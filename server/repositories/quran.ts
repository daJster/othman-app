import type { DatabaseSync } from 'node:sqlite';
import type {
  QuranBookmarkRecord,
  QuranNoteRecord,
  QuranProgressRecord,
} from '../contracts.ts';

/**
 * Per-user Qur'an data: memorisation progress, bookmarks, notes.
 *
 * Every query is scoped by `user_id` in SQL, not filtered afterwards. That is
 * the authorization boundary in one place: a handler cannot accidentally return
 * another account's rows by forgetting a `.filter()`.
 */

type ProgressRow = {
  user_id: string;
  surah_number: number;
  percent: number;
  last_reviewed: string | null;
  updated_at: string;
};

type BookmarkRow = {
  id: string;
  user_id: string;
  surah: number;
  ayah: number;
  absolute_number: number;
  label: string | null;
  created_at: string;
};

type NoteRow = {
  id: string;
  user_id: string;
  surah: number;
  ayah: number;
  absolute_number: number;
  text: string;
  created_at: number;
  updated_at: string;
};

function toProgress(row: ProgressRow): QuranProgressRecord {
  return {
    surahNumber: row.surah_number,
    percent: row.percent,
    lastReviewed: row.last_reviewed,
  };
}

function toBookmark(row: BookmarkRow): QuranBookmarkRecord {
  return {
    id: row.id,
    surah: row.surah,
    ayah: row.ayah,
    absoluteNumber: row.absolute_number,
    label: row.label,
    createdAt: row.created_at,
  };
}

function toNote(row: NoteRow): QuranNoteRecord {
  return {
    id: row.id,
    ayah: {
      surah: row.surah,
      ayah: row.ayah,
      absoluteNumber: row.absolute_number,
    },
    text: row.text,
    createdAt: row.created_at,
  };
}

