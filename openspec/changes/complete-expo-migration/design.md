# Design

## Context

See `proposal.md` for motivation. `MIGRATE.md` remains the scope and dependency authority; this design explains execution rather than introducing a replacement roadmap.

Observed at planning baseline `3cea3ce` on `refactor/add-mobile-support`:

- Merge `ba1ed9a` introduced invalid root `package.json`/`package-lock.json` and duplicated `src/app/_layout.tsx`; both parents have valid JSON and one root-layout declaration.
- The layer boundaries, Uniwind primitives, Query services, and vanilla Zustand reader store already exist. P5.3 includes components, geometry, gestures, prefetch hooks, query hooks, and tests; the Quran tab is still a placeholder.
- Native Google returns `not-implemented`; there is no AuthProvider or protected navigator. Profile, meetings, and progress use demo/mock repositories.
- There are 65 test files, but no current full test/build result can be inferred while manifests are broken and dependencies absent. Dependency-free core purity and i18n audits passed during exploration; native acceptance is not established by those checks.
- OpenSpec has no durable capabilities yet. Root agent instructions describe the legacy app, README is a template, and no tracked GitHub workflows were found. The legacy `othman-web/` tree is read-only.

## Goals / Non-Goals

**Goals:** Define technical contracts before tasks, preserve working abstractions, make every remaining migration item supervisable, isolate concurrent agents, and distinguish implemented code from verified behavior.

**Non-Goals:** A rewrite, replacement state/styling frameworks, extra backend features inferred from TODOs, automatic Git/deployment authority, or bringing deferred release work forward without approval. This workflow itself changes planning artifacts only.

## Decisions

### D1. Recover the integration baseline before feature changes

Repair the three corrupted files in a dedicated PR, using both merge parents as evidence. Resolve the intended manifest first, then recover a matching coherent lockfile or regenerate it with the agreed npm/Node toolchain. Do not hand-merge lockfile fragments or upgrade unrelated dependencies. Preserve the existing reader and account route registrations when deduplicating the layout.

Prove the result with clean dependency installation, `npm run verify`, Expo config/doctor, and platform exports. If the incomplete P5.3 commit exposes local lint/type defects after parsing succeeds, fix only those blockers in the recovery package and identify them in its review evidence.

Alternative rejected: reverting the entire merge or branch, which could discard valid work and conceal rather than resolve integration defects.

### D2. Preserve the existing architecture and state ownership

| Concern | Owner and approach | Avoid |
| --- | --- | --- |
| Domain rules and parsing | Pure `src/core`; extend existing Quran/date/account helpers with boundary tests | React, platform SDKs, DOM, or styling in core |
| Platform differences | `src/platform` contracts and platform-resolved adapters | Explicit `.web` imports from shared consumers |
| Backend and external data | Injected repositories and `src/services` facades; validate at the boundary | SDK calls or ad hoc fetching in screens |
| Server state | TanStack Query client and typed key factory; feature hooks expose existing async-state unions | A second cache or effect-driven fetches |
| Reader decisions | Existing vanilla Zustand store and narrow selectors | Copying catalog/query data into another global store |
| Durable local data | `storageService`; version only new structured payloads that need migration | Whole-store persistence or persisted Query caches |
| Presentation | Existing Uniwind primitives and module-level interop wrappers; `@expo/ui` native controls | `className` on native UI children, dynamic class fragments, new theme frameworks |

Keep the existing exceptions narrowly scoped: normalized reader geometry, edition art data where already required, and Reanimated values are not an excuse to add inline token colors throughout the app. Use existing theme tokens and `tv()`/literal classes for UI variants.

Alternative rejected: abstracting all features behind a new application framework. The current factories, hooks, and selectors already provide the required seams.

### D3. P3.3 uses one session lifecycle and existing account queries

AuthProvider subscribes to `authService.onAuthStateChanged`, resolves the profile using the existing service and account query identity, and exposes settled loading/error/account state. Reuse the account query rather than fetching the same profile independently into another authoritative store. Unsubscribe on teardown and guard profile completions with the current session generation so account A cannot overwrite account B.

A missing profile produces the existing auth-only account merge. A failed profile read ends loading and exposes an error/retry without inventing a privileged role. Replace the demo session/profile selection and remove production demo sign-in affordances; tests can retain injected fixtures. Gate private tabs and account subroutes from the route registry's access intent on both native and web, preserving a validated internal return destination. Home/Quran remain public.

Use the planned native Google id-token-to-Firebase-credential exchange and retain web popup auth. Before wiring screens, verify the installed auth-session/provider APIs and Google redirect restrictions with a minimal development-client flow. Use `makeRedirectUri` with the app scheme and per-platform public client IDs; missing IDs are a configuration error, not a reason to synthesize credentials. If this provider strategy is incompatible, stop for a scoped decision instead of silently adopting another native auth library. Handle cancellation, credential conflicts, and non-enumerating email/password failures.

