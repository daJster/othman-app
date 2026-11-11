import { randomUUID } from 'node:crypto';
import type { AyahContentRecord, QuranCatalogRecord } from '../contracts.ts';
import { ApiError } from '../lib/errors.ts';
import {
  asObject,
  optionalInteger,
  optionalNullableString,
  optionalNumber,
  optionalString,
  requiredInteger,
  requiredNumber,
  requiredString,
} from '../lib/validation.ts';
import { createQuranRepository } from '../repositories/quran.ts';
import { requireDocument, type DocumentStore } from '../stores/documents.ts';
import { requireAuth } from './guards.ts';
import { created, defineFunction, noContent, ok } from './types.ts';
import type { FunctionResult } from './types.ts';

/**
 * Qur'an information + per-user records.
 *
 * The catalog is document-shaped (JSON store): it changes when the mushaf
 * edition changes, not per user, and it is loaded as one payload by the reader.
 * Progress, bookmarks and notes are tabular (SQLite): tiny rows, queried by
 * user, and the natural home for foreign keys.
 *
 * Ayah text is mock data. A real function would proxy the CDN; the shape is
 * already `AyahContent`, so the frontend's existing parser is unchanged.
 */

const SURAH_COUNT = 114;
const MAX_ABSOLUTE_AYAH = 6236;

/** The opening surah is short enough to ship real text for a believable reading. */
const FATIHA = [
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
  'الرَّحْمَٰنِ الرَّحِيمِ',
  'مَالِكِ يَوْمِ الدِّينِ',
  'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
  'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
  'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
];

function readCatalog(context: {
  documents: DocumentStore;
}): QuranCatalogRecord {
  const catalog = requireDocument<{
    surahs: QuranCatalogRecord['surahs'];
    editions: QuranCatalogRecord['editions'];
  }>(context.documents, 'quran', 'catalog', 'Quran catalog is not seeded');

  return catalog;
}

function ayahOffset(surahs: QuranCatalogRecord['surahs'], surahNumber: number) {
  let offset = 0;

  for (let number = 1; number < surahNumber; number += 1) {
    offset += surahs[String(number)]?.ayahCount ?? 0;
  }

  return offset;
}

function mockAyah(
  surah: QuranCatalogRecord['surahs'][string],
  surahNumber: number,
  ayahInSurah: number,
  absoluteNumber: number,
): AyahContentRecord {
  const real = surahNumber === 1 ? FATIHA[ayahInSurah - 1] : undefined;

  return {
    absoluteNumber,
    text: real ?? `${surah.name} · الآية ${ayahInSurah}`,
    numberInSurah: ayahInSurah,
    juz: Math.min(30, Math.floor((absoluteNumber - 1) / 208) + 1),
    manzil: Math.min(7, Math.floor((absoluteNumber - 1) / 891) + 1),
    page: Math.min(604, Math.ceil(absoluteNumber / (6236 / 604))),
    ruku: Math.ceil(absoluteNumber / 100),
    hizbQuarter: Math.min(240, Math.ceil(absoluteNumber / (6236 / 240))),
    sajda: false,
  };
}

const catalog = defineFunction((event, context): FunctionResult => {
  const data = readCatalog(context);

  return ok(data);
});

const surah = defineFunction((event, context): FunctionResult => {
  const number = requiredInteger(
    asObject({ number: Number(event.params.number) }),
    'number',
    { min: 1, max: SURAH_COUNT },
  );
  const data = readCatalog(context);
  const metadata = data.surahs[String(number)];

  if (!metadata) throw ApiError.notFound(`Surah ${number} does not exist`);

  const start = ayahOffset(data.surahs, number);
  const ayahs = Array.from({ length: metadata.ayahCount }, (_, index) => {
    const ayahInSurah = index + 1;

    return mockAyah(metadata, number, ayahInSurah, start + ayahInSurah);
  });

  return ok({ surah: metadata, ayahs });
});

