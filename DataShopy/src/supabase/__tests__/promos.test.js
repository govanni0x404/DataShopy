import { activePromoFilter } from '../promos';

// Regression guard for the bug where every promo screen/query only checked
// `is_active`, never `expires_at`, so an expired promotion still showed up
// as "active" everywhere (Home nearby banner, notifications, store detail,
// owner dashboard/stats, the 5-promo cap).
describe('activePromoFilter', () => {
  it('returns a PostgREST .or() filter string requiring null or future expires_at', () => {
    const filter = activePromoFilter();
    expect(filter).toMatch(/^expires_at\.is\.null,expires_at\.gte\.\d{4}-\d{2}-\d{2}$/);
  });

  it('uses today\'s date in YYYY-MM-DD form', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(activePromoFilter()).toBe(`expires_at.is.null,expires_at.gte.${today}`);
  });
});
