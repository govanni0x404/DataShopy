import { buildStoreAppUrl, buildStoreShareUrl, parseStoreLink } from '../deepLinks';

describe('deep links', () => {
  test('parses the app scheme and the shared web link', () => {
    expect(parseStoreLink('datashopy://store/12')).toBe(12);
    expect(parseStoreLink('DataShopy://store/7/')).toBe(7);
    expect(parseStoreLink('https://govanni0x404.github.io/DataShopy/store.html?id=45')).toBe(45);
    expect(parseStoreLink('https://example.com/x/store.html?utm=a&id=3&z=1')).toBe(3);
  });

  test('rejects anything else', () => {
    ['', null, undefined, 'datashopy://store/abc', 'datashopy://store/0', 'datashopy://other/5', 'https://x.com/other?id=5', 'javascript:alert(1)'].forEach(
      (bad) => expect(parseStoreLink(bad)).toBeNull()
    );
  });

  test('builds round-trippable links; local-only stores get no link', () => {
    expect(parseStoreLink(buildStoreAppUrl(99))).toBe(99);
    expect(parseStoreLink(buildStoreShareUrl(99))).toBe(99);
    expect(buildStoreShareUrl(null)).toBeNull();
    expect(buildStoreShareUrl('abc')).toBeNull();
  });
});
