import type { FeedbackValue } from '@/ui/panel';
import { STORAGE_KEYS, storageService } from '@/platform/storage';

/**
 * Feedback storage.
 *
 * There is no feedback endpoint yet, so a submitted note is kept on the device
 * and the confirmation says exactly that. Pretending it was delivered would be
 * the worst kind of demo data: the reader would wait for an answer that could
 * never come.
 *
 * The store is a small append-only list. It is deliberately not a service or a
 * query: nothing else reads it, and a future backend replaces this one file.
 */
export type FeedbackEntry = FeedbackValue & {
  createdAt: string;
};

/** Keep a bounded history; an unbounded local log is a leak with a nicer name. */
const MAX_ENTRIES = 25;

export async function saveFeedback(value: FeedbackValue): Promise<void> {
  const existing = await storageService.getItem<FeedbackEntry[]>(
    STORAGE_KEYS.accountFeedback,
    [],
  );
  const entry: FeedbackEntry = {
    ...value,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  const saved = await storageService.setItem(
    STORAGE_KEYS.accountFeedback,
    next,
  );

  if (!saved) {
    throw new Error('feedback could not be stored');
  }
}
