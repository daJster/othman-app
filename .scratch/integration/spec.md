# Integration — four parallel agents, one repository, release 0.6

Status: complete
Date: 2026-11-11 → 2026-11-12
Owner: integration agent (session `ses_e33c20c85ffeNxOmT8D0CooVPG`)
Feature slug: `integration`

## Assignment

| Field                 | Meaning                                                                                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package / IDs         | Repository integration of four parallel agent packages (CRUD UI, request layer, glass materials, typography) plus the accumulated uncommitted tree, then the 0.6 branch and tag consolidation |
| Owner                 | integration agent, maintainer-delegated ("manage the repo, commit and push as you see fit; keep only main and develop; tag 0.6")                                                              |
| Branch / worktree     | `develop` · `C:/Users/elkar/work/othman/othman-app`                                                                                                                                           |
| Base SHA              | `c1a3c9f` (tip of `origin/feat/quran-dashboard` when the session started)                                                                                                                     |
| Prerequisites         | none                                                                                                                                                                                          |
| Owned paths           | repository-wide integration: commit composition and ordering, `.gitignore` hygiene, verification, branch and tag bookkeeping. No product-code authorship.                                     |
| Authorized operations | `commit`, `push`, `merge` (release), branch/tag creation and deletion, worktree cleanup                                                                                                        |
| Checks                | `npm run verify`, `npm run build:web`, `npm run check:web`                                                                                                                                    |
| Evidence owner        | maintainer (device); integration agent (web, tests)                                                                                                                                           |
| Tested SHA            | `d5702da` → recorded again after the release commit                                                                                                                                           |

## Situation found

- Four agent sessions were writing to **the same worktree** (all rooted at
  `othman-app`), which breaks the one-worktree-per-package rule in
  `CONTRIBUTING.md`. Their file sets overlapped on `src/ui/text.tsx`,
  `src/global.css` and `app.config.ts`, so commit boundaries had to be drawn by
  hand rather than by agent.
- The working tree was already dirty before any of them started: 101 modified
  files and 57 untracked paths dated 03–09 Nov — the mock backend, the panel
  primitives, the account/progress rebuild and the home circle/hero work.
- The pushed tip `c1a3c9f` **did not typecheck**: missing `home.halqa.ring` and
  `language.restart*` keys, `quranReadingLog` absent from `StorageKeys`, and a
  `userSelect` style `Pressable` does not accept. The dirty tree carried the
  fixes, so integration had to land the tree that actually runs, not preserve
  the broken tip.
- `CONTRIBUTING.md` and `MIGRATE.md` had been deleted from disk with no commit
  while `AGENTS.md` still named them as authorities.

## What was done

1. **Snapshot first — and it did not work.** The intent was to capture the whole
   dirty tree (tracked + untracked) as `refs/wip/20261111-211656` through a
   throwaway index. The index path was relative and `git add -A` failed silently
   (its stderr was discarded), so the resulting commit has an **empty tree**:
   `git ls-tree -r refs/wip/20261111-211656` lists 0 files. Nothing was protected
   by it. No harm followed because no destructive operation (no `stash`, `reset`,
   `checkout -- .` or `clean`) ran before the agents' own commits landed, and the
   final working tree is clean. The lesson is recorded rather than hidden: a
   safety net has to be verified (`git ls-tree` count) before it is trusted.
2. **Two consolidation commits** written by the integration agent, verified in a
   detached sandbox at `1e143bd`:
   - `af0e3dd` `chore(repo): restore the git authorities and adopt the local
     toolchain` — restores `CONTRIBUTING.md`/`MIGRATE.md`, adopts the dev
     scripts, agent skills, hero media, and ignores local artifacts (Playwright
     cache, baseline screenshots, draw.io scratch, APKs, font archives).
   - `1e143bd` `feat(backend): add the SQLite mock server and its client layer` —
     the `node:sqlite` server that simulates serverless functions, its client,
     the switching repositories, the meetings domain status and their
     translations.
3. **The four agents committed their own slices** while the integration agent
   was between turns, on top of those two commits, and pushed them:
   - `6d3000c` request registry (`src/api/`, `docs/api.md`, `AGENTS.md`)
   - `4977236` IBM Plex Sans Arabic across every UI string
   - `adac62f` glass material system + ratio layout scale (`DESIGN.md` rewritten)
   - `f341157` CORS on the server event stream
   - `d1b854a` meeting/member/Qur'an-record write paths
   - `19f400c` live events drop the meetings domain cache
   - `d5702da` the shared `Text` primitive gets the app typeface
4. **No history was rewritten.** The agents' pushes were fast-forwards on the
   same branch; the integration commits remain ancestors of the tip.
5. **Release consolidation**: `develop` carries the integrated tip, `main`
   fast-forwards to it (it was a strict ancestor, 86 commits behind), and `0.6`
   is an annotated tag on the release commit. `feat/quran-dashboard`,
   `ui/icon-page-modernization` and `feat/nav-shell-rebuild` are deleted locally
   and remotely; both of the latter were ancestors of `develop`.

## Decisions (user unavailable; each branch resolved to the recommended default)

1. **A safety net must be verified, not assumed.** The snapshot attempt is kept
   in the record as a failure precisely because it looked successful.
2. **The running tree wins over the pushed tree.** The pushed tip was broken;
   the working tree was not.
3. **Restore authority documents** (`CONTRIBUTING.md`, `MIGRATE.md`) instead of
   deleting them as a side effect. `DESIGN.md` was left to the agent that had
   already decided to rewrite it — and did, in `adac62f`.
4. **Push to the topic branch, never to `main`**, until the tip was verified.
   `main` moved only after `npm run verify` passed on the exact SHA.
5. **Two long-lived branches only** (`main`, `develop`) after the release; topic
   branches are deleted once their content is contained.
6. **Tag `0.6`, annotated**, following the existing `0.5-post-migration` scheme.
   The app version in `app.config.ts` stays `1.0.0`: the tags in this repository
   name milestones, not store versions.
7. **Hygiene over completeness**: local screenshots, the Playwright MCP cache,
   the side-loaded APK, draw.io `.$*` scratch files and font source archives are
   ignored, not committed.

## Evidence

`npm run verify` on `d5702da` (working tree clean, tip of the released commit):

```
typecheck         pass
typecheck:core    pass
check:core        pass
check:i18n        en and ar agree on 583 keys; 432 keys referenced from source
lint              0 errors, 13 warnings (pre-existing `require()` in tests)
format:check      all matched files use Prettier code style
test:server       14 passed, 0 failed
test (jest)       120 suites passed, 906 tests passed
```

`npm run build:web` on `d5702da` → `Exported: dist`, 21 static routes
(`/admin/members`, `/meetings/edit`, `/quran/records` and `/account/edit`
included). `npm run check:web` → all 10 route/hosting checks passed.

The only commit after the gate is this record itself (a Markdown file outside
`src/`, `server/` and the Prettier globs), so the released tree is the tested
tree.

Device evidence stays with the maintainer: the agents' screenshots were taken
on the shared Pixel 10 emulator and the web build at 390/1440, but nothing here
claims a store build.
