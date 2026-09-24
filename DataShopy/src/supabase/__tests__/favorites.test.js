// Covers the reconciliation rules between the phone's SQLite favorites and the
// `favorites` table in Supabase (in-memory fake below), since a mistake here
// silently loses or resurrects a user's favorites.
const USER = '11111111-2222-3333-4444-555555555555';

const mockRemote = { rows: [], failReads: false };

jest.mock('../client', () => {
  const makeBuilder = () => {
    const state = { op: 'select', filters: {}, rows: [] };
    const run = () => {
      if (state.op === 'select') {
        if (mockRemote.failReads) return { data: null, error: new Error('network down') };
        const data = mockRemote.rows.filter((r) => Object.entries(state.filters).every(([k, v]) => r[k] === v));
        return { data, error: null };
      }
      if (state.op === 'upsert') {
        for (const row of state.rows) {
          if (!mockRemote.rows.some((r) => r.user_id === row.user_id && r.store_id === row.store_id)) mockRemote.rows.push({ ...row });
        }
        return { error: null };
      }
      mockRemote.rows = mockRemote.rows.filter((r) => !Object.entries(state.filters).every(([k, v]) => r[k] === v));
      return { error: null };
    };
    const builder = {
      select: () => builder,
      delete: () => {
        state.op = 'delete';
        return builder;
      },
      upsert: (rows) => {
        state.op = 'upsert';
        state.rows = Array.isArray(rows) ? rows : [rows];
        return builder;
      },
      eq: (key, value) => {
        state.filters[key] = value;
        return builder;
      },
      limit: () => builder,
      then: (resolve, reject) => Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  };
  return { supabase: { from: () => makeBuilder() } };
});

let db;
let favorites;
const storeIdOf = (supaId) => db.getStoreByExternalId(`sb:store/${supaId}`).id;
const remoteStoreIds = () => mockRemote.rows.filter((r) => r.user_id === USER).map((r) => r.store_id).sort();

beforeEach(() => {
  jest.resetModules();
  mockRemote.rows = [];
  mockRemote.failReads = false;
  // eslint-disable-next-line global-require
  db = require('../../database/db');
  db.initDB();
  // eslint-disable-next-line global-require
  favorites = require('../favorites');
  for (const id of [1, 2, 3]) {
    db.getDB().runSync(
      'INSERT INTO stores (owner_id, name, category, external_id, claimed) VALUES (?, ?, ?, ?, ?)',
      [1, `Tienda ${id}`, 'Local', `sb:store/${id}`, 1]
    );
  }
});

describe('isRemoteUser', () => {
  it('only treats real Supabase user ids as remote', () => {
    expect(favorites.isRemoteUser(USER)).toBe(true);
    expect(favorites.isRemoteUser('guest')).toBe(false);
    expect(favorites.isRemoteUser(undefined)).toBe(false);
    expect(favorites.isRemoteUser(42)).toBe(false);
  });
});

describe('syncFavorites', () => {
  it('first sync merges both sides: uploads phone-only favorites and downloads server-only ones', async () => {
    db.setFavoriteStore(USER, storeIdOf(1), true); // only on the phone (pre-existing local favorite)
    mockRemote.rows.push({ user_id: USER, store_id: 2 }); // only on the server (added from another device)

    const result = await favorites.syncFavorites(USER);

    expect(result.ok).toBe(true);
    expect(remoteStoreIds()).toEqual([1, 2]);
    expect(db.isFavoriteStore(USER, storeIdOf(1))).toBe(true);
    expect(db.isFavoriteStore(USER, storeIdOf(2))).toBe(true);
  });

  it('later syncs treat the server as the source of truth (a favorite removed elsewhere disappears here)', async () => {
    db.setFavoriteStore(USER, storeIdOf(1), true);
    mockRemote.rows.push({ user_id: USER, store_id: 1 });
    await favorites.syncFavorites(USER); // first sync: in agreement, marks the user as synced

    mockRemote.rows = []; // removed from another device
    await favorites.syncFavorites(USER);

    expect(db.isFavoriteStore(USER, storeIdOf(1))).toBe(false);
  });

  it('skips server favorites whose store is not cached locally yet (no crash)', async () => {
    mockRemote.rows.push({ user_id: USER, store_id: 999 });
    const result = await favorites.syncFavorites(USER);
    expect(result.ok).toBe(true);
    expect(db.getFavoriteStoreIds(USER)).toEqual([]);
  });

  it('does nothing for guests', async () => {
    db.setFavoriteStore('guest', storeIdOf(1), true);
    const result = await favorites.syncFavorites('guest');
    expect(result.ok).toBe(false);
    expect(mockRemote.rows).toEqual([]);
    expect(db.isFavoriteStore('guest', storeIdOf(1))).toBe(true);
  });

  it('leaves local favorites untouched when the server cannot be reached', async () => {
    db.setFavoriteStore(USER, storeIdOf(3), true);
    mockRemote.failReads = true;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await favorites.syncFavorites(USER);

    expect(result.ok).toBe(false);
    expect(db.isFavoriteStore(USER, storeIdOf(3))).toBe(true);
    warn.mockRestore();
  });
});

describe('pushFavoriteChange', () => {
  it('writes favorites and un-favorites through to the server', async () => {
    await favorites.pushFavoriteChange(USER, storeIdOf(2), true);
    expect(remoteStoreIds()).toEqual([2]);

    await favorites.pushFavoriteChange(USER, storeIdOf(2), false);
    expect(remoteStoreIds()).toEqual([]);
  });

  it('does not call the server for guests', async () => {
    await favorites.pushFavoriteChange('guest', storeIdOf(2), true);
    expect(mockRemote.rows).toEqual([]);
  });
});
