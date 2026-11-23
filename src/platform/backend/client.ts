import type {
  HttpClient,
  HttpRequestInit,
  RequestOptions,
} from '@/platform/http';
import {
  HttpAbortError,
  HttpError,
  HttpTimeoutError,
  PROBE_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  defaultHttpClient,
} from '@/platform/http';
import { STORAGE_KEYS, storageService } from '@/platform/storage';
import type { StorageService } from '@/platform/storage';
import { backendBaseUrl } from './config';
import {
  BackendError,
  type AccountResponse,
  type AccountsResponse,
  type AuthSessionResponse,
  type AyahResponse,
  type BackendAccount,
  type BackendAccountPatch,
  type BackendBookmark,
  type BackendErrorCode,
  type BackendFeatureChange,
  type BackendFeatureConfig,
  type BackendHealth,
  type BackendRequestOptions,
  type BookmarkResponse,
  type BookmarksResponse,
  type CatalogResponse,
  type EventsResponse,
  type MeetingResponse,
  type MeetingsResponse,
  type NoteResponse,
  type NoticesResponse,
  type NotesResponse,
  type ProgressListResponse,
  type ProgressResponse,
  type SurahResponse,
  type UserResponse,
} from './types';
import type { Meeting, UserRole } from '@/core/types';

/**
 * The single HTTP entrypoint to the mock backend.
 *
 * Everything the app sends to the backend goes through this class: token
 * persistence, JSON encoding, query strings and error normalization live here
 * and nowhere else. Repositories and hooks never call `fetch` directly.
 *
 * Reads accept `RequestOptions` so a query can cancel its request when the
 * screen that asked for it goes away. Writes do not: a half-cancelled write is
 * worse than a late one.
 *
 * The token is kept in memory after the first read. A cold start hydrates it
 * from `storageService`, which is AsyncStorage on native and localStorage on
 * web, the same persistence the Firebase SDK gives the real session.
 */

const VALID_CODES: readonly BackendErrorCode[] = [
  'invalid-argument',
  'unauthenticated',
  'permission-denied',
  'not-found',
  'already-exists',
  'failed-precondition',
  'unavailable',
  'internal',
];

type ErrorEnvelope = {
  error?: { code?: string; message?: string; details?: unknown };
};

function isBackendErrorCode(value: unknown): value is BackendErrorCode {
  return VALID_CODES.some((code) => code === value);
}

function queryString(
  query: Record<string, string | number | boolean | undefined> | undefined,
): string {
  if (!query) return '';

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }

  const serialized = params.toString();

  return serialized ? `?${serialized}` : '';
}

export class BackendClient {
  private readonly http: HttpClient;
  private readonly storage: StorageService;
  private readonly baseUrl: string;
  private readonly storageKey: typeof STORAGE_KEYS.backendSession;
  private token: string | null = null;
  private hydrated: Promise<void> | null = null;
  private tokenTouched = false;

  constructor(
    options: {
      http?: HttpClient;
      storage?: StorageService;
      baseUrl?: string;
      storageKey?: typeof STORAGE_KEYS.backendSession;
    } = {},
  ) {
    this.http = options.http ?? defaultHttpClient;
    this.storage = options.storage ?? storageService;
    this.baseUrl = (options.baseUrl ?? backendBaseUrl()).replace(/\/+$/, '');
    this.storageKey = options.storageKey ?? STORAGE_KEYS.backendSession;
  }

  /** Reads the persisted token exactly once per process. */
  hydrateToken(): Promise<void> {
    this.hydrated ??= this.storage
      .getItem<string | null>(this.storageKey, null)
      .then((stored) => {
        // A sign-in that finished while the storage read was in flight wins.
        if (!this.tokenTouched) this.token = stored;
      });

    return this.hydrated;
  }

  getToken(): string | null {
    return this.token;
  }

  async setToken(token: string | null): Promise<void> {
    this.tokenTouched = true;
    this.token = token;
    this.hydrated ??= Promise.resolve();

    if (token) {
      await this.storage.setItem(this.storageKey, token);
    } else {
      await this.storage.removeItem(this.storageKey);
    }
  }

