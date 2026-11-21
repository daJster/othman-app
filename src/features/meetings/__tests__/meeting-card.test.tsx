import { fireEvent, render, screen } from '@testing-library/react-native';
import { PortalHost } from '@rn-primitives/portal';
import type { ReactElement } from 'react';
import type { Meeting } from '@/core/types';
import { MeetingCard } from '@/features/meetings/meeting-card';

/**
 * The card is a glance: three lines, the reader's answer, and Join once the
 * answer is yes. The dialog's contents are covered by `meeting-dialog.test.tsx`.
 */
jest.mock('@/features/auth/use-session-role', () => ({
  useSessionRole: () => ({
    state: 'ready',
    uid: 'uid-1',
    role: 'user',
    signedIn: true,
    canWrite: true,
    isAdmin: false,
    isSuperadmin: false,
  }),
}));

jest.mock('@/api/hooks', () => ({
  useApiMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useApiQuery: jest.fn(),
}));

jest.mock('@/ui/panel', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

const mockOpenMeetLink = jest.fn();
jest.mock('@/features/meetings/open-meet-link', () => ({
  openMeetLink: (url: string) => mockOpenMeetLink(url),
}));

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
  status: 'scheduled',
  attendees: [{ name: 'Sara K.' }, { name: 'Omar A.' }],
  organizer: 'Shaykh Ahmad',
  location: 'Online',
};

const ACCEPTED: Meeting = {
  ...MEETING,
  attendees: [{ name: 'Me', userId: 'uid-1', status: 'going' }],
};

const DECLINED: Meeting = {
  ...MEETING,
  attendees: [{ name: 'Me', userId: 'uid-1', status: 'declined' }],
};

beforeEach(() => {
  mockOpenMeetLink.mockClear();
});

/** The dialog renders through the app's portal host. */
function renderCard(element: ReactElement) {
  return render(
    <>
      {element}
      <PortalHost />
    </>,
  );
}

describe('MeetingCard', () => {
  it('shows state, title, schedule, attendees and the answer buttons', async () => {
    await renderCard(<MeetingCard meeting={MEETING} />);

    expect(screen.getByText('Scheduled')).toBeTruthy();
    expect(screen.getByText('Tafsir circle')).toBeTruthy();
    expect(screen.getByText(/6:00 PM/)).toBeTruthy();
    expect(screen.getByText(/60 min/)).toBeTruthy();
    expect(screen.getByText('2 attendees')).toBeTruthy();
    expect(screen.getByTestId('meeting-accept')).toBeTruthy();
    expect(screen.getByTestId('meeting-decline')).toBeTruthy();
    // The card offers only the two direct answers; the dialog adds "unknown".
    expect(screen.queryByTestId('meeting-unknown')).toBeNull();
    // Join follows an accepted answer, not a pending one.
    expect(screen.queryByText('Join')).toBeNull();
  });

  it('shows Join once the reader accepts, without a badge', async () => {
    await renderCard(<MeetingCard meeting={ACCEPTED} />);

    expect(screen.getByText('Join')).toBeTruthy();
    expect(screen.queryByTestId('my-response:accepted')).toBeNull();
    expect(screen.queryByTestId('meeting-accept')).toBeNull();
  });

  it('replaces the meeting state with a red cross when declined', async () => {
    await renderCard(<MeetingCard meeting={DECLINED} />);

    expect(screen.getByTestId('my-response:declined')).toBeTruthy();
    expect(screen.queryByTestId('meeting-status:scheduled')).toBeNull();
    expect(screen.queryByText('Join')).toBeNull();
    expect(screen.queryByTestId('meeting-decline')).toBeNull();
  });

  it('opens the details dialog from anywhere on the card', async () => {
    await renderCard(<MeetingCard meeting={MEETING} />);

    await fireEvent.press(screen.getByTestId('meeting-card'));

    expect(screen.getByTestId('meeting-dialog')).toBeTruthy();
  });

  it('sends Join to the room without opening the dialog', async () => {
    await renderCard(<MeetingCard meeting={ACCEPTED} />);

    await fireEvent.press(screen.getByTestId('meeting-join:1'));

    expect(mockOpenMeetLink).toHaveBeenCalledWith(MEETING.meetLink);
    expect(screen.queryByTestId('meeting-dialog')).toBeNull();
  });

  it('answers optimistically before the server responds', async () => {
    await renderCard(<MeetingCard meeting={MEETING} />);

    await fireEvent.press(screen.getByTestId('meeting-accept'));

    // The answer is local state first; the mutation and refetch follow.
    expect(screen.getByText('Join')).toBeTruthy();
    expect(screen.queryByTestId('meeting-accept')).toBeNull();
  });

  it('collapses attendees beyond five into a counter', async () => {
    const crowded: Meeting = {
      ...MEETING,
      attendees: Array.from({ length: 6 }, (_, index) => ({
        name: `Attendee ${index + 1}`,
      })),
    };

    await renderCard(<MeetingCard meeting={crowded} />);

    expect(screen.getByText('+1')).toBeTruthy();
    expect(screen.getByText('6 attendees')).toBeTruthy();
  });

  it('does not offer answers or Join on a session that has ended', async () => {
    await renderCard(<MeetingCard meeting={{ ...ACCEPTED, status: 'past' }} />);

    expect(screen.getByText('Ended')).toBeTruthy();
    expect(screen.queryByText('Join')).toBeNull();
    expect(screen.queryByTestId('meeting-accept')).toBeNull();
  });

  it('does not offer answers or Join on a canceled session', async () => {
    await renderCard(
      <MeetingCard
        meeting={{ ...MEETING, status: 'canceled', canceled: true }}
      />,
    );

    expect(screen.getByText('Canceled')).toBeTruthy();
    expect(screen.queryByText('Join')).toBeNull();
    expect(screen.queryByTestId('meeting-accept')).toBeNull();
  });

  it('names the live and near states beside the title', async () => {
    for (const [status, label] of [
      ['now', 'Now'],
      ['soon', 'Soon'],
    ] as const) {
      const view = await renderCard(
        <MeetingCard meeting={{ ...MEETING, status }} />,
      );

      expect(screen.getByTestId(`meeting-status:${status}`)).toBeTruthy();
      expect(screen.getByText(label)).toBeTruthy();

      view.unmount();
    }
  });
});
