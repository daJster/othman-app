import type { AccountProfile } from '@/core/domain/account/merge-profile';
import type { QuranNote } from '@/core/domain/notes/notes';
import type { SurahProgress } from '@/core/domain/progress/surah-progress';
import type {
  AccountData,
  AuthUser,
  AyahContent,
  BookContentType,
  ContentBody,
  ContentSource,
  ContentType,
  DateKey,
  EditionBboxes,
  Meeting,
  QuranEdition,
  SurahInfoSection,
  UserRole,
} from '@/core/types';
import { backendClient } from '@/platform/backend';
import type {
  AccountResponse,
  AccountsResponse,
  AyahResponse,
  BackendAccountPatch,
  BackendHealth,
  BookmarkResponse,
  BookmarksResponse,
  CatalogResponse,
  MeetingResponse,
  MeetingsResponse,
  NoteResponse,
  NotesResponse,
  ProgressListResponse,
  ProgressResponse,
  SurahResponse,
} from '@/platform/backend';
import { circleService, type CircleItem } from '@/services/circle';
import { meetingsService } from '@/services/meetings';
import { notesService } from '@/services/notes';
import { profileService } from '@/services/profile';
import { progressService } from '@/services/progress';
import { queryKeys } from '@/services/query';
import { quranService, type QuranCatalog } from '@/services/quran';
import { tafsirService } from '@/services/tafsir';
import type { ApiMutation, ApiQuery, NoParams } from './types';

/**
 * The command registry.
 *
 * Every HTTP request the app can issue is declared here exactly once: its cache
 * key, its strategy, its guard, where the bytes come from, and what a successful
 * write invalidates. Screens do not build query objects; they name a command:
 *
 *     useApiQuery(api.meetings.byDate, { date })
 *     useApiMutation(api.accounts.update).mutate({ uid, patch })
 *
 * Two sources feed the registry, and the split is deliberate:
 *
 *  - **`api.*`** — what the *UI* reads. These call the service barrels, so the
 *    `EXPO_PUBLIC_MOCK_BACKEND` switch keeps working: a screen asks for "the
 *    circle" and the service decides whether that is a fixture or the server.
 *  - **`api.demo.*`** — the mock server's own surface (administration, health,
 *    raw rows). Marked `demo: true`, which disables the query when the flag is
 *    off instead of producing a connection error. Nothing in the app depends on
 *    these yet; they exist so the demo server's contract has one typed home.
 *
 * Why a registry instead of one hook per endpoint: the fetching *strategy* was
 * previously reinvented in every hook, and invalidation rules lived in whichever
 * mutation happened to run. Both are facts about the command, not about the
 * screen, so both are written next to the command.
 */

/** Both wires are needed: the absolute number keys the cache, the local pair is
 * what the book endpoints accept. */
export type TafsirAyah = {
  surah: number;
  /** Ayah-in-surah, 1-286. */
  ayah: number;
  /** Absolutely unique ayah, 1-6236. */
  absoluteNumber: number;
};

const ANONYMOUS = 'anonymous';

/**
 * A meeting write also invalidates the service's day cache.
 *
 * The TanStack keys below can be invalidated declaratively, but the cache
 * inside `meetingsService` sits underneath them: a refetch through that cache
 * replays the pre-write day. Clearing it inside the command's `run` means the
 * invalidation that follows is guaranteed to be a real read.
 */
async function meetingWrite<T>(request: Promise<T>): Promise<T> {
  const result = await request;
  meetingsService.invalidate();

  return result;
}

/** Identity helpers: they exist to give the object literal its type at the
 * declaration site, so a missing `run` or a wrong key is an error here rather
 * than at a screen three files away. */
function query<P, R>(endpoint: ApiQuery<P, R>): ApiQuery<P, R> {
  return endpoint;
}

function mutation<P, R>(endpoint: ApiMutation<P, R>): ApiMutation<P, R> {
  return endpoint;
}

