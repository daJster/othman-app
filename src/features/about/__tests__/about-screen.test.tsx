import { fireEvent, render, screen } from '@testing-library/react-native';
import { WEBSITE_URL } from '@/core/config';
import AboutScreen from '@/app/about';

/**
 * The screen is mostly content, so these tests pin the contract that is easy to
 * break: every row navigates to a destination that exists, the one external link
 * goes through the https guard, and the identity block carries the real version
 * rather than a hard-coded string.
 */
const mockNavigate = jest.fn();
const mockBack = jest.fn();
const mockOpenHttpsLink = jest.fn();
// Stable, like the real `useRouter()`.
const mockRouter = { navigate: mockNavigate, back: mockBack };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('expo-router/head', () => () => null);

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.3.4' } },
}));

jest.mock('@/platform/browser', () => ({
  openHttpsLink: (url: string) => mockOpenHttpsLink(url),
}));

beforeEach(() => {
  mockNavigate.mockReset();
  mockBack.mockReset();
  mockOpenHttpsLink.mockReset();
});

describe('AboutScreen', () => {
  it('introduces the app with its version', async () => {
    await render(<AboutScreen />);

    expect(screen.getByText('Othman')).toBeTruthy();
    expect(screen.getByText('Contemplate the Book of Allah')).toBeTruthy();
    expect(screen.getByText(/dedicated to learning the Quran/)).toBeTruthy();
    expect(screen.getByTestId('about-version')).toHaveTextContent(
      'Version 2.3.4',
    );
  });

  it('offers every tab that exists', async () => {
    await render(<AboutScreen />);

    for (const href of ['/', '/quran', '/meetings', '/account']) {
      expect(screen.getByTestId(`about-link:${href}`)).toBeTruthy();
    }
  });

  it('navigates to a tab instead of stacking a second copy of it', async () => {
    await render(<AboutScreen />);

    await fireEvent.press(screen.getByTestId('about-link:/quran'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/quran');
  });

  it('opens the website through the https guard', async () => {
    await render(<AboutScreen />);

    await fireEvent.press(screen.getByTestId('about-website'));

    expect(mockOpenHttpsLink).toHaveBeenCalledTimes(1);
    expect(mockOpenHttpsLink).toHaveBeenCalledWith(WEBSITE_URL);
  });

  it('closes with the back control', async () => {
    await render(<AboutScreen />);

    await fireEvent.press(screen.getByTestId('about-back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('prints the copyright with the current year', async () => {
    await render(<AboutScreen />);

    const year = new Date().getFullYear();
    expect(screen.getByTestId('about-copyright')).toHaveTextContent(
      `© ${year} Othman. All rights reserved.`,
    );
  });
});