After successful sign-out, cancel in-flight account queries, clear Query data, reset reader state through an explicit store action, and reject stale session/hydration completions. Preserve theme/language and never call global `storage.clear()`. Define and test the interaction with saved reader preferences instead of relying on remount timing. Navigation guards are UX, not backend authorization: confirm the configured Firestore rules restrict profile writes and role changes before treating real-account edits as safe.

Alternative rejected: wiring a Firebase SDK directly into route components or treating a client-side role picker as an authorization boundary.

### D4. P5.3 completes the existing image-and-overlay implementation

Retain `MushafPage`, `AyahOverlay`, `PageTurn`, geometry helpers, and query/prefetch hooks. Fit the image and hit rectangles into the same measured content box; retain the documented 412/600 reference aspect and use the edition geometry when the scan differs. Test letterboxing, rotation/container changes, first/last pages, and pages crossing surah boundaries. Any deviation from the fixed-aspect wording is recorded with alignment evidence, not silently hidden.

Use the existing Uniwind-enabled image wrapper, contain fitting, memory-disk caching, and one Pressable per normalized bbox. Multiple boxes select the same ayah without a rectangular union swallowing intervening text. Outside taps clear selection. Preserve web selection data and native accessibility state; literal/tv highlight classes are an equivalent implementation when the selected-state mechanism is platform-specific. Apply a local light scope only if scan/overlay contrast actually requires it.

Separate image loading/failure/retry from catalog/bbox query errors so a successful metadata request cannot leave a silently blank page. Keep page/edition bounds in the store and service helpers rather than duplicating 604 as a universal scan limit.

Use gesture-handler for horizontal intent and Reanimated for visual updates; execute store navigation and best-effort haptics only on committed, effective turns. Debounce neighboring-page prefetch, limit it to plus/minus two in-range pages, and contain failures. Test fast-swipe cancellation and no-op boundaries. Validate `useCSSVariable` runtime values with an actual native/web animation; document conversion or static-token fallback instead of claiming the Jest mock proves animatability.

Alternative rejected: implementing the native module before the JavaScript reader has measured evidence.

### D5. P5.4-P5.6 share canonical navigation and content identities

Use `@expo/ui` menus/sheets/pickers and the existing primitives for header/footer actions. The surah sheet uses FlatList for 114 searchable rows, not native grouped List. Chrome must respect insets and leave the scan inspectable; coordinate outside taps, selection taps, and auto-hide so one gesture cannot issue contradictory actions. Next/previous remain reading-order actions even when UI language changes.

Reuse the store's page/surah/ayah navigation and selection-clearing rules. Switching editions changes the query identity and attaches the matching bbox result atomically; a stale response from the previous edition must not replace the new selection. Keep the current position according to the existing clamping contract and test per-edition ranges.

Derive an explicit content identity containing at least surah and ayah, plus edition/riwaya where relevant, from the selected bbox row. Never use an ayah-in-surah string alone for cross-page content, notes, audio, or cache identity. Quran text uses selectable Quran typography; translations and e3rab get explicit source direction with local LayoutDirection scopes. Test 200% text and constrained tablet widths.

One typed parser and URL builder handle `othman://quran` and `/quran` query parameters. Explicit deep links win over saved position on cold start and apply once; plain entry restores the saved position. Invalid pages clamp to the resolved edition, while invalid surah/ayah combinations produce the specified recoverable state. Resolve page/surah/ayah together; when a valid surah+ayah is supplied, its edition mapping determines the page rather than allowing contradictory parameters to select a different ayah. Share uses the same builder, and the Quran tab actually enters the reader. Retain the existing reader route as the rendering surface instead of creating a second reader.

Alternative rejected: separate link parsing in the tab, modal, share action, and store, which would make cold-start behavior depend on arrival path.

### D6. P6.1 owns one explicit audio lifecycle

Install only missing Expo-compatible dependencies; haptics already exists. Verify installed `expo-audio` declarations before translating the audio-mode fields in MIGRATE: require silent-mode/background behavior, not an unsupported option name. Keep one playback owner, use player/status hooks, and derive UI from player state rather than a second independent clock.

Identify each loaded item by selected ayah and reciter. Handle completion once per playback generation and reuse the existing absolute-ayah/URL helpers with surah metadata for advancement. `adjacentAyahNumbers` returns the previous ayah and three forward neighbors; it is not itself an auto-advance result. Select the immediate forward neighbor and stop at surah end unless wrap is enabled. Replacing selection, source, or reciter invalidates stale completion callbacks. Prefetch only the next audio item rather than blindly requesting the entire existing prefetch helper's output; expose buffering and transport failure. Use native Slider/Picker/Switch controls, release resources on teardown, and pause on interruption without automatic resume. Lock-screen controls stay excluded.

