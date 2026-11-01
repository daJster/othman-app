import { nextThemeMode, themeOption } from '../theme-options';

describe('theme options', () => {
  it('cycles system → light → dark → system', () => {
    expect(nextThemeMode('system')).toBe('light');
    expect(nextThemeMode('light')).toBe('dark');
    expect(nextThemeMode('dark')).toBe('system');
  });

  it('gives each mode an icon and a label key', () => {
    for (const mode of ['system', 'light', 'dark'] as const) {
      expect(themeOption(mode).icon).toBeTruthy();
      expect(themeOption(mode).labelKey).toMatch(/^theme\./);
    }
  });
});
