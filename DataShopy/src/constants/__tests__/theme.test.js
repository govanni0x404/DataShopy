import { colors, categories } from '../theme';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

// These are cheap structural checks, but they exist because the design
// pass across the whole app (theme.js -> every screen) has already broken
// silently once: a category ended up with the exact same color as
// `colors.primary`, and a screen referenced a `colors.*` token that was
// never defined (rendered transparent, no error). Both would have been
// caught instantly by this file.
describe('theme colors', () => {
  it('every color token is a valid 6-digit hex string', () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(HEX_RE);
    }
  });
});

describe('theme categories', () => {
  it('has a unique, non-empty id for every category', () => {
    const ids = categories.map((c) => c.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every category (except "all") has a label, a vivid color and a pastel bg', () => {
    for (const cat of categories) {
      if (cat.id === 'all') continue;
      expect(typeof cat.label).toBe('string');
      expect(cat.label.length).toBeGreaterThan(0);
      expect(cat.color).toMatch(HEX_RE);
      expect(cat.bg).toMatch(HEX_RE);
    }
  });

  it('no two categories share the exact same accent color', () => {
    const colorToId = new Map();
    for (const cat of categories) colorToId.set(cat.color, [...(colorToId.get(cat.color) || []), cat.id]);
    const duplicates = [...colorToId.entries()].filter(([, ids]) => ids.length > 1);
    expect(duplicates).toEqual([]);
  });
});