export const api = {
  /* ── the signed-in account ─────────────────────────────────────────── */

  account: {
    /**
     * The auth record merged with the profile. Keyed by uid, so account A's
     * response can never be served under account B.
     */
    byUid: query<{ user: AuthUser | null }, AccountData>({
      id: 'account.byUid',
      policy: 'default',
      key: ({ user }) => queryKeys.account.byUid(user?.uid ?? ANONYMOUS),
      ready: ({ user }) => user !== null,
      run: ({ user }) => {
        if (!user) throw new Error('account requested without a session');

        return profileService.getAccount(user);
      },
    }),

    /**
     * A partial profile write.
     *
     * Invalidates instead of writing the response into the cache: the store
     * merges the patch with fields this call does not know about, so the only
     * correct next read is a refetch.
     */
    update: mutation<{ uid: string; patch: Partial<AccountProfile> }, void>({
      id: 'account.update',
      run: ({ uid, patch }) => profileService.update(uid, patch),
      invalidates: ({ uid }) => [queryKeys.account.byUid(uid)],
    }),
  },

  /* ── meetings ──────────────────────────────────────────────────────── */

  meetings: {
    byDate: query<{ date: DateKey }, Meeting[]>({
      id: 'meetings.byDate',
      policy: 'live',
      key: ({ date }) => queryKeys.meetings.byDate(date),
      run: ({ date }) => meetingsService.listByDate(date),
    }),

    /** One read for the calendar's density window, not 42 per-day reads. */
    range: query<{ from: DateKey; to: DateKey }, Meeting[]>({
      id: 'meetings.range',
      policy: 'live',
      key: ({ from, to }) => queryKeys.meetings.range(from, to),
      run: ({ from, to }) => meetingsService.listByRange(from, to),
    }),
  },

  /* ── the circle ────────────────────────────────────────────────────── */

  circle: {
    list: query<NoParams, CircleItem[]>({
      id: 'circle.list',
      policy: 'live',
      key: () => queryKeys.circle.list,
      run: () => circleService.list(),
    }),
  },

  /* ── progress ──────────────────────────────────────────────────────── */

  progress: {
    surah: query<NoParams, SurahProgress[]>({
      id: 'progress.surah',
      policy: 'session',
      key: () => queryKeys.progress.surah,
      run: () => progressService.listSurahProgress(),
    }),
  },

  /* ── Qur'an (public, immutable) ────────────────────────────────────── */

  quran: {
    catalog: query<NoParams, QuranCatalog>({
      id: 'quran.catalog',
      policy: 'static',
      key: () => queryKeys.quran.catalog,
      run: () => quranService.loadCatalog(),
    }),

    /** Both bbox tables of one edition — the multi-megabyte payloads. */
    bboxes: query<{ edition: QuranEdition | null }, EditionBboxes>({
      id: 'quran.bboxes',
      policy: 'static',
      key: ({ edition }) => queryKeys.quran.bboxes(edition?.key ?? 'none'),
      ready: ({ edition }) => edition !== null,
      run: ({ edition }) => {
        if (!edition) throw new Error('bboxes requested without an edition');

        return quranService.loadBboxes(edition);
      },
    }),

    ayah: query<{ absoluteNumber: number | null }, AyahContent>({
      id: 'quran.ayah',
      policy: 'static',
      key: ({ absoluteNumber }) => queryKeys.quran.ayah(absoluteNumber ?? 0),
      ready: ({ absoluteNumber }) => absoluteNumber !== null,
      run: ({ absoluteNumber }) => {
        if (absoluteNumber === null) {
          throw new Error('ayah content requested without a selection');
        }

        return quranService.loadAyah(absoluteNumber);
      },
    }),
  },

  /* ── tafsir / e3rab / translation ──────────────────────────────────── */

  tafsir: {
    /**
     * Option lists. Keyed by type + absolute ayah: switching type starts a
     * different query, so one type's list can never answer for another.
     */
    sources: query<
      { type: ContentType; ayah: TafsirAyah | null },
      ContentSource[]
    >({
      id: 'tafsir.sources',
      policy: 'static',
      key: ({ type, ayah }) =>
        queryKeys.tafsir.sources(type, ayah?.absoluteNumber ?? 0),
      ready: ({ type, ayah }) => ayah !== null && type !== 'surah',
      run: ({ type, ayah }) => {
        if (!ayah) throw new Error('sources requested without an ayah');

        return tafsirService.sources(type as BookContentType, {
          surah: ayah.surah,
          ayah: ayah.ayah,
        });
      },
    }),

    /** One source's body. A source id only means something inside its type, so
     * the type is part of the key. */
    content: query<
      { type: ContentType; ayah: TafsirAyah | null; sourceId: number | null },
      ContentBody
    >({
      id: 'tafsir.content',
      policy: 'static',
      key: ({ type, ayah, sourceId }) =>
        queryKeys.tafsir.content(
          type,
          ayah?.absoluteNumber ?? 0,
          sourceId ?? 0,
        ),
      ready: ({ type, ayah, sourceId }) =>
        ayah !== null && type !== 'surah' && sourceId !== null,
      run: ({ type, ayah, sourceId }) => {
        if (!ayah || sourceId === null) {
          throw new Error('content requested without a selection');
        }

        return tafsirService.content(
          type as BookContentType,
          {
            surah: ayah.surah,
            ayah: ayah.ayah,
          },
          sourceId,
        );
      },
    }),

    /** Surah-level information; only fetched while the `surah` type is open. */
    surah: query<{ surah: number | null }, SurahInfoSection[]>({
      id: 'tafsir.surah',
      policy: 'static',
      key: ({ surah }) => queryKeys.tafsir.surah(surah ?? 0),
      ready: ({ surah }) => surah !== null,
      run: ({ surah }) => {
        if (surah === null) {
          throw new Error('surah information requested without a selection');
        }

        return tafsirService.surahInfo(surah);
      },
    }),
  },

  /* ── notes ─────────────────────────────────────────────────────────── */

  notes: {
    /**
     * Notes for one ayah *in one namespace*. The namespace is in the key, not
     * a filter applied afterwards: account A's cached list must not be readable
     * under account B's key.
     */
    byAyah: query<
      { namespace: string; absoluteNumber: number | null },
      QuranNote[]
    >({
      id: 'notes.byAyah',
      policy: 'default',
      key: ({ namespace, absoluteNumber }) =>
        queryKeys.notes.byAyah(namespace, absoluteNumber ?? 0),
      ready: ({ absoluteNumber }) => absoluteNumber !== null,
      run: async ({ namespace, absoluteNumber }) => {
        const notes = await notesService.list(namespace);

        return notes.filter(
          (note) => note.ayah.absoluteNumber === absoluteNumber,
        );
      },
    }),

    save: mutation<{ namespace: string; note: QuranNote }, QuranNote>({
      id: 'notes.save',
      run: ({ namespace, note }) => notesService.save(namespace, note),
      invalidates: ({ namespace, note }) => [
        queryKeys.notes.byAyah(namespace, note.ayah.absoluteNumber),
      ],
    }),
  },

  /* ── the mock backend's own surface ────────────────────────────────── */

  demo: {
    /** Liveness of the local server. Polled: the poll *is* the retry. */
    health: query<NoParams, BackendHealth>({
      id: 'demo.health',
      policy: 'probe',
      key: () => queryKeys.backend.health,
      run: () => backendClient.health(),
      demo: true,
    }),

    accounts: {
      list: query<
        {
          role?: UserRole;
          q?: string;
          limit?: number;
          offset?: number;
        },
        AccountsResponse
      >({
        id: 'demo.accounts.list',
        policy: 'session',
        key: (params) => queryKeys.backend.accounts(params),
        run: (params) => backendClient.listAccounts(params),
        demo: true,
      }),

      byUid: query<{ uid: string | null }, AccountResponse>({
        id: 'demo.accounts.byUid',
        policy: 'session',
        key: ({ uid }) => queryKeys.backend.account(uid ?? ANONYMOUS),
        ready: ({ uid }) => uid !== null,
        run: ({ uid }) => {
          if (!uid) throw new Error('account requested without a uid');

          return backendClient.getAccount(uid);
        },
        demo: true,
      }),

      create: mutation<
        {
          email: string;
          password: string;
          displayName?: string;
          role?: UserRole;
          phoneNumber?: string | null;
        },
        { account: AccountResponse['account'] }
      >({
        id: 'demo.accounts.create',
        run: (input) => backendClient.createAccount(input),
        invalidates: () => [
          queryKeys.backend.accountsRoot,
          queryKeys.account.root,
        ],
        demo: true,
      }),

      update: mutation<
        { uid: string; patch: BackendAccountPatch },
        AccountResponse
      >({
        id: 'demo.accounts.update',
        run: ({ uid, patch }) => backendClient.updateAccount(uid, patch),
        invalidates: ({ uid }) => [
          queryKeys.backend.account(uid),
          queryKeys.backend.accountsRoot,
          queryKeys.account.root,
        ],
        demo: true,
      }),

      remove: mutation<{ uid: string }, void>({
        id: 'demo.accounts.remove',
        run: ({ uid }) => backendClient.deleteAccount(uid),
        invalidates: () => [
          queryKeys.backend.accountsRoot,
          queryKeys.backend.accountRoot,
          queryKeys.account.root,
        ],
        demo: true,
      }),

      me: query<NoParams, AccountResponse>({
        id: 'demo.accounts.me',
        policy: 'session',
        key: () => queryKeys.backend.account('me'),
        run: () => backendClient.getMyAccount(),
        demo: true,
      }),

      updateMe: mutation<BackendAccountPatch, AccountResponse>({
        id: 'demo.accounts.updateMe',
        run: (patch) => backendClient.updateMyAccount(patch),
        invalidates: () => [
          queryKeys.backend.accountRoot,
          queryKeys.account.root,
        ],
        demo: true,
      }),

      /**
       * Self-service deletion. Distinct from `remove`: the server revokes the
       * caller's sessions and the screen must sign out afterwards.
       */
      deleteMe: mutation<NoParams, { deleted: boolean }>({
        id: 'demo.accounts.deleteMe',
        run: () => backendClient.deleteMyAuthAccount(),
        invalidates: () => [queryKeys.backend.root],
        demo: true,
      }),
    },

    meetings: {
      list: query<
        { date?: string; from?: string; to?: string },
        MeetingsResponse
      >({
        id: 'demo.meetings.list',
        policy: 'session',
        key: (params) => queryKeys.backend.meetings(params),
        run: (params) => backendClient.listMeetings(params),
        demo: true,
      }),

      byId: query<{ id: number | null }, MeetingResponse>({
        id: 'demo.meetings.byId',
        policy: 'session',
        key: ({ id }) => queryKeys.backend.meeting(id ?? 0),
        ready: ({ id }) => id !== null,
        run: ({ id }) => {
          if (id === null) throw new Error('meeting requested without an id');

          return backendClient.getMeeting(id);
        },
        demo: true,
      }),

      create: mutation<
        Partial<Meeting> & {
          title: string;
          date: string;
          time: string;
          durationMinutes: number;
        },
        MeetingResponse
      >({
        id: 'demo.meetings.create',
        run: (input) => meetingWrite(backendClient.createMeeting(input)),
        invalidates: () => [
          queryKeys.backend.meetingsRoot,
          queryKeys.meetings.root,
        ],
        demo: true,
      }),

      update: mutation<
        { id: number; patch: Partial<Meeting> },
        MeetingResponse
      >({
        id: 'demo.meetings.update',
        run: ({ id, patch }) =>
          meetingWrite(backendClient.updateMeeting(id, patch)),
        invalidates: ({ id }) => [
          queryKeys.backend.meeting(id),
          queryKeys.backend.meetingsRoot,
          queryKeys.meetings.root,
        ],
        demo: true,
      }),

      remove: mutation<{ id: number }, void>({
        id: 'demo.meetings.remove',
        run: ({ id }) => meetingWrite(backendClient.deleteMeeting(id)),
        invalidates: () => [
          queryKeys.backend.meetingsRoot,
          queryKeys.backend.meetingRoot,
          queryKeys.meetings.root,
        ],
        demo: true,
      }),

      rsvp: mutation<{ id: number; going: boolean }, MeetingResponse>({
        id: 'demo.meetings.rsvp',
        run: ({ id, going }) =>
          meetingWrite(
            going ? backendClient.rsvp(id) : backendClient.unrsvp(id),
          ),
        invalidates: ({ id }) => [
          queryKeys.backend.meeting(id),
          queryKeys.backend.meetingsRoot,
          queryKeys.meetings.root,
        ],
        demo: true,
      }),
    },

    quran: {
      catalog: query<NoParams, CatalogResponse>({
        id: 'demo.quran.catalog',
        policy: 'static',
        key: () => queryKeys.backend.quran.catalog,
        run: () => backendClient.getQuranCatalog(),
        demo: true,
      }),

      surah: query<{ number: number | null }, SurahResponse>({
        id: 'demo.quran.surah',
        policy: 'static',
        key: ({ number }) => queryKeys.backend.quran.surah(number ?? 0),
        ready: ({ number }) => number !== null,
        run: ({ number }) => {
          if (number === null)
            throw new Error('surah requested without a number');

          return backendClient.getSurah(number);
        },
        demo: true,
      }),

      ayah: query<{ absoluteNumber: number | null }, AyahResponse>({
        id: 'demo.quran.ayah',
        policy: 'static',
        key: ({ absoluteNumber }) =>
          queryKeys.backend.quran.ayah(absoluteNumber ?? 0),
        ready: ({ absoluteNumber }) => absoluteNumber !== null,
        run: ({ absoluteNumber }) => {
          if (absoluteNumber === null) {
            throw new Error('ayah requested without a number');
          }

          return backendClient.getAyah(absoluteNumber);
        },
        demo: true,
      }),

      progress: query<NoParams, ProgressListResponse>({
        id: 'demo.quran.progress',
        policy: 'session',
        key: () => queryKeys.backend.quran.progress,
        run: () => backendClient.listProgress(),
        demo: true,
      }),

      putProgress: mutation<
        { surahNumber: number; percent: number; lastReviewed?: string | null },
        ProgressResponse
      >({
        id: 'demo.quran.putProgress',
        run: ({ surahNumber, ...rest }) =>
          backendClient.putProgress({ surahNumber, ...rest }),
        invalidates: () => [
          queryKeys.backend.quran.progress,
          queryKeys.progress.root,
        ],
        demo: true,
      }),

      removeProgress: mutation<{ surahNumber: number }, void>({
        id: 'demo.quran.removeProgress',
        run: ({ surahNumber }) => backendClient.removeProgress(surahNumber),
        invalidates: () => [
          queryKeys.backend.quran.progress,
          queryKeys.progress.root,
        ],
        demo: true,
      }),
    },

    bookmarks: {
      list: query<NoParams, BookmarksResponse>({
        id: 'demo.bookmarks.list',
        policy: 'session',
        key: () => queryKeys.backend.quran.bookmarks,
        run: () => backendClient.listBookmarks(),
        demo: true,
      }),

      create: mutation<
        {
          id?: string;
          surah: number;
          ayah: number;
          absoluteNumber: number;
          label?: string | null;
        },
        BookmarkResponse
      >({
        id: 'demo.bookmarks.create',
        run: (input) => backendClient.createBookmark(input),
        invalidates: () => [queryKeys.backend.quran.bookmarks],
        demo: true,
      }),

      update: mutation<
        {
          id: string;
          patch: {
            label?: string | null;
            ayah?: number;
            absoluteNumber?: number;
          };
        },
        BookmarkResponse
      >({
        id: 'demo.bookmarks.update',
        run: ({ id, patch }) => backendClient.updateBookmark(id, patch),
        invalidates: () => [queryKeys.backend.quran.bookmarks],
        demo: true,
      }),

      remove: mutation<{ id: string }, void>({
        id: 'demo.bookmarks.remove',
        run: ({ id }) => backendClient.deleteBookmark(id),
        invalidates: () => [queryKeys.backend.quran.bookmarks],
        demo: true,
      }),
    },

    notes: {
      list: query<{ absoluteNumber?: number }, NotesResponse>({
        id: 'demo.notes.list',
        policy: 'session',
        key: ({ absoluteNumber }) =>
          queryKeys.backend.quran.notes(absoluteNumber),
        run: ({ absoluteNumber }) => backendClient.listNotes(absoluteNumber),
        demo: true,
      }),

      save: mutation<
        {
          id?: string;
          surah: number;
          ayah: number;
          absoluteNumber: number;
          text: string;
          createdAt?: number;
        },
        NoteResponse
      >({
        id: 'demo.notes.save',
        run: (input) => backendClient.saveNote(input),
        // The reader panel reads through `notesService`; administration reads
        // through the demo namespace. Both go stale on any note write.
        invalidates: () => [
          queryKeys.backend.quran.notesRoot,
          queryKeys.notes.root,
        ],
        demo: true,
      }),

      update: mutation<{ id: string; text: string }, NoteResponse>({
        id: 'demo.notes.update',
        run: ({ id, text }) => backendClient.updateNote(id, text),
        invalidates: () => [
          queryKeys.backend.quran.notesRoot,
          queryKeys.notes.root,
        ],
        demo: true,
      }),

      remove: mutation<{ id: string }, void>({
        id: 'demo.notes.remove',
        run: ({ id }) => backendClient.deleteNote(id),
        invalidates: () => [
          queryKeys.backend.quran.notesRoot,
          queryKeys.notes.root,
        ],
        demo: true,
      }),
    },
  },
} as const;
