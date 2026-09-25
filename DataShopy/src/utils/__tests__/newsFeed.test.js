import { rankNewsFeed } from '../newsFeed';
import { cityOfNearestStore, distanceKm, formatDistance } from '../geo';

const me = { lat: -35.85, lng: -71.6 }; // Linares
const item = (id, extra) => ({ id, isFavorite: false, lat: null, lng: null, createdAt: '2026-09-01T00:00:00Z', ...extra });

describe('distance helpers', () => {
  test('distanceKm is ~0 for the same point and null without data', () => {
    expect(distanceKm(me, me)).toBeCloseTo(0, 5);
    expect(distanceKm(null, me)).toBeNull();
  });

  test('formatDistance: meters under 1 km, one decimal under 10 km, rounded above', () => {
    expect(formatDistance(0.42)).toBe('a 420 m');
    expect(formatDistance(2.34)).toBe('a 2,3 km');
    expect(formatDistance(15.6)).toBe('a 16 km');
    expect(formatDistance(null)).toBe('');
  });
});

describe('rankNewsFeed', () => {
  const near = { lat: -35.851, lng: -71.601 };
  const far = { lat: -35.5, lng: -71.3 };

  test('favorites come first even when farther away', () => {
    const ids = rankNewsFeed([item('near', near), item('fav-far', { ...far, isFavorite: true })], me).map((i) => i.id);
    expect(ids).toEqual(['fav-far', 'near']);
  });

  test('inside a group the nearest store comes first', () => {
    const ids = rankNewsFeed([item('far', far), item('near', near)], me).map((i) => i.id);
    expect(ids).toEqual(['near', 'far']);
  });

  test('stores without coordinates go after those with coordinates', () => {
    const ids = rankNewsFeed([item('nocoords'), item('far', far)], me).map((i) => i.id);
    expect(ids).toEqual(['far', 'nocoords']);
  });

  test('re-ranks when the user moves', () => {
    const list = [item('a', near), item('b', far)];
    expect(rankNewsFeed(list, me)[0].id).toBe('a');
    expect(rankNewsFeed(list, { lat: -35.5, lng: -71.3 })[0].id).toBe('b');
  });

  test('without location: newest first inside each group', () => {
    const list = [
      item('old', { createdAt: '2026-08-01T00:00:00Z' }),
      item('new', { createdAt: '2026-09-20T00:00:00Z' }),
      item('fav-old', { isFavorite: true, createdAt: '2026-07-01T00:00:00Z' }),
    ];
    expect(rankNewsFeed(list, null).map((i) => i.id)).toEqual(['fav-old', 'new', 'old']);
  });

  test('equal distance falls back to newest and input is not mutated', () => {
    const list = [item('a', { ...near, createdAt: '2026-08-01T00:00:00Z' }), item('b', { ...near, createdAt: '2026-09-01T00:00:00Z' })];
    const copy = JSON.stringify(list);
    expect(rankNewsFeed(list, me).map((i) => i.id)).toEqual(['b', 'a']);
    expect(JSON.stringify(list)).toBe(copy);
  });
});

describe('cityOfNearestStore', () => {
  const stores = [
    { city: 'Linares', lat: -35.85, lng: -71.6 },
    { city: 'Talca', lat: -35.43, lng: -71.66 },
    { city: 'Sin coords', lat: null, lng: null },
  ];
  test('picks the city of the closest store', () => {
    expect(cityOfNearestStore(stores, { lat: -35.44, lng: -71.65 })).toBe('Talca');
  });
  test('returns null when nothing is close or there is no position', () => {
    expect(cityOfNearestStore(stores, { lat: -33.4, lng: -70.6 })).toBeNull();
    expect(cityOfNearestStore(stores, null)).toBeNull();
    expect(cityOfNearestStore([], { lat: 0, lng: 0 })).toBeNull();
  });
});
