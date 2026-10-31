# Contributing

This repository is migrating from the frozen `othman-web/` Vite app to the root
Expo app. `othman-web/` is read-only reference material: never edit, move, or
delete it as incidental cleanup.

`MIGRATE.md` is the scope and dependency authority. The active OpenSpec change
(`openspec/changes/complete-expo-migration/`) is the execution ledger. A task's
checkbox records implementation **and** evidence, not intention.

## Agent and contributor Git policy

These rules apply to humans and AI agents alike. Having a task assigned does not
imply permission to commit, push, merge, deploy, rewrite history, or delete
anything.

### Assignments

- One PR-sized package owns one branch and one worktree **outside** the
  repository (for example `../othman-worktrees/<slug>`). Never work two packages
  in one worktree.
- Branch names are descriptive and scoped, not shared stage branches:
  `feat/<change>-<package>-<slug>`, `fix/<slug>`, `docs/<slug>`, `chore/<slug>`.
- Until migration integration is accepted, migration PRs target
  `refactor/add-mobile-support`. Promotion to `main` happens later through a
  reviewed integration PR.
- Record an assignment before implementation:

  | Field                 | Meaning                                                             |
  | --------------------- | ------------------------------------------------------------------- |
  | Package / P IDs       | Ledger group and original `MIGRATE.md` IDs                          |
  | Owner                 | One person or agent                                                 |
  | Branch / worktree     | Exact names and location                                            |
  | Base SHA              | Commit the branch was cut from                                      |
  | Prerequisites         | Package numbers/decisions that must already be accepted             |
  | Owned paths           | Files or directories this assignment may edit                       |
  | Authorized operations | `commit`, `push`, `PR`, `merge`, `deploy`, `delete` (each explicit) |
  | Checks                | Focused tests plus `npm run verify`                                 |
  | Evidence owner        | Who obtains target/device evidence                                  |
  | Tested SHA            | Commit whose checks are reported                                    |

  Sample:

  > Package 5.1 (P5.3) · owner: agent-A · branch `feat/os-001-reader-entry` ·
  > worktree `../othman-worktrees/os-001-reader-entry` · base `18dbd83` ·
  > prerequisites: group 1 accepted · owns `src/app/(tabs)/quran.tsx`,
  > `src/features/quran/**` · authorized: commit and push to this topic branch ·
  > checks: `npm test -- quran`, `npm run verify` · device evidence: maintainer ·
  > tested SHA: recorded in the PR.

### Commits and PRs

- Use atomic Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`) and stage
  explicit paths. Never commit generated `dist/`, credentials, or unrelated
  edits. Do not rewrite historical commits merely to normalize subjects.
- Commit, push, open PR, merge, deploy, force-push, and delete are distinct
  permissions. Merging, deploying, and cleanup remain maintainer-controlled.
  Never push directly to a protected or integration branch.
- Prefer independent PRs and squash merges for a coherent topic. A necessary
  stack targets its immediate parent and merges in dependency order. Squashing a
  parent changes commit identity: reconcile the dependent branch deliberately
  and rerun its checks before retargeting. Do not independently rebase shared
  branches.
- A push runs focused checks and `npm run verify` on the pushed SHA. A draft PR
  may disclose pending device evidence, but it cannot imply acceptance.

### Shared files

One integration owner owns `package.json`, `package-lock.json`, `app.config.ts`,
`src/app/_layout.tsx`, shared locale files, and `MIGRATE.md`. Overlapping
assignments must name that owner and a merge order instead of editing those
paths concurrently. The integration owner revalidates the combined tree.

**Current integration owner:** the repository maintainer (`jelkarchis-team`).
Delegation must be recorded in the assignment/PR; it is not implied by review.

### Cleanup and history

Deletion of a branch or worktree requires all of the following: a clean owned
worktree, changes incorporated into the integration target, no dependent
branches, and explicit approval. A dirty worktree, dependent branch,
unincorporated squash commit, or stale cached remote ref stops deletion. Never
force-remove a dirty worktree, reset shared history, or delete a remote branch
based only on cached tracking refs. Force-push requires specific approval,
exclusive branch ownership, and `--force-with-lease`.

## PR evidence

Use `.github/PULL_REQUEST_TEMPLATE.md`. A PR is merge-blocking while any required
field is missing: change/P IDs, dependencies, approach, tested SHA, focused and
full check results, device/web smoke results, limitations, rollback, and
reviewer sign-off. Independent review plus green verification of the integrated
result precede merge.

## Evidence dispositions

Every ledger item ends in exactly one of:

- **implemented** - code exists and its owning tests pass;
- **automated** - checks (`npm run verify`, focused suites, audits) pass on a
  recorded SHA;
- **device** - exercised on the named target/build and linked;
- **deferred** - explicitly postponed with an approval reference and owner;
- **conditional-not-needed** - a recorded decision (for example P7.2 after a
  passing profile) closes the item without building it;
- **blocked** - the missing capability (device, credentials, rules access) is
  named.

A checked box implies the disposition its task names. Tests passing does not
replace native/manual evidence, and a decision task may close without the
deferred feature existing. Do not claim CI, branch protection, or store
readiness that is not actually configured.

## Scope boundaries

The following are **not** part of this migration and require a separate approved
proposal:

- real meetings or progress backends; meetings and progress remain demo/mock
  repositories and must never be described as synchronized account data;
- cloud avatar storage; the account screen uses device-local photo selection
  only;
- Apple/Facebook auth, admin/role-management screens, offline media downloads,
  persisted Query caches, lock-screen controls, PWA/service workers, and web
  E2E.

Stage 9 in `MIGRATE.md` (release readiness, CI/device flows, documentation
handover) is **deferred**. Do not start it, or move CI/full documentation
earlier, without a recorded scope/order amendment and accepted P8.3 evidence.
