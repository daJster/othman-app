# Mock backend (`server/`)

A development-only HTTP service that simulates the Firebase Functions this app
will eventually deploy. It exists so the whole UI can be exercised — sign-in,
authorization, meeting CRUD, Qur'an progress, bookmarks, notes, live updates —
without a Firebase project, emulator, or network.

```
npm run mock        # API only, http://localhost:9000
npm run dev         # API + Metro together (web + native)
npm run test:server # 13 integration tests, Node's own runner
```

`npm run dev` starts the server on **:9000**, waits for `/health`, then starts
Metro on **:8081** with `EXPO_PUBLIC_MOCK_BACKEND=1`. The flag switches the
frontend's auth service, meetings repository, profile repository and progress
repository onto this server. Without the flag, `npm start` keeps using the
offline fixtures — the two modes never disagree by accident.

## Why this shape

The handlers are written as **serverless functions**, not as Express routes:

```ts
type FunctionHandler = (
  event: FunctionEvent, // method, path, params, query, body, headers
  context: FunctionContext, // db, documents, events, config, auth, requestId
) => FunctionResult | Promise<FunctionResult>; // { status, body }
```

They never see `req`/`res`. That is the whole point: the same function can be
mounted on the local Node server, the GCP Functions Framework or AWS Lambda +
API Gateway. Adapters live in `server/serverless/adapters.ts` and only translate
transport shapes.

Authorization is inside the handler (`requireAuth`, `requireRole`,
`requireSelfOrAdmin`), never in a router middleware. A provider cannot mount an
unprotected route by forgetting a wrapper.

```
server/
├── mockServer.ts              CLI entry (Node 24 type stripping)
├── mock-server.ts             createMockServer() for tests / embedding
├── application.ts             composition root (db, stores, events, registry)
├── routes.ts                  declarative REST surface
├── runtime.ts                 auth resolution + per-request context
├── http/request-handler.ts    Node adapter: CORS, body, SSE, error mapping
├── serverless/adapters.ts     GCP Functions Framework + AWS Lambda adapters
├── functions/                 handlers: auth, accounts, meetings, quran, system
├── repositories/              SQLite access, one file per domain
├── stores/                    JSON document store + profile documents
├── db/database.ts             schema + migrations (PRAGMA user_version)
├── events/event-bus.ts        persisted event log + in-process pub/sub
├── seed.ts                    seeded accounts, meetings, progress, notes
└── __tests__/backend.test.ts  HTTP integration tests
```

## Storage split

| Data                                                             | Store          | Why                                           |
| ---------------------------------------------------------------- | -------------- | --------------------------------------------- |
| users, sessions, meetings, attendees, progress, bookmarks, notes | SQLite         | small rows, foreign keys, per-user queries    |
| account profiles, Qur'an catalog, editions                       | JSON documents | free-form/changing shape, read as one payload |
| domain events                                                    | SQLite         | the polling cursor is a monotonic integer     |

SQLite uses Node's built-in `node:sqlite` — no native dependency, no build step.
Documents are one file per record (`server/data/documents/<collection>/<id>.json`)
with atomic writes (temp file + rename).

Runtime data is gitignored (`server/data/`). Delete it to reseed.

## Accounts

Every seeded account uses the password **`kuttab1234`**.

| Email                 | Role         | Use                                     |
| --------------------- | ------------ | --------------------------------------- |
| `admin@kuttab.test`   | `superadmin` | account CRUD, role changes, stats       |
| `shaykh@kuttab.test`  | `admin`      | meeting CRUD                            |
| `student@kuttab.test` | `user`       | progress/bookmarks/notes already seeded |
| `google@kuttab.test`  | `user`       | the demo Google button signs in here    |

Registration creates a `user` with an empty progress list. The student's rows
are deterministic, so screenshots and tests do not drift.

## REST API

Base URL: `http://localhost:9000`. Errors use
`{ "error": { "code", "message", "details"? } }` with Firebase-style codes
(`invalid-argument`, `unauthenticated`, `permission-denied`, `not-found`,
`already-exists`, `failed-precondition`, `internal`).

### Auth

