import { fireEvent, render, screen } from '@testing-library/react-native';
import ErrorScreen from '@/app/error/[code]';
import NotFoundScreen from '@/app/+not-found';

/**
 * Both screens are pure translations of a code plus one navigation action, so
 * the tests cover exactly that: the right strings for a known code, the 404
 * fallback for an unknown one, and `replace` rather than `push` (a broken URL
 * must not stay in the history).
 *
 * `expo-router` is mocked at the hook boundary; the real hooks need a navigation
 * container that would tell us nothing about this screen.
 */
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockParams = {};
});

describe('NotFoundScreen', () => {
  it('shows the 404 copy and goes home', async () => {
    await render(<NotFoundScreen />);

    expect(screen.getByText('Page not found')).toBeTruthy();
    expect(
      screen.getByText(
        'The page you are looking for does not exist or has moved.',
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByText('Back to home'));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('ErrorScreen', () => {
  it('renders the requested status', async () => {
    mockParams = { code: '403' };
    await render(<ErrorScreen />);

    expect(screen.getByText('Access denied')).toBeTruthy();
    expect(
      screen.getByText('Your account does not have access to this page.'),
    ).toBeTruthy();
  });

  it('falls back to 404 for a code the app does not define', async () => {
    // `/error/418` is a URL that does not describe a state this app knows.
    mockParams = { code: '418' };
    await render(<ErrorScreen />);

    expect(screen.getByText('Page not found')).toBeTruthy();
  });

  it('falls back to 404 for a non-numeric code', async () => {
    mockParams = { code: 'teapot' };
    await render(<ErrorScreen />);

    expect(screen.getByText('Page not found')).toBeTruthy();
  });

  it('offers a way home', async () => {
    mockParams = { code: '500' };
    await render(<ErrorScreen />);

    fireEvent.press(screen.getByText('Back to home'));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
