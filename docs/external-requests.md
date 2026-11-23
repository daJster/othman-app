# External requests

Every request the front end makes, where it is declared, how it travels to the
network, and how a response becomes a rendered row. Read this before adding a
request; read [`api.md`](api.md) for the registry itself.

## The rule

A request leaves the app through one transport, `FetchHttpClient` in
`src/platform/http/client.ts`. Anything else that wants bytes from the network
goes through a repository that receives that client, or through `BackendClient`,
which wraps it. The lint rule in `eslint.config.js` makes a raw `fetch` or
`XMLHttpRequest` outside `src/platform/http` a build error.

Two kinds of network use do not go through the transport. The SDKs (Firebase,
`expo-auth-session`) run their own requests. The media players (`expo-image`,
`expo-audio`) load their own bytes. They are listed in the inventory so the full
surface is visible in one place.

## Connectivity gate

The health probe answers "is the mock server up?". It says nothing about whether
the device has internet at all, so a second probe answers that, in
`src/platform/http/connectivity.ts`:

- `probeReachability` sends a `HEAD` to the Qur'an CDN and to quranpedia. Any
  HTTP response — a 404 included — proves the network works; only a network
  error or the 4 s timeout means offline. `HEAD` is CORS-safelisted and
  downloads no body.
- The monitor holds `unknown | online | offline`. It probes at startup, then
  every 10 s while offline and every 60 s while online, and re-checks
  immediately when the platform fires its `online`/`offline` events.
- `defaultHttpClient` consults the monitor before every request. When offline the
  request is skipped with `HttpOfflineError`, recorded as `outcome: 'offline'`:
  no timer is armed and `fetch` is never called.
- `ConnectivityBridge` mirrors the state into the Zustand store
  (`internet`) and into TanStack's `onlineManager`, so queries **pause**
  (`fetchStatus: 'paused'`) while offline and run again by themselves when the
  probe succeeds, instead of failing and retrying on a schedule.

`unknown` fails open: a request is allowed until the monitor positively reports
offline. Pausing every query until the first probe answers would make startup
depend on the canary hosts, and a firewall that blocks them would look like a
dead app. The probe runs immediately on mount, so `unknown` lasts one round trip.

The canaries, the cadence and the probe timeout are named constants
(`CONNECTIVITY_PROBE_URLS`, `ONLINE_RECHECK_MS`, `OFFLINE_RETRY_MS`,
`PROBE_TIMEOUT_MS`).

## Service inventory

"Mock server" means the local Node server in `server/`. The app talks to it only
when `EXPO_PUBLIC_MOCK_BACKEND` is on. Otherwise each service uses the local
source named in its row.

