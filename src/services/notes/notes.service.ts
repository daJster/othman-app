import type { QuranNote } from '@/core/domain/notes/notes';
import type { RequestOptions } from '@/platform/http';
import type { NotesRepository } from './notes.types';

export interface NotesService {
  list(namespace: string, options?: RequestOptions): Promise<QuranNote[]>;
  /** Persists a note that the caller already created with a stable id. */
  save(namespace: string, note: QuranNote): Promise<QuranNote>;
}

/**
 * Note use-cases over an injected repository.
 *
 * A factory, like the other services: tests inject an in-memory repository and
 * this file stays independent of AsyncStorage.
 */
export function createNotesService(repository: NotesRepository): NotesService {
  return {
    list: (namespace, options) => repository.list(namespace, options),

    async save(namespace, note) {
      await repository.save(namespace, note);

      return note;
    },
  };
}
