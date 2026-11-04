# Plan 009: Give the reader a real reading log, and derive the day's hizb from it

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat de327df..HEAD -- src/features/quran/store src/platform/storage src/features/quran/history`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `de327df`, 2026-11-03
- **Issue**: —

## Why this matters

The Qur'an landing page is about to carry a resume card, a previous-readings
list, a daily hizb gauge and a reading-activity board. All four need the same
fact — *what did this person read, and when* — and the app currently persists
only the current page. Without this plan every module would invent its own
array of fake rows, and the four modules would disagree with each other the
first time a real page turn happened.

When this lands, the reader writes a small local log as the user reads, and a
pure selector turns that log into "today's pages", "hizb target met" and "the
last four positions". Mock data exists only as a *seed* for first run, so a
never-used install still renders believable modules.

## Current state

- `src/features/quran/store/reader-store.ts` — vanilla Zustand store. Owns
  `editionKey`, `page`, `surah`, `ayahKey`, `direction` and the actions.
  It imports no React. Excerpt of the fields:

  ```ts
  export type ReaderFields = {
    editionKey: string | null;
    page: number;
    surah: number;
    ayahKey: string | null;
    direction: PageTurnDirection;
  };
  ```

- `src/features/quran/store/use-reader.ts` — the React selector hooks over that
  store (`useReaderPage`, `useReaderSurah`, `useReaderEdition`,
  `useRestoreReader`). This file is the only place that knows how to read the
  store from a component.
- `src/platform/storage/storage.types.ts` — the persisted-key table and the
  `StorageService` interface:

  ```ts
  export const STORAGE_KEYS = {
    language: 'language',
    theme: 'theme',
    quranEdition: 'quranreader:edition',
    lastVisitedPage: 'lastVisitedPage',
    quranNotes: 'quran:notes',
  } as const;
  ```

- `src/platform/storage` — `storageService.getItem<T>(key, fallback)` /
  `setItem<T>(key, value)`. AsyncStorage on native, `localStorage` on web.
  Never touch `localStorage` directly; the service is the seam the tests mock.
- `src/core/domain/quran/surah.ts` — `QURAN_PAGE_COUNT` (604), `isSurahNumber`,
  `isAyahInSurah`. Use these rather than literals.
- Conventions to match:
  - **Pure domain logic lives in `src/core/domain/<area>/`** and is unit-tested
    there with no React. See `src/core/domain/progress/surah-progress.ts`.
  - **A Zustand vanilla store + a `use-*.ts` selector file** is the pattern for
    user state: see `src/features/quran/store/`.
  - **Every user-visible string goes through `t()`**, and both
    `src/i18n/locales/en/common.json` and `…/ar/common.json` must gain the key
    or `npm run check:i18n` fails.

## Commands you will need

| Purpose      | Command                  | Expected on success                    |
| ------------ | ------------------------ | -------------------------------------- |
| Typecheck    | `npm run typecheck`      | exit 0                                 |
| One test     | `npm test -- reading-log`| all pass                               |
| Whole suite  | `npm test`               | all pass                               |
| Lint         | `npm run lint`           | exit 0, no errors                      |
| i18n parity  | `npm run check:i18n`     | `en and ar agree on N keys`            |
| Full gate    | `npm run verify`         | exit 0                                 |

## Scope

**In scope**

- `src/platform/storage/storage.types.ts` (one new key)
- `src/core/domain/quran/reading-log.ts` (new, pure)
- `src/core/domain/quran/reading-log.test.ts` (new)
- `src/features/quran/history/reading-log.store.ts` (new)
- `src/features/quran/history/use-reading-log.ts` (new)
- `src/features/quran/history/seed.ts` (new, mock seed)
- `src/features/quran/history/__tests__/use-reading-log.test.tsx` (new)
- `src/features/quran/store/reader-store.ts` — one hook point only: after a page
  or ayah change settles, append to the log

**Out of scope**

- The reader UI (`reader-screen.tsx`, `reader-header.tsx`, `reader-footer.tsx`).
  Do not add UI here; this plan produces data only.
- The Qur'an landing page (`src/app/(tabs)/quran.tsx`) — plan 010 composes it.
- Any network call. This log is local state, never synced.

## Steps

### Step 1: Define the record and the pure selector

Create `src/core/domain/quran/reading-log.ts`:

```ts
export type ReadingEntry = {
  /** ISO date, `YYYY-MM-DD`, in the user's locale-independent form. */
  day: string;
  page: number;
  surah: number;
  ayahKey: string | null;
  editionKey: string | null;
  /** Epoch millis of the last time this position was written. */
  at: number;
};
```

Functions (all pure, no imports from `src/features`):

- `appendReading(log: ReadingEntry[], next: ReadingEntry): ReadingEntry[]` —
  replaces the entry for the same `day` (last position wins), prepends new days,
  and caps the list at 30 entries.
- `resumeEntry(log)` — the newest entry, or `null`.
- `previousEntries(log, max = 3)` — newest-first, excluding the newest.
- `pagesOn(log, day)` — count of distinct pages logged for a day. Because the
  log stores one entry per day, count pages from `readPages`.
- `hizbProgress(log, day, targetPages)` — `{ read, target, done }` where
  `read = pagesOn(...)` clamped to `target`, `done = read >= target`.

To make `pagesOn` meaningful, extend the record with
`readPages: number[]` (the pages visited that day, deduped, capped at 40). Every
write appends the page.

**Verify**: `npm test -- reading-log` → all pass (write the tests in Step 2
first if you prefer red-green; either order is acceptable as long as the test
file exists when you finish).

### Step 2: Test the pure module

`src/core/domain/quran/reading-log.test.ts`. Cases, each named:

1. `appends a new day at the front`
2. `replaces the same day instead of duplicating it` (read the last position)
3. `dedupes pages within a day`
4. `caps the log at 30 days`
5. `previousEntries returns at most three and never the resume`
6. `hizbProgress clamps read to the target`
7. `hizbProgress is done at exactly the target`

Use plain `describe`/`it`/`expect` like
`src/core/domain/progress/surah-progress.test.ts`.

**Verify**: `npm test -- reading-log` → 7 passing tests.

### Step 3: Seed data

Create `src/features/quran/history/seed.ts` exporting
`SEED_READING_LOG: ReadingEntry[]` — **eight** plausible days ending yesterday,
pages spread between 1 and 604, surahs consistent with the page (use the
ranges in `src/core/domain/quran/surah.ts`; do not invent a surah that cannot
own the page). Today is deliberately absent: today's entry must come from real
reading, so the resume card is honest about the current session.

This is the only mock in the plan. Name the export and the file comment so a
reader can see it is demo data:

```ts
/** Demo history used only when no real log exists yet. */
```

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Persist it

Add to `STORAGE_KEYS`: `quranReadingLog: 'quran:reading-log'`.

Create `src/features/quran/history/reading-log.store.ts`: a vanilla Zustand
store shaped like `reader-store.ts`, holding
`{ entries, ready }`, with `hydrate()` (reads storage, falls back to
`SEED_READING_LOG`), `record(entry)` (calls `appendReading`, writes storage
fire-and-forget) and `reset()` for tests. Do not create a React context.

**Verify**: `npm run typecheck` → exit 0.

### Step 5: The React hook

`src/features/quran/history/use-reading-log.ts` exports:

- `useReadingLog()` — `{ entries, ready }`.
- `useResumeEntry()`, `usePreviousEntries()`, `useDailyHizb(day, target = 10)`.
- `useHydrateReadingLog()` — calls `hydrate()` once; mirror
  `useRestoreReader()` in `src/features/quran/store/use-reader.ts`.

**Verify**: `npm run typecheck` → exit 0.

### Step 6: Record from the reader

In `reader-store.ts`, after `setPage`/`setAyah` have written their fields, call
a single `recordReading()` helper that builds a `ReadingEntry` from the current
fields and today's date and forwards it to the reading-log store. Import the
reading-log store lazily inside the action (not at module scope) to keep the
existing store module free of a second store's initialisation order.

Keep the write idempotent: two turns on the same page in the same day must not
grow `readPages` twice.

**Verify**: `npm test -- reader-store` → existing tests still pass; then
`npm test -- use-reading-log` → the new tests pass.

### Step 7: Hook test

`src/features/quran/history/__tests__/use-reading-log.test.tsx` — render a tiny
probe component under the store, assert: hydrate falls back to the seed when
storage is empty; `record()` updates the resume entry; `useDailyHizb` reports
`0/10` for an empty day and `done` at 10 pages. Mock storage with
`jest.mock('@/platform/storage', …)` the way `reader-store.test.ts` does.

**Verify**: `npm test -- use-reading-log` → all pass.

### Step 8: Full gate

**Verify**: `npm run verify` → typecheck, core purity, i18n (no new keys yet),
lint 0 errors, format, full suite green.

## Test plan

- New pure tests: `src/core/domain/quran/reading-log.test.ts` (7 cases above).
- New hook tests: `src/features/quran/history/__tests__/use-reading-log.test.tsx`.
- Structural pattern: `src/features/quran/__tests__/reader-store.test.ts`.
- No existing test should need changing. If `reader-store.test.ts` fails because
  the action now writes a log, fix the *test's* storage mock, not the behaviour.

## Done criteria

- [ ] `npm run verify` exits 0
- [ ] `reading-log.test.ts` covers the seven named cases
- [ ] `grep -rn "SEED_READING_LOG" src/` shows it imported only by the store's
      hydrate fallback
- [ ] `grep -rn "localStorage" src/features/quran` returns nothing
- [ ] No files outside the scope list modified (`git status`)

## STOP conditions

- `reader-store.ts` no longer matches the excerpted field list (the store was
  refactored).
- `storageService` is not the only persistence path (a direct AsyncStorage call
  is found in the reader).
- Writing to the log from the store action forces a React import into
  `reader-store.ts` — that file must stay React-free; report before changing it.
- The seed's surah/page pairs cannot be made consistent with
  `src/core/domain/quran/surah.ts`.

## Maintenance notes

- The log is capped at 30 days and 40 pages/day. If the activity board ever
  needs a year of history, this cap is the first thing to raise, and the storage
  payload size should be measured on web (`localStorage` is synchronous).
- The hizb target (10 pages) is a product number living in the plan; if it
  becomes configurable it belongs beside the other domain constants, not in a
  component.
- A reviewer should check that the store action write cannot throw into the
  render path: the log is fire-and-forget, exactly like the page persistence.
