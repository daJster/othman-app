import { existsSync, readFileSync } from 'node:fs';
import type { DatabaseSync } from 'node:sqlite';
import type {
  QuranCatalogRecord,
  QuranEditionRecord,
  SurahMetadataRecord,
  UserRole,
} from './contracts.ts';
import { fixturePath } from './config.ts';
import { hashPassword } from './lib/password.ts';
import { createUsersRepository } from './repositories/users.ts';
import { createMeetingsRepository } from './repositories/meetings.ts';
import { createQuranRepository } from './repositories/quran.ts';
import type { DocumentStore } from './stores/documents.ts';
import { ensureProfile, writeProfile } from './stores/profiles.ts';

/**
 * Development seed.
 *
 * Seed data is written only when the users table is empty, so a developer's
 * edits, notes and sessions survive a restart. The catalog documents are
 * written independently because they are derived from repository fixtures and
 * can be regenerated if someone deletes `server/data/documents`.
 *
 * Credentials are printed at boot; they are development-only and deliberately
 * obvious. `google@kuttab.test` is the account the demo Google button signs in.
 */

export const SEED_PASSWORD = 'kuttab1234';

export type SeedAccount = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
};

export const SEED_ACCOUNTS: readonly SeedAccount[] = [
  {
    uid: 'demo-superadmin',
    email: 'admin@kuttab.test',
    displayName: 'Admin Demo',
    role: 'superadmin',
  },
  {
    uid: 'demo-shaykh',
    email: 'shaykh@kuttab.test',
    displayName: 'الشيخ عبد الرحمن',
    role: 'admin',
  },
  {
    uid: 'demo-student',
    email: 'student@kuttab.test',
    displayName: 'عثمان الفارسي',
    role: 'user',
  },
  {
    uid: 'demo-google',
    email: 'google@kuttab.test',
    displayName: 'Google Demo',
    role: 'user',
  },
];

type RawMeeting = {
  id: number;
  dayOffset: number;
  time: string;
  durationMinutes: number;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  meetLink: string;
  attendees: { name: string; nameAr?: string; avatar?: string }[];
  organizer: string;
  organizerAr?: string;
  location: string;
  locationAr?: string;
};

type RawSurah = {
  name: string;
  name_en: string;
  location: 'makka' | 'madina';
  number_of_ayat: number;
};

type RawEdition = {
  name: string;
  riwaya: string;
  base_url: string;
  bbox_url: string;
  bbox_reversed_url: string;
  bbox_norm_url: string;
  bbox_reversed_norm_url: string;
  first_page: number;
  last_page: number;
  theme_color: string;
};

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) {
    console.warn(`[seed] fixture missing: ${path}`);
    return null;
  }

  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (error) {
    console.warn(`[seed] could not parse ${path}:`, error);
    return null;
  }
}

/** Local day key, matching the app's `formatDateKey` (not UTC). */
function dateKey(offsetDays: number): string {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  day.setDate(day.getDate() + offsetDays);

  return [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, '0'),
    String(day.getDate()).padStart(2, '0'),
  ].join('-');
}

function seedCatalog(documents: DocumentStore): void {
  const existing = documents.get<QuranCatalogRecord>('quran', 'catalog');
  if (existing) return;

  const rawSurahs = readJson<Record<string, RawSurah>>(
    fixturePath('services', 'quran', '__fixtures__', 'surah-metadata.json'),
  );
  const rawEditions = readJson<Record<string, RawEdition>>(
    fixturePath('services', 'quran', '__fixtures__', 'editions.json'),
  );

  const surahs: Record<string, SurahMetadataRecord> = {};

  for (const [key, row] of Object.entries(rawSurahs ?? {})) {
    surahs[key] = {
      number: Number(key),
      name: row.name,
      nameEnglish: row.name_en,
      location: row.location,
      ayahCount: row.number_of_ayat,
    };
  }

  // A fixture-free checkout must still boot; the reader's own CDN remains the
  // primary source, so placeholders here are a last resort, not the demo path.
  if (Object.keys(surahs).length === 0) {
    for (let number = 1; number <= 114; number += 1) {
      surahs[String(number)] = {
        number,
        name: `سورة ${number}`,
        nameEnglish: `Surah ${number}`,
        location: number <= 49 ? 'makka' : 'madina',
        ayahCount: number === 1 ? 7 : 10,
      };
    }
  }

  const editions: Record<string, QuranEditionRecord> = {};

  for (const [key, row] of Object.entries(rawEditions ?? {})) {
    editions[key] = {
      key,
      name: row.name,
      riwaya: row.riwaya,
      baseUrl: row.base_url,
      bboxUrl: row.bbox_url,
      bboxReversedUrl: row.bbox_reversed_url,
      bboxNormUrl: row.bbox_norm_url,
      bboxReversedNormUrl: row.bbox_reversed_norm_url,
      firstPage: row.first_page,
      lastPage: row.last_page,
      themeColor: row.theme_color,
    };
  }

  documents.set('quran', 'catalog', { surahs, editions });
  documents.set('quran', 'editions', editions);
}

