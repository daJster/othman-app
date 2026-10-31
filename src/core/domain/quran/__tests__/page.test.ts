import {
  clampPageToEdition,
  formatPageNumber,
  isPageInEdition,
  quranPageImageUrl,
} from '@/core/domain/quran/page';

const EDITION = { firstPage: 4, lastPage: 605 };

describe('formatPageNumber', () => {
  it('pads to the three digits used by the CDN file names', () => {
    expect(formatPageNumber(1)).toBe('001');
    expect(formatPageNumber(42)).toBe('042');
    expect(formatPageNumber(604)).toBe('604');
  });
});

describe('isPageInEdition', () => {
  it('accepts pages inside the edition range', () => {
    expect(isPageInEdition(EDITION, 4)).toBe(true);
    expect(isPageInEdition(EDITION, 300)).toBe(true);
    expect(isPageInEdition(EDITION, 605)).toBe(true);
  });

  it('rejects pages outside the range or not whole', () => {
    expect(isPageInEdition(EDITION, 3)).toBe(false);
    expect(isPageInEdition(EDITION, 606)).toBe(false);
    expect(isPageInEdition(EDITION, 4.5)).toBe(false);
    expect(isPageInEdition(EDITION, Number.NaN)).toBe(false);
  });
});

describe('clampPageToEdition', () => {
  it('keeps a valid page untouched', () => {
    expect(clampPageToEdition(EDITION, 120)).toBe(120);
  });

  it('clamps to the edition instead of the standard mushaf', () => {
    expect(clampPageToEdition(EDITION, 1)).toBe(4);
    expect(clampPageToEdition(EDITION, 900)).toBe(605);
  });

  it('turns a non-finite page into the first page', () => {
    expect(clampPageToEdition(EDITION, Number.NaN)).toBe(4);
    expect(clampPageToEdition(EDITION, Number.POSITIVE_INFINITY)).toBe(4);
  });
});

describe('quranPageImageUrl', () => {
  it('builds the page scan url', () => {
    expect(quranPageImageUrl({ baseUrl: 'https://cdn.test/Tajweed' }, 7)).toBe(
      'https://cdn.test/Tajweed/pages/007.png',
    );
  });

  it('does not double a trailing slash in the base url', () => {
    expect(
      quranPageImageUrl({ baseUrl: 'https://cdn.test/Tajweed/' }, 604),
    ).toBe('https://cdn.test/Tajweed/pages/604.png');
  });
});
