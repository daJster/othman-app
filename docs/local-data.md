# Local-first data and sync

Screens still read through TanStack Query. What is new is that a small,
user-scoped slice of the query cache survives relaunches:

```
src/services/local-data/
├── checksum.ts          stable JSON checksum (cache-hit test)
├── local-store.ts       versioned per-user document over StorageService
├── scopes.ts            which keys persist, their pulls and their expiry
├── sync-engine.ts       hydrate / capture / sync / prune
└── index.ts             the app singleton
src/providers/local-data-provider.tsx   session lifecycle + foreground sync
```

The boot gate (`BootProvider`) waits for the first hydration, so the first
signed-in frame paints from disk instead of a skeleton.

## Why

The account row, the progress snapshot and the meeting windows the calendar has
visited do not change between two app opens. Fetching them again only to paint
the same numbers is the cost this module removes. Local data is still *server
data*: the server remains authoritative, and a sync replaces whatever changed.

## The cache states

Every stored key has one of four outcomes on a sync:

| State        | Test                                              | What happens                                        |
| ------------ | ------------------------------------------------- | --------------------------------------------------- |
| **hit**      | fresh payload checksum equals the stored checksum | Nothing is written; no screen re-renders.            |
| **miss**     | no stored entry                                   | The next successful read is captured and persisted. |
| **changed**  | checksums differ                                  | Query cache and stored entry are replaced.          |
| **obsolete** | outside retention, unmatched scope, or deleted    | Dropped from disk; dropped from cache when unwatched. |

Hydration writes each entry back with its **original `updatedAt`**, so
TanStack's `staleTime` decides the next read rather than the app deciding for
it: fresh data paints from disk and waits, stale data paints from disk and
revalidates in the background. That is the stale-while-revalidate half of the
strategy.

The checksum is FNV-1a + djb2 over canonical JSON (sorted keys, `Date` as ISO).
It is change detection, not cryptography. If the backend later exposes ETags,
the same seam can carry them; today the pull is a normal read and the write is
skipped on an equal checksum.

## Scopes

| Scope      | Keys                                | Source                    | Expiry                         |
| ---------- | ----------------------------------- | ------------------------- | ------------------------------ |
| `account`  | `['othman','account',uid]`          | `profileService`          | only this uid                  |
| `progress` | `['othman','progress','surah']`     | `progressService`         | never                          |
| `meetings` | day and `range` keys               | `meetingsService`         | 30 days (`MEETINGS_RETENTION_DAYS`) |

The mushaf (catalog, bbox tables, ayah text, page scans) is deliberately **not**
persisted here: it is public, immutable and already covered by the query and
image caches. Persisting it would write megabytes per page for no freshness
gain.

A new domain is one entry in `scopes.ts` — `matches`, `pull`, optional
`obsolete` — not another sync implementation.

## Lifecycle

- **Start** (signed in): run `stop` for the previous session, read the document,
  hydrate, subscribe to successful query reads, then sync in the background.
- **Capture**: every successful read whose key belongs to a scope is stored
  (debounced, 250 ms), so a screen's own refetch persists itself.
- **Foreground / timer**: `AppState` active triggers a sync; a 5-minute timer
  covers data nobody is watching. Mounted screens still revalidate on their
  TanStack schedule.
- **Sign-out / account switch**: the previous account's slice is deleted; its
  private query keys are already dropped by `AuthProvider`.
- **Schema change**: bump `LOCAL_DATA_VERSION`; the whole document is discarded
  and refetched. Migrating unknown shapes is how a cache starts lying.

Writes are serialized and only run when something changed (`dirty`), so a
no-op sync does not touch storage.

## Storage

One `StorageService` key (`local-data`), one JSON document:

```json
{
  "version": 1,
  "users": {
    "<uid>": {
      "savedAt": 1730000000000,
      "entries": [
        {
          "key": ["othman", "progress", "surah"],
          "data": [{ "surah": 1 }],
          "checksum": "…",
          "updatedAt": 1730000000000,
          "verifiedAt": 1730000000000
        }
      ]
    }
  }
}
```

Hydration re-checks every stored checksum against its payload; a corrupt entry is
skipped and removed. A meeting day older than the retention window is pruned on
hydration and sync.

## Deliberately out of scope

- **Offline write queue.** Mutations still go straight to the backend; this
  module makes reads local-first. Queueing writes needs conflict policy, which
  is a separate decision.
- **Conditional HTTP.** No ETag/304 plumbing yet; the checksum prevents cache
  churn but the pull still travels.
- **Public Qur'an data.** See above.
- **Practice.** `practiceService` is already a local store; it is read through
  the same query layer but is not server data to synchronize.
- **Cold-start offline sign-in.** Hydration needs the uid, so the boot gate still
  waits for the session to settle. The real (Firebase) backend restores a session
  from local storage; the mock backend validates it against `/auth/session`, so a
  fully offline cold launch against the mock shows sign-in instead of private
  data. Local-first applies once the session is known.
