import type { QuranNote } from '@/core/domain/notes/notes';

/**
 * Note persistence contract.
 *
 * `namespace` is passed on every call rather than held by the repository: the
 * same repository serves every account on the device, and a repository that
 * remembered "the current user" would be one stale closure away from writing
 * account A's note into account B's list.
 */
export interface NotesRepository {
  list(namespace: string): Promise<QuranNote[]>;
  /** Idempotent by note id, so a retried save cannot duplicate. */
  save(namespace: string, note: QuranNote): Promise<void>;
}

export class NotesWriteError extends Error {
  constructor() {
    super('The note could not be written to local storage');

    this.name = 'NotesWriteError';
  }
}
