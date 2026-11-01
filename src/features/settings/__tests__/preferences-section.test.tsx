import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { PreferencesSection } from '../preferences-section';

/**
 * The controls use the providers for state, so this suite mocks the two hooks
 * rather than hydrating storage and Uniwind. The point here is the control
 * wiring: the right label, the right option, the right setter.
 */
const mockSetMode = jest.fn();
const mockSetLanguage = jest.fn(async () => ({ restartRequired: false }));

jest.mock('@/providers/theme-provider', () => ({
  useThemeMode: () => ({
    mode: 'system',
    isDark: false,
    ready: true,
    setMode: mockSetMode,
  }),
}));

jest.mock('@/providers/language-provider', () => ({
  useLanguage: () => ({
    language: 'en',
    direction: 'ltr',
    isRTL: false,
    ready: true,
    setLanguage: mockSetLanguage,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PreferencesSection', () => {
  it('shows the theme and language groups', async () => {
    await render(<PreferencesSection />);

    expect(screen.getByText('Theme')).toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('System')).toBeTruthy();
    expect(screen.getByText('Light')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
    expect(screen.getByText('العربية')).toBeTruthy();
    expect(screen.getByText('English')).toBeTruthy();
  });

  it('marks the current theme and language as selected', async () => {
    await render(<PreferencesSection />);

    expect(
      screen.getByRole('radio', { name: 'System' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByRole('radio', { name: 'English' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('changes the theme', async () => {
    await render(<PreferencesSection />);

    fireEvent.press(screen.getByText('Dark'));

    expect(mockSetMode).toHaveBeenCalledWith('dark');
  });

  it('changes the language', async () => {
    await render(<PreferencesSection />);

    fireEvent.press(screen.getByText('العربية'));

    await waitFor(() => expect(mockSetLanguage).toHaveBeenCalledWith('ar'));
  });
});