| Service                   | Module                                                                 | Carries                                                                        | Network                                                               | Cancels on unmount                 | Validated at the boundary                                          |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| HTTP transport            | `src/platform/http/client.ts`                                          | every non-SDK request                                                          | `fetch`, 10 s default timeout                                         | yes                                | status code and JSON content type                                  |
| Internet connectivity     | `src/platform/http/connectivity.ts`                                    | decides whether external requests may leave the device                         | `HEAD` to two canaries (Qur'an CDN, quranpedia), 4 s timeout           | re-probes 10 s offline / 60 s online | any HTTP response counts as online                                |
| Backend client            | `src/platform/backend/client.ts`                                       | accounts, meetings, notices, Qur'an records, progress, bookmarks, notes, flags | mock server                                                           | yes, on the read methods           | per-domain wire parsers                                            |
| Live updates              | `src/api/events.tsx`                                                   | server events turned into cache invalidation                                   | SSE on web, polling elsewhere (5 s, backing off to 60 s)              | yes                                | event payload; a malformed frame is dropped                        |
| Account and profile       | `src/services/profile/`                                                | the signed-in user's merged account                                            | Firestore `users` in Firebase builds; mock server otherwise           | mock server reads only             | `backend-profile.wire.ts`                                          |
| Authentication            | `src/platform/auth/`                                                   | email sign-in and Google sign-in                                               | Firebase Auth SDK; Google OAuth endpoints via `expo-auth-session`     | n/a (SDK)                          | the SDK                                                            |
| Meetings                  | `src/services/meetings/`                                               | the day and range calendar                                                     | mock server; bundled fixture otherwise                                | mock server reads only             | `backend-meetings.wire.ts`                                         |
| Notices                   | `src/services/notices/`                                                | the inbox, one page at a time                                                  | mock server; empty otherwise                                          | mock server reads only             | `backend-notices.wire.ts`                                          |
| Progress                  | `src/services/progress/`                                               | memorisation per surah                                                         | mock server; generated demo record otherwise                          | mock server reads only             | `backend-progress.wire.ts` (percent clamped)                       |
| Feature flags             | `src/services/config/`                                                 | the switchboard document                                                       | mock server; empty document otherwise, writes reject                  | mock server reads only             | `backend-config.wire.ts`                                           |
| Qur'an catalog            | `src/services/quran/editions.repository.ts`, `metadata.repository.ts`  | `editions.json` and `quran.json`                                               | Qur'an CDN (`CDN_BASE_URL`)                                           | yes                                | `parseEditions`, `parseSurahMetadata`                              |
| Qur'an coordinates        | `src/services/quran/bboxes.repository.ts`                              | both coordinate tables for one edition, in parallel                            | the edition's `bboxNormUrl` and `bboxReversedNormUrl`                 | yes                                | `parseEditionBboxes`                                               |
| Ayah text                 | `src/services/quran/content.repository.ts`                             | one ayah by absolute number                                                    | `https://api.alquran.cloud`                                           | yes                                | `parseAyahContent` (checks the API's own `code`)                   |
| Tafsir, e3rab, surah info | `src/services/tafsir/tafsir.repository.ts`                             | option lists, book text, surah information                                     | `https://api.quranpedia.net`                                          | yes                                | `parseContentSources`, `parseBookContent`, `parseSurahInformation` |
| Notes                     | `src/services/notes/`                                                  | a reader's notes per ayah                                                      | mock server for signed-in readers; device storage otherwise           | mock server reads only             | field mapping only (`toQuranNote`)                                 |
| Recitation audio          | `src/features/quran/use-ayah-audio.ts`, `use-audio-prefetch.ts`        | an ayah's recitation file                                                      | audio CDN (`ALQURAN_CDN_BASE_URL`) via `expo-audio`                   | n/a (platform player)              | none; the player reports failure                                   |
| Page images               | `src/features/quran/use-page-prefetch.ts`, `src/ui/image.tsx`          | mushaf page images                                                             | the edition's CDN `baseUrl` via `expo-image`                          | n/a (platform loader)              | none                                                               |
| Practice                  | `src/services/practice/`                                               | daily practice entries                                                         | none; device storage                                                  | n/a                                | none                                                               |
| Circle                    | `src/services/circle/`                                                 | the circle's next sessions                                                     | none; demo data                                                       | n/a                                | none                                                               |
| Local data cache          | `src/services/local-data/`                                             | persisted account, progress and meeting windows                                | none of its own; revalidates through the queries above                | n/a                                | checksum per entry                                                 |
| External links            | `src/platform/browser.ts`                                              | the marketing site, and the meeting links the user is shown                    | none; opens the browser                                               | n/a                                | `https:` only                                                      |

## One example: the meetings calendar

A screen names a command. It never builds a URL.

```ts
// src/api/endpoints.ts: the registry declares the command once
meetings: {
  byDate: query<{ date: DateKey }, Meeting[]>({
    id: 'meetings.byDate',
    policy: 'live',
    key: ({ date }) => queryKeys.meetings.byDate(date),
    run: ({ date }, context) => meetingsService.listByDate(date, context),
  }),
},

// a screen reads it
const meetings = useApiQuery(api.meetings.byDate, { date });
```

The service chooses the source, the repository names the request, and the
transport moves the bytes:

```ts
// src/services/meetings/backend-meetings.repository.ts
async listByDate(dateKey, options) {
  return parseMeetingsResponse(
    await client.listMeetings({ date: dateKey }, options),
  );
},
```

## From a tap to a rendered row

Following one tap on a calendar day, through a cache miss, to the rendered screen:

1. **The screen names a command.** The calendar calls
   `useApiQuery(api.meetings.byDate, { date })`
   (`src/features/meetings/use-meetings.ts`).
2. **The hook applies the strategy.** `src/api/hooks.ts` takes the `live`
   policy (fresh for one minute), checks `ready` and `enabled`, and asks TanStack
   Query for the key `['meetings', 'byDate', date]`.
3. **TanStack decides whether to fetch.** A fresh cache entry returns here, and
   nothing below runs. On a miss or a stale entry it calls the query function
   with an `AbortSignal`, which it aborts if the screen leaves.
4. **The query function calls the command.** `queryFn: ({ signal }) =>
endpoint.run(params, { signal })` runs `meetingsService.listByDate`.
5. **The service checks its day cache.** `fetchMeetingsForDate`
   (`src/core/domain/meetings/`) serves a day already read this session. A
   failed or cancelled read is never written to it.
6. **The repository names the request.** On a miss,
   `backendMeetingsRepository` calls `backendClient.listMeetings({ date }, { signal })`.
7. **The backend client builds the URL.** `BackendClient` adds the session
   token, encodes the query and calls `FetchHttpClient.request`.
8. **The transport sends it.** `FetchHttpClient` applies the 10-second timeout,
   combines the caller's signal with its own, and calls `fetch`. A timeout, a
   caller abort, an HTTP error and a network failure each become a distinct
   error class.
9. **The request is recorded.** One observer event is written to the request
   log (`src/platform/http/observe.ts`). Its URL has credential parameters
   redacted, and the log keeps the newest 100 events.
10. **The response is validated.** `parseMeetingsResponse` checks every row
    against `backend-meetings.wire.ts`. A drifted field, such as a `time` that
    is not `HH:mm`, throws a `WireShapeError` naming the field
    (`meetings[2].time`). The query shows its error state rather than a card
    with an empty time.
11. **The caches fill.** The service stores the day, and TanStack stores the
    result under its key.
12. **The screen renders.** The calendar reads `data` and draws the day.

**A live update** reaches the same cache from the other side. The server emits
`meetings.updated`. `src/api/events.tsx` receives it over SSE (web) or polling
(native), clears the service's day cache, and invalidates the `meetings` keys.
Step 3 runs again, so the screen refetches. The event never writes into the
cache directly; the server stays the only writer of truth.

**A write** takes the mutation path. `useApiMutation(api.demo.meetings.create)`
runs the write, clears the service's day cache so the refetch cannot replay the
old day, and invalidates the keys the command declares. Writes do not take a
signal: a half-cancelled write is worse than a late one.

## Rules for adding a request

1. **Declare it in the registry.** `src/api/endpoints.ts` is the only place a
   screen's request is named. Set `id`, `policy`, `key`, and `ready` if it
   depends on a selection.
2. **Put the transport behind a service and a repository.** The repository
   receives an `HttpClient` (or `BackendClient`), so a test can inject a fake and
   assert the URL. Nothing outside `src/platform/http` imports `fetch`.
3. **Validate at the boundary.** Add a wire parser using
   `src/core/domain/wire/shape.ts`. Never cast a response with `as`. A parser
   that refuses a row is correct: it turns silent corruption into an error with a
   path.
4. **Forward the cancellation options.** A read takes `RequestOptions` and passes
   it to the client. The query function already supplies the signal.
5. **Pick a policy and leave retries to TanStack.** The HTTP client does not
   retry, so a failing request is retried once per query, not once per layer.
6. **Keep secrets out of URLs where you can.** A credential parameter is redacted
   in the log automatically, but the request itself still carries it. The one
   exception is below.
7. **Write a contract test.** Cover the request the adapter names, the parsed
   result, one drifted field that must be refused, and the forwarded signal. The
   `backend-*.repository.test.ts` files are the template.

## Decisions and deferred items

- **The event stream token is in the query string.** `EventSource` cannot set an
  Authorization header, so the session token travels in the URL. The URL is
  built only by `BackendClient.eventStreamUrl`, and the request log redacts it
  (`token=REDACTED`). A production backend should issue a short-lived stream
  ticket instead of sending the session token.
- **No HTTP-level retry.** TanStack Query owns retries. A retry inside the
  transport would multiply with the query's own, so one failing request could
  become several dozen attempts.
- **Polling backs off.** While the server is unreachable, the poll interval
  doubles from 5 seconds up to 60 seconds, and resets on the first success.
- **Deferred from the audit (F9, F10).** F9 is the per-command declaration
  ceremony, accepted as the cost of explicitness. F10 is that a payload has no
  size cap after download. Both are low priority while the mock server is the
  only backend.
- **Some services have local fallbacks.** Outside mock mode the inbox is empty,
  the calendar reads a bundled fixture, and progress reads a generated record.
  A build without the mock server never points at a server that does not exist.
- **Feature-flag writes reject without a backend.** A switch that never reached
  a server must not report "saved".
- **Notes fall back silently.** When the backend fails, the notes repository
  reads from device storage, so a reader keeps what is already on the device. A
  cancelled read is the one exception: it rethrows. This is a deliberate design
  choice, recorded here so it is not mistaken for a bug.
- **Firestore profile reads do not cancel.** The Firestore SDK owns that
  request, and the repository passes no signal to it.

## Verifying a change

```
npm run typecheck
npm run lint
npm test
npm run test:server
```

`npm run verify` runs all of them, plus the core-purity and i18n audits.
