import { THEME_OPTIONS } from '../theme-options';

describe('theme options', () => {
  it('offers system, light and dark in that order', () => {
    expect(THEME_OPTIONS.map((option) => option.mode)).toEqual([
      'system',
      'light',
      'dark',
    ]);
  });

  it('gives every mode a full and a compact label key', () => {
    for (const option of THEME_OPTIONS) {
      expect(option.labelKey).toMatch(/^theme\./);
      expect(option.shortKey).toMatch(/^theme\./);
    }
  });
});
