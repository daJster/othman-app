import { isSurahNumber } from '../quran/surah';

/**
 * Local selected-ayah notes.
 *
 * The payload is versioned and namespaced because it is *personal* data: one
 * device can hold notes for several accounts plus a guest, and a signed-in user
 * must never see another account's notes. The namespace is therefore part of
 * the stored shape, not a caller-side filter that a bug could skip.
 *
 * Parsing is deliberately forgiving in the same way the reader's storage is:
 * a corrupt row is dropped rather than taking the whole note list down with it.
 * The version is checked first, so a future payload is left untouched instead
 * of being read as if it had today's meaning.
 */

export const NOTES_PAYLOAD_VERSION = 1;

/** Canonical identity of the ayah a note belongs to. */
export type NoteAyah = {
  surah: number;
  /** Ayah-in-surah, 1–286. */
  ayah: number;
  /** Absolute ayah number, 1–6236 — the globally unique key. */
  absoluteNumber: number;
};

export type QuranNote = {
  /** Stable, generated once; retries reuse it so a failed save cannot duplicate. */
  id: string;
  ayah: NoteAyah;
  text: string;
  /** Unix milliseconds. */
  createdAt: number;
};

export type NotesByNamespace = Readonly<Record<string, readonly QuranNote[]>>;

export type NotesPayload = {
  version: typeof NOTES_PAYLOAD_VERSION;
  byNamespace: NotesByNamespace;
};

export const EMPTY_NOTES: NotesPayload = {
  version: NOTES_PAYLOAD_VERSION,
  byNamespace: {},
};

/** `user:<uid>` or the explicit guest namespace. */
export function notesNamespace(userId: string | null | undefined): string {
  return userId ? `user:${userId}` : 'guest';
}

export function isNoteAyah(value: unknown): value is NoteAyah {
  if (typeof value !== 'object' || value === null) return false;

  const ayah = value as Partial<NoteAyah>;

  return (
    isSurahNumber(ayah.surah as number) &&
    Number.isInteger(ayah.ayah) &&
    (ayah.ayah as number) >= 1 &&
    Number.isInteger(ayah.absoluteNumber) &&
    (ayah.absoluteNumber as number) >= 1
  );
}

function parseNote(value: unknown): QuranNote | null {
  if (typeof value !== 'object' || value === null) return null;

  const note = value as Partial<QuranNote>;

  if (typeof note.id !== 'string' || note.id.length === 0) return null;
  if (!isNoteAyah(note.ayah)) return null;
  if (typeof note.text !== 'string' || note.text.trim().length === 0)
    return null;
  if (typeof note.createdAt !== 'number' || !Number.isFinite(note.createdAt)) {
    return null;
  }

  return {
    id: note.id,
    ayah: {
      surah: note.ayah.surah,
      ayah: note.ayah.ayah,
      absoluteNumber: note.ayah.absoluteNumber,
    },
    text: note.text,
    createdAt: note.createdAt,
  };
}

/**
 * Accepts `unknown` because the value comes from storage: a hand-edited or
 * partially written entry is input, not a type error to work around.
 */
export function parseNotesPayload(value: unknown): NotesPayload {
  if (typeof value !== 'object' || value === null) return EMPTY_NOTES;

  const payload = value as Partial<NotesPayload>;

  if (payload.version !== NOTES_PAYLOAD_VERSION) return EMPTY_NOTES;
  if (typeof payload.byNamespace !== 'object' || payload.byNamespace === null) {
    return EMPTY_NOTES;
  }

  const byNamespace: Record<string, QuranNote[]> = {};

  for (const [namespace, rows] of Object.entries(payload.byNamespace)) {
    if (!Array.isArray(rows)) continue;

    const parsed = rows
      .map(parseNote)
      .filter((note): note is QuranNote => note !== null);

    if (parsed.length > 0) byNamespace[namespace] = parsed;
  }

  return { version: NOTES_PAYLOAD_VERSION, byNamespace };
}

/** Notes for one namespace, oldest first. */
export function notesIn(
  payload: NotesPayload,
  namespace: string,
): readonly QuranNote[] {
  return payload.byNamespace[namespace] ?? [];
}

/**
 * Insert or replace by `id`.
 *
 * Replacing is what makes a retried save idempotent: the caller generates the
 * id once, so a retry after an ambiguous failure cannot append a second copy.
 */
export function withNote(
  payload: NotesPayload,
  namespace: string,
  note: QuranNote,
): NotesPayload {
  const existing = notesIn(payload, namespace);
  const index = existing.findIndex((row) => row.id === note.id);
  const rows =
    index === -1
      ? [...existing, note]
      : existing.map((row, at) => (at === index ? note : row));

  return {
    version: NOTES_PAYLOAD_VERSION,
    byNamespace: { ...payload.byNamespace, [namespace]: rows },
  };
}

/** Remove one note by id; a missing id is a no-op. */
export function withoutNote(
  payload: NotesPayload,
  namespace: string,
  id: string,
): NotesPayload {
  const existing = notesIn(payload, namespace);
  const rows = existing.filter((row) => row.id !== id);

  if (rows.length === existing.length) return payload;

  return {
    version: NOTES_PAYLOAD_VERSION,
    byNamespace: { ...payload.byNamespace, [namespace]: rows },
  };
}

/**
 * A new note with a stable id.
 *
 * `random` is injected so ids are deterministic in tests while still unique in
 * practice; `Date.now()` alone would collide when two notes are added in the
 * same millisecond.
 */
export function createNote(
  ayah: NoteAyah,
  text: string,
  {
    now = Date.now,
    random = Math.random,
  }: { now?: () => number; random?: () => number } = {},
): QuranNote {
  const timestamp = now();
  const suffix = Math.floor(random() * 1e9).toString(36);

  return {
    id: `${timestamp.toString(36)}-${suffix}`,
    ayah,
    text: text.trim(),
    createdAt: timestamp,
  };
}
