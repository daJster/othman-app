import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import { MeetingCalendar } from '@/features/meetings/meeting-calendar';

/**
 * RNTL 14 made `fireEvent` asynchronous — a press only commits when it is
 * awaited, which is why every interaction here is `await fireEvent.…`.
 */
const SELECTED = new Date(2026, 3, 2, 12); // 2 April 2026

describe('MeetingCalendar', () => {
  it('renders a six-week Gregorian grid around the selected day', async () => {
    const onSelect = jest.fn();
    await render(
      <MeetingCalendar selectedDate={SELECTED} onSelect={onSelect} />,
    );

    expect(screen.getByTestId('calendar-month-label')).toHaveTextContent(
      'April 2026',
    );
    expect(screen.getAllByTestId(/^calendar-day:/)).toHaveLength(42);
    expect(screen.getByTestId('calendar-day:2026-03-29')).toBeTruthy();
    expect(screen.getByTestId('calendar-day:2026-05-09')).toBeTruthy();
  });

  it('reports the selected day as a local date', async () => {
    const onSelect = jest.fn();
    await render(
      <MeetingCalendar selectedDate={SELECTED} onSelect={onSelect} />,
    );

    await fireEvent.press(screen.getByTestId('calendar-day:2026-04-15'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const date = onSelect.mock.calls[0][0] as Date;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(15);
  });

  it('switches to the Hijri month without changing the selected day', async () => {
    const onSelect = jest.fn();
    await render(
      <MeetingCalendar selectedDate={SELECTED} onSelect={onSelect} />,
    );

    await fireEvent.press(screen.getByText('Hijri'));

    // 2 April 2026 is 14 Shawwal 1447.
    expect(screen.getByTestId('calendar-month-label')).toHaveTextContent(
      'Shawwal 1447',
    );
    expect(
      within(screen.getByTestId('calendar-day:2026-04-02')).getByText('14'),
    ).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('moves between months in the active system', async () => {
    await render(
      <MeetingCalendar selectedDate={SELECTED} onSelect={jest.fn()} />,
    );

    await fireEvent.press(screen.getByLabelText('Next month'));
    expect(screen.getByTestId('calendar-month-label')).toHaveTextContent(
      'May 2026',
    );

    await fireEvent.press(screen.getByText('Hijri'));
    expect(screen.getByTestId('calendar-month-label')).toHaveTextContent(
      "Dhu al-Qi'dah 1447",
    );
  });

  it('returns to today from a browsed month', async () => {
    const onSelect = jest.fn();
    await render(
      <MeetingCalendar selectedDate={SELECTED} onSelect={onSelect} />,
    );

    await fireEvent.press(screen.getByLabelText('Previous month'));
    await fireEvent.press(screen.getByText('Today'));

    expect(onSelect).toHaveBeenCalledTimes(1);

    const date = onSelect.mock.calls[0][0] as Date;
    const now = new Date();
    expect(date.getFullYear()).toBe(now.getFullYear());
    expect(date.getMonth()).toBe(now.getMonth());
    expect(date.getDate()).toBe(now.getDate());
  });
});