const ayah = defineFunction((event, context): FunctionResult => {
  const absoluteNumber = requiredInteger(
    asObject({ absoluteNumber: Number(event.params.absoluteNumber) }),
    'absoluteNumber',
    { min: 1, max: MAX_ABSOLUTE_AYAH },
  );
  const data = readCatalog(context);

  for (let number = 1; number <= SURAH_COUNT; number += 1) {
    const metadata = data.surahs[String(number)];
    if (!metadata) continue;

    const start = ayahOffset(data.surahs, number);
    const end = start + metadata.ayahCount;

    if (absoluteNumber > start && absoluteNumber <= end) {
      return ok({
        ayah: mockAyah(
          metadata,
          number,
          absoluteNumber - start,
          absoluteNumber,
        ),
      });
    }
  }

  throw ApiError.notFound(`Ayah ${absoluteNumber} does not exist`);
});

/* ── progress ─────────────────────────────────────────────────────── */

const listProgress = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const rows = createQuranRepository(context.db).listProgress(auth.user.uid);

  return ok({ progress: rows });
});

const putProgress = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const body = asObject(event.body);
  const surahNumber = requiredInteger(body, 'surahNumber', {
    min: 1,
    max: SURAH_COUNT,
  });
  const percent = Math.round(
    requiredNumber(body, 'percent', { min: 0, max: 100 }),
  );
  const lastReviewed = optionalString(body, 'lastReviewed', { max: 10 });

  if (lastReviewed !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(lastReviewed)) {
    throw ApiError.invalid('"lastReviewed" must be a YYYY-MM-DD day');
  }

  const row = createQuranRepository(context.db).putProgress(auth.user.uid, {
    surahNumber,
    percent,
    lastReviewed: lastReviewed ?? null,
  });

  context.events.publish('quran.progress.updated', {
    uid: auth.user.uid,
    surahNumber,
    percent,
  });

  return ok({ progress: row });
});

const removeProgress = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const surahNumber = requiredInteger(
    asObject({ surahNumber: Number(event.params.surahNumber) }),
    'surahNumber',
    { min: 1, max: SURAH_COUNT },
  );

  createQuranRepository(context.db).removeProgress(auth.user.uid, surahNumber);
  context.events.publish('quran.progress.updated', {
    uid: auth.user.uid,
    surahNumber,
    percent: null,
  });

  return noContent();
});

/* ── bookmarks ────────────────────────────────────────────────────── */

const listBookmarks = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const rows = createQuranRepository(context.db).listBookmarks(auth.user.uid);

  return ok({ bookmarks: rows });
});

const createBookmark = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const body = asObject(event.body);
  const repo = createQuranRepository(context.db);
  const id = optionalString(body, 'id', { max: 128 }) ?? randomUUID();

  if (repo.findBookmark(auth.user.uid, id)) {
    throw ApiError.conflict(`Bookmark ${id} already exists`);
  }

  const bookmark = repo.createBookmark(auth.user.uid, {
    id,
    surah: requiredInteger(body, 'surah', { min: 1, max: SURAH_COUNT }),
    ayah: requiredInteger(body, 'ayah', { min: 1, max: 286 }),
    absoluteNumber: requiredInteger(body, 'absoluteNumber', {
      min: 1,
      max: MAX_ABSOLUTE_AYAH,
    }),
    label: optionalNullableString(body, 'label', { max: 200 }) ?? null,
  });

  context.events.publish('quran.bookmarks.created', {
    uid: auth.user.uid,
    id: bookmark.id,
  });

  return created({ bookmark });
});

const updateBookmark = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const id = event.params.id;
  if (!id) throw ApiError.invalid('Missing bookmark id');

  const body = asObject(event.body);
  const repo = createQuranRepository(context.db);

  if (!repo.findBookmark(auth.user.uid, id)) {
    throw ApiError.notFound(`Bookmark ${id} does not exist`);
  }

  const bookmark = repo.updateBookmark(auth.user.uid, id, {
    label: optionalNullableString(body, 'label', { max: 200 }),
    ayah: optionalInteger(body, 'ayah', { min: 1, max: 286 }),
    absoluteNumber: optionalInteger(body, 'absoluteNumber', {
      min: 1,
      max: MAX_ABSOLUTE_AYAH,
    }),
  });

  context.events.publish('quran.bookmarks.updated', {
    uid: auth.user.uid,
    id,
  });

  return ok({ bookmark });
});

