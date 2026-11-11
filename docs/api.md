# The request layer

One module, `src/api/`, owns every HTTP request the app makes. Screens never
name a URL, a cache key, a retry count or an invalidation rule; they name a
command.

```ts
import { api, useApiQuery, useApiMutation } from '@/api';

const meetings = useApiQuery(api.meetings.byDate, { date });
const save = useApiMutation(api.account.update);

save.mutate({ uid, patch });
```

## Why one registry

Before this layer, the fetching strategy was reinvented per hook: `staleTime`
appeared as `60_000` in three files with three justifications, the global default
silently applied wherever an author forgot, and the rule "an account write makes
the account stale" lived in whichever mutation happened to run. All three are
facts about the _command_, so they are declared next to it:

| Fact           | Where                                    |
| -------------- | ---------------------------------------- |
| Cache key      | `key(params)` — same params, same key    |
| Strategy       | `policy` — a name from `policies.ts`     |
| Can it run yet | `ready(params)`                          |
| Source of data | `run(params)` — a service, never `fetch` |
| What it stales | `invalidates(params)` on mutations       |

## Layers

```
src/api/endpoints.ts   the registry: every command, exactly once
src/api/policies.ts    named strategies (static, default, live, session, probe)
src/api/hooks.ts       useApiQuery / useApiMutation (TanStack)
src/api/store.ts       transport state (Zustand): connection, cursor, events
src/api/events.tsx     live updates -> cache invalidation
src/api/messages.ts    error code -> user-facing copy
src/api/index.ts       the only barrel the app imports
```

The transport itself (`src/platform/backend`) still owns token persistence, JSON
encoding, timeouts and error normalization. Nothing outside `src/api` should
import it: a screen that reached for `backendClient` would bypass the strategy
and the invalidation rule.

## Two namespaces

- **`api.*`** is what the UI reads. Each command calls a service barrel
  (`@/services/meetings`, `@/services/quran`, …), so the demo/offline switch
  (`EXPO_PUBLIC_MOCK_BACKEND`) keeps working: the screen asks for "the
  meetings", the service decides whether that is a fixture or the server.
- **`api.demo.*`** is the local mock server's own surface (health, accounts,
  meetings CRUD, Qur'an records). Those endpoints are marked `demo: true` and
  are disabled — not failing — when the flag is off or nobody is signed in.

## Strategies

| Policy    | Stale for | Use for                                        |
| --------- | --------- | ---------------------------------------------- |
| `static`  | forever   | the mushaf, bbox tables, tafsir books, catalog |
| `default` | 5 min     | records that change on the scale of hours      |
| `live`    | 1 min     | "today's meetings", the circle's next session  |
| `session` | 30 s      | per-user rows: progress, bookmarks, notes      |
| `probe`   | 0, polled | the mock server's health                       |

Retry is deliberately _not_ part of a policy (except `probe`, where polling is
the retry). It is an environment decision — the query client runs with two
attempts in production and none in tests — and an endpoint that pinned it would
override both.

## Adding a command

1. Add the method to the service barrel if it does not exist
   (`src/services/<domain>/`). The registry never talks to `fetch` directly.
2. Declare it in `endpoints.ts`:

   ```ts
   export const api = {
     meetings: {
       byDate: query<{ date: DateKey }, Meeting[]>({
         id: 'meetings.byDate',
         policy: 'live',
         key: ({ date }) => queryKeys.meetings.byDate(date),
         run: ({ date }) => meetingsService.listByDate(date),
       }),
     },
   };
   ```

3. Read it with `useApiQuery(api.meetings.byDate, { date })`.
4. If it is a write, declare `invalidates` — the narrowest prefix that covers
   what changed. Never `queryKeys.all`.
5. Add the key to `src/services/query/keys.ts` if it is new, with a domain root
   so invalidation can name the domain instead of every row.

## Client-local state

Zustand holds only what the server cannot: whether the event stream is
connected, the last event, and the cursor. Server rows belong to TanStack Query
and the session belongs to `AuthProvider`. Copying either into the store would
recreate the two-sources-of-truth bug this layer exists to prevent.