Alternative rejected: one player per rendered ayah or auto-advancement from multiple effects observing the same completion boolean.

### D7. P6.2-P6.3 use selected-ayah repositories, not panel-local storage

Notes use a repository/service under `src/services/notes`, backed by `storageService` for v1. Persist a versioned note payload with stable note IDs and canonical ayah identity. Namespace personal records by the current account or an explicit guest namespace so account switches do not expose another account's notes. Optimistically show an addition, reconcile or roll it back on failure, and clear the draft only after persistence succeeds. The native sheet contains a virtualized list and keyboard-safe composer; use the native text-input control unless the existing documented controlled-draft limitation requires the app Input fallback.

Tafsir reuses the Quran content boundary where appropriate and adds explicit source/type adapters where the existing endpoint lacks them. Preserve the reference panel's surah, tafsir, e3rab, and translation categories, but validate their provider option/content URLs against recorded responses: the reference inconsistently mixes absolute and local ayah numbers. Option and content query identities include canonical ayah and content type; content additionally includes the source ID. A type change must refetch its options and invalidate an incompatible selected source. Validate real non-empty fixtures per supported type, enforce a named payload-size bound, and distinguish pending, transport/parse error, legitimate empty, and ready text. Render selectable text using source direction and keep the failure/retry state local to the selected source. Never convert backend failure into a successful empty string.

Alternative rejected: connecting notes to Firestore during the migration or carrying the frozen web implementation's empty-tafsir stub into the new service.

### D8. P7 is an evidence gate, not a scheduled native rewrite

Profile the JS reader after P5.3 on the lowest supported available device in a representative non-debug build. Record device/OS/build/commit/edition, cache conditions, 20 page turns, JS frame timings, displayed frame rate, tap-to-select latency, and memory before/after repeated runs. Report the statistic used, not an unsupported blanket claim. Evaluate the original under-16-ms JS-frame target, at-least-55-fps target, and memory plateau; distinguish image-cache warmup from continuing growth.

If the budget is met, record P7.2 as not needed and do not scaffold a module. Otherwise first identify the bottleneck and take the P7.2 branch only with the recorded go decision. Its view contract is image plus normalized rectangles, ayah press events, and prefetch; use platform caches, theme-agnostic props, a feature flag, and the existing JS implementation for web/fallback. Verify behavior and performance against the same measurements.

### D9. P8 preserves static Expo web while validating actual hosting behavior

Export to root `dist` and configure root Firebase Hosting for that output. Serve generated assets/static routes before an unmatched-route fallback; prove refresh and direct navigation for Home, Quran query links, reader routes, sign-in, and protected return flows. Do not copy the legacy hosting file without testing how Metro's static export resolves those URLs. Any hosting strategy that requires changing `web.output` needs a separate approved compatibility decision.

Keep public Firebase configuration and web OAuth authorized origins separate from secrets. Verify fonts before content reveal, startup DOM guards, document direction, responsive top navigation, mouse/trackpad interactions, and 375/768/1024 widths. No native-only module may load in the web bundle. Use a preview environment before a separately authorized deployment. PWA/service-worker assets are not ported.

### D10. Tasks mirror the existing dependency graph and acceptance debt

The supervisory ledger contains one recovery prerequisite, an explicitly requested governance package, all remaining original P IDs, and outstanding evidence from completed stages. Completed foundations are reused, not reimplemented. P3.3 and P5.3 may progress independently after their original prerequisites are verified; shared-file ownership is serialized. Preserve P5.3 -> P5.4 -> P5.5 -> P5.6 -> P6.1 -> P6.2 -> P6.3. P7.1 branches from P5.3. P8 follows completed P4/P5 prerequisites and need not acquire an invented dependency on all utilities; final acceptance still includes all activated v1 features.

P9.1-P9.3 remain deferred even though described in the ledger. Explicit activation and P8.3 evidence are required before execution. Earlier CI/full documentation rewrites require a recorded scope/order amendment; basic local verification and PR discipline apply immediately. Track P3.2 Link.Preview/Link.Menu as an explicit applicable implementation or reviewed deferral: do not invent meeting-detail routes just to check the box.

Resolve the legacy scope-note contradictions by preserving the explicit task-list boundaries: mock meetings/progress stay mock, and cloud avatar storage is not inferred from a P4.3 prose note. Record the discrepancy and obtain a scoped amendment if remote persistence is required. Do not claim demo progress or device-local photos are real synchronized account data.

### D11. Agent Git operations have explicit ownership and authorization

Adopt these rules in a contributor-facing policy with a small pointer from agent instructions; the full P9.3 documentation rewrite remains deferred. The planning artifacts are not permission to execute Git mutations.

