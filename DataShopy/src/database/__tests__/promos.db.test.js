// Exercises the local SQLite side of the "expired promos must not show as
// active" fix against a real in-memory SQLite engine (see
// __mocks__/expo-sqlite.js), not just a string-shape check. This is the
// other half of the bug fixed alongside src/supabase/promos.js —
// getPromosByStore/countActivePromos both filter in raw SQL, so a future
// edit to either query string that breaks the expiry clause would only be
// caught here.

// db.js imports the real Supabase client just to fire-and-forget analytics
// events; it needs real env config to construct, which doesn't exist in
// this test environment. Stub it out — nothing here exercises trackEvent.
jest.mock('../../supabase/client', () => ({
  supabase: { from: () => ({ insert: () => ({ then: () => {}, catch: () => {} }) }) },
}));

let db;

beforeEach(() => {
  jest.resetModules();
  // eslint-disable-next-line global-require
  db = require('../db');
  db.initDB();
  // initDB() seeds demo stores/promotions on a fresh database (so the app
  // has something to show on first launch) — clear that out so each test
  // starts from a clean, predictable promotions table.
  db.getDB().runSync('DELETE FROM promotions');
});

const STORE_ID = 1;

const insertRawPromo = ({ title, expiresAt, isActive = 1 }) => {
  const conn = db.getDB();
  conn.runSync(
    'INSERT INTO promotions (store_id, title, description, tag, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?)',
    [STORE_ID, title, '', '', expiresAt, isActive]
  );
};

describe('local promo expiry filtering (SQLite)', () => {
  it('excludes a promo whose expires_at is in the past', () => {
    insertRawPromo({ title: 'Vencida', expiresAt: '2020-01-01' });
    expect(db.getPromosByStore(STORE_ID)).toHaveLength(0);
    expect(db.countActivePromos(STORE_ID)).toBe(0);
  });

  it('includes a promo whose expires_at is in the future', () => {
    insertRawPromo({ title: 'Vigente', expiresAt: '2099-01-01' });
    const promos = db.getPromosByStore(STORE_ID);
    expect(promos).toHaveLength(1);
    expect(promos[0].title).toBe('Vigente');
    expect(db.countActivePromos(STORE_ID)).toBe(1);
  });

  it('includes a promo with no expiration date (null/empty means it never expires)', () => {
    insertRawPromo({ title: 'Sin vencimiento', expiresAt: null });
    expect(db.getPromosByStore(STORE_ID)).toHaveLength(1);
    insertRawPromo({ title: 'Vacía', expiresAt: '' });
    expect(db.countActivePromos(STORE_ID)).toBe(2);
  });

  it('excludes a promo that is inactive even if it has not expired', () => {
    insertRawPromo({ title: 'Desactivada', expiresAt: '2099-01-01', isActive: 0 });
    expect(db.getPromosByStore(STORE_ID)).toHaveLength(0);
  });

  it('deletePromo soft-deletes by setting is_active = 0', () => {
    db.createPromo(STORE_ID, { title: 'Nueva', description: '', tag: '', expires_at: '2099-01-01' });
    const [created] = db.getPromosByStore(STORE_ID);
    expect(created).toBeTruthy();

    db.deletePromo(created.id);
    expect(db.getPromosByStore(STORE_ID)).toHaveLength(0);
  });

  it('only counts promos for the requested store', () => {
    insertRawPromo({ title: 'Tienda 1', expiresAt: '2099-01-01' });
    const conn = db.getDB();
    conn.runSync(
      'INSERT INTO promotions (store_id, title, description, tag, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [2, 'Tienda 2', '', '', '2099-01-01', 1]
    );
    expect(db.countActivePromos(STORE_ID)).toBe(1);
    expect(db.countActivePromos(2)).toBe(1);
  });
});

describe('getActivePromoTexts / replaceActivePromoSnapshot', () => {
  const addStore = ({ name, externalId, claimed }) => {
    const conn = db.getDB();
    conn.runSync(
      'INSERT INTO stores (owner_id, name, category, external_id, claimed) VALUES (?, ?, ?, ?, ?)',
      [1, name, 'Local', externalId, claimed]
    );
    return conn.getFirstSync('SELECT id FROM stores WHERE external_id = ?', [externalId]).id;
  };
  const addPromo = (storeId, title, expiresAt = '2099-01-01', isActive = 1) =>
    db.getDB().runSync(
      'INSERT INTO promotions (store_id, title, description, tag, expires_at, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [storeId, title, '', '', expiresAt, isActive]
    );

  it('joins the text of active promos per claimed store and ignores expired/inactive/unclaimed ones', () => {
    const claimed = addStore({ name: 'Claimed', externalId: 'sb:store/900', claimed: 1 });
    const unclaimed = addStore({ name: 'Unclaimed', externalId: 'sb:store/901', claimed: 0 });
    addPromo(claimed, '2x1 en cascos');
    addPromo(claimed, 'Vencida', '2020-01-01');
    addPromo(claimed, 'Apagada', '2099-01-01', 0);
    addPromo(unclaimed, 'No debería verse');

    const texts = db.getActivePromoTexts();
    expect(texts[claimed]).toContain('2x1 en cascos');
    expect(texts[claimed]).not.toContain('Vencida');
    expect(texts[claimed]).not.toContain('Apagada');
    expect(texts[unclaimed]).toBeUndefined();
  });

  it('snapshot switches off synced promos that the server no longer reports as active', () => {
    addStore({ name: 'Tienda', externalId: 'sb:store/910', claimed: 1 });
    const promo = (id, title) => ({ id, store_id: 910, title, expires_at: '2099-01-01', is_active: true });

    db.replaceActivePromoSnapshot({ promos: [promo(1, 'Primera'), promo(2, 'Segunda')] });
    const storeId = db.getDB().getFirstSync('SELECT id FROM stores WHERE external_id = ?', ['sb:store/910']).id;
    expect(db.countActivePromos(storeId)).toBe(2);

    // Promo 1 was deactivated on the server: next snapshot only contains #2.
    db.replaceActivePromoSnapshot({ promos: [promo(2, 'Segunda')] });
    expect(db.countActivePromos(storeId)).toBe(1);
    expect(db.getPromosByStore(storeId)[0].title).toBe('Segunda');
  });

  it('with storeIds, only resets promos of those stores (other cities stay untouched)', () => {
    addStore({ name: 'Ciudad A', externalId: 'sb:store/930', claimed: 1 });
    addStore({ name: 'Ciudad B', externalId: 'sb:store/931', claimed: 1 });
    const promo = (id, storeId, title) => ({ id, store_id: storeId, title, expires_at: '2099-01-01', is_active: true });
    db.replaceActivePromoSnapshot({ promos: [promo(10, 930, 'A1'), promo(11, 931, 'B1')] });

    // Sync of city A only (store 930): its promo was removed on the server.
    db.replaceActivePromoSnapshot({ promos: [], storeIds: [930] });

    const idOf = (ext) => db.getDB().getFirstSync('SELECT id FROM stores WHERE external_id = ?', [ext]).id;
    expect(db.countActivePromos(idOf('sb:store/930'))).toBe(0);
    expect(db.countActivePromos(idOf('sb:store/931'))).toBe(1);
  });

  it('does not touch local-only promos (no source) when snapshotting', () => {
    const storeId = addStore({ name: 'Local', externalId: 'sb:store/920', claimed: 1 });
    addPromo(storeId, 'Solo local'); // source is NULL
    db.replaceActivePromoSnapshot({ promos: [] });
    expect(db.countActivePromos(storeId)).toBe(1);
  });
});
