// Generic store search: works for any category, including ones that don't
// exist yet, by combining four layers (in increasing "leniency"):
//   1. Exact phrase match anywhere in name/category/description.
//   2. Word-level substring match (e.g. "pan" <-> "panadería").
//   3. Word-level shared-root match (e.g. "zapato" <-> "zapatería",
//      "helado" <-> "heladería") — handles Spanish noun -> "-ería"/"-ería"
//      store-type derivations without needing a synonym entry.
//   4. Word-level fuzzy match by edit distance, for typos and near-misses.
// A small curated synonym map covers the cases that can't be derived from
// shared spelling at all (e.g. "hospital" and "farmacia" share no root).
// Add to it sparingly — most future business categories are already found
// by layers 2-4 without needing an entry here.
const SEARCH_SYNONYMS = {
  hospital: ['clinica', 'salud', 'medico', 'doctor', 'farmacia', 'dental', 'veterinaria', 'urgencia'],
  clinica: ['hospital', 'salud', 'medico', 'doctor', 'consultorio'],
  salud: ['farmacia', 'clinica', 'hospital', 'medico', 'dental'],

  bebida: ['jugo', 'refresco', 'gaseosa', 'bar', 'cerveceria', 'licoreria', 'botilleria', 'cafeteria'],
  bar: ['cerveceria', 'bebida', 'licoreria', 'botilleria'],
  cerveza: ['cerveceria', 'bar', 'botilleria', 'licoreria', 'bebida'],
  vino: ['licoreria', 'botilleria', 'bar', 'bebida'],
  licor: ['licoreria', 'botilleria', 'bar', 'bebida'],
  alcohol: ['licoreria', 'botilleria', 'bar', 'cerveceria'],
  gaseosa: ['bebida', 'refresco', 'jugo'],

  comida: ['restaurante', 'restaurant', 'almuerzo', 'cena', 'gastronomia'],
  choclo: ['maiz', 'verdura', 'legumbre'],
  maiz: ['choclo', 'verdura'],
  legumbre: ['lenteja', 'poroto', 'garbanzo', 'arveja', 'verdura'],
  lenteja: ['legumbre'],
  poroto: ['legumbre'],
  garbanzo: ['legumbre'],

  mascota: ['veterinaria', 'petshop', 'animales', 'perro', 'gato'],
  perro: ['mascota', 'veterinaria', 'petshop', 'animales'],
  gato: ['mascota', 'veterinaria', 'petshop', 'animales'],

  ropa: ['moda', 'vestuario', 'boutique', 'vestido'],
  moda: ['ropa', 'vestuario', 'boutique', 'vestido'],
  vestido: ['ropa', 'moda', 'boutique'],

  electrodomestico: ['refrigerador', 'lavadora', 'microondas', 'hogar'],

  belleza: ['peluqueria', 'salon', 'estetica', 'spa', 'barberia'],
  auto: ['automotriz', 'mecanica', 'taller', 'repuestos'],
  super: ['supermercado', 'almacen', 'minimarket', 'abarrotes'],
  gym: ['gimnasio', 'deporte', 'fitness'],
  gimnasio: ['gym', 'deporte', 'fitness'],
};

// Explicit accent map avoids relying on a Unicode diacritic regex range,
// since that kind of escape has been silently mangled by file-writing
// tooling in this project before.
const ACCENT_MAP = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };

const normalize = (value) => {
  const lower = String(value || '').toLowerCase().trim();
  let out = '';
  for (const ch of lower) out += ACCENT_MAP[ch] || ch;
  return out;
};

const tokenize = (value) => normalize(value).split(/[^a-z0-9]+/).filter(Boolean);

const NORMALIZED_SYNONYMS = Object.entries(SEARCH_SYNONYMS).reduce((acc, [key, values]) => {
  acc[normalize(key)] = values.map(normalize);
  return acc;
}, {});

// Iterative Levenshtein distance. Store search text is short (a few words),
// so the O(n*m) cost here is negligible.
const editDistance = (a, b) => {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prevRow = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    const currRow = [i];
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(prevRow[j] + 1, currRow[j - 1] + 1, prevRow[j - 1] + cost);
    }
    prevRow = currRow;
  }
  return prevRow[n];
};

const sharedPrefixLength = (a, b) => {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i += 1;
  return i;
};

