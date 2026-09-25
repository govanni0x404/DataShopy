// Picks the promo worth highlighting on a store (the one that ends soonest, so it creates
// urgency; promos without an end date come after) and words its deadline.

const dayNumber = (date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);

// 'YYYY-MM-DD' -> whole days from today (0 = today). null if missing/unreadable.
export const daysUntil = (expiresAt, now = new Date()) => {
  const match = String(expiresAt || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const end = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000;
  return Math.round(end - dayNumber(now));
};

export const expiryLabel = (expiresAt, now = new Date()) => {
  const days = daysUntil(expiresAt, now);
  if (days === null || days < 0) return '';
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days <= 14) return `Vence en ${days} días`;
  return '';
};

export const pickFeaturedPromo = (promos, now = new Date()) => {
  const live = (promos || []).filter((p) => {
    const d = daysUntil(p.expires_at, now);
    return d === null || d >= 0;
  });
  if (!live.length) return null;
  return [...live].sort((a, b) => {
    const da = daysUntil(a.expires_at, now);
    const db = daysUntil(b.expires_at, now);
    if (da !== db) return (da ?? Infinity) - (db ?? Infinity);
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  })[0];
};
