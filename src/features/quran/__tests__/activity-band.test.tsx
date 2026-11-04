import { render, screen } from '@testing-library/react-native';
import type { ContributionDay } from '@/components/catalogs/contribution-graph.native';
import ContributionGraph from '@/components/catalogs/contribution-graph.native';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import {
  ActivityBand,
  activityBandGeometry,
} from '@/features/quran/components/activity-band';

/**
 * The activity band is a glance at the year, not a report: these cases pin the
 * window it asks the grid for, the binary goal it maps onto the catalog levels,
 * and the fact that a new reader still sees a full grid instead of a blank band.
 *
 * The platform grid (SVG on web, views on native) is mocked at its boundary for
 * the band cases; the band's job is the data window, the geometry and the
 * legend. One case renders the native port directly to pin the 53 × 7 cells,
 * which is the one number the band cannot show through the mock.
 */
type GridProps = {
  days: { day: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[];
  columns: number;
  cellSize: number;
};

let mockGrid: GridProps | null = null;
let mockEntries: ReadingEntry[] = [];

jest.mock('@/features/quran/components/activity-grid', () => ({
  ActivityGrid: (props: GridProps) => {
    mockGrid = props;
    return null;
  },
}));

jest.mock('@/features/quran/history/use-reading-log', () => ({
  useReadingLog: () => ({ entries: mockEntries, ready: true }),
}));

function entry(day: string, readPages: number[]): ReadingEntry {
  return {
    day,
    page: readPages.at(-1) ?? 1,
    surah: 1,
    ayahKey: null,
    editionKey: null,
    at: Date.now(),
    readPages,
  };
}

/** A deterministic day key, with today at 0. */
function dayBefore(daysAgo: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);

  return formatDateKey(date);
}

function grid(): GridProps {
  if (!mockGrid) throw new Error('ActivityGrid was not rendered');

  return mockGrid;
}

beforeEach(() => {
  mockGrid = null;
  mockEntries = [];
});

describe('ActivityBand', () => {
  it('asks for fifty-three week columns covering the last 365 days', async () => {
    await render(<ActivityBand />);

    expect(screen.getByText('Recent activity')).toBeTruthy();
    expect(grid().columns).toBe(53);
    expect(grid().days).toHaveLength(365);
    expect(grid().days[0].day).toBe(dayBefore(364));
    expect(grid().days.at(-1)?.day).toBe(dayBefore(0));
  });

  it('maps one page to level 4 and an empty day to level 0', async () => {
    mockEntries = [entry(dayBefore(0), [7])];

    await render(<ActivityBand />);

    const days = grid().days;
    const today = days.find((day) => day.day === dayBefore(0));
    const yesterday = days.find((day) => day.day === dayBefore(1));

    expect(today).toMatchObject({ count: 1, level: 4 });
    expect(yesterday).toMatchObject({ count: 0, level: 0 });
    expect(
      days.every((day) => (day.count >= 1 ? day.level === 4 : day.level === 0)),
    ).toBe(true);
  });

  it('replaces the five-step ramp with the two-state legend', async () => {
    await render(<ActivityBand />);

    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('No reading')).toBeTruthy();
    expect(screen.queryByText('Less')).toBeNull();
    expect(screen.queryByText('More')).toBeNull();
  });

  it('still renders a full year for an empty log', async () => {
    await render(<ActivityBand />);

    expect(screen.getByTestId('quran-activity-band')).toBeTruthy();
    expect(grid().days).toHaveLength(365);
    expect(grid().days.every((day) => day.count === 0)).toBe(true);
    expect(grid().days.every((day) => day.level === 0)).toBe(true);
  });

  it('sizes the year to the page column and clamps the phone cell', () => {
    const phone = activityBandGeometry(390);
    expect(phone.cell).toBe(10);
    expect(phone.width).toBe(53 * 10 + 52 * 3);
    expect(phone.width).toBeGreaterThan(phone.available);

    const desktop = activityBandGeometry(768);
    expect(desktop.cell).toBe(10.79);
    expect(desktop.width).toBeLessThanOrEqual(desktop.available);

    const wide = activityBandGeometry(1440);
    expect(wide.cell).toBe(10.79);
    expect(wide.available).toBe(728);
    expect(wide.width).toBeLessThanOrEqual(wide.available);
  });
});

describe('ContributionGraph (native)', () => {
  it('renders 53 week columns and 371 cells for a 365-day window', async () => {
    const days: ContributionDay[] = Array.from({ length: 365 }, (_, index) => ({
      day: dayBefore(364 - index),
      count: index % 2,
      level: index % 2 === 0 ? 0 : 4,
    }));

    await render(<ContributionGraph weeks={days} columns={53} cellSize={10} />);

    expect(
      screen.getAllByTestId('contribution-cell', {
        includeHiddenElements: true,
      }),
    ).toHaveLength(53 * 7);
  });
});