const wordsAreRelated = (queryWord, hayWord) => {
  if (!queryWord || !hayWord) return false;

  const minLen = Math.min(queryWord.length, hayWord.length);
  // Below this length a word is usually a stopword ("de", "y", "la"...)
  // that happens to be a substring of almost anything — not a real match.
  if (minLen < 3) return false;

  if (hayWord.includes(queryWord) || queryWord.includes(hayWord)) return true;
  if (minLen < 4) return false;

  // Shared root: catches Spanish store-type derivations like
  // zapato/zapatería, helado/heladería, verdura/verdulería, libro/librería,
  // where the words diverge only in their suffix.
  const prefix = sharedPrefixLength(queryWord, hayWord);
  if (prefix >= 4 && prefix >= minLen - 2) return true;

  // Typo tolerance for otherwise-close words.
  const maxDistance = minLen <= 5 ? 1 : 2;
  return editDistance(queryWord, hayWord) <= maxDistance;
};

// How much each field of a store counts towards its relevance score. A hit
// in the name is worth far more than one buried in the description.
const FIELD_WEIGHTS = { name: 100, keywords: 60, category: 40, promos: 35, description: 25 };

// How strongly a field matched: exact phrase > synonym > related word.
const STRENGTH = { phrase: 1, synonym: 0.8, related: 0.6, relatedSynonym: 0.5 };

const prepareQuery = (rawQuery) => {
  const q = normalize(rawQuery);
  if (!q) return null;
  const queryWords = tokenize(rawQuery);
  const synonymWords = new Set();
  for (const w of queryWords) {
    const extra = NORMALIZED_SYNONYMS[w];
    if (extra) for (const term of extra) synonymWords.add(term);
  }
  return { q, queryWords, synonymWords: [...synonymWords] };
};

// Synonyms shorter than 4 letters ("bar", "spa", "gym") must match a whole
// word, otherwise "bar" would match "ba-rrio" in "farmacia de barrio".
const textHasTerm = (text, words, term) => (term.length < 4 ? words.includes(term) : text.includes(term));

const fieldStrength = (rawValue, ctx) => {
  const text = normalize(rawValue);
  if (!text) return 0;
  if (text.includes(ctx.q)) return STRENGTH.phrase;

  const words = tokenize(text);
  for (const term of ctx.synonymWords) {
    if (textHasTerm(text, words, term)) return STRENGTH.synonym;
  }
  for (const qw of ctx.queryWords) {
    for (const hw of words) {
      if (wordsAreRelated(qw, hw)) return STRENGTH.related;
    }
  }
  for (const term of ctx.synonymWords) {
    if (term.length < 4) continue; // short synonyms only count as whole words (handled above)
    for (const hw of words) {
      if (wordsAreRelated(term, hw)) return STRENGTH.relatedSynonym;
    }
  }
  return 0;
};

const scoreWithContext = (store, ctx, promoText) => {
  if (!store) return 0;
  const fields = {
    name: store.name,
    keywords: store.keywords,
    category: store.category,
    promos: promoText,
    description: store.description,
  };
  let best = 0;
  let matchedFields = 0;
  for (const [field, value] of Object.entries(fields)) {
    const strength = fieldStrength(value, ctx);
    if (strength <= 0) continue;
    matchedFields += 1;
    best = Math.max(best, FIELD_WEIGHTS[field] * strength);
  }
  // Small bonus for matching in several fields, so it can break ties but
  // never outrank a stronger single-field match.
  return best > 0 ? best + (matchedFields - 1) * 2 : 0;
};

// Relevance score for one store: 0 means "does not match". An empty query
// matches everything.
export const scoreStoreForQuery = (store, rawQuery, promoText = '') => {
  const ctx = prepareQuery(rawQuery);
  if (!ctx) return 1;
  return scoreWithContext(store, ctx, promoText);
};

export const storeMatchesQuery = (store, rawQuery, promoText = '') => scoreStoreForQuery(store, rawQuery, promoText) > 0;

// Filters and orders stores by relevance to the query. Ties keep the input
// order (the caller sorts by distance first, so nearer stores win ties).
// `promoTextByStore` maps store.id -> searchable text of its active promos.
export const rankStores = (stores, rawQuery, promoTextByStore = {}) => {
  const ctx = prepareQuery(rawQuery);
  if (!ctx) return stores;
  const scored = [];
  stores.forEach((store, index) => {
    const score = scoreWithContext(store, ctx, promoTextByStore[store.id] || '');
    if (score > 0) scored.push({ store, score, index });
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map((entry) => entry.store);
};