- One PR-sized assignment owns one branch and one worktree outside the repository. Record P IDs, base SHA, prerequisites, allowed files, tests, device-evidence owner, and authorized Git operations before implementation. Use descriptive `feat/`, `fix/`, `docs/`, or `chore/` branches rather than shared stage branches.
- Until migration integration is accepted, migration PRs target `refactor/add-mobile-support`; promote the completed migration to `main` through a reviewed PR. Verify current refs/ancestry before acting; cached tracking refs are not proof of remote freshness.
- Use atomic Conventional Commits and explicit path staging. Do not commit unrelated edits, generated output, credentials, or broken intermediate work as a finished feature. Do not rewrite historical commits merely to normalize their subjects.
- Commit, push, create PR, merge, deploy, force-push, and delete are distinct permissions. Require explicit assignment-level authorization for commits and topic-branch pushes; merging/deploying/cleanup remain maintainer-controlled unless specifically delegated. Never push directly to protected/integration branches. A push runs focused checks and `verify` on the pushed SHA; any authorized draft exception is labeled and cannot merge.
- PRs identify change/P IDs, dependencies, approach, exact checks, manual evidence, limitations, and rollback. Draft status can expose pending device evidence but cannot imply acceptance. Independent review, green verification of the integrated result, and required native/web UI smoke evidence precede merge.
- Prefer independent PRs and squash merges for a coherent topic. A necessary stack targets its immediate parent; merge in dependency order. Squashing a parent changes commit identity, so deliberately reconcile dependent branches and rerun checks before retargeting. Do not let agents independently rebase shared branches.
- Serialize overlapping changes in package/lock/config files, root layout, shared locale keys, and MIGRATE. Use one integration owner and revalidate the combined tree; never concatenate both sides of a conflict or hand-merge generated lockfiles.
- No destructive reset, shared-history rewrite, or force-removal of dirty worktrees. A force-push needs specific approval, exclusive branch ownership, and `--force-with-lease`. Cleanup requires a clean owned worktree, incorporated changes, no dependents, and approval. For squash merges verify PR disposition/content, not ancestry alone. Do not delete apparently stale remote branches based only on cached refs.

### D12. Evidence, closure, and steady-state development are separate milestones

`tasks.md` is the execution ledger; MIGRATE retains original requirements/history. Every task has implementation and acceptance tracked separately through its package handoff. Record owner, tested SHA, command/build/device results, evidence link, and disposition (ready, in progress, blocked, validated, conditional-not-needed, or explicitly deferred). An unchecked manual gate remains unchecked even after automated tests pass. A policy decision or documented deferral can be completed as a decision task without pretending the deferred feature was delivered.

After P8, migration functionality may be validated while Stage 9 remains deferred; do not label the app store-ready. After activated release work and P9.3, reconcile every box, promote approved integrated work, archive/sync completed OpenSpec changes, and use small capability-based changes for ongoing features and fixes. Carry genuine leftovers into an owned backlog with acceptance criteria and an approval reference; do not erase them during archival.

## Risks / Trade-offs

- [Broken baseline hides additional P5.3 defects] -> Repair parsing first, run focused reader checks and then the full existing verification gate; keep unrelated fixes out.
- [Windows cannot establish iOS/device evidence alone] -> Assign native execution to an EAS/development-client and device-capable owner; report blocked evidence rather than marking it passed.
- [OAuth/provider or audio options differ from prose examples] -> Verify installed declarations and a bounded runtime spike before implementing against them; escalate incompatible approaches.
- [Client guards mistaken for security] -> Verify backend rules for real account operations and do not expose role mutation based on client checks alone.
- [Scope notes imply unscheduled backends] -> Preserve explicit boundaries, disclose demo/local behavior, and require an approved amendment for expansion.
- [Parallel agents recreate merge corruption] -> Isolated worktrees, shared-file ownership, explicit dependencies, and integrated-result validation.
- [Deferred CI weakens enforcement] -> Require recorded local verification/review now; activate P9 CI explicitly instead of claiming unavailable protections exist.

## Migration Plan

1. Review this design and ledger; authorize one ready package and its Git permissions, not the entire backlog by implication.
2. Land the baseline recovery, then adopt the workflow policy and close native foundation evidence as the relevant device/session capabilities become available.
3. Execute original P3.3/P5/P6 dependencies, measuring P7 from P5.3 and validating P8 once its prerequisites are ready. Each package includes focused tests, `verify`, and target-appropriate evidence.
4. Keep deferred and conditional branches stopped at their gates. Explicitly activate release work only after cross-target acceptance and maintainer approval.
5. Promote/release only through authorized review. Roll back a defective topic by a reviewed revert or flag-off fallback; do not reset shared history, revert unrelated work, or mutate the frozen web tree.
6. Reconcile MIGRATE and OpenSpec status before handover. Continue with ordinary small changes using the same technical boundaries, verification, review, and cleanup policy.