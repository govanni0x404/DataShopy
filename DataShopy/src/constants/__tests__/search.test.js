import { rankStores, scoreStoreForQuery, storeMatchesQuery } from '../search';

// Real catalog snapshot (Linares demo data) — used to guard against
// regressions like the ones we actually hit while building this:
//   - "zapato" not finding "Zapatería" (word-form derivation)
//   - "cerveza"/"perro"/"gato" not finding related stores (no shared root)
//   - a store's `keywords` field not being searched at all
const bikeShop = {
  name: 'Bicicletas del Maule',
  category: 'Local',
  description: 'Venta y reparación de bicicletas urbanas y mountain bike.',
  keywords: 'bicicleta, bici, rueda, llanta, neumático, cámara, manubrio, sillín, pedal, cadena, freno, casco',
};
const shoeStore = { name: 'Zapatería El Paso', category: 'Local', description: 'Calzado urbano y escolar para toda la familia.' };
const bookStore = { name: 'Librería Maule', category: 'Local', description: 'Librería y artículos escolares en el centro de Linares.' };
const pharmacy = { name: 'Farmacia LinaSalud', category: 'Local', description: 'Farmacia de barrio con atención personalizada.' };
const petStore = { name: 'Mascotas Linares', category: 'Local', description: 'Alimentos y accesorios para mascotas.' };
const liquorStore = { name: 'Botillería El Encuentro', category: 'Local', description: 'Bebidas, snacks y productos de conveniencia.' };
const boutique = { name: 'Boutique Aurora', category: 'Local', description: 'Tienda de ropa y accesorios femeninos.' };
const cornStore = { name: 'Choclos Baratos', category: 'Comida y verdura', description: 'Los mejores choclos baratos del mercado' };
const legumeStore = { name: 'Juanito Alcachofas', category: 'Legumbres', description: 'Local de todo tipo de legumbres' };

describe('storeMatchesQuery', () => {
  it('returns true for every store when the query is empty/whitespace', () => {
    expect(storeMatchesQuery(bikeShop, '')).toBe(true);
    expect(storeMatchesQuery(bikeShop, '   ')).toBe(true);
  });

  it('matches an exact phrase anywhere in name/category/description', () => {
    expect(storeMatchesQuery(bikeShop, 'bicicletas')).toBe(true);
    expect(storeMatchesQuery(pharmacy, 'farmacia')).toBe(true);
  });

  it('is accent- and case-insensitive', () => {
    expect(storeMatchesQuery(bookStore, 'LIBRERIA')).toBe(true);
    expect(storeMatchesQuery(pharmacy, 'FaRmAcIa')).toBe(true);
    expect(storeMatchesQuery({ name: 'Café Central', category: 'Local' }, 'cafe')).toBe(true);
  });

  it('searches the keywords field, not just name/category/description', () => {
    expect(storeMatchesQuery(bikeShop, 'rueda')).toBe(true);
    expect(storeMatchesQuery(bikeShop, 'manubrio')).toBe(true);
    expect(storeMatchesQuery(bikeShop, 'sillín')).toBe(true);
    expect(storeMatchesQuery(bikeShop, 'casco')).toBe(true);
  });

  it('matches Spanish noun -> store-type derivations via shared root', () => {
    // "zapato" (shoe) vs "Zapatería" (shoe store) — different suffix, same root.
    expect(storeMatchesQuery(shoeStore, 'zapato')).toBe(true);
    // "libro" (book) vs "Librería" (bookstore).
    expect(storeMatchesQuery(bookStore, 'libro')).toBe(true);
  });

  it('tolerates small typos via fuzzy matching', () => {
    expect(storeMatchesQuery(bikeShop, 'manurio')).toBe(true); // missing a letter from "manubrio"
  });

  it('resolves synonyms that share no common root', () => {
    expect(storeMatchesQuery(pharmacy, 'hospital')).toBe(true);
    expect(storeMatchesQuery(liquorStore, 'cerveza')).toBe(true);
    expect(storeMatchesQuery(liquorStore, 'vino')).toBe(true);
    expect(storeMatchesQuery(petStore, 'perro')).toBe(true);
    expect(storeMatchesQuery(petStore, 'gato')).toBe(true);
    expect(storeMatchesQuery(boutique, 'moda')).toBe(true);
    expect(storeMatchesQuery(boutique, 'vestido')).toBe(true);
    expect(storeMatchesQuery(cornStore, 'maiz')).toBe(true);
    expect(storeMatchesQuery(legumeStore, 'lenteja')).toBe(true);
    expect(storeMatchesQuery(legumeStore, 'poroto')).toBe(true);
  });

  it('does not produce false positives for unrelated stores', () => {
    expect(storeMatchesQuery(petStore, 'zapato')).toBe(false);
    expect(storeMatchesQuery(bikeShop, 'farmacia')).toBe(false);
    expect(storeMatchesQuery(boutique, 'hospital')).toBe(false);
    expect(storeMatchesQuery(pharmacy, 'bicicleta')).toBe(false);
  });

  it('handles a null/missing store gracefully', () => {
    expect(storeMatchesQuery(null, 'algo')).toBe(false);
    expect(storeMatchesQuery({}, 'algo')).toBe(false);
    expect(storeMatchesQuery({}, '')).toBe(true);
  });

  it('does not crash on stores with missing keywords/description', () => {
    expect(() => storeMatchesQuery({ name: 'Solo Nombre' }, 'nombre')).not.toThrow();
    expect(storeMatchesQuery({ name: 'Solo Nombre' }, 'nombre')).toBe(true);
  });
});

