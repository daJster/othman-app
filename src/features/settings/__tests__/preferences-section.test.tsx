import { render, screen } from '@testing-library/react-native';
import { PreferencesSection } from '../preferences-section';

/**
 * The controls use the providers for state, so this suite mocks the two hooks
 * rather than hydrating storage and Uniwind. The dropdown menu itself is the
 * platform's; here we assert the rows and the current values.
 */
jest.mock('@/providers/theme-provider', () => ({
  useThemeMode: () => ({
    mode: 'system',
    isDark: false,
    ready: true,
    setMode: jest.fn(),
  }),
}));

jest.mock('@/providers/language-provider', () => ({
  useLanguage: () => ({
    language: 'en',
    direction: 'ltr',
    isRTL: false,
    ready: true,
    setLanguage: jest.fn(async () => ({ restartRequired: false })),
  }),
}));

describe('PreferencesSection', () => {
  it('shows the theme and language rows with their current values', async () => {
    await render(<PreferencesSection />);

    expect(screen.getByTestId('preferences-section')).toBeTruthy();
    expect(screen.getByText('Theme')).toBeTruthy();
    expect(screen.getByText('System')).toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
  });
});
