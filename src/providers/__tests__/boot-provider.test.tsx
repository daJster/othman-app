import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAppFonts } from '@/providers/font-provider';
import { useAuth } from '@/providers/auth-provider';
import { BootProvider } from '@/providers/boot-provider';
import { useLanguage } from '@/providers/language-provider';
import { useThemeMode } from '@/providers/theme-provider';

/**
 * The gate has three inputs from three providers, so all are stubbed: the theme
 * and language hooks directly, the font hook through its module. The splash
 * screen is the observable side effect, which is what these tests assert.
 */
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(async () => true),
  hideAsync: jest.fn(async () => true),
}));

jest.mock('@/providers/theme-provider', () => ({
  useThemeMode: jest.fn(),
}));

jest.mock('@/providers/language-provider', () => ({
  useLanguage: jest.fn(),
}));

jest.mock('@/providers/font-provider', () => ({
  useAppFonts: jest.fn(),
}));

jest.mock('@/providers/auth-provider', () => ({
  useAuth: jest.fn(),
}));

const splash = SplashScreen as unknown as {
  hideAsync: jest.Mock;
};

const themeMode = useThemeMode as unknown as jest.Mock;
const language = useLanguage as unknown as jest.Mock;
const appFonts = useAppFonts as unknown as jest.Mock;
const auth = useAuth as unknown as jest.Mock;

function setState(
  ready: { theme: boolean; language: boolean; auth?: boolean },
  fonts: readonly [boolean, Error | null],
) {
  themeMode.mockReturnValue({
    mode: 'system',
    isDark: true,
    ready: ready.theme,
  });
  language.mockReturnValue({
    language: 'en',
    direction: 'ltr',
    isRTL: false,
    ready: ready.language,
    setLanguage: jest.fn(),
  });
  auth.mockReturnValue({
    status: ready.auth === false ? 'restoring' : 'signed-out',
  });
  appFonts.mockReturnValue(fonts);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BootProvider', () => {
  it('renders nothing while the theme is still hydrating', async () => {
    setState({ theme: false, language: true }, [true, null]);

    await render(
      <BootProvider>
        <Text>app</Text>
      </BootProvider>,
    );

    expect(screen.queryByText('app')).toBeNull();
    expect(splash.hideAsync).not.toHaveBeenCalled();
  });

  it('renders nothing while the language is still hydrating', async () => {
    setState({ theme: true, language: false }, [true, null]);

    await render(
      <BootProvider>
        <Text>app</Text>
      </BootProvider>,
    );

    expect(screen.queryByText('app')).toBeNull();
    expect(splash.hideAsync).not.toHaveBeenCalled();
  });

  it('renders nothing while fonts are still loading', async () => {
    setState({ theme: true, language: true }, [false, null]);

    await render(
      <BootProvider>
        <Text>app</Text>
      </BootProvider>,
    );

    expect(screen.queryByText('app')).toBeNull();
    expect(splash.hideAsync).not.toHaveBeenCalled();
  });

  it('renders nothing while the auth session is still restoring', async () => {
    setState({ theme: true, language: true, auth: false }, [true, null]);

    await render(
      <BootProvider>
        <Text>app</Text>
      </BootProvider>,
    );

    expect(screen.queryByText('app')).toBeNull();
    expect(splash.hideAsync).not.toHaveBeenCalled();
  });

  it('reveals the app once theme, language and fonts are all ready', async () => {
    setState({ theme: true, language: true }, [true, null]);

    await render(
      <BootProvider>
        <Text>app</Text>
      </BootProvider>,
    );

    expect(screen.getByText('app')).toBeTruthy();
    await waitFor(() => expect(splash.hideAsync).toHaveBeenCalledTimes(1));
  });

  it('reveals the app when fonts fail, instead of holding the splash', async () => {
    // A missing font is a typography problem; a stuck splash is an unusable
    // app. The error path wins.
    setState({ theme: true, language: true }, [
      false,
      new Error('font load failed'),
    ]);

    await render(
      <BootProvider>
        <Text>app</Text>
      </BootProvider>,
    );

    expect(screen.getByText('app')).toBeTruthy();
    await waitFor(() => expect(splash.hideAsync).toHaveBeenCalledTimes(1));
  });

  it('hides the splash exactly once across re-renders', async () => {
    setState({ theme: true, language: true }, [true, null]);

    const view = await render(
      <BootProvider>
        <Text>app</Text>
      </BootProvider>,
    );

    await waitFor(() => expect(splash.hideAsync).toHaveBeenCalledTimes(1));

    view.rerender(
      <BootProvider>
        <Text>app</Text>
      </BootProvider>,
    );

    expect(splash.hideAsync).toHaveBeenCalledTimes(1);
  });
});
