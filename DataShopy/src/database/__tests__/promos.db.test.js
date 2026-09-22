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
