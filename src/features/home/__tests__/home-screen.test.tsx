import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import HomeScreen from '@/app/(tabs)/index';
import type { CircleItem } from '@/services/circle';
import { HOME_LINKS } from '@/features/home/feature-links';

const mockPush = jest.fn();
const mockNow = new Date('2026-11-08T09:00:00');

/**
 * `Link` needs a mounted Expo Router container, and `Head` needs a navigation
 * object for `useIsFocused`. Neither is what this test is about: the screen's
 * job is to choose the content and the destinations. The mock turns each link
 * into a testable node keyed by its `href`, which is exactly the contract the
 * screen is responsible for.
 */
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Link: ({ href, children }: { href: string; children: ReactNode }) =>
      React.createElement(View, { testID: `link:${href}` }, children),
    useRouter: () => ({ push: mockPush }),
  };
});

jest.mock('expo-router/head', () => () => null);

jest.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}));

/**
 * The film resolves to opaque asset ids. Jest's asset transformer has no
 * `.mp4` rule, so the real `require` yields an unusable stub and the player
 * crashes on `.uri` — the screen is not what proves the media wiring (that is
 * `hero-film.test.tsx`), only that the hero renders around it.
 */
jest.mock('@/features/home/hero-media', () => ({
  getHeroFilm: () => ({
    video: { testUri: 'hero-wide.mp4' },
    poster: { testUri: 'poster-wide.jpeg' },
  }),
}));

/**
 * `@expo/ui`'s sheet is a SwiftUI/Compose surface. The home screen only needs
 * to prove the bell opens the inbox; the sheet's own presentation is native
 * behaviour, not something a JS test can observe.
 */
