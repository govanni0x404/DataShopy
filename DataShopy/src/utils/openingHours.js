// Interprets the free-text schedules owners type ("09:00 - 18:00", "Lun-Sab: 12:00-18:00")
// to tell whether a store is open right now. Anything we can't read gives `null`, so the
// UI simply shows no status instead of a wrong one.

const DAY_INDEX = { dom: 0, lun: 1, mar: 2, mie: 3, jue: 4, vie: 5, sab: 6 };
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const strip = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const TIME_RANGE = /(\d{1,2})[:.](\d{2})\s*(?:-|–|a|hasta)\s*(\d{1,2})[:.](\d{2})/;
const DAY_RANGE = /\b(lun|mar|mie|jue|vie|sab|dom)[a-z]*\.?\s*(?:-|–|a|al)\s*(lun|mar|mie|jue|vie|sab|dom)[a-z]*/;

const daysBetween = (from, to) => {
  const days = [];
  for (let d = from; ; d = (d + 1) % 7) {
    days.push(d);
    if (d === to) break;
  }
  return days;
};

// "lun-sab" -> [1..6]; "dom" or "lun, mie" -> those days; nothing recognisable -> null.
const parseDays = (prefix) => {
  const range = prefix.match(DAY_RANGE);
  if (range) return daysBetween(DAY_INDEX[range[1]], DAY_INDEX[range[2]]);
  const singles = [...prefix.matchAll(/\b(lun|mar|mie|jue|vie|sab|dom)[a-z]*/g)].map((m) => DAY_INDEX[m[1]]);
  return singles.length ? [...new Set(singles)] : null;
};

// One schedule field -> { days, start, end } (minutes; end may pass 1440 for overnight) or null.
const parseField = (text, defaultDays) => {
  const clean = strip(text);
  const range = clean.match(TIME_RANGE);
  if (!range) return null;
  const start = Number(range[1]) * 60 + Number(range[2]);
  let end = Number(range[3]) * 60 + Number(range[4]);
  if (Number(range[1]) > 23 || Number(range[3]) > 24 || Number(range[2]) > 59 || Number(range[4]) > 59) return null;
  if (end <= start) end += 1440; // closes after midnight ("11:00 - 00:00")
  return { days: parseDays(clean.slice(0, range.index)) || defaultDays, start, end };
};

export const parseSchedule = (store) =>
  [parseField(store?.schedule_weekday, [1, 2, 3, 4, 5]), parseField(store?.schedule_weekend, [6, 0])].filter(Boolean);

const hhmm = (minutes) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// -> null | { state: 'open' | 'closing' | 'closed', label }
export const getOpenStatus = (store, now = new Date()) => {
  const entries = parseSchedule(store);
  if (!entries.length) return null;

  const today = now.getDay();
  const yesterday = (today + 6) % 7;
  const minutes = now.getHours() * 60 + now.getMinutes();

  // Open now: today's window, or last night's window that runs past midnight.
  for (const e of entries) {
    if (e.days.includes(today) && minutes >= e.start && minutes < e.end) {
      const left = e.end - minutes;
      return {
        state: left <= 60 ? 'closing' : 'open',
        label: left <= 60 ? `Cierra pronto · ${hhmm(e.end)}` : `Abierto · cierra a las ${hhmm(e.end)}`,
      };
    }
    if (e.days.includes(yesterday) && e.end > 1440 && minutes < e.end - 1440) {
      return { state: 'open', label: `Abierto · cierra a las ${hhmm(e.end)}` };
    }
  }

  // Closed: find the next opening within a week.
  for (let offset = 0; offset < 8; offset += 1) {
    const day = (today + offset) % 7;
    const starts = entries
      .filter((e) => e.days.includes(day) && (offset > 0 || e.start > minutes))
      .map((e) => e.start)
      .sort((a, b) => a - b);
    if (starts.length) {
      const when = offset === 0 ? 'hoy' : offset === 1 ? 'mañana' : `el ${DAY_NAMES[day]}`;
      return { state: 'closed', label: `Cerrado · abre ${when} ${hhmm(starts[0])}` };
    }
  }
  return { state: 'closed', label: 'Cerrado' };
};

// Validation for the owner's form: empty is fine, "Cerrado" is fine, otherwise we must be
// able to read a time range (so the "open now" badge works).
export const isReadableSchedule = (text) => {
  const clean = strip(text).trim();
  if (!clean) return true;
  if (/cerrad/.test(clean)) return true;
  return parseField(clean, [0]) !== null;
};
