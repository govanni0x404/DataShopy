import { getOpenStatus, isReadableSchedule, parseSchedule } from '../openingHours';
import { daysUntil, expiryLabel, pickFeaturedPromo } from '../promoHighlight';
import { travelEstimate } from '../geo';

// 2026-09-23 is a Wednesday; 2026-09-26 a Saturday; 2026-09-27 a Sunday.
const at = (y, m, d, h, min) => new Date(y, m - 1, d, h, min);
const store = { schedule_weekday: '09:00 - 18:00', schedule_weekend: '10:00 - 14:00' };

describe('getOpenStatus', () => {
  test('open during the weekday window', () => {
    expect(getOpenStatus(store, at(2026, 9, 23, 12, 0))).toEqual({ state: 'open', label: 'Abierto · cierra a las 18:00' });
  });

  test('closing soon in the last hour', () => {
    expect(getOpenStatus(store, at(2026, 9, 23, 17, 30))).toEqual({ state: 'closing', label: 'Cierra pronto · 18:00' });
  });

  test('closed before opening: opens today', () => {
    expect(getOpenStatus(store, at(2026, 9, 23, 7, 0)).label).toBe('Cerrado · abre hoy 09:00');
  });

  test('closed after closing: opens tomorrow', () => {
    expect(getOpenStatus(store, at(2026, 9, 23, 20, 0)).label).toBe('Cerrado · abre mañana 09:00');
  });

  test('Friday night: next opening is Saturday (weekend hours)', () => {
    expect(getOpenStatus(store, at(2026, 9, 25, 20, 0)).label).toBe('Cerrado · abre mañana 10:00');
  });

  test('Sunday evening: next opening is tomorrow (Monday)', () => {
    expect(getOpenStatus(store, at(2026, 9, 27, 20, 0)).label).toBe('Cerrado · abre mañana 09:00');
  });

  test('a store closed on Sunday names the day: "abre el lunes"', () => {
    const s = { schedule_weekday: 'Lun-Sab: 12:00-18:00', schedule_weekend: '' };
    expect(getOpenStatus(s, at(2026, 9, 26, 20, 0)).label).toBe('Cerrado · abre el lunes 12:00');
  });

  test('uses weekend hours on Saturday', () => {
    expect(getOpenStatus(store, at(2026, 9, 26, 11, 0)).state).toBe('open');
    expect(getOpenStatus(store, at(2026, 9, 26, 15, 0)).state).toBe('closed');
  });

  test('closing at midnight ("11:00 - 00:00") and overnight spill into the next day', () => {
    const bar = { schedule_weekday: '11:00 - 23:00', schedule_weekend: '11:00 - 00:00' };
    expect(getOpenStatus(bar, at(2026, 9, 26, 23, 30))).toEqual({ state: 'closing', label: 'Cierra pronto · 00:00' });
    const night = { schedule_weekday: '20:00 - 02:00', schedule_weekend: '' };
    expect(getOpenStatus(night, at(2026, 9, 24, 1, 0)).state).toBe('open'); // Wed 01:00, opened Tue night
  });

  test('day ranges in the text: "Lun-Sab: 12:00-18:00" is open Saturday, closed Sunday', () => {
    const s = { schedule_weekday: 'Lun-Sab: 12:00-18:00', schedule_weekend: '' };
    expect(getOpenStatus(s, at(2026, 9, 26, 13, 0)).state).toBe('open');
    expect(getOpenStatus(s, at(2026, 9, 27, 13, 0)).label).toBe('Cerrado · abre mañana 12:00');
  });

  test('unreadable or empty schedules give no status', () => {
    expect(getOpenStatus({ schedule_weekday: 'Lun-Viern', schedule_weekend: '' })).toBeNull();
    expect(getOpenStatus({})).toBeNull();
    expect(parseSchedule({ schedule_weekday: '25:00 - 30:00' })).toEqual([]);
  });
});

describe('schedule text variants', () => {
  test('single day prefix ("Dom: 13:00–21:00") and en-dash ranges', () => {
    const s = { schedule_weekday: 'Lun–Sáb: 12:00–23:00', schedule_weekend: 'Dom: 13:00–21:00' };
    expect(getOpenStatus(s, at(2026, 9, 26, 22, 0)).state).toBe('closing'); // Saturday
    expect(getOpenStatus(s, at(2026, 9, 27, 14, 0)).state).toBe('open'); // Sunday
    expect(getOpenStatus(s, at(2026, 9, 27, 22, 0)).label).toBe('Cerrado · abre mañana 12:00');
  });

  test('"Cerrado" on weekends means closed those days', () => {
    const s = { schedule_weekday: '09:00 - 18:00', schedule_weekend: 'Cerrado' };
    expect(getOpenStatus(s, at(2026, 9, 26, 11, 0)).label).toBe('Cerrado · abre el lunes 09:00');
  });

  test('isReadableSchedule accepts empty, Cerrado and time ranges only', () => {
    expect(isReadableSchedule('')).toBe(true);
    expect(isReadableSchedule('Cerrado')).toBe(true);
    expect(isReadableSchedule('09:00 - 18:00')).toBe(true);
    expect(isReadableSchedule('Lun-Sab: 12:00-18:00')).toBe(true);
    expect(isReadableSchedule('todo el día')).toBe(false);
    expect(isReadableSchedule('Lun-Viern')).toBe(false);
  });
});

describe('promo highlight', () => {
  const now = at(2026, 9, 23, 10, 0);
  test('daysUntil and labels', () => {
    expect(daysUntil('2026-09-23', now)).toBe(0);
    expect(expiryLabel('2026-09-23', now)).toBe('Vence hoy');
    expect(expiryLabel('2026-09-24', now)).toBe('Vence mañana');
    expect(expiryLabel('2026-09-27', now)).toBe('Vence en 4 días');
    expect(expiryLabel('2026-12-31', now)).toBe('');
    expect(expiryLabel('2026-09-01', now)).toBe('');
    expect(expiryLabel(null, now)).toBe('');
  });

  test('features the promo that ends soonest, skipping expired ones', () => {
    const promos = [
      { id: 1, expires_at: '2026-10-31' },
      { id: 2, expires_at: '2026-09-25' },
      { id: 3, expires_at: '2026-09-01' },
      { id: 4, expires_at: null },
    ];
    expect(pickFeaturedPromo(promos, now).id).toBe(2);
    expect(pickFeaturedPromo([{ id: 3, expires_at: '2026-09-01' }], now)).toBeNull();
    expect(pickFeaturedPromo([], now)).toBeNull();
  });
});

describe('travelEstimate', () => {
  test('walking under 1.5 km, driving beyond', () => {
    expect(travelEstimate(0.8)).toEqual({ mode: 'walk', minutes: 10 });
    expect(travelEstimate(6)).toEqual({ mode: 'drive', minutes: 16 });
    expect(travelEstimate(null)).toBeNull();
  });
});
