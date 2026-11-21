import {
  clampPractice,
  EMPTY_PRACTICE,
  practiceDayKey,
  type PracticeEntry,
} from '@/core/domain/practice/practice';
import { STORAGE_KEYS, storageService } from '@/platform/storage';

/**
 * The practice store.
 *
 * Local and persisted, but behind a promise-returning service so the screens
 * read it through the same query layer as every other piece of server state.
 * When a real backend exists, only this file changes: the API registry, the
 * hooks and the calendar merge already treat practice as fetchable data.
 *
 * One map holds every day, keyed by practice day, because the calendar needs a
 * range and one read is cheaper than thirty. Writes merge into the day's row,
 * so a salah tick cannot erase a duaa count.
 */
export type PracticeService = {
  get(day?: string): Promise<PracticeEntry>;
  save(
    day: string,
    patch: Partial<Omit<PracticeEntry, 'day'>>,
  ): Promise<PracticeEntry>;
  list(): Promise<PracticeEntry[]>;
};

type PracticeMap = Record<string, Omit<PracticeEntry, 'day'>>;

async function readAll(): Promise<PracticeMap> {
  return storageService.getItem<PracticeMap>(STORAGE_KEYS.homePractice, {});
}

export const practiceService: PracticeService = {
  async get(day = practiceDayKey()) {
    const all = await readAll();

    return { day, ...clampPractice(all[day] ?? EMPTY_PRACTICE) };
  },

  async save(day, patch) {
    const all = await readAll();
    const entry = { day, ...clampPractice({ ...all[day], ...patch }) };
    const { day: _day, ...values } = entry;

    await storageService.setItem(STORAGE_KEYS.homePractice, {
      ...all,
      [day]: values,
    });

    return entry;
  },

  async list() {
    const all = await readAll();

    return Object.entries(all)
      .map(([day, values]) => ({
        day,
        ...clampPractice(values),
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  },
};
