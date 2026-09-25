const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance in km between two {lat, lng} points (null if either is missing).
export const distanceKm = (a, b) => {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
};

export const formatDistance = (km) => {
  if (km == null || !Number.isFinite(km)) return '';
  if (km < 1) return `a ${Math.max(10, Math.round(km * 100) * 10)} m`;
  return `a ${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
};

// City of the closest store that has coordinates (within maxKm), used when reverse
// geocoding is unavailable. Returns null if nothing is close enough.
export const cityOfNearestStore = (stores, coords, maxKm = 40) => {
  if (!coords) return null;
  let best = null;
  let bestKm = Infinity;
  for (const store of stores || []) {
    const lat = Number(store.lat);
    const lng = Number(store.lng);
    if (store.lat == null || store.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const km = distanceKm(coords, { lat, lng });
    if (km < bestKm && String(store.city || '').trim()) {
      best = String(store.city).trim();
      bestKm = km;
    }
  }
  return bestKm <= maxKm ? best : null;
};