  /** Exposed so a caller can show the resolved URL in a diagnostics panel. */
  get url(): string {
    return this.baseUrl;
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: BackendRequestOptions = {},
  ): Promise<T> {
    await this.hydrateToken();

    const headers: Record<string, string> = {
      accept: 'application/json',
    };

    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
    }

    if (options.auth !== false && this.token) {
      headers.authorization = `Bearer ${this.token}`;
    }

    const init: HttpRequestInit = {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      timeoutMs: options.timeoutMs ?? REQUEST_TIMEOUT_MS,
    };

    try {
      return await this.http.request<T>(
        `${this.baseUrl}${path}${queryString(options.query)}`,
        init,
      );
    } catch (error) {
      throw toBackendError(error);
    }
  }

  /* ── auth ─────────────────────────────────────────────────────────── */

  register(input: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<AuthSessionResponse> {
    return this.request('POST', '/v1/auth/register', {
      body: input,
      auth: false,
    });
  }

  login(input: {
    email: string;
    password: string;
  }): Promise<AuthSessionResponse> {
    return this.request('POST', '/v1/auth/login', {
      body: input,
      auth: false,
    });
  }

  loginWithGoogle(): Promise<AuthSessionResponse> {
    return this.request('POST', '/v1/auth/google', { auth: false });
  }

  logout(): Promise<{ signedOut: boolean }> {
    return this.request('POST', '/v1/auth/logout');
  }

  session(options: RequestOptions = {}): Promise<UserResponse> {
    return this.request('GET', '/v1/auth/session', { signal: options.signal });
  }

  updateAuthProfile(patch: {
    displayName?: string | null;
    photoURL?: string | null;
    phoneNumber?: string | null;
  }): Promise<UserResponse> {
    return this.request('PATCH', '/v1/auth/profile', { body: patch });
  }

  /* ── accounts ─────────────────────────────────────────────────────── */

  getAccount(
    uid: string,
    options: RequestOptions = {},
  ): Promise<AccountResponse> {
    return this.request('GET', `/v1/accounts/${encodeURIComponent(uid)}`, {
      signal: options.signal,
    });
  }

  getMyAccount(options: RequestOptions = {}): Promise<AccountResponse> {
    return this.request('GET', '/v1/accounts/me', { signal: options.signal });
  }

  updateMyAccount(patch: BackendAccountPatch): Promise<AccountResponse> {
    return this.request('PATCH', '/v1/accounts/me', { body: patch });
  }

  listAccounts(
    query: {
      role?: UserRole;
      q?: string;
      limit?: number;
      offset?: number;
    } = {},
    options: RequestOptions = {},
  ): Promise<AccountsResponse> {
    return this.request('GET', '/v1/accounts', {
      query,
      signal: options.signal,
    });
  }

  createAccount(input: {
    email: string;
    password: string;
    displayName?: string;
    role?: UserRole;
    phoneNumber?: string | null;
  }): Promise<{ account: BackendAccount }> {
    return this.request('POST', '/v1/accounts', { body: input });
  }

  updateAccount(
    uid: string,
    patch: BackendAccountPatch,
  ): Promise<AccountResponse> {
    return this.request('PATCH', `/v1/accounts/${encodeURIComponent(uid)}`, {
      body: patch,
    });
  }

  deleteAccount(uid: string): Promise<void> {
    return this.request('DELETE', `/v1/accounts/${encodeURIComponent(uid)}`);
  }

  /**
   * Self-service deletion, distinct from an administrator removing a member.
   *
   * `/v1/auth/account` revokes every session for the caller first; the admin
   * route refuses to delete the caller at all. The UI must send a signed-in user
   * here, never to `deleteAccount`.
   */
  deleteMyAuthAccount(): Promise<{ deleted: boolean }> {
    return this.request('DELETE', '/v1/auth/account');
  }

  /* ── meetings ─────────────────────────────────────────────────────── */

  listMeetings(
    query: { date?: string; from?: string; to?: string } = {},
    options: RequestOptions = {},
  ): Promise<MeetingsResponse> {
    return this.request('GET', '/v1/meetings', {
      query,
      signal: options.signal,
    });
  }

  /**
   * The inbox, one page at a time. Deliberately the slowest read in the demo
   * backend: the waiting state on the panel is a product surface, and the paging
   * spinner depends on it being slow.
   */
  listNotices(
    query: { page?: number; limit?: number; extended?: boolean } = {},
    options: RequestOptions = {},
  ): Promise<NoticesResponse> {
    return this.request('GET', '/v1/notices', {
      query,
      signal: options.signal,
    });
  }

  getMeeting(
    id: number,
    options: RequestOptions = {},
  ): Promise<MeetingResponse> {
    return this.request('GET', `/v1/meetings/${id}`, {
      signal: options.signal,
    });
  }

  createMeeting(
    input: Partial<Meeting> & {
      title: string;
      date: string;
      time: string;
      durationMinutes: number;
    },
  ): Promise<MeetingResponse> {
    return this.request('POST', '/v1/meetings', { body: input });
  }

  updateMeeting(id: number, patch: Partial<Meeting>): Promise<MeetingResponse> {
    return this.request('PATCH', `/v1/meetings/${id}`, { body: patch });
  }

  deleteMeeting(id: number): Promise<void> {
    return this.request('DELETE', `/v1/meetings/${id}`);
  }

  rsvp(id: number, going = true): Promise<MeetingResponse> {
    return this.request('POST', `/v1/meetings/${id}/rsvp`, {
      body: { going },
    });
  }

  unrsvp(id: number): Promise<MeetingResponse> {
    return this.request('DELETE', `/v1/meetings/${id}/rsvp`);
  }

  /* ── Qur'an ───────────────────────────────────────────────────────── */

  getQuranCatalog(options: RequestOptions = {}): Promise<CatalogResponse> {
    return this.request('GET', '/v1/quran/catalog', { signal: options.signal });
  }

  getSurah(
    number: number,
    options: RequestOptions = {},
  ): Promise<SurahResponse> {
    return this.request('GET', `/v1/quran/surahs/${number}`, {
      signal: options.signal,
    });
  }

  getAyah(
    absoluteNumber: number,
    options: RequestOptions = {},
  ): Promise<AyahResponse> {
    return this.request('GET', `/v1/quran/ayahs/${absoluteNumber}`, {
      signal: options.signal,
    });
  }

  listProgress(options: RequestOptions = {}): Promise<ProgressListResponse> {
    return this.request('GET', '/v1/quran/progress', {
      signal: options.signal,
    });
  }

  putProgress(input: {
    surahNumber: number;
    percent: number;
    lastReviewed?: string | null;
  }): Promise<ProgressResponse> {
    return this.request('PUT', `/v1/quran/progress/${input.surahNumber}`, {
      body: input,
    });
  }

  removeProgress(surahNumber: number): Promise<void> {
    return this.request('DELETE', `/v1/quran/progress/${surahNumber}`);
  }

  listBookmarks(options: RequestOptions = {}): Promise<BookmarksResponse> {
    return this.request('GET', '/v1/quran/bookmarks', {
      signal: options.signal,
    });
  }

  createBookmark(input: {
    id?: string;
    surah: number;
    ayah: number;
    absoluteNumber: number;
    label?: string | null;
  }): Promise<BookmarkResponse> {
    return this.request('POST', '/v1/quran/bookmarks', { body: input });
  }

  updateBookmark(
    id: string,
    patch: Partial<Pick<BackendBookmark, 'label' | 'ayah' | 'absoluteNumber'>>,
  ): Promise<BookmarkResponse> {
    return this.request(
      'PATCH',
      `/v1/quran/bookmarks/${encodeURIComponent(id)}`,
      { body: patch },
    );
  }

  deleteBookmark(id: string): Promise<void> {
    return this.request(
      'DELETE',
      `/v1/quran/bookmarks/${encodeURIComponent(id)}`,
    );
  }

  listNotes(
    absoluteNumber?: number,
    options: RequestOptions = {},
  ): Promise<NotesResponse> {
    return this.request('GET', '/v1/quran/notes', {
      query: absoluteNumber === undefined ? {} : { absoluteNumber },
      signal: options.signal,
    });
  }

  saveNote(input: {
    id?: string;
    surah: number;
    ayah: number;
    absoluteNumber: number;
    text: string;
    createdAt?: number;
  }): Promise<NoteResponse> {
    return this.request('POST', '/v1/quran/notes', { body: input });
  }

  updateNote(id: string, text: string): Promise<NoteResponse> {
    return this.request('PATCH', `/v1/quran/notes/${encodeURIComponent(id)}`, {
      body: { text },
    });
  }

  deleteNote(id: string): Promise<void> {
    return this.request('DELETE', `/v1/quran/notes/${encodeURIComponent(id)}`);
  }

  /* ── system ───────────────────────────────────────────────────────── */

  health(options: RequestOptions = {}): Promise<BackendHealth> {
    return this.request('GET', '/health', {
      auth: false,
      timeoutMs: PROBE_TIMEOUT_MS,
      signal: options.signal,
    });
  }

  /* ── remote feature control ───────────────────────────────────────── */

  /**
   * The flag document.
   *
   * Unauthenticated on purpose: a kill switch has to apply before sign-in, and
   * a signed-out client must be able to learn that sign-in itself is paused.
   */
  getFeatureConfig(
    options: RequestOptions = {},
  ): Promise<BackendFeatureConfig> {
    return this.request('GET', '/v1/config/features', {
      auth: false,
      signal: options.signal,
    });
  }

  saveFeatureChanges(
    changes: readonly BackendFeatureChange[],
  ): Promise<BackendFeatureConfig> {
    return this.request('PUT', '/v1/config/features', { body: { changes } });
  }

  /**
   * Firebase-callable style invocation.
   *
   * Returns the inner `result` so a caller does not have to unwrap the
   * envelope; errors take the same `BackendError` path as REST.
   */
  async callFunction<T = unknown>(
    name: string,
    data?: unknown,
    options: {
      params?: Record<string, string>;
      query?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const response = await this.request<{ result: T }>(
      'POST',
      `/v1/functions/${encodeURIComponent(name)}`,
      { body: { data, params: options.params, query: options.query } },
    );

    return response.result;
  }

  /** Polling transport. `since` is the last event id seen. */
  pollEvents(since: number, signal?: AbortSignal): Promise<EventsResponse> {
    return this.request('GET', '/v1/events', {
      query: { since },
      signal,
    });
  }

  /**
   * The address of the server-sent event stream, or `null` without a session.
   *
   * `EventSource` cannot send an `Authorization` header, so the session token
   * travels in the query string. That is a platform limit, recorded in
   * `docs/external-requests.md`. The URL never reaches the request log (the
   * stream is not an `HttpClient` request), and a real backend should replace
   * it with a single-use stream ticket.
   */
  eventStreamUrl(since: number): string | null {
    if (!this.token) return null;

    return `${this.baseUrl}/v1/events/stream?token=${encodeURIComponent(
      this.token,
    )}&since=${since}`;
  }
}

function toBackendError(error: unknown): never {
  if (error instanceof HttpAbortError) throw error;

  if (error instanceof HttpTimeoutError) {
    throw new BackendError(
      'timeout',
      'The mock backend did not answer in time',
      0,
    );
  }

  if (error instanceof HttpError) {
    const envelope = error.body as ErrorEnvelope | undefined;
    const code = envelope?.error?.code;

    throw new BackendError(
      isBackendErrorCode(code) ? code : 'internal',
      envelope?.error?.message ?? `Request failed with status ${error.status}`,
      error.status,
      envelope?.error?.details,
    );
  }

  if (error instanceof BackendError) throw error;

  throw new BackendError(
    'network',
    error instanceof Error ? error.message : 'The mock backend is unreachable',
  );
}

export const backendClient = new BackendClient();
