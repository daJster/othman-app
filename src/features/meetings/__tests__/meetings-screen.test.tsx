import { fireEvent, render, screen } from '@testing-library/react-native';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { Meeting } from '@/core/types';
import type { AsyncState } from '@/features/query/async-state';
import MeetingsScreen from '@/app/(tabs)/meetings';

/**
 * The screen is tested against a faked hook rather than a real `QueryClient`:
 * `use-meetings.test.tsx` already covers the query, and what is left to verify
 * here is the screen's own four-state contract and its reaction to a day being
 * picked.
 *
 * `Head` needs a navigation container (it reads `useIsFocused`), which says
 * nothing about this screen, so it is stubbed out.
 */
const mockUseMeetingsByDate = jest.fn();
const mockRefresh = jest.fn();

jest.mock('@/features/meetings/use-meetings', () => ({
  useMeetingsByDate: (dateKey: string) => mockUseMeetingsByDate(dateKey),
  useRefreshMeetings: () => mockRefresh,
}));

jest.mock('expo-router/head', () => () => null);

const MEETING: Meeting = {
  id: 1,
  title: 'Tafsir circle',
  description: 'Weekly tafsir of Surah Al-Kahf.',
  date: '2026-04-02',
  time: '18:00',
  duration: '60 min',
  meetLink: 'https://meet.example.test/abc',
  status: 'upcoming',
  attendees: [{ name: 'Sara K.', avatar: '' }],
  organizer: 'Shaykh Ahmad',
  location: 'Online',
};

function given(state: AsyncState<Meeting[]>, isFetching = false) {
  mockUseMeetingsByDate.mockReturnValue({ state, isFetching });
}

beforeEach(() => {
  mockUseMeetingsByDate.mockReset();
  mockRefresh.mockReset();
});

describe('MeetingsScreen', () => {
  it('shows skeleton cards while the first read is in flight', async () => {
    given({ status: 'pending' });

    await render(<MeetingsScreen />);

    expect(screen.getAllByTestId('meeting-skeleton')).toHaveLength(3);
    // "Empty" must never be shown while the answer is still unknown.
    expect(screen.queryByText('No meetings')).toBeNull();
  });

  it("shows the selected day's meetings and how many there are", async () => {
    const second: Meeting = { ...MEETING, id: 2, title: 'Hifz circle' };
    given({ status: 'ready', data: [MEETING, second] });

    await render(<MeetingsScreen />);

    expect(screen.getByText('Tafsir circle')).toBeTruthy();
    expect(screen.getByText('Hifz circle')).toBeTruthy();
    expect(screen.getByText('2 meetings')).toBeTruthy();
  });

  it('reports an empty day without inventing content', async () => {
    given({ status: 'empty' });

    await render(<MeetingsScreen />);

    expect(screen.getByText('No meetings on this day.')).toBeTruthy();
    expect(screen.queryByTestId('meeting-skeleton')).toBeNull();
  });

  it('offers the query retry when the day failed to load', async () => {
    const retry = jest.fn();
    given({ status: 'error', error: new Error('offline'), retry });

    await render(<MeetingsScreen />);

    expect(screen.getByText('Something went wrong')).toBeTruthy();

    await fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('asks for the day the calendar was moved to', async () => {
    given({ status: 'pending' });

    await render(<MeetingsScreen />);

    const today = formatDateKey(new Date());
    expect(mockUseMeetingsByDate).toHaveBeenLastCalledWith(today);

    // The grid always contains today, so tomorrow is always a cell it renders
    // — no dependency on which month the test happens to run in.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = formatDateKey(tomorrow);

    await fireEvent.press(screen.getByTestId(`calendar-day:${tomorrowKey}`));

    expect(mockUseMeetingsByDate).toHaveBeenLastCalledWith(tomorrowKey);
  });
});