const removeBookmark = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const id = event.params.id;
  if (!id) throw ApiError.invalid('Missing bookmark id');

  if (!createQuranRepository(context.db).removeBookmark(auth.user.uid, id)) {
    throw ApiError.notFound(`Bookmark ${id} does not exist`);
  }

  context.events.publish('quran.bookmarks.deleted', {
    uid: auth.user.uid,
    id,
  });

  return noContent();
});

/* ── notes ────────────────────────────────────────────────────────── */

const listNotes = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const absoluteNumber = optionalInteger(
    asObject({
      absoluteNumber:
        event.query.absoluteNumber === undefined
          ? undefined
          : Number(event.query.absoluteNumber),
    }),
    'absoluteNumber',
    { min: 1, max: MAX_ABSOLUTE_AYAH },
  );
  const rows = createQuranRepository(context.db).listNotes(
    auth.user.uid,
    absoluteNumber,
  );

  return ok({ notes: rows });
});

const createNote = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const body = asObject(event.body);
  const text = requiredString(body, 'text', { min: 1, max: 5_000 });
  const createdAt = optionalNumber(body, 'createdAt', { min: 0 }) ?? Date.now();

  const note = createQuranRepository(context.db).saveNote(auth.user.uid, {
    id: optionalString(body, 'id', { max: 128 }) ?? randomUUID(),
    surah: requiredInteger(body, 'surah', { min: 1, max: SURAH_COUNT }),
    ayah: requiredInteger(body, 'ayah', { min: 1, max: 286 }),
    absoluteNumber: requiredInteger(body, 'absoluteNumber', {
      min: 1,
      max: MAX_ABSOLUTE_AYAH,
    }),
    text,
    createdAt,
  });

  context.events.publish('quran.notes.saved', {
    uid: auth.user.uid,
    id: note.id,
  });

  return created({ note });
});

const updateNote = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const id = event.params.id;
  if (!id) throw ApiError.invalid('Missing note id');

  const body = asObject(event.body);
  const repo = createQuranRepository(context.db);

  if (!repo.findNote(auth.user.uid, id)) {
    throw ApiError.notFound(`Note ${id} does not exist`);
  }

  const note = repo.updateNote(auth.user.uid, id, {
    text: requiredString(body, 'text', { min: 1, max: 5_000 }),
  });

  context.events.publish('quran.notes.saved', {
    uid: auth.user.uid,
    id,
  });

  return ok({ note });
});

const removeNote = defineFunction((event, context): FunctionResult => {
  const auth = requireAuth(context);
  const id = event.params.id;
  if (!id) throw ApiError.invalid('Missing note id');

  if (!createQuranRepository(context.db).removeNote(auth.user.uid, id)) {
    throw ApiError.notFound(`Note ${id} does not exist`);
  }

  context.events.publish('quran.notes.deleted', {
    uid: auth.user.uid,
    id,
  });

  return noContent();
});

export const quranFunctions = {
  'quran.catalog': catalog,
  'quran.surah': surah,
  'quran.ayah': ayah,
  'quran.progress.list': listProgress,
  'quran.progress.put': putProgress,
  'quran.progress.remove': removeProgress,
  'quran.bookmarks.list': listBookmarks,
  'quran.bookmarks.create': createBookmark,
  'quran.bookmarks.update': updateBookmark,
  'quran.bookmarks.remove': removeBookmark,
  'quran.notes.list': listNotes,
  'quran.notes.create': createNote,
  'quran.notes.update': updateNote,
  'quran.notes.remove': removeNote,
};
