const USER = '11111111-1111-4111-8111-111111111111';

let mockResult;
let mockCalls;
jest.mock('../client', () => {
  const chain = {};
  const record = (name) => (...args) => {
    mockCalls.push([name, ...args]);
    return chain;
  };
  ['select', 'in', 'eq', 'or', 'gt'].forEach((m) => {
    chain[m] = record(m);
  });
  chain.then = (resolve, reject) => Promise.resolve(mockResult).then(resolve, reject);
  return { supabase: { from: (table) => (mockCalls.push(['from', table]), chain) } };
});

let db;
let badge;

beforeEach(() => {
  jest.resetModules();
  mockCalls = [];
  mockResult = { count: 2, error: null };
  db = require('../../database/db');
  db.initDB();
  db.getDB().runSync("DELETE FROM promotions");
  badge = require('../newsBadge');
});

const favoriteStore = () => {
  db.importCatalogStores({
    stores: [{ name: 'Local A', category: 'Comida', city: 'Linares', external_id: 'sb:store/77', source: 'supabase' }],
    source: 'supabase',
  });
  const store = db.getStoreByExternalId('sb:store/77');
  db.setFavoriteStore(USER, store.id, true);
  return store;
};

describe('news badge', () => {
  test('guests never get a count', async () => {
    expect(await badge.refreshNewsCount('guest')).toBe(0);
    expect(mockCalls).toHaveLength(0);
  });

  test('first run starts from now and only asks the server about favorites', async () => {
    favoriteStore();
    const count = await badge.refreshNewsCount(USER);
    expect(count).toBe(2);
    expect(db.getAppMeta(`news_seen_at:${USER}`)).toBeTruthy();
    const inCall = mockCalls.find((c) => c[0] === 'in');
    expect(inCall.slice(1)).toEqual(['store_id', [77]]);
    expect(mockCalls.some((c) => c[0] === 'gt' && c[1] === 'created_at')).toBe(true);
  });

  test('no favorites: zero without hitting the server', async () => {
    expect(await badge.refreshNewsCount(USER)).toBe(0);
    expect(mockCalls.some((c) => c[0] === 'from')).toBe(false);
  });

  test('markNewsSeen resets the counter and notifies subscribers', async () => {
    favoriteStore();
    const seen = [];
    badge.subscribeNewsCount((n) => seen.push(n));
    await badge.refreshNewsCount(USER);
    badge.markNewsSeen(USER);
    expect(seen).toEqual([2, 0]);
    expect(badge.getNewsCount()).toBe(0);
  });

  test('a server error keeps the previous count', async () => {
    favoriteStore();
    await badge.refreshNewsCount(USER);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockResult = { count: null, error: new Error('boom') };
    expect(await badge.refreshNewsCount(USER)).toBe(2);
    warn.mockRestore();
  });
});
