import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Meeting } from '@/core/types';
import { MeetingCard } from '@/features/meetings/meeting-card';

/**
 * The card's admin controls read the real session role, which reaches Firebase
 * through the auth provider. The card's subject is the meeting row, not the
 * session, so the role is pinned to "signed out" here.
 */
jest.mock('@/features/auth/use-session-role', () => ({
  useSessionRole: () => ({
    state: 'signed-out',
    uid: null,
    role: null,
    signedIn: false,
    canWrite: false,
    isAdmin: false,
    isSuperadmin: false,
  }),
}));

// The admin actions call mutations; the card has no QueryClient in this test.
jest.mock('@/api/hooks', () => ({
  useApiMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useApiQuery: jest.fn(),
}));

/**
 * Reanimated is covered by the manual mock in `__mocks__/` (the real library
 * cannot load under Jest). Its animation props are therefore inert here, and
 * these tests assert what the card *shows* rather than how it moves.
 *
 * `fireEvent` is asynchronous in RNTL 14, so every press is awaited.
 */
const mockOpenMeetLink = jest.fn();
jest.mock('@/features/meetings/open-meet-link', () => ({
  openMeetLink: (url: string) => mockOpenMeetLink(url),
}));

/*
 * The write actions need a QueryClient and a session. The card's own contract
 * is what these tests describe — status, clock, details, Join — so the server
 * surface is replaced with nothing rather than mounting an app shell here.
 * `meeting-actions.test.tsx` covers the actions themselves.
 */
jest.mock('@/features/meetings/meeting-actions', () => ({
  MeetingCardActions: () => null,
}));

const MEETING: Meeting = {
  id: 1,
  title: 'Tafsir circle',
  description: 'Weekly tafsir of Surah Al-Kahf.',
  date: '2026-04-02',
  time: '18:00',
  durationMinutes: 60,
  meetLink: 'https://meet.example.test/abc',
  status: 'upcoming',
  attendees: [{ name: 'Sara K.' }, { name: 'Omar A.' }],
  organizer: 'Shaykh Ahmad',
  location: 'Online',
};

beforeEach(() => {
  mockOpenMeetLink.mockClear();
});

describe('MeetingCard', () => {
  it('shows the status, title and meta at a glance', async () => {
    await render(<MeetingCard meeting={MEETING} />);

    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Tafsir circle')).toBeTruthy();
    // The clock is formatted per language; the fixture stores 24-hour time.
    expect(screen.getByText('6:00 PM')).toBeTruthy();
    expect(screen.getByText('60 min')).toBeTruthy();
    expect(screen.getByText('Online')).toBeTruthy();
    expect(screen.getByText('2 attendees')).toBeTruthy();
    expect(screen.getByText('Join')).toBeTruthy();
  });

  it('keeps the description collapsed until Details is pressed', async () => {
    await render(<MeetingCard meeting={MEETING} />);

    expect(screen.queryByText(MEETING.description)).toBeNull();
    expect(screen.queryByText('Organized by Shaykh Ahmad')).toBeNull();

    await fireEvent.press(screen.getByText('Details'));

    expect(screen.getByText(MEETING.description)).toBeTruthy();
    expect(screen.getByText('Organized by Shaykh Ahmad')).toBeTruthy();
    expect(screen.getByText('Sara K. · Omar A.')).toBeTruthy();
    expect(screen.getByText('Less')).toBeTruthy();

    await fireEvent.press(screen.getByText('Less'));
    expect(screen.queryByText(MEETING.description)).toBeNull();
  });

  it('opens the meet link through the in-app browser helper', async () => {
    await render(<MeetingCard meeting={MEETING} />);

    await fireEvent.press(screen.getByText('Join'));

    expect(mockOpenMeetLink).toHaveBeenCalledWith(MEETING.meetLink);
  });

  it('collapses attendees beyond the visible stack into a counter', async () => {
    const crowded: Meeting = {
      ...MEETING,
      attendees: Array.from({ length: 6 }, (_, index) => ({
        name: `Attendee ${index + 1}`,
      })),
    };

    await render(<MeetingCard meeting={crowded} />);

    expect(screen.getByText('+2')).toBeTruthy();
    expect(screen.getByText('6 attendees')).toBeTruthy();
  });

  it('does not offer Join on a session that has ended', async () => {
    await render(<MeetingCard meeting={{ ...MEETING, status: 'past' }} />);

    expect(screen.getByText('Ended')).toBeTruthy();
    expect(screen.queryByText('Join')).toBeNull();
  });
});