function seedProgress(
  db: DatabaseSync,
  userId: string,
  reviewedDaysAgo: (surahNumber: number) => number,
  percentFor: (surahNumber: number) => number,
): void {
  const repo = createQuranRepository(db);

  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const percent = percentFor(surahNumber);

    repo.putProgress(userId, {
      surahNumber,
      percent,
      lastReviewed:
        percent === 0 ? null : dateKey(-reviewedDaysAgo(surahNumber)),
    });
  }
}

export function seedIfEmpty(input: {
  db: DatabaseSync;
  documents: DocumentStore;
}): void {
  const { db, documents } = input;

  seedCatalog(documents);

  const users = createUsersRepository(db);
  if (users.countAll() > 0) return;

  const passwordHash = hashPassword(SEED_PASSWORD);

  for (const account of SEED_ACCOUNTS) {
    users.insert({
      id: account.uid,
      email: account.email,
      passwordHash,
      displayName: account.displayName,
      photoURL: null,
      phoneNumber: null,
      role: account.role,
    });

    ensureProfile(documents, account.uid);

    if (account.uid === 'demo-student') {
      writeProfile(documents, account.uid, {
        bio: 'طالب في حلقة تحفيظ القرآن.',
        locale: 'ar',
        notifications: true,
      });
    }
  }

  seedMeetings(db);
  seedStudentQuran(db);
}

function seedMeetings(db: DatabaseSync): void {
  const fixture = readJson<{ meetings: RawMeeting[] }>(
    fixturePath('data', 'mock', 'MeetingsMock.json'),
  );
  const repo = createMeetingsRepository(db);

  for (const row of fixture?.meetings ?? []) {
    if (!Number.isFinite(row.dayOffset)) continue;

    repo.create({
      title: row.title,
      titleAr: row.titleAr ?? null,
      description: row.description,
      descriptionAr: row.descriptionAr ?? null,
      date: dateKey(row.dayOffset),
      time: row.time,
      durationMinutes: row.durationMinutes,
      meetLink: row.meetLink,
      organizer: row.organizer,
      organizerAr: row.organizerAr ?? null,
      location: row.location,
      locationAr: row.locationAr ?? null,
      attendees: (row.attendees ?? []).map((attendee) => ({
        name: attendee.name,
        nameAr: attendee.nameAr ?? null,
        avatar: attendee.avatar ?? null,
        userId: null,
        status: 'invited' as const,
      })),
    });
  }
}

function seedStudentQuran(db: DatabaseSync): void {
  const student = 'demo-student';
  const repo = createQuranRepository(db);

  // Shaped like a student working through Juz' Amma first: short surahs are
  // complete, the long middle is patchy. Deterministic so screenshots and tests
  // do not drift between launches.
  const percentFor = (surahNumber: number): number => {
    if (surahNumber >= 112) return 100;
    if (surahNumber >= 78) return Math.min(100, 60 + ((surahNumber * 7) % 41));
    if (surahNumber <= 20) return (surahNumber * 11) % 101;

    return (surahNumber * 13 + 17) % 61;
  };

  seedProgress(
    db,
    student,
    (surahNumber) => 2 + ((surahNumber * 7) % 40),
    percentFor,
  );

  repo.createBookmark(student, {
    id: 'bookmark-fatiha',
    surah: 1,
    ayah: 1,
    absoluteNumber: 1,
    label: 'الفاتحة',
  });
  repo.createBookmark(student, {
    id: 'bookmark-ikhlas',
    surah: 112,
    ayah: 1,
    absoluteNumber: 6222,
    label: 'الإخلاص',
  });

  repo.saveNote(student, {
    id: 'note-fatiha-1',
    surah: 1,
    ayah: 1,
    absoluteNumber: 1,
    text: 'بسم الله الرحمن الرحيم — بداية كل شيء بخير.',
    createdAt: Date.now() - 86_400_000,
  });
  repo.saveNote(student, {
    id: 'note-ikhlas-1',
    surah: 112,
    ayah: 1,
    absoluteNumber: 6222,
    text: 'قل هو الله أحد — أسهل سورة للحفظ في البداية.',
    createdAt: Date.now() - 3_600_000,
  });
}
