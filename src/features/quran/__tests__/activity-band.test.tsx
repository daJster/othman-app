import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, ScrollView } from 'react-native';
import type { ContributionDay } from '@/components/catalogs/contribution-graph.native';
import ContributionGraph from '@/components/catalogs/contribution-graph.native';
import {
  ActivityBand,
  activityBandGeometry,
} from '@/features/quran/components/activity-band';
import {
  buildSpanCells,
  buildYearCells,
  currentMonthKey,
  endOfMonth,
  formatMonthRange,
  formatYearTitle,
  shiftMonthKey,
} from '@/features/quran/components/use-monthly-activity';

/**
 * The activity band is a glance at the span, not a report: these cases pin the
 * window each segment asks the grid for, the paging the toggles move through,
 * and the reset that switching segments performs.
 *
 * The platform grid (SVG on web, views on native) is mocked at its boundary for
 * the band cases; the band's job is the span window, the geometry, the header
 * and the segment control. One case renders the native port directly to pin a
 * monthly cell count, which is the one number the band cannot show through the
 * mock.
 */
type GridProps = {
  days: { day: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[];
  columns: number;
  cellSize: number;
  weekStart?: number;
};

let mockGrid: GridProps | null = null;

jest.mock('@/features/quran/components/activity-grid', () => ({
  ActivityGrid: (props: GridProps) => {
    mockGrid = props;
    return null;
  },
}));

function grid(): GridProps {
  if (!mockGrid) throw new Error('ActivityGrid was not rendered');

  return mockGrid;
}

function title(): string {
  return screen.getByTestId('quran-activity-title').props.children;
}

function summary(): string {
  return screen.getByTestId('quran-activity-summary').props.children;
}

function expectedSummary(days: GridProps['days']): string {
  const span = days.filter((day) => {
    const key = (day as { outside?: boolean }).outside;

    return !key;
  });
  const read = span.filter((day) => day.count > 0).length;

  return `${read} of ${span.length} days read`;
}

function isPrevDisabled(): boolean {
  return screen.getByTestId('quran-activity-prev').props.accessibilityState
    .disabled;
}

function isNextDisabled(): boolean {
  return screen.getByTestId('quran-activity-next').props.accessibilityState
    .disabled;
}

beforeEach(() => {
  mockGrid = null;
});

describe('ActivityBand', () => {
  it('defaults to the rolling three-month span', async () => {
    await render(<ActivityBand />);

    const base = currentMonthKey();
    const start = shiftMonthKey(base, -2);
    const expected = buildSpanCells(start, 3, 1);

    expect(screen.getByText('Recent activity')).toBeTruthy();
    expect(title()).toBe(formatMonthRange(start, base, 'en'));
    expect(grid().days.map((day) => day.day)).toEqual(
      expected.map((day) => day.day),
    );
    expect(grid().days).toHaveLength(expected.length);
    expect(grid().columns).toBe(expected.length / 7);
    expect(summary()).toBe(expectedSummary(grid().days));
    expect(isNextDisabled()).toBe(true);
  });

  it('selects the active segment and shows both spans', async () => {
    await render(<ActivityBand />);

    expect(screen.getByText('3 months')).toBeTruthy();
    expect(screen.getByText('Annual')).toBeTruthy();
    expect(screen.queryByText('One-off')).toBeNull();
    expect(
      screen.getByTestId('quran-activity-span-monthly').props
        .accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByTestId('quran-activity-span-annual').props.accessibilityState,
    ).toMatchObject({ selected: false });
  });

  it('pages three months at a time across a twelve-month history', async () => {
    await render(<ActivityBand />);

    const base = currentMonthKey();

    await fireEvent.press(screen.getByTestId('quran-activity-prev'));

    const end = shiftMonthKey(base, -3);
    expect(title()).toBe(formatMonthRange(shiftMonthKey(end, -2), end, 'en'));
    expect(grid().days.map((day) => day.day)).toEqual(
      buildSpanCells(shiftMonthKey(end, -2), 3, 1).map((day) => day.day),
    );
    expect(isNextDisabled()).toBe(false);

    await fireEvent.press(screen.getByTestId('quran-activity-prev'));
    expect(isPrevDisabled()).toBe(false);

    await fireEvent.press(screen.getByTestId('quran-activity-prev'));
    expect(title()).toBe(
      formatMonthRange(shiftMonthKey(base, -11), shiftMonthKey(base, -9), 'en'),
    );
    expect(isPrevDisabled()).toBe(true);
  });

  it('shows the rolling year on Annual and pages twelve months', async () => {
    await render(<ActivityBand />);

    await fireEvent.press(screen.getByText('Annual'));

    const base = currentMonthKey();
    expect(title()).toBe(formatYearTitle(base, 'en'));
    expect(grid().columns).toBe(53);
    expect(grid().days).toHaveLength(365);
    expect(grid().days.map((day) => day.day)).toEqual(
      buildYearCells(endOfMonth(base)).map((day) => day.day),
    );
    expect(summary()).toBe(expectedSummary(grid().days));
    expect(isNextDisabled()).toBe(true);

    await fireEvent.press(screen.getByTestId('quran-activity-prev'));

    const previous = shiftMonthKey(base, -12);
    expect(title()).toBe(formatYearTitle(previous, 'en'));
    expect(isPrevDisabled()).toBe(true);

    await fireEvent.press(screen.getByTestId('quran-activity-next'));
    expect(title()).toBe(formatYearTitle(base, 'en'));
  });

  it('resets to the current period when switching spans', async () => {
    await render(<ActivityBand />);

    const base = currentMonthKey();

    await fireEvent.press(screen.getByTestId('quran-activity-prev'));
    await fireEvent.press(screen.getByText('Annual'));
    expect(title()).toBe(formatYearTitle(base, 'en'));

    await fireEvent.press(screen.getByTestId('quran-activity-prev'));
    await fireEvent.press(screen.getByText('3 months'));
    expect(title()).toBe(formatMonthRange(shiftMonthKey(base, -2), base, 'en'));
  });

  it('keeps a day stable across every span that contains it', async () => {
    await render(<ActivityBand />);

    const monthly = new Map(grid().days.map((day) => [day.day, day]));

    await fireEvent.press(screen.getByText('Annual'));

    for (const day of grid().days) {
      const twin = monthly.get(day.day);

      // `outside` is positional (padding in one span, in-span in another);
      // the demo value itself must be identical everywhere.
      if (twin) {
        expect({ day: day.day, count: day.count, level: day.level }).toEqual({
          day: twin.day,
          count: twin.count,
          level: twin.level,
        });
      }
    }
  });

  it('centers the monthly grid and left-pins the overflowing year', async () => {
    const { width: windowWidth } = Dimensions.get('window');

    await render(<ActivityBand />);

    const monthly = activityBandGeometry(windowWidth, grid().columns);
    expect(monthly.width).toBeLessThanOrEqual(monthly.available);
    expect(
      screen.getByTestId('quran-activity-scroller').props.contentContainerStyle,
    ).toMatchObject({ justifyContent: 'center' });

    await fireEvent.press(screen.getByText('Annual'));

    const annual = activityBandGeometry(windowWidth, grid().columns);
    expect(annual.width).toBeGreaterThan(annual.available);
    expect(
      screen.getByTestId('quran-activity-scroller').props.contentContainerStyle,
    ).toMatchObject({ justifyContent: 'flex-start' });
  });

  it('pins the scroller to the newest end when switching spans', async () => {
    const spy = jest
      .spyOn(ScrollView.prototype, 'scrollToEnd')
      .mockImplementation(() => {});

    try {
      await render(<ActivityBand />);
      spy.mockClear();

      await fireEvent.press(screen.getByText('Annual'));

      expect(spy).toHaveBeenCalledWith({ animated: false });
    } finally {
      spy.mockRestore();
    }
  });

  it('replaces the five-step ramp with the two-state legend', async () => {
    await render(<ActivityBand />);

    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('No reading')).toBeTruthy();
    expect(screen.queryByText('Less')).toBeNull();
    expect(screen.queryByText('More')).toBeNull();
  });

  it('caps the cell and scrolls wider grids', () => {
    const phone = activityBandGeometry(390, 14);
    expect(phone.cell).toBe(20);
    expect(phone.width).toBe(14 * 20 + 13 * 6);
    expect(phone.width).toBe(phone.available);

    const desktop = activityBandGeometry(768, 5);
    expect(desktop.cell).toBe(22);
    expect(desktop.width).toBeLessThanOrEqual(desktop.available);

    const year = activityBandGeometry(390, 53);
    expect(year.cell).toBe(10);
    expect(year.width).toBe(53 * 10 + 52 * 6);
    expect(year.width).toBeGreaterThan(year.available);
  });
});

describe('ContributionGraph (native)', () => {
  it('renders one cell per day of a three-month span', async () => {
    const base = currentMonthKey();
    const days: ContributionDay[] = buildSpanCells(
      shiftMonthKey(base, -2),
      3,
      1,
    ).map(({ day, count, level, outside }) => ({
      day,
      count,
      level,
      outside,
    }));

    await render(
      <ContributionGraph
        weeks={days}
        columns={days.length / 7}
        cellSize={20}
        weekStart={1}
      />,
    );

    expect(
      screen.getAllByTestId('contribution-cell', {
        includeHiddenElements: true,
      }),
    ).toHaveLength(days.length);
  });
});
