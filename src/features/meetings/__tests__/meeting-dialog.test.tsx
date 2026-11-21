import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Meeting } from '@/core/types';
import { MeetingDetails } from '@/features/meetings/meeting-dialog';

/**
 * The dialog body: what the card no longer carries. The wrapper (`Dialog`) is
 * the shared glass surface and is exercised by other screens; this test pins
 * the order and the three invitation states.
 */
jest.mock('@/features/auth/use-session-role', () => ({
  useSessionRole: () => mockSession,
}));

jest.mock('@/api/hooks', () => ({
  useApiMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useApiQuery: jest.fn(),
}));

jest.mock('@/ui/panel', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

jest.mock('@/features/meetings/meeting-actions', () => ({
  MeetingCardActions: () => null,
}));

type SessionMock = {
  state: 'restoring' | 'signed-out' | 'loading' | 'ready';
  uid: string | null;
  role: 'user' | 'admin' | 'superadmin' | null;
  signedIn: boolean;
  canWrite: boolean;
  isAdmin: boolean;
  isSuperadmin: boolean;
};

let mockSession: SessionMock = {
  state: 'signed-out',
  uid: null,
  role: null,
  signedIn: false,
  canWrite: false,
  isAdmin: false,
  isSuperadmin: false,
};

beforeEach(() => {
  mockSession = {
    state: 'signed-out',
    uid: null,
    role: null,
    signedIn: false,
    canWrite: false,
    isAdmin: false,
    isSuperadmin: false,
  };
});

const MEETING: Meeting = {
  id: 1,
  title: 'Tafsir circle',
  description: 'Weekly tafsir of Surah Al-Kahf.',
  date: '2026-04-02',
  time: '18:00',
  durationMinutes: 60,
  meetLink: 'https://meet.example.test/abc',
  status: 'scheduled',
  organizer: 'Shaykh Ahmad',
  location: 'Online',
  attendees: [
    { name: 'Layla M.', status: 'invited' },
    { name: 'Omar A.', status: 'declined' },
    { name: 'Sara K.', status: 'going' },
  ],
};

describe('MeetingDetails', () => {
  it('shows the state, title and the whole time block', async () => {
    await render(<MeetingDetails meeting={MEETING} />);

    expect(screen.getByText('Scheduled')).toBeTruthy();
    expect(screen.getByText('Tafsir circle')).toBeTruthy();
    expect(screen.getByText(/6:00 PM — .*7:00 PM/)).toBeTruthy();
    expect(screen.getByText('60 min')).toBeTruthy();
  });

  it('reads the description under Details', async () => {
    await render(<MeetingDetails meeting={MEETING} />);

    expect(screen.getByText('Details')).toBeTruthy();
    expect(screen.getByText(MEETING.description)).toBeTruthy();
  });

  it('lists the organiser first, then every attendee', async () => {
    await render(<MeetingDetails meeting={MEETING} />);

    expect(screen.getByText('Attendees')).toBeTruthy();
    expect(screen.getByText('Shaykh Ahmad')).toBeTruthy();
    expect(screen.getByText('Sara K.')).toBeTruthy();
    expect(screen.getByText('Omar A.')).toBeTruthy();
    expect(screen.getByText('Layla M.')).toBeTruthy();

    expect(screen.getByTestId('attendee-role:organizer')).toBeTruthy();
    expect(screen.getAllByTestId('attendee-role:attendee')).toHaveLength(3);
  });

  it('maps invitation states to accepted, declined and unknown', async () => {
    await render(<MeetingDetails meeting={MEETING} />);

    // The organiser is accepted, plus the one attendee marked going.
    expect(screen.getAllByTestId('attendee-state:accepted')).toHaveLength(2);
    expect(screen.getAllByTestId('attendee-state:declined')).toHaveLength(1);
    expect(screen.getAllByTestId('attendee-state:unknown')).toHaveLength(1);
  });

  it('orders accepted and declined before unknown', async () => {
    await render(<MeetingDetails meeting={MEETING} />);

    const states = screen
      .getAllByTestId(/^attendee-state:/)
      .map((node) => node.props.testID);

    expect(states).toEqual([
      'attendee-state:accepted',
      'attendee-state:accepted',
      'attendee-state:declined',
      'attendee-state:unknown',
    ]);
  });

  it('lets a signed-in reader change their answer', async () => {
    mockSession = {
      state: 'ready',
      uid: 'uid-1',
      role: 'user',
      signedIn: true,
      canWrite: true,
      isAdmin: false,
      isSuperadmin: false,
    };

    await render(
      <MeetingDetails
        meeting={{
          ...MEETING,
          attendees: [{ name: 'Me', userId: 'uid-1', status: 'going' }],
        }}
      />,
    );

    expect(screen.getByText('Your response')).toBeTruthy();
    expect(screen.getByTestId('meeting-accept')).toBeTruthy();
    expect(screen.getByTestId('meeting-decline')).toBeTruthy();
    expect(screen.getByTestId('meeting-unknown')).toBeTruthy();
    expect(screen.getByTestId('meeting-dialog-join:1')).toBeTruthy();
  });

  it('returns to the default state with the third answer', async () => {
    mockSession = {
      state: 'ready',
      uid: 'uid-1',
      role: 'user',
      signedIn: true,
      canWrite: true,
      isAdmin: false,
      isSuperadmin: false,
    };

    await render(
      <MeetingDetails
        meeting={{
          ...MEETING,
          attendees: [{ name: 'Me', userId: 'uid-1', status: 'going' }],
        }}
      />,
    );

    expect(screen.getByTestId('meeting-dialog-join:1')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('meeting-unknown'));

    // Unknown is the default state, so Join disappears immediately.
    expect(screen.queryByTestId('meeting-dialog-join:1')).toBeNull();
    expect(
      screen.getByTestId('meeting-unknown').props.accessibilityState.selected,
    ).toBe(true);
  });

  it('shows an answer before the server confirms it', async () => {
    mockSession = {
      state: 'ready',
      uid: 'uid-1',
      role: 'user',
      signedIn: true,
      canWrite: true,
      isAdmin: false,
      isSuperadmin: false,
    };

    await render(<MeetingDetails meeting={MEETING} />);

    expect(screen.queryByTestId('meeting-dialog-join:1')).toBeNull();

    await fireEvent.press(screen.getByTestId('meeting-accept'));

    // The optimistic answer is local; the backend call runs behind it.
    expect(screen.getByTestId('meeting-dialog-join:1')).toBeTruthy();
  });
});