| Method  | Path                | Auth | Notes                               |
| ------- | ------------------- | ---- | ----------------------------------- |
| `POST`  | `/v1/auth/register` | —    | `{ email, password, displayName? }` |
| `POST`  | `/v1/auth/login`    | —    | `{ email, password }`               |
| `POST`  | `/v1/auth/google`   | —    | demo Google account                 |
| `POST`  | `/v1/auth/logout`   | ✓    | revokes the current token           |
| `GET`   | `/v1/auth/session`  | ✓    | current user                        |
| `PATCH` | `/v1/auth/profile`  | ✓    | displayName/photoURL/phoneNumber    |

### Accounts

| Method   | Path                | Auth          |
| -------- | ------------------- | ------------- |
| `GET`    | `/v1/accounts`      | admin         |
| `POST`   | `/v1/accounts`      | admin         |
| `GET`    | `/v1/accounts/me`   | ✓             |
| `PATCH`  | `/v1/accounts/me`   | ✓             |
| `GET`    | `/v1/accounts/:uid` | self or admin |
| `PATCH`  | `/v1/accounts/:uid` | self or admin |
| `DELETE` | `/v1/accounts/:uid` | admin         |

A user cannot change their own `role`/`disabled`. Admins can grant `admin` to
ordinary accounts; only a superadmin can grant `superadmin`, and the last
superadmin cannot be demoted or deleted.

### Meetings

| Method   | Path                     | Auth  |
| -------- | ------------------------ | ----- |
| `GET`    | `/v1/meetings?date=`     | —     |
| `GET`    | `/v1/meetings?from=&to=` | —     |
| `GET`    | `/v1/meetings/:id`       | —     |
| `POST`   | `/v1/meetings`           | admin |
| `PATCH`  | `/v1/meetings/:id`       | admin |
| `DELETE` | `/v1/meetings/:id`       | admin |
| `POST`   | `/v1/meetings/:id/rsvp`  | ✓     |
| `DELETE` | `/v1/meetings/:id/rsvp`  | ✓     |

`status` is derived on read from the day, clock and duration; it is never
stored.

### Qur'an

| Method   | Path                              | Auth | Notes                     |
| -------- | --------------------------------- | ---- | ------------------------- |
| `GET`    | `/v1/quran/catalog`               | —    | 114 surahs + editions     |
| `GET`    | `/v1/quran/surahs/:number`        | —    | metadata + mock ayah text |
| `GET`    | `/v1/quran/ayahs/:absoluteNumber` | —    | 1–6236                    |
| `GET`    | `/v1/quran/progress`              | ✓    | rows for the caller       |
| `PUT`    | `/v1/quran/progress/:surahNumber` | ✓    | upsert                    |
| `DELETE` | `/v1/quran/progress/:surahNumber` | ✓    |                           |
| `GET`    | `/v1/quran/bookmarks`             | ✓    |                           |
| `POST`   | `/v1/quran/bookmarks`             | ✓    | idempotent id             |
| `PATCH`  | `/v1/quran/bookmarks/:id`         | ✓    |                           |
| `DELETE` | `/v1/quran/bookmarks/:id`         | ✓    |                           |
| `GET`    | `/v1/quran/notes?absoluteNumber=` | ✓    |                           |
| `POST`   | `/v1/quran/notes`                 | ✓    | idempotent id, safe retry |
| `PATCH`  | `/v1/quran/notes/:id`             | ✓    |                           |
| `DELETE` | `/v1/quran/notes/:id`             | ✓    |                           |

Every per-user query is scoped by `user_id` in SQL, so one account cannot read
another's rows even if a handler forgot a filter.

### System / events

| Method | Path                | Auth  | Notes                                       |
| ------ | ------------------- | ----- | ------------------------------------------- |
| `GET`  | `/health`           | —     | uptime probe used by `npm run dev`          |
| `GET`  | `/v1/system/stats`  | admin | counts, subscriber count, config            |
| `GET`  | `/v1/events?since=` | ✓     | `{ events, cursor }` polling                |
| `GET`  | `/v1/events/stream` | ✓     | SSE; token may be `?token=` for EventSource |

