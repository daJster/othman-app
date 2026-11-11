/**
 * Wire contracts for the mock backend.
 *
 * These are deliberately duplicated from `src/core/types` instead of imported:
 * the server runs under plain Node (`node server/mockServer.ts`) and cannot
 * resolve the app's `@/` Metro alias. The duplication is bounded to the wire
 * shape, and the frontend repositories map these records onto the app's domain
 * types at the boundary.
 *
 * When the real Firebase Functions are extracted, this file becomes the shared
 * `@kuttab/contracts` package and the server keeps importing it — nothing else
 * in the server has to change.
 */

export type UserRole = 'guest' | 'user' | 'admin' | 'superadmin';

export type DateKey = string;

export type PublicUser = {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  phoneNumber: string | null;
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Document half of an account.
 *
 * Accounts are tabular (SQLite: identity, role, credentials) but the profile is
 * document-shaped (JSON store: free-form preferences). This split is intentional
 * and mirrors Firestore-vs-SQL in the target architecture.
 */
export type ProfileDocument = {
  bio: string | null;
  locale: 'ar' | 'en';
  notifications: boolean;
  updatedAt: string;
};

export type AccountRecord = PublicUser & {
  profile: ProfileDocument | null;
};

export type AttendeeRecord = {
  name: string;
  nameAr?: string;
  avatar?: string;
  userId: string | null;
  status: 'invited' | 'going' | 'declined';
};

export type MeetingStatus = 'soon' | 'upcoming' | 'scheduled' | 'past';

export type MeetingRecord = {
  id: number;
  title: string;
  titleAr?: string;
  description: string;
  descriptionAr?: string;
  date: DateKey;
  time: string;
  durationMinutes: number;
  meetLink: string;
  status: MeetingStatus;
  attendees: AttendeeRecord[];
  organizer: string;
  organizerAr?: string;
  location: string;
  locationAr?: string;
  createdAt: string;
  updatedAt: string;
};

export type SurahMetadataRecord = {
  number: number;
  name: string;
  nameEnglish: string;
  location: 'makka' | 'madina';
  ayahCount: number;
};

export type QuranEditionRecord = {
  key: string;
  name: string;
  riwaya: string;
  baseUrl: string;
  bboxUrl: string;
  bboxReversedUrl: string;
  bboxNormUrl: string;
  bboxReversedNormUrl: string;
  firstPage: number;
  lastPage: number;
  themeColor: string;
};

export type QuranCatalogRecord = {
  editions: Record<string, QuranEditionRecord>;
  surahs: Record<string, SurahMetadataRecord>;
};

export type AyahContentRecord = {
  absoluteNumber: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
};

export type QuranProgressRecord = {
  surahNumber: number;
  percent: number;
  lastReviewed: DateKey | null;
};

export type QuranBookmarkRecord = {
  id: string;
  surah: number;
  ayah: number;
  absoluteNumber: number;
  label: string | null;
  createdAt: string;
};

export type QuranNoteRecord = {
  id: string;
  ayah: {
    surah: number;
    ayah: number;
    absoluteNumber: number;
  };
  text: string;
  createdAt: number;
};

/** One server-published domain event. `id` is the polling cursor. */
export type DomainEvent = {
  id: number;
  type: string;
  payload: unknown;
  createdAt: string;
};

export type SessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type AuthContext = {
  user: PublicUser;
  token: string;
};
