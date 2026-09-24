// The star ratings shown on store cards are a cached copy of the server-side
// store_rating_stats view. These pin down how that cache is refreshed.
jest.mock('../../supabase/client', () => ({
  supabase: { from: () => ({ insert: () => ({ then: () => {}, catch: () => {} }) }) },
}));

let db;

const addStore = (externalId, name = 'Tienda') => {
  db.getDB().runSync(
    'INSERT INTO stores (owner_id, name, category, external_id, claimed) VALUES (?, ?, ?, ?, ?)',
    [1, name, 'Local', externalId, 1]
  );
  return db.getStoreByExternalId(externalId).id;
};
const ratingOf = (externalId) => {
  const { rating_avg: avg, rating_count: count } = db.getStoreByExternalId(externalId);
  return { avg, count };
};

beforeEach(() => {
  jest.resetModules();
  // eslint-disable-next-line global-require
  db = require('../db');
  db.initDB();
});

describe('replaceStoreRatings', () => {
  it('stores the average and count on the matching cached store', () => {
    addStore('sb:store/1');
    db.replaceStoreRatings([{ store_id: 1, rating_avg: '4.50', rating_count: 12 }]);
    expect(ratingOf('sb:store/1')).toEqual({ avg: 4.5, count: 12 });
  });

  it('resets stores that no longer have reviews', () => {
    addStore('sb:store/1');
    addStore('sb:store/2');
    db.replaceStoreRatings([
      { store_id: 1, rating_avg: 5, rating_count: 1 },
      { store_id: 2, rating_avg: 3, rating_count: 2 },
    ]);
    db.replaceStoreRatings([{ store_id: 1, rating_avg: 5, rating_count: 1 }]);
    expect(ratingOf('sb:store/2')).toEqual({ avg: null, count: 0 });
    expect(ratingOf('sb:store/1').count).toBe(1);
  });

  it('ignores malformed rows and unknown stores without throwing', () => {
    addStore('sb:store/1');
    expect(() =>
      db.replaceStoreRatings([{ store_id: 999, rating_avg: 4, rating_count: 1 }, { store_id: 1, rating_avg: 'x', rating_count: 1 }, null])
    ).not.toThrow();
    expect(ratingOf('sb:store/1')).toEqual({ avg: null, count: 0 });
  });
});

describe('setStoreRatingLocal', () => {
  it('updates one store, and clears it when there are no reviews left', () => {
    const id = addStore('sb:store/1');
    db.setStoreRatingLocal(id, 4.2, 5);
    expect(ratingOf('sb:store/1')).toEqual({ avg: 4.2, count: 5 });
    db.setStoreRatingLocal(id, 0, 0);
    expect(ratingOf('sb:store/1')).toEqual({ avg: null, count: 0 });
  });
});

describe('getSupabaseStoreId', () => {
  it('maps cached stores to their Supabase id and returns null for local-only ones', () => {
    const cached = addStore('sb:store/77');
    const localOnly = addStore('local:abc');
    expect(db.getSupabaseStoreId(cached)).toBe(77);
    expect(db.getSupabaseStoreId(localOnly)).toBeNull();
    expect(db.getSupabaseStoreId(123456)).toBeNull();
  });
});