describe('short synonyms must match whole words', () => {
  it('"bebida" (synonym: bar) does not match "Farmacia de barrio"', () => {
    // Regression: the synonym "bar" used to match as a raw substring of "barrio".
    expect(storeMatchesQuery(pharmacy, 'bebida')).toBe(false);
  });

  it('still matches a real bar', () => {
    expect(storeMatchesQuery({ name: 'Bar El Puerto', category: 'Local' }, 'bebida')).toBe(true);
  });
});

describe('promo text is searchable', () => {
  it('matches a store by the text of its active promotions', () => {
    expect(storeMatchesQuery(bikeShop, '3x1', '3x1 en cascos')).toBe(true);
    expect(storeMatchesQuery(bikeShop, '3x1')).toBe(false);
  });
});

describe('scoreStoreForQuery', () => {
  it('returns 0 when nothing matches and a positive score when it does', () => {
    expect(scoreStoreForQuery(bikeShop, 'farmacia')).toBe(0);
    expect(scoreStoreForQuery(bikeShop, 'bicicleta')).toBeGreaterThan(0);
  });

  it('scores a name hit above a keyword hit above a description hit', () => {
    const byName = { name: 'Casco Total', category: 'Local' };
    const byKeyword = { name: 'Tienda A', category: 'Local', keywords: 'casco, rueda' };
    const byDescription = { name: 'Tienda B', category: 'Local', description: 'Vendemos cascos y más' };
    const scores = [byName, byKeyword, byDescription].map((s) => scoreStoreForQuery(s, 'casco'));
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
  });

  it('scores an exact phrase above a fuzzy/typo match in the same field', () => {
    const exact = { name: 'Manubrio Center' };
    const typo = { name: 'Manubrios Rápidos' };
    expect(scoreStoreForQuery(exact, 'manubrio')).toBeGreaterThanOrEqual(scoreStoreForQuery(typo, 'manubrio'));
    expect(scoreStoreForQuery({ name: 'Manubrio Center' }, 'manurio')).toBeLessThan(scoreStoreForQuery(exact, 'manubrio'));
  });
});

describe('rankStores', () => {
  const far = { id: 1, name: 'Ciclos Lejanos', keywords: 'rueda' };
  const near = { id: 2, name: 'Ciclos Cercanos', keywords: 'rueda' };
  const nameHit = { id: 3, name: 'Rueda Feliz', keywords: '' };
  const unrelated = { id: 4, name: 'Panadería', keywords: 'pan' };

  it('returns the same list untouched for an empty query', () => {
    const list = [far, near];
    expect(rankStores(list, '')).toBe(list);
  });

  it('drops non-matching stores and puts the strongest match first', () => {
    const result = rankStores([far, unrelated, nameHit], 'rueda');
    expect(result.map((s) => s.id)).toEqual([3, 1]);
  });

  it('keeps the incoming order (distance) for equally scored stores', () => {
    expect(rankStores([near, far], 'rueda').map((s) => s.id)).toEqual([2, 1]);
    expect(rankStores([far, near], 'rueda').map((s) => s.id)).toEqual([1, 2]);
  });

  it('uses promo text by store id', () => {
    const result = rankStores([unrelated, far], '2x1', { 4: '2x1 en pan amasado' });
    expect(result.map((s) => s.id)).toEqual([4]);
  });
});
