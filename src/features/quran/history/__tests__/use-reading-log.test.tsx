import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { formatDateKey } from '@/core/domain/meetings/date-key';
import type { ReadingEntry } from '@/core/domain/quran/reading-log';
import { readingLogStore } from '@/features/quran/history/reading-log.store';
import {
  useDailyHizb,
  useHydrateReadingLog,
  useReadingLog,
  useResumeEntry,
} from '@/features/quran/history/use-reading-log';
import { storageService } from '@/platform/storage';

/**
 * The hooks are the boundary the landing page sees. These tests prove the
 * wiring: a first run falls back to the demo seed, a recorded position becomes
 * the resume entry, and the daily gauge counts distinct pages rather than
 * entries.
 *
 * Storage is mocked at its barrel because the hooks use the app-wide singleton;
 * the factory and its caps are covered by the pure module's tests.
 */

jest.mock('@/platform/storage', () => ({
  STORAGE_KEYS: {
    quranReadingLog: 'quran:reading-log',
  },
  storageService: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

const storage = storageService as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
};

function HydrateProbe() {
  useHydrateReadingLog();
  const { entries, ready } = useReadingLog();

  return <Text>{ready ? `${entries.length}` : 'loading'}</Text>;
}

function ResumeProbe() {
  const entry = useResumeEntry();

  return <Text>{entry ? `${entry.day} p${entry.page}` : 'none'}</Text>;
}

function HizbProbe({ day }: { day: string }) {
  const { read, target, done } = useDailyHizb(day);

  return <Text>{`${read}/${target} ${done ? 'done' : 'pending'}`}</Text>;
}

function entry(day: string, page: number, readPages: number[]): ReadingEntry {
  return {
    day,
    page,
    surah: 2,
    ayahKey: null,
    editionKey: '1',
    at: Date.now(),
    readPages,
  };
}

beforeEach(() => {
  readingLogStore.getState().reset();
  jest.clearAllMocks();

  storage.getItem.mockImplementation(
    async (_key: string, fallback: unknown) => fallback,
  );
  storage.setItem.mockResolvedValue(true);
});

describe('useHydrateReadingLog', () => {
  it('falls back to the seed when storage is empty', async () => {
    await render(<HydrateProbe />);

    // The demo seed is eight days; today is deliberately not one of them.
    await waitFor(() => expect(screen.getByText('8')).toBeTruthy());

    expect(readingLogStore.getState()).toMatchObject({
      ready: true,
      entries: expect.any(Array),
    });
    expect(readingLogStore.getState().entries).toHaveLength(8);
    expect(storage.getItem).toHaveBeenCalledWith('quran:reading-log', null);
  });
});

describe('useResumeEntry', () => {
  it('updates the resume entry when a position is recorded', async () => {
    await act(async () => {
      await readingLogStore.getState().hydrate();
    });

    const today = formatDateKey(new Date());
    const seed = readingLogStore.getState().entries[0];

    await render(<ResumeProbe />);
    expect(screen.getByText(`${seed.day} p${seed.page}`)).toBeTruthy();

    await act(async () => {
      readingLogStore.getState().record(entry(today, 42, [42]));
    });

    expect(screen.getByText(`${today} p42`)).toBeTruthy();
    expect(storage.setItem).toHaveBeenCalledWith(
      'quran:reading-log',
      expect.arrayContaining([expect.objectContaining({ page: 42 })]),
    );
  });
});

describe('useDailyHizb', () => {
  it('reports 0/10 for a day with no reading', async () => {
    await act(async () => {
      await readingLogStore.getState().hydrate();
    });

    const today = formatDateKey(new Date());

    await render(<HizbProbe day={today} />);

    expect(screen.getByText('0/10 pending')).toBeTruthy();
  });

  it('reports done at ten distinct pages', async () => {
    const today = formatDateKey(new Date());

    await act(async () => {
      readingLogStore.getState().record(
        entry(
          today,
          10,
          Array.from({ length: 10 }, (_, index) => index + 1),
        ),
      );
    });

    await render(<HizbProbe day={today} />);

    expect(screen.getByText('10/10 done')).toBeTruthy();
  });
});
