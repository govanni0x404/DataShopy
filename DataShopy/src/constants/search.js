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
  if (hayWord.includes(queryWord) || queryWord.includes(hayWord)) return true;

  const minLen = Math.min(queryWord.length, hayWord.length);
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

export const storeMatchesQuery = (store, rawQuery) => {
  const q = normalize(rawQuery);
  if (!q) return true;

  const haystackText = normalize(`${store?.name || ''} ${store?.category || ''} ${store?.description || ''}`);
  if (haystackText.includes(q)) return true;

  const queryWords = tokenize(rawQuery);
  const synonymWords = new Set();
  for (const w of queryWords) {
    const extra = NORMALIZED_SYNONYMS[w];
    if (extra) for (const term of extra) synonymWords.add(term);
  }
  for (const term of synonymWords) {
    if (haystackText.includes(term)) return true;
  }

  const haystackWords = tokenize(haystackText);
  for (const qw of queryWords) {
    for (const hw of haystackWords) {
      if (wordsAreRelated(qw, hw)) return true;
    }
  }
  for (const term of synonymWords) {
    for (const hw of haystackWords) {
      if (wordsAreRelated(term, hw)) return true;
    }
  }
  return false;
};
