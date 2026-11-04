import { render, screen } from '@testing-library/react-native';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import { DailyHizbBand } from '@/features/quran/components/daily-hizb-band';
import { SEED_READING_LOG } from '@/features/quran/history/seed';

/**
 * The band is the day's scoreboard, so these cases pin the one thing it may
 * claim: one page, either zero or one. There is no partial hizb to render, no
 * ten-page target, and no percentage to repeat beside the fraction.
 *
 * The gauge adapter and the reading-log hooks are mocked at their boundaries —
 * the SVG gauge is not the subject, and the store's hydration is covered by its
 * own tests. The band only has to turn `{ read, target, done }` and the log into
 * a band. `useIsWide` is mocked so the two arc sizes are deterministic.
 */
const mockGauge = jest.fn();
let mockRead = 0;
let mockEntries: ReadingEntry[] = [];
let mockWide = false;

jest.mock('@/ui/layout', () => ({
  useIsWide: () => mockWide,
}));

jest.mock('@/features/quran/components/hizb-gauge', () => ({
  HizbGauge: (props: {
    value: number;
    max: number;
    size?: number;
    strokeWidth?: number;
  }) => {
    mockGauge(props);
    return null;
  },
}));

jest.mock('@/features/quran/history/use-reading-log', () => ({
  useHydrateReadingLog: () => undefined,
  useReadingLog: () => ({ entries: mockEntries, ready: true }),
  useDailyHizb: (_day: string, target: number) => ({
    read: Math.min(mockRead, target),
    target,
    done: mockRead >= target,
  }),
}));

function entry(page: number, surah: number): ReadingEntry {
  return {
    day: '2026-01-01',
    page,
    surah,
    ayahKey: null,
    editionKey: null,
    at: Date.now(),
    readPages: [page],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRead = 0;
  mockEntries = [];
  mockWide = false;
});

describe('DailyHizbBand', () => {
  it('starts the day at 0 of 1 page', async () => {
    await render(<DailyHizbBand />);

    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('0 of 1 page')).toBeTruthy();
    expect(mockGauge).toHaveBeenCalledWith(
      expect.objectContaining({ value: 0, max: 1 }),
    );
    expect(screen.queryByTestId('quran-hizb-done')).toBeNull();
    expect(screen.queryByText('Counted from this device')).toBeNull();
  });

  it('completes at one page and mounts the success line', async () => {
    mockRead = 1;

    await render(<DailyHizbBand />);

    expect(screen.getByText('1 of 1 page')).toBeTruthy();
    expect(mockGauge).toHaveBeenCalledWith(
      expect.objectContaining({ value: 1, max: 1 }),
    );
    expect(screen.getByTestId('quran-hizb-done')).toBeTruthy();
    expect(screen.getByText('Daily goal complete')).toBeTruthy();
  });

  it('keeps one completion line across re-renders', async () => {
    mockRead = 1;

    const { rerender } = await render(<DailyHizbBand />);

    await rerender(<DailyHizbBand />);

    expect(screen.getAllByTestId('quran-hizb-done')).toHaveLength(1);
  });

  it('uses the phone arc on a narrow window and the large arc from md', async () => {
    const phone = await render(<DailyHizbBand />);

    expect(mockGauge).toHaveBeenCalledWith(
      expect.objectContaining({ size: 136 }),
    );

    await phone.unmount();
    mockWide = true;

    await render(<DailyHizbBand />);

    expect(mockGauge).toHaveBeenCalledWith(
      expect.objectContaining({ size: 176 }),
    );
  });

  it('shows the sample caption only while the demo seed is in the log', async () => {
    mockEntries = SEED_READING_LOG;

    const seed = await render(<DailyHizbBand />);

    expect(screen.getByText('Counted from this device')).toBeTruthy();

    await seed.unmount();
    mockEntries = [entry(12, 2)];

    await render(<DailyHizbBand />);

    expect(screen.queryByText('Counted from this device')).toBeNull();
  });
});
