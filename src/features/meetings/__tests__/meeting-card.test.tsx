import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Meeting } from '@/core/types';
import { MeetingCard } from '@/features/meetings/meeting-card';

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

const MEETING: Meeting = {
  id: 1,
  title: 'Tafsir circle',
  description: 'Weekly tafsir of Surah Al-Kahf.',
  date: '2026-04-02',
  time: '18:00',
  duration: '60 min',
  meetLink: 'https://meet.example.test/abc',
  status: 'upcoming',
  attendees: [
    { name: 'Sara K.', avatar: '' },
    { name: 'Omar A.', avatar: '' },
  ],
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
    expect(screen.getByText('18:00 · 60 min')).toBeTruthy();
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
        avatar: '',
      })),
    };

    await render(<MeetingCard meeting={crowded} />);

    expect(screen.getByText('+2')).toBeTruthy();
    expect(screen.getByText('6 attendees')).toBeTruthy();
  });
});
