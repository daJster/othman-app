import { screen, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import HomeScreen from '@/app/(tabs)/index';
import type { CircleItem } from '@/services/circle';
import { render } from '@/test-utils/render';

const mockNow = new Date('2026-11-08T09:00:00');

/**
 * `Link` needs a mounted Expo Router container, and `Head` needs a navigation
 * object for `useIsFocused`. Neither is what this test is about: the screen's
 * job is to choose the content. The mock turns each link into a testable node
 * keyed by its `href`, which is exactly the contract the screen is responsible
 * for.
 */
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Link: ({ href, children }: { href: string; children: ReactNode }) =>
      React.createElement(View, { testID: `link:${href}` }, children),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  };
});

jest.mock('expo-router/head', () => () => null);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

/**
 * The bell asks for page one of the inbox so its dot is honest; the screen test
 * has no query client, so it gets an empty first page — the screen's own
 * composition is what this file is about.
 */
jest.mock('@/api', () => {
  const emptyHistory: unknown[] = [];
  const emptyResponse = {
    notices: [],
    page: 1,
    hasMore: false,
    total: 0,
    day: '2026-11-20',
    salah: 0,
    duaa: 0,
    nafila: 0,
    pages: 0,
  };

  return {
    api: {
      notices: { page: { key: () => ['othman', 'notices', 'page', 1] } },
      practice: {
        byDay: { key: () => ['othman', 'practice', 'day'] },
        history: { key: () => ['othman', 'practice', 'history'] },
      },
    },
    useApiQuery: (endpoint: { key: () => readonly unknown[] }) => ({
      // Keep query data referentially stable: NoticesPanel accumulates pages
      // when a response changes, just as TanStack Query does in the app.
      data: endpoint.key().includes('history') ? emptyHistory : emptyResponse,
      isPending: false,
      isFetching: false,
    }),
    useApiMutation: () => ({ mutate: jest.fn(), isPending: false }),
  };
});

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

/**
 * A fixed week, injected rather than queried: the point of the screen test is
 * the composition, and the projection rules have their own pure tests. `now`
 * is pinned so "Today" and "In 5 days" are deterministic in every timezone.
 *
 * Only the ready shape is needed now — the rail's pending and error states left
 * Home with the circle section.
 */
jest.mock('@/features/home/use-circle', () => ({
  useCircle: () => ({
    state: { status: 'ready' as const, data: ITEMS },
    items: ITEMS,
    nextUp: ITEMS[0],
    nextHalqa: ITEMS[0],
    nextExam: ITEMS[1],
    newestNotice: ITEMS[2],
    now: mockNow,
  }),
}));

jest.mock('@/features/home/notices-read', () => ({
  useReadNotices: () => ({ read: new Set<string>(), markRead: jest.fn() }),
}));

describe('HomeScreen', () => {
  it('opens with the app identity', async () => {
    await render(<HomeScreen />);

    // The h1 is the app name; the card itself is the day's verse, so the
    // old tagline no longer appears anywhere on the page.
    expect(screen.getByText('Othman')).toBeTruthy();
    expect(screen.queryByText('Contemplate the Book of Allah')).toBeNull();
  });

  it('keeps the continue control in the hero card', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Continue reading')).toBeTruthy();
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

  it('offers the inbox from a sticky control on a phone, not the hero card', async () => {
    await render(<HomeScreen />);

    // Phones have no bar: the bell is pinned over the film instead.
    expect(screen.getByTestId('home-notices-sticky')).toBeTruthy();
    expect(
      within(screen.getByTestId('hero-card')).queryByTestId(
        'notices-bell-panel',
      ),
    ).toBeNull();
  });

  it('carries the reading sections that left the Quran tab', async () => {
    await render(<HomeScreen />);

    // Resume reading and recent activity live here now; the Quran tab keeps
    // only the book's own surfaces.
    expect(screen.getByTestId('home-section-resume')).toBeTruthy();
    expect(screen.getByTestId('home-section-activity')).toBeTruthy();
    expect(screen.getByTestId('quran-resume-band')).toBeTruthy();
    expect(screen.getByTestId('quran-activity-band')).toBeTruthy();
  });

  /**
   * The circle section and the destination strip were removed on request: for
   * now the page is the hero and the verse. This test is the guard against
   * either drifting back in without a decision.
   */
  it('carries only the hero and the verse below the fold', async () => {
    await render(<HomeScreen />);

    expect(screen.queryByTestId('home-sign-in')).toBeNull();
    expect(screen.queryByTestId('home-link-quran')).toBeNull();
    expect(screen.queryByText('Your circle')).toBeNull();
    expect(
      screen.queryByText('Match with your shaykh and classmates'),
    ).toBeNull();
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
