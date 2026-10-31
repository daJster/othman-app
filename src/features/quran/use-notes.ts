import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import {
  createNote,
  type NoteAyah,
  type QuranNote,
} from '@/core/domain/notes/notes';
import { toAsyncResult, type AsyncState } from '@/features/query/async-state';
import { queryKeys } from '@/services/query';
import { notesService } from '@/services/notes';

/**
 * Local notes for one selected ayah.
 *
 * The namespace and the absolute ayah number are both in the cache key, so
 * switching accounts or ayat cannot serve another identity's list from the
 * cache. The query is disabled without a selection: an open panel must not
 * request ayah 0 as a placeholder.
 *
 * A note's id is generated *before* the write and kept across a failed retry.
 * That is what makes `withNote`'s replace-by-id rule useful: persisting a
 * rejected write twice cannot append two copies of the same note. The id is
 * reset when the ayah changes, so a draft can never be saved under the wrong
 * ayah because an earlier failure kept the old note around.
 */
export type NotesController = {
  state: AsyncState<QuranNote[]>;
  /** Resolves with the persisted note, or rejects so the panel can keep the draft. */
  add: (text: string) => Promise<QuranNote>;
  isAdding: boolean;
  addError: Error | null;
};

export function useAyahNotes(
  namespace: string,
  ayah: NoteAyah | null,
): NotesController {
  const client = useQueryClient();
  const absoluteNumber = ayah?.absoluteNumber ?? null;
  const key = queryKeys.notes.byAyah(namespace, absoluteNumber ?? 0);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (absoluteNumber === null) {
        throw new Error('notes requested without a selection');
      }

      const notes = await notesService.list(namespace);

      return notes.filter(
        (note) => note.ayah.absoluteNumber === absoluteNumber,
      );
    },
    enabled: absoluteNumber !== null,
  });

  const mutation = useMutation({
    mutationFn: (note: QuranNote) => notesService.save(namespace, note),
    onMutate: async (note) => {
      // A refetch that started before this optimistic write must not land on top
      // of it with the old list.
      await client.cancelQueries({ queryKey: key });

      const previous = client.getQueryData<QuranNote[]>(key);

      client.setQueryData<QuranNote[]>(key, (rows) => [...(rows ?? []), note]);

      return { previous };
    },
    onError: (_error, _note, context) => {
      if (context?.previous === undefined) {
        client.removeQueries({ queryKey: key });

        return;
      }

      client.setQueryData<QuranNote[]>(key, context.previous);
    },
    onSettled: () => {
      // Reconcile with what storage actually holds, including a list another
      // panel wrote while this save was in flight.
      void client.invalidateQueries({ queryKey: key });
    },
  });

  // A failed note belongs to the ayah it was drafted for. Carrying its id into
  // another ayah would reuse the identity for different text.
  const pending = useRef<QuranNote | null>(null);

  useEffect(() => {
    pending.current = null;
  }, [namespace, absoluteNumber]);

  const { mutateAsync, isPending, error } = mutation;

  const add = useCallback(
    async (text: string) => {
      if (ayah === null) {
        throw new Error('note added without a selection');
      }

      const trimmed = text.trim();
      if (trimmed.length === 0) {
        throw new Error('note added without text');
      }

      // Retry after a rejected write: keep the same id so persistence stays
      // idempotent. A changed draft is a new note.
      const note =
        pending.current !== null && pending.current.text === trimmed
          ? pending.current
          : createNote(ayah, trimmed);

      pending.current = note;

      try {
        await mutateAsync(note);
      } catch (writeError) {
        // `pending.current` intentionally survives: the next save of the same
        // draft reuses this identity.
        throw writeError;
      }

      pending.current = null;

      return note;
    },
    [ayah, mutateAsync],
  );

  return {
    state: toAsyncResult(query, (notes) => notes.length === 0).state,
    add,
    isAdding: isPending,
    addError: error instanceof Error ? error : null,
  };
}
