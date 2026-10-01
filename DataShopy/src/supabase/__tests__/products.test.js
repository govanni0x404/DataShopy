jest.mock('../client', () => ({ supabase: {} }));

import { discountPercent, formatPrice, parsePrice } from '../products';

describe('formatPrice', () => {
  it('groups thousands with dots and hides zero decimals', () => {
    expect(formatPrice(12990)).toBe('$12.990');
    expect(formatPrice(1500000)).toBe('$1.500.000');
    expect(formatPrice(0)).toBe('$0');
  });

  it('keeps non-zero decimals with a comma', () => {
    expect(formatPrice(9.5)).toBe('$9,50');
  });

  it('returns empty for missing values', () => {
    expect(formatPrice(null)).toBe('');
    expect(formatPrice('')).toBe('');
    expect(formatPrice('abc')).toBe('');
  });
});

describe('parsePrice', () => {
  it('understands the ways an owner types a price', () => {
    expect(parsePrice('12990')).toBe(12990);
    expect(parsePrice('12.990')).toBe(12990);
    expect(parsePrice('$ 1.500.000')).toBe(1500000);
    expect(parsePrice('12990,50')).toBe(12990.5);
    expect(parsePrice('9.5')).toBe(9.5);
  });

  it('rejects empty, negative or invalid input', () => {
    expect(parsePrice('')).toBeNull();
    expect(parsePrice('-5')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
  });
});

describe('discountPercent', () => {
  it('returns the rounded discount only when the old price is higher', () => {
    expect(discountPercent(7990, 9990)).toBe(20);
    expect(discountPercent(9990, 9990)).toBeNull();
    expect(discountPercent(9990, null)).toBeNull();
  });
});
