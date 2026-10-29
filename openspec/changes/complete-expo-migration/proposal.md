# Proposal

Proposal ID: `OS-001`
OpenSpec change: `complete-expo-migration`

## Why

The Expo migration has substantial implemented code, but committed merge damage prevents verification, authentication is missing, the reader is partial, and device acceptance remains outstanding inside checked-off stages. Agents need an evidence-based technical design and a supervisory task ledger that completes `MIGRATE.md` without replacing its scope, dependencies, or explicit deferrals.

## What Changes

- Recover a reproducible baseline by repairing the merge-introduced corruption in the root manifest, lockfile, and layout, preserving both parents' intended changes.
- Establish technical approaches before implementation: retain the existing layer boundaries, Uniwind/native controls, Query/Zustand ownership, Firebase adapters, and image-plus-bbox reader.
- Complete P3.3 and P5.3-P6.3 through bounded, dependency-aware PRs; finish existing partial components instead of rebuilding them.
- Carry forward earlier native boot, persistence, language, typography, navigation, and screen acceptance checks, including prose-only outstanding checks.
- Make P7.1 measurements control P7.2; retain a JavaScript web path whether or not a native implementation is justified.
- Complete P8.1-P8.3 while retaining static Expo web output and the frozen legacy app as reference only.
- Define agent assignments, PR evidence, commit/push authorization, worktree isolation, merge order, and safe cleanup; transition to ordinary change-driven development after migration closure.
- Keep P9.1-P9.3 visible but deferred until explicitly activated. Moving CI or documentation work earlier requires a recorded approval rather than an implicit reorder.

## Capabilities

### New Capabilities

- `development-workflow`: Reproducible verification, traceable migration supervision, isolated agent work, Git authorization, review evidence, and migration handover.
- `user-auth`: Email/Google authentication, restored sessions, profile resolution, protected navigation, and session cleanup.
- `mushaf-reader`: Correct page rendering and selection, navigation/chrome, ayah content, deep links, and evidence-gated optimization.
- `reader-audio`: Selected-ayah playback, native controls, deterministic advancement, buffering, and interruption handling.
- `ayah-utilities`: Restart-persistent local notes and real, bounded, source-aware tafsir content for a selected ayah.
- `cross-platform-delivery`: Native readiness, static web hosting/parity, cross-target acceptance, and explicitly deferred release automation.

### Modified Capabilities

None. The OpenSpec capability inventory is empty; these specifications document the remaining migration contracts, not a rewrite of completed foundations.

## Impact

Future implementation affects the root package/configuration files; `src/app`, `src/providers`, `src/features`, `src/services`, relevant core contracts/tests, and root delivery documentation/configuration. Expected additions include Expo-compatible auth-session/crypto/audio packages, a local notes repository, Firebase Hosting configuration, and optionally a profiled native reader module; already installed packages such as haptics must be reused.

This proposal writes planning artifacts only. `othman-web/` stays read-only. Real meetings/progress backends, cloud avatar storage, Apple/Facebook auth, admin screens, offline media downloads, persisted Query caches, lock-screen controls, PWA, and web E2E are not implicitly added. Conflicting legacy notes about backend/photo scope require an explicit disposition before related implementation or release claims.