`POST /v1/functions/:name` calls any registered function with a Firebase-callable
body (`{ "data": … }`) and returns `{ "result": … }`. The REST routes and the
callable endpoint share one registry, so they cannot drift.

## Frontend entrypoint

Everything in the app goes through **one** client:

- `src/platform/backend/client.ts` — URL resolution, bearer token persistence,
  JSON encoding, timeout policy, error normalization.
- `src/services/{meetings,profile,progress,notes}/backend-*.repository.ts` —
  adapters that map wire records onto the app's existing service contracts.
- `src/features/backend/` — the doorway screens import from:
  - TanStack Query hooks for every CRUD operation,
  - a Zustand store for transport state (`connection`, cursor, last event),
  - `<BackendEventsBridge />` — SSE on web, 5-second polling on native,
    invalidating the relevant query keys per event type.

Base URL resolution:

| Target           | URL                                                 |
| ---------------- | --------------------------------------------------- |
| web              | `http://localhost:9000`                             |
| Android emulator | `http://10.0.2.2:9000`                              |
| iOS simulator    | `http://localhost:9000`                             |
| physical device  | set `EXPO_PUBLIC_MOCK_API_URL=http://<lan-ip>:9000` |

## Environment

| Variable                   | Default                     | Used by |
| -------------------------- | --------------------------- | ------- |
| `EXPO_PUBLIC_MOCK_BACKEND` | unset                       | app     |
| `EXPO_PUBLIC_MOCK_API_URL` | platform default            | app     |
| `MOCK_SERVER_PORT`         | `9000`                      | server  |
| `MOCK_SERVER_HOST`         | `0.0.0.0`                   | server  |
| `MOCK_DB_PATH`             | `server/data/kuttab.sqlite` | server  |
| `MOCK_DATA_DIR`            | `server/data/documents`     | server  |
| `MOCK_TOKEN_TTL_MS`        | 7 days                      | server  |
| `MOCK_LATENCY_MS`          | `0`                         | server  |
| `MOCK_LOG`                 | `1`                         | server  |

Set `MOCK_LATENCY_MS=300` to exercise loading and skeleton states.

`npm run mock` and `npm run dev` load `.env` via `node --env-file-if-exists`
before starting the server, so the `MOCK_*` values in `.env.example` work from
either command. The app's `EXPO_PUBLIC_*` values are still read by Expo itself.

## Extending

1. Add a handler in `server/functions/<domain>.ts` using `defineFunction`.
2. Add it to that file's exported registry object.
3. Add a route in `server/routes.ts` if it needs a REST path.
4. Add typed client methods in `src/platform/backend/client.ts`.
5. Add a TanStack hook in `src/features/backend/` and invalidate the right keys.
6. Add a case to the relevant test in `server/__tests__/backend.test.ts`.

## Decisions log

- **No Express.** Node's `http` plus ~200 lines of adapter keeps the server
  dependency-free and makes the serverless boundary explicit. A framework would
  have hidden the request/response translation this project is demonstrating.
- **`node:sqlite`, not better-sqlite3.** Node 24 ships it; there is no native
  build step, no ABI mismatch, and tests run on the same engine as production.
- **Dotted function names.** `auth.login`, `meetings.rsvp` map one-for-one to
  future `onCall` names and read better in logs than kebab-case routes.
- **Derived status.** Meeting status is computed on read, never stored, so a
  demo row cannot claim "starts soon" weeks after it ended.
- **Events invalidate, never write.** The subscription bridge turns every event
  into a TanStack invalidation. The server stays the only writer of truth, so a
  live update can never overwrite a pending optimistic edit with a stale shape.
- **Duplicate wire contracts.** `server/contracts.ts` mirrors `src/core/types`
  because the server cannot resolve the Metro `@/` alias. When the functions
  move to a real package, this file becomes the shared contract module.

## Intentionally deferred

- Real Google OAuth verification — the mock signs in a seeded account.
- Password reset / email verification — the UI does not expose them yet.
- Multi-device sync conflict resolution — last write wins.
- File/photo upload — `photoURL` is a string; no storage backend.
- Production token storage — this mock stores opaque tokens verbatim so they are
  easy to inspect during device debugging; the real function must store hashes.
