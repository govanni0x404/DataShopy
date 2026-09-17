// A promotion only counts as "active" while `is_active` is true AND it
// hasn't expired yet (`expires_at` null/empty means it never expires).
// Use as: query.eq('is_active', true).or(activePromoFilter())
export const activePromoFilter = () => {
  const today = new Date().toISOString().slice(0, 10);
  return `expires_at.is.null,expires_at.gte.${today}`;
};
