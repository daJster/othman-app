import { useCallback } from 'react';
import { api, useApiMutation, useApiQuery } from '@/api';
import {
  EMPTY_PRACTICE,
  practiceDayKey,
  type PracticeEntry,
} from '@/core/domain/practice/practice';

/**
 * Today's practice row, fetched and writable.
 *
 * The day key is recomputed on every render rather than memoised: it is a
 * string comparison and it is the only thing that makes the 02:00 reset happen
 * without a timer — the next render after two o'clock asks for a different row.
 *
 * Writes go through the API registry so the query cache is invalidated the same
 * way any server mutation is; the service happens to be local for now.
 */
export type PracticePatch = Partial<Omit<PracticeEntry, 'day'>>;

export function usePracticeDay() {
  const day = practiceDayKey();
  const query = useApiQuery(api.practice.byDay, { day });
  const mutation = useApiMutation(api.practice.save);

  const entry: PracticeEntry = query.data ?? { day, ...EMPTY_PRACTICE };

  const update = useCallback(
    (patch: PracticePatch) => {
      mutation.mutate({ day, patch });
    },
    [day, mutation],
  );

  return {
    day,
    entry,
    ready: !query.isPending,
    saving: mutation.isPending,
    update,
  };
}
