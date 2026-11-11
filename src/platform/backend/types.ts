import type { AccountProfile } from '@/core/domain/account/merge-profile';
import type { QuranNote } from '@/core/domain/notes/notes';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import type {
  AyahContent,
  Meeting,
  QuranEdition,
  SurahMetadata,
  UserRole,
} from '@/core/types';

/**
 * Wire types for the mock backend.
 *
 * Field names mirror `src/core/types` so repositories can hand records to the UI
 * without a translation layer. Records the core does not model yet (accounts,
 * bookmarks, events) are declared here and exported through the service barrel.
 */

export type BackendUser = {
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

export type BackendProfile = {
  bio: string | null;
  locale: 'ar' | 'en';
  notifications: boolean;
  updatedAt: string;
};

export type BackendAccount = BackendUser & {
  profile: BackendProfile | null;
};

export type BackendSession = {
  user: BackendUser;
  token: string;
  expiresAt: string;
};

export type BackendAccountPatch = Partial<
  Pick<BackendUser, 'displayName' | 'photoURL' | 'phoneNumber'> & {
    role: UserRole;
    disabled: boolean;
  }
> & {
  profile?: Partial<Pick<BackendProfile, 'bio' | 'locale' | 'notifications'>>;
};

export type BackendQuranCatalog = {
  editions: Record<string, QuranEdition>;
  surahs: Record<string, SurahMetadata>;
};

export type BackendSurah = {
  surah: SurahMetadata;
  ayahs: AyahContent[];
};

export type BackendBookmark = {
  id: string;
  surah: number;
  ayah: number;
  absoluteNumber: number;
  label: string | null;
  createdAt: string;
};

export type BackendNote = QuranNote;

export type BackendEvent = {
  id: number;
  type: string;
  payload: unknown;
  createdAt: string;
};

export type BackendHealth = {
  ok: boolean;
  service: string;
  version: string;
  uptimeSeconds: number;
  time: string;
};

export type BackendErrorCode =
  | 'invalid-argument'
  | 'unauthenticated'
  | 'permission-denied'
  | 'not-found'
  | 'already-exists'
  | 'failed-precondition'
  | 'unavailable'
  | 'internal'
  | 'network'
  | 'timeout';

export class BackendError extends Error {
  readonly code: BackendErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(
    code: BackendErrorCode,
    message: string,
    status = 0,
    details?: unknown,
  ) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type BackendRequestOptions = {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Defaults to true: send the stored bearer token when there is one. */
  auth?: boolean;
};

/* Response envelopes, kept beside the DTOs so a repository never guesses. */
export type AuthSessionResponse = BackendSession;
export type UserResponse = { user: BackendUser };
export type AccountResponse = { account: BackendAccount };
export type AccountsResponse = { accounts: BackendUser[]; total: number };
export type MeetingsResponse = { meetings: Meeting[]; total: number };
export type MeetingResponse = { meeting: Meeting };
export type CatalogResponse = BackendQuranCatalog;
export type SurahResponse = BackendSurah;
export type AyahResponse = { ayah: AyahContent };
export type ProgressResponse = { progress: SurahProgress };
export type ProgressListResponse = { progress: SurahProgress[] };
export type BookmarkResponse = { bookmark: BackendBookmark };
export type BookmarksResponse = { bookmarks: BackendBookmark[] };
export type NoteResponse = { note: BackendNote };
export type NotesResponse = { notes: BackendNote[] };
export type EventsResponse = { events: BackendEvent[]; cursor: number };

/** Used by tests and by the profile repository's `update` bridge. */
export type ProfilePatch = Partial<AccountProfile>;