export function createQuranRepository(db: DatabaseSync) {
  return {
    /* ── progress ─────────────────────────────────────────────────── */

    listProgress(userId: string): QuranProgressRecord[] {
      const rows = db
        .prepare(
          `SELECT * FROM quran_progress
           WHERE user_id = ?
           ORDER BY surah_number ASC`,
        )
        .all(userId) as ProgressRow[];

      return rows.map(toProgress);
    },

    putProgress(
      userId: string,
      input: {
        surahNumber: number;
        percent: number;
        lastReviewed: string | null;
      },
    ): QuranProgressRecord {
      db.prepare(
        `INSERT INTO quran_progress
           (user_id, surah_number, percent, last_reviewed, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, surah_number) DO UPDATE SET
           percent = excluded.percent,
           last_reviewed = excluded.last_reviewed,
           updated_at = excluded.updated_at`,
      ).run(
        userId,
        input.surahNumber,
        input.percent,
        input.lastReviewed,
        new Date().toISOString(),
      );

      return {
        surahNumber: input.surahNumber,
        percent: input.percent,
        lastReviewed: input.lastReviewed,
      };
    },

    removeProgress(userId: string, surahNumber: number): boolean {
      const result = db
        .prepare(
          'DELETE FROM quran_progress WHERE user_id = ? AND surah_number = ?',
        )
        .run(userId, surahNumber);

      return Number(result.changes) > 0;
    },

    /* ── bookmarks ─────────────────────────────────────────────────── */

    listBookmarks(userId: string): QuranBookmarkRecord[] {
      const rows = db
        .prepare(
          `SELECT * FROM quran_bookmarks
           WHERE user_id = ?
           ORDER BY created_at DESC`,
        )
        .all(userId) as BookmarkRow[];

      return rows.map(toBookmark);
    },

    createBookmark(
      userId: string,
      input: {
        id: string;
        surah: number;
        ayah: number;
        absoluteNumber: number;
        label: string | null;
      },
    ): QuranBookmarkRecord {
      const createdAt = new Date().toISOString();

      db.prepare(
        `INSERT INTO quran_bookmarks
           (id, user_id, surah, ayah, absolute_number, label, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        input.id,
        userId,
        input.surah,
        input.ayah,
        input.absoluteNumber,
        input.label,
        createdAt,
      );

      return {
        id: input.id,
        surah: input.surah,
        ayah: input.ayah,
        absoluteNumber: input.absoluteNumber,
        label: input.label,
        createdAt,
      };
    },

    findBookmark(userId: string, id: string): QuranBookmarkRecord | null {
      const row = db
        .prepare('SELECT * FROM quran_bookmarks WHERE user_id = ? AND id = ?')
        .get(userId, id) as BookmarkRow | undefined;

      return row ? toBookmark(row) : null;
    },

    updateBookmark(
      userId: string,
      id: string,
      patch: { label?: string | null; ayah?: number; absoluteNumber?: number },
    ): QuranBookmarkRecord | null {
      const assignments: string[] = [];
      const values: (string | number | null)[] = [];

      if (patch.label !== undefined) {
        assignments.push('label = ?');
        values.push(patch.label);
      }
      if (patch.ayah !== undefined) {
        assignments.push('ayah = ?');
        values.push(patch.ayah);
      }
      if (patch.absoluteNumber !== undefined) {
        assignments.push('absolute_number = ?');
        values.push(patch.absoluteNumber);
      }

      if (assignments.length === 0) return this.findBookmark(userId, id);

      values.push(userId, id);
      db.prepare(
        `UPDATE quran_bookmarks SET ${assignments.join(', ')}
         WHERE user_id = ? AND id = ?`,
      ).run(...values);

      return this.findBookmark(userId, id);
    },

    removeBookmark(userId: string, id: string): boolean {
      const result = db
        .prepare('DELETE FROM quran_bookmarks WHERE user_id = ? AND id = ?')
        .run(userId, id);

      return Number(result.changes) > 0;
    },

    /* ── notes ─────────────────────────────────────────────────────── */

    listNotes(userId: string, absoluteNumber?: number): QuranNoteRecord[] {
      const rows = (
        absoluteNumber === undefined
          ? db
              .prepare(
                `SELECT * FROM quran_notes
                 WHERE user_id = ?
                 ORDER BY created_at DESC`,
              )
              .all(userId)
          : db
              .prepare(
                `SELECT * FROM quran_notes
                 WHERE user_id = ? AND absolute_number = ?
                 ORDER BY created_at DESC`,
              )
              .all(userId, absoluteNumber)
      ) as NoteRow[];

      return rows.map(toNote);
    },

    findNote(userId: string, id: string): QuranNoteRecord | null {
      const row = db
        .prepare('SELECT * FROM quran_notes WHERE user_id = ? AND id = ?')
        .get(userId, id) as NoteRow | undefined;

      return row ? toNote(row) : null;
    },

    /**
     * Insert-or-replace by id.
     *
     * The app generates the note id once and retries the save, so an idempotent
     * write is what stops a flaky request from duplicating a note.
     */
    saveNote(
      userId: string,
      note: {
        id: string;
        surah: number;
        ayah: number;
        absoluteNumber: number;
        text: string;
        createdAt: number;
      },
    ): QuranNoteRecord {
      db.prepare(
        `INSERT INTO quran_notes
           (id, user_id, surah, ayah, absolute_number, text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           surah = excluded.surah,
           ayah = excluded.ayah,
           absolute_number = excluded.absolute_number,
           text = excluded.text,
           updated_at = excluded.updated_at
         WHERE quran_notes.user_id = excluded.user_id`,
      ).run(
        note.id,
        userId,
        note.surah,
        note.ayah,
        note.absoluteNumber,
        note.text,
        note.createdAt,
        new Date().toISOString(),
      );

      // A conflicting id owned by another user is a no-op above; read back
      // through the user-scoped lookup so that case is a 404, never a leak.
      const saved = this.findNote(userId, note.id);
      if (!saved) throw new Error('Note save failed');

      return saved;
    },

    updateNote(
      userId: string,
      id: string,
      patch: { text?: string },
    ): QuranNoteRecord | null {
      if (patch.text !== undefined) {
        db.prepare(
          `UPDATE quran_notes SET text = ?, updated_at = ?
           WHERE user_id = ? AND id = ?`,
        ).run(patch.text, new Date().toISOString(), userId, id);
      }

      return this.findNote(userId, id);
    },

    removeNote(userId: string, id: string): boolean {
      const result = db
        .prepare('DELETE FROM quran_notes WHERE user_id = ? AND id = ?')
        .run(userId, id);

      return Number(result.changes) > 0;
    },
  };
}

export type QuranRepository = ReturnType<typeof createQuranRepository>;