jest.mock('@expo/ui', () => {
  const React = require('react');

  return {
    BottomSheet: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    RNHostView: ({ children }: { children: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

/**
 * A fixed week, injected rather than queried: the point of the screen test is
 * the composition, and the projection rules have their own pure tests. `now`
 * is pinned so "Today" and "In 5 days" are deterministic in every timezone.
 *
 * `mockCircleMode` lets a test see the rail's other two states without a second
 * harness: `pending` before the first answer, `error` when the read failed.
 */
const ITEMS: readonly CircleItem[] = [
  {
    id: 'halqa-3',
    kind: 'halqa',
    date: '2026-11-08',
    time: '18:00',
    title: { ar: 'حلقة الجزء الثالث', en: 'Juz 3 session' },
    body: { ar: 'تسميع', en: 'Recitation' },
    meta: { ar: 'الشيخ عبد الرحمن', en: 'Shaykh Abdulrahman' },
    topic: null,
    href: '/meetings',
  },
  {
    id: 'exam-3',
    kind: 'exam',
    date: '2026-11-13',
    time: '17:00',
    title: { ar: 'اختبار الجزء الثالث', en: 'Juz 3 exam' },
    body: { ar: 'الجزء الثالث', en: 'All of Juz 3' },
    meta: { ar: '٢٠ دقيقة', en: '20 min' },
    topic: null,
    href: null,
  },
  {
    id: 'notice-shaykh',
    kind: 'notice',
    date: '2026-11-07',
    time: null,
    title: { ar: 'موعد الحلقة تغيّر', en: 'Session time changed' },
    body: { ar: 'تبدأ ١٨:٣٠', en: 'Starts at 18:30' },
    meta: { ar: 'الشيخ', en: 'Shaykh' },
    topic: 'shaykh',
    href: null,
  },
];

const mockRetry = jest.fn();
let mockCircleMode: 'ready' | 'pending' | 'error' = 'ready';

jest.mock('@/features/home/use-circle', () => ({
  useCircle: () => ({
    state:
      mockCircleMode === 'pending'
        ? { status: 'pending' as const }
        : mockCircleMode === 'error'
          ? {
              status: 'error' as const,
              error: new Error('offline'),
              retry: mockRetry,
            }
          : { status: 'ready' as const, data: ITEMS },
    items: mockCircleMode === 'ready' ? ITEMS : [],
    nextUp: mockCircleMode === 'ready' ? ITEMS[0] : null,
    nextHalqa: mockCircleMode === 'ready' ? ITEMS[0] : null,
    nextExam: mockCircleMode === 'ready' ? ITEMS[1] : null,
    newestNotice: mockCircleMode === 'ready' ? ITEMS[2] : null,
    now: mockNow,
  }),
}));

jest.mock('@/features/home/notices-read', () => ({
  useReadNotices: () => ({ read: new Set<string>(), markRead: jest.fn() }),
}));

describe('HomeScreen', () => {
  it('opens with the app identity', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Othman')).toBeTruthy();
    expect(screen.getByText('Contemplate the Book of Allah')).toBeTruthy();
  });

  it('opens the sign-in page from Home while signed out', async () => {
    await render(<HomeScreen />);

    await fireEvent.press(screen.getByTestId('home-sign-in'));

    expect(mockPush).toHaveBeenCalledWith('/auth/sign-in');
  });

  it('shows the basmalah in the hero', async () => {
    await render(<HomeScreen />);

    expect(
      screen.getByText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'),
    ).toBeTruthy();
  });

  it('shows the featured verse with its reference', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Verse of the Day')).toBeTruthy();
    expect(
      screen.getByText(
        'Indeed, this Quran guides to that which is most upright',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Al-Isra 9')).toBeTruthy();
  });

  it('carries the circle week: session, exam and news', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Next session')).toBeTruthy();
    expect(screen.getByText('Juz 3 session')).toBeTruthy();

    expect(screen.getByText('Next exam')).toBeTruthy();
    expect(screen.getByText('Juz 3 exam')).toBeTruthy();
    expect(screen.getByText(/In 5 days/)).toBeTruthy();

    expect(screen.getByText('Shaykh')).toBeTruthy();
    // The rail carries the newest notice and the inbox repeats it, so the copy
    // appears twice by design.
    expect(
      screen.getAllByText('Session time changed').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('expands the exam in place instead of leaving Home', async () => {
    await render(<HomeScreen />);

    expect(screen.queryByText('All of Juz 3')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Next exam: Juz 3 exam'));

    expect(screen.getByText('All of Juz 3')).toBeTruthy();
  });

  it('links to every destination in the registry list', async () => {
    await render(<HomeScreen />);

    // Four strip destinations, the hero CTA, and the rail's next-session row.
    expect(screen.getAllByTestId(/^link:/)).toHaveLength(HOME_LINKS.length + 2);

    for (const route of HOME_LINKS) {
      expect(
        screen.getAllByTestId(`link:${route.href}`).length,
      ).toBeGreaterThan(0);
    }
  });

  it('labels each destination with the same name as its tab', async () => {
    await render(<HomeScreen />);

    // The descriptions moved off Home with the old list; the strip carries the
    // name only, and the tab it points at carries the rest.
    expect(screen.queryByText('Read the mushaf page by page')).toBeNull();
    expect(screen.getByText('Quran')).toBeTruthy();
    expect(screen.getByText('Meetings')).toBeTruthy();
    expect(screen.getByText('Account')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });

  it('offers the inbox from the hero panel', async () => {
    await render(<HomeScreen />);

    expect(screen.getByTestId('notices-bell-panel')).toBeTruthy();
  });

  it('holds the rail open while its first answer is pending', async () => {
    mockCircleMode = 'pending';
    await render(<HomeScreen />);

    expect(screen.getByLabelText('Loading your circle…')).toBeTruthy();
    expect(screen.queryByText('Juz 3 session')).toBeNull();

    mockCircleMode = 'ready';
  });

  it('offers a retry when the circle read fails', async () => {
    mockCircleMode = 'error';
    await render(<HomeScreen />);

    expect(screen.getByText("Couldn't load your circle.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));

    expect(mockRetry).toHaveBeenCalled();
    mockCircleMode = 'ready';
  });

  it('no longer opens on the halqa ring', async () => {
    await render(<HomeScreen />);

    // The ring diagrammed a community the reader cannot see and cost half the
    // phone viewport; the film and the panel replaced it. Nothing should
    // reintroduce the label or the diagram.
    expect(screen.queryByText('HALQA')).toBeNull();
    expect(screen.queryByText('حلقة')).toBeNull();
  });

  it('does not advertise features the app does not ship', async () => {
    await render(<HomeScreen />);

    // The legacy page sold tafsir, search and bookmarks. None of them exists
    // yet, so they must not return as placeholders.
    expect(screen.queryByText('Tafsir')).toBeNull();
    expect(screen.queryByText('Search')).toBeNull();
    expect(screen.queryByText('Bookmarks')).toBeNull();
  });
});
