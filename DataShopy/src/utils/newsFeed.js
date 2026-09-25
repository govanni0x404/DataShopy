import { distanceKm } from './geo';

const num = (v) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

// Orders the "Novedades" feed:
//   1. promos of the user's favorite stores first,
//   2. then the rest; inside each group, nearest store first when we know where
//      the user is (stores without coordinates go last), newest promo as tie-break.
// Without user coordinates each group is just newest-first.
// Each item needs { isFavorite, lat, lng, createdAt }; returns copies with `distanceKm`.
export const rankNewsFeed = (items, coords) => {
  const withDistance = (items || []).map((item) => {
    const lat = num(item.lat);
    const lng = num(item.lng);
    const km = coords && lat !== null && lng !== null ? distanceKm(coords, { lat, lng }) : null;
    return { ...item, distanceKm: km };
  });

  const created = (item) => Date.parse(item.createdAt) || 0;

  return withDistance.sort((a, b) => {
    if (!!a.isFavorite !== !!b.isFavorite) return a.isFavorite ? -1 : 1;
    if (coords) {
      const da = a.distanceKm;
      const db = b.distanceKm;
      if (da !== null && db !== null && da !== db) return da - db;
      if (da !== null && db === null) return -1;
      if (da === null && db !== null) return 1;
    }
    return created(b) - created(a);
  });
};
