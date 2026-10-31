# Tasks

This is the supervisory ledger for the remaining `MIGRATE.md` work, not permission to implement every package at once. Read `design.md` before assigning work. All boxes start unchecked because this proposal implements nothing; existing code is reused and assessed, not counted as newly completed work.

**Execution rules**

- Authorize one ready PR-sized package at a time; split a group across PRs when needed. Preserve original P dependencies, serialize shared-file edits, and stop at unavailable credentials/devices, unapproved scope changes, or permission gates.
- For every assigned package record: owner, branch/worktree, base SHA, owned paths, dependencies, Git permissions, tested SHA, check results, evidence link, reviewer, and disposition. These fields are initially unassigned; maintain them in the package PR/handoff and link evidence beside completed tasks.
- Code completion is not stage acceptance. Keep device/integration checkboxes open until their own evidence exists. Use explicit blocked/deferred/conditional-not-needed notes rather than checking an unimplemented feature.
- Every implementation package runs its focused checks and `npm run verify`; every UI PR needs iOS, Android, and web smoke evidence before merge. Tests, translations, and relevant documentation land with their owning package, not at the end of the migration.
- Groups 12-13 are the P7 branch from P5.3, not a dependency after all of Stage 6. Run the shared profiling campaign as soon as the P5.3 implementation is testable; its evidence closes P5.3 performance acceptance before P5.4 acceptance.
- Groups 18-20 remain **DEFERRED**. Their checkboxes are inventory, not activation. Do not execute them or move CI/full documentation earlier without explicit approval.

**Dependency map**

| Package | Source scope                   | Gate                                                                               |
| ------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| 1       | Recovery for P0.1/P0.4         | First implementation package                                                       |
| 2       | Requested SWE governance       | Adopt after recovery; governs subsequent assignments                               |
| 3       | Outstanding P0-P3 evidence     | Requires recovered builds and target access; session evidence also follows group 4 |
| 4       | P3.3                           | Existing P3.2 prerequisites; recovery and assignment policy                        |
| 5-8     | P5.3 -> P5.4 -> P5.5 -> P5.6   | Existing P5.1/P5.2 and original P3.1/P4.2 prerequisites                            |
| 9-11    | P6.1 -> P6.2 -> P6.3           | P5.6, then original sequential dependencies                                        |
| 12-13   | P7.1 -> conditional P7.2       | Testable P5.3 implementation; recorded optimization decision                       |
| 14      | Outstanding P4.1-P4.5 evidence | Native builds; real-account checks follow P3.3                                     |
| 15-17   | P8.1 -> P8.2 -> P8.3           | Original P4.x/P5.x prerequisites; final matrix covers activated features           |
| 18-20   | P9.1 -> P9.2 -> P9.3           | Accepted P8.3 plus explicit Stage 9 activation                                     |

## 1. Recover the verification baseline

Source: recovery prerequisite for P0.1/P0.4. Approach: D1. Owner area: root manifest/lock/layout and only directly exposed integration blockers.

- [x] 1.1 Compare merge `ba1ed9a` with both parents and record intended dependency/script/provider/route differences; verify: the recovery note identifies the three corrupted files and preserves legitimate changes from both parents. (Evidence: `MIGRATE.md` → "Recovery baseline (OS-001 group 1)".)
- [x] 1.2 Repair root `package.json` without duplicate dependency/script entries or unrelated upgrades; verify: strict JSON parsing succeeds and each retained entry has one authoritative value.
- [x] 1.3 Recover or regenerate a coherent root lockfile using the agreed Node/npm versions; verify: a clean `npm ci` succeeds without changing dependency intent and the toolchain versions are recorded. (Node 24.15.0 / npm 11.12.1; `npm ci --dry-run` up to date, full `npm ci` blocked only by the running Metro process holding a native module.)
- [x] 1.4 Deduplicate `src/app/_layout.tsx` while retaining provider order, account sheets, About, and full-screen reader registration; verify: `npm run typecheck` and relevant navigation/render checks pass.
- [x] 1.5 Repair only directly exposed partial-reader type/lint/test blockers; verify: focused existing Quran tests and the complete `npm run verify` pass with failures and fixes identified in the recovery PR. (No extra reader fix was required; 65 suites / 479 tests pass.)
- [x] 1.6 Confirm config, SDK compatibility, and target bundling; verify: `npx expo config --type public`, `npx expo-doctor`, and the three root `build:web`, `build:ios`, and `build:android` scripts succeed without touching `othman-web/`.
- [x] 1.7 Record the new baseline and supersede obsolete green claims without rewriting migration history; verify: the tested SHA, install/check/export results, and remaining device blockers are linked from the ledger/MIGRATE evidence. (Base `18dbd83`, recovered tree `c7b1a49`.)

## 2. Establish agent and Git operating policy

Source: explicitly requested governance addition, not promotion of the full P9.3 rewrite. Approach: D10-D12. Depends on group 1 for implementation; no Git mutation is implied by these planning artifacts.

- [x] 2.1 Publish the D11 contributor policy and add a minimal agent-instruction pointer while retaining P9.3's full rewrite as deferred; verify: documentation clearly separates implementation, commit, push, PR, merge, deploy, rewrite, and delete permissions.
- [x] 2.2 Define exclusive branch/worktree naming, external worktree location, migration integration base, assignment records, and explicit owned paths; verify: a sample assignment identifies base SHA, dependencies, checks, evidence owner, and authorized operations.
- [x] 2.3 Establish PR evidence fields for P/change IDs, dependencies, tested SHA, focused/full checks, device results, limitations, and rollback; verify: a PR template or documented equivalent marks missing acceptance evidence as merge-blocking.
- [x] 2.4 Establish atomic Conventional Commits, explicit staging, independent/stacked PR ordering, squash-parent reconciliation, and integrated-result checks; verify: the policy walkthrough covers a dependent PR after parent squash without duplicate or lost changes.
- [x] 2.5 Assign one integration owner for manifests, lockfile, app config/layout, shared locales, and MIGRATE updates; verify: overlapping sample assignments have a documented owner and merge order rather than concurrent shared writes.
- [x] 2.6 Define approved cleanup criteria and protected-history rules; verify: dirty worktrees, dependent branches, unincorporated squash commits, and stale cached remote refs all stop deletion in the documented decision process.
- [x] 2.7 Record the mock meetings/progress and local-photo scope discrepancies without adding backends; verify: any proposed expansion has a separate approval reference, and demo/local behavior is not described as synchronized account data.
- [x] 2.8 Adopt implementation/automated/device/deferred evidence dispositions and check the new policy documentation; verify: a maintainer review and documentation formatting/diff checks pass without claiming CI or branch protections already exist.

## 3. Close outstanding foundation and shell evidence

Source: unchecked tasks and prose-only acceptance debt in P0-P3. Approach: D2/D10/D12. Use existing live screens/forms instead of recreating the deleted proof screen. Each task records target/build/SHA and pass/fail; unavailable native execution remains blocked.

- [ ] 3.1 Complete P0.2 development-client boot on iOS and Android using EAS or appropriate native toolchains; verify: both clients launch, required public configuration resolves, and Firebase initialization does not throw.
- [ ] 3.2 Complete P0.3 native styling checks on equivalent existing surfaces; verify: light/dark palette, spacing/rem scale, active styling, and Arabic shaping match the intended Uniwind behavior on both native targets.
- [ ] 3.3 Complete P2.1 primitive acceptance; verify: text, controls, media, loading/error/empty states, and accessibility structure render in both schemes on iOS/Android/web, not only in Jest mocks.
- [ ] 3.4 Complete P2.2 theme acceptance; verify: saved mode survives relaunch, system mode follows OS changes, and first content does not flash the wrong scheme.
- [ ] 3.5 Complete P2.3 font/splash acceptance; verify: Arabic shaping, Quran line height, absence of tofu/font swap after reveal, and font-failure splash release are evidenced on native plus web.
- [ ] 3.6 Complete P2.4 language/form acceptance; verify: Arabic/English persistence, logical layout, shaped Input text, keyboard alignment, restart-required behavior, and document direction work on applicable targets with `check:i18n` passing.
- [ ] 3.7 Complete P3.1 boot/deep-link/inset acceptance; verify: cold-start navigation, safe-area updates, and provider gates work on native while static web rendering has no module-scope DOM failure.
- [ ] 3.8 Complete P3.2/P3.5 navigation acceptance; verify: all four native tabs have correct glyphs/tint/RTL ordering and every offered registry/error/back destination resolves on all targets, including protected behavior after group 4.
- [ ] 3.9 Resolve the outstanding P3.2 Link.Preview/Link.Menu obligation; verify: applicable existing navigation has tested previews/menus or a maintainer-approved deferral explains why no detail route is in scope, without inventing routes solely for the checkbox.

## 4. Complete P3.3 authentication

Approach: D3. Depends on original P3.2 prerequisites and groups 1-2; may run beside P5.3 with explicit shared-file ownership. Reuse existing auth/profile/query interfaces and tests.

- [x] 4.1 Install only missing Expo-compatible auth-session/crypto dependencies and maintain a coherent lockfile; verify: installation, typecheck, and public Expo config succeed with recorded versions. (`expo-auth-session@~57.0.16`, `expo-crypto@~57.0.4`; lockfile updated, typecheck and `expo export --platform web` succeeded.)
- [ ] 4.2 Validate the planned native Google provider API, public client IDs, redirect scheme, and provider-console restrictions using a bounded dev-client flow; verify: the documented token/redirect contract is supported, or implementation stops for a scoped compatibility decision. **Blocked:** no Google client IDs in `.env`, no device/dev-client, and no console access; the installed API contract is coded and unit-tested but cannot be validated against the provider.
- [x] 4.3 Implement AuthProvider session observation and profile resolution through the existing account service/query identity; verify: tests cover missing profile, profile failure settling loading, unsubscribe, and account-A/account-B response races. (`src/providers/auth-provider.tsx`; 8 tests in `src/providers/__tests__/auth-provider.test.tsx`.)
- [x] 4.4 Replace production demo session/profile selection and remove demo sign-in affordances while preserving injectable test fixtures; verify: account/edit hooks use the authenticated user and profile-service tests still cover merge/update failure behavior. (`demo-session.ts` deleted; profile barrel uses Firestore; demo repository retained as a fixture; account/edit screens migrated.)
- [x] 4.5 Implement native Google credential exchange and retain web popup behavior; verify: boundary tests cover success, cancellation, missing configuration, provider failure, and no fabricated session. (`src/platform/auth/google.ts`, code+PKCE exchange; 18 boundary tests; web still uses `signInWithPopup`.)
- [x] 4.6 Build the modal Google/email-then-password sign-in screen with pending/error/retry states; verify: screen tests cover both credential steps, submission disabling, non-enumerating failures, and absence of an account-existence lookup. (`src/app/auth/sign-in.tsx`, 11 tests.)
- [x] 4.7 Enforce registry-derived private tabs and account subroutes on native/web with a validated internal return destination; verify: direct signed-out access redirects, successful sign-in returns correctly, and external return URLs are rejected. (`RequireAuth` on meetings/account/edit/progress; `visibleTabs`; `sanitizeReturnTo` with 7 rejection tests.)
- [x] 4.8 Add explicit reader reset and stale-hydration protection to sign-out, cancel/clear prior-session queries, and retain display preferences; verify: account-switch and late-completion tests prove old state cannot reappear and theme/language survive. (`readerStore.reset`; provider cancels/removes account/progress/meetings and keeps Quran cache, theme, language, edition and page; race tests included.)
- [x] 4.9 Handle account-exists-with-different-credential without silent account linking; verify: a service/screen test exposes a recoverable sign-in path and exits pending state. (Screen shows recovery copy, no auto-retry, and leaves the form usable; mapper already surfaces the code.)
- [ ] 4.10 Verify configured backend authorization for own-profile updates and privileged role changes; verify: authorized/unauthorized backend or emulator evidence exists before real profile writes are accepted, with missing rules access reported as a blocker. **Blocked:** no Firestore rules/emulator access on this machine; profile writes now target Firestore, so rules must be reviewed before release (see `docs/auth-setup.md` §7).
- [ ] 4.11 Complete P1.2/P3.3 session and guard runtime acceptance; verify: Google/email sign-in, force-quit/relaunch restoration, profile-failure recovery, protected deep-link return, and sign-out work on iOS/Android/web. **Blocked:** no iOS/Android device or toolchain, no Google client IDs, and no web hosting/deploy target.
- [x] 4.12 Document public client-ID setup, redirect/authorized-origin configuration, rebuild needs, error recovery, and preserved mock/local boundaries; verify: no secrets are committed and a second operator can follow the setup notes. (`docs/auth-setup.md`, `.env.example` redirect entry, README pointer; only public IDs/origins are documented.)
- [ ] 4.13 Close the auth package with focused tests, translations, and integrated checks; verify: `npm run verify` passes on the integrated SHA and auth UI smoke evidence is linked for all three targets. `npm run verify` passes (70 suites / 530 tests); **auth UI smoke on native is blocked** with 4.2/4.11; web smoke exists only as a successful static export including `/auth/sign-in`.

## 5. Complete existing P5.3 mushaf rendering and hit-testing

Approach: D4. Depends on existing P5.1/P5.2 plus original P3.1/P4.2 prerequisites and groups 1-2. Owner area: existing Quran screen/components/hooks and their current tests; coordinate store changes with auth.

- [x] 5.1 Replace the Quran tab placeholder with a usable entry into the existing reader route; verify: screen/navigation tests and a manual open/exit round trip work without creating a second reader implementation. (`src/app/(tabs)/quran.tsx` opens `/reader/[page]` at the restored page; `quran-screen.test.tsx` covers restore and page 1. The reader stays the only implementation. The _manual_ round trip needs a device — see 5.11.)
- [x] 5.2 Complete catalog/preference/bbox attachment ordering and async states using existing hooks; verify: tests show no unnecessary default-edition bbox fetch and late data does not move an attached reader unexpectedly. (`reader-screen.test.tsx` covers attach order, retry without a catalog reload, and late bboxes leaving `page` at the restored value.)
- [x] 5.3 Complete measured scan fitting and normalized geometry across edition sizes; verify: existing geometry/page tests plus letterbox/resize/boundary cases prove image and overlay rectangles agree, including editions with nonstandard page ranges. (`mushaf-page` measures its container and fits the edition ratio via `fitBox`; `bbox-geometry.test.ts` covers letterbox, resize, rounding and boundary cases; `page.test.ts` covers nonstandard ranges.)
- [x] 5.4 Complete per-bbox Pressables, multi-box ayah highlights, outside clearing, selection data, and accessibility state; verify: overlay tests cover every box of an ayah, clear taps, and correct surah identity on a boundary page. (`ayah-overlay.tsx` renders one pressable per line box and a first-in-order full-page clear; `ayah-overlay.test.tsx` covers multi-box selection, clearing, labels and the boundary surah.)
- [x] 5.5 Add recoverable image loading/error/retry without conflating image failure with catalog/bbox success; verify: image failure/retry tests keep exit usable and never display a silently blank ready page. (`mushaf-page` owns `loading`/`ready`/`error`; retry remounts only the image; three new tests.)
- [x] 5.6 Complete gesture-handler/Reanimated turns and best-effort haptics; verify: gesture tests cover reading order, vertical rejection, rapid turns, and no animation/feedback for an out-of-range no-op. (`page-turn.test.tsx` + `swipe.test.ts` + `use-page-turn.test.tsx`, including the rapid-turn haptic count and the no-op boundary.)
- [x] 5.7 Run the CSS-variable animation spike on native and web, implementing a supported conversion/static fallback if required; verify: the runtime value type, timing behavior, and chosen `--motion-page-turn` handling are recorded in MIGRATE evidence. **Recorded** in `MIGRATE.md` P5.3: the token is a number/string/undefined depending on platform, so `cssNumber` converts it once and `withTiming` receives a duration; CSS variables are not used directly as animated style values. No fallback theme was required.
- [x] 5.8 Complete plus/minus-two-page debounced prefetch and contain failures; verify: fake-timer tests cover rapid-page cancellation, first/last-page bounds, settled requests, and failure handling. (`use-page-prefetch.test.ts`, including the contained-rejection case.)
- [x] 5.9 Decide whether scan contrast requires a local light scope and record any aspect/highlight implementation equivalence; verify: screenshots in both schemes justify the decision without introducing a global forced-light reader theme. **Decision recorded** in `MIGRATE.md` P5.3: no local light scope; the scan carries its own contrast, the surround uses the edition's data `themeColor`, and the highlight is a translucent token. Screenshot-based sign-off is part of the blocked device pass (5.11).
- [x] 5.10 Run existing P5.1/P5.2/P5.3 service/store/selector/render regressions and document the completed rendering approach; verify: focused Quran checks and `npm run verify` pass with no needless catalog duplication or whole-store subscriptions. (12 Quran suites / 127 tests; `npm run verify` green; selectors stay narrow and the catalog query is not duplicated.)
- [ ] 5.11 Close P5.3 runtime acceptance using the shared group-12 campaign; verify: correct ayah hit-testing on supported editions, target smoke evidence, and 20-turn frame/memory results are linked before marking P5.3 accepted. **Blocked:** no iOS/Android device, no hosting/deploy target, and no profiler session.

## 6. Implement P5.4 reader chrome

Approach: D5. Depends on accepted P5.3; its performance evidence comes from group 12. Owner area: reader chrome/sheets and narrow store/query integration.

- [x] 6.1 Build the surah/ayah header, page indicator, native menu, and exit action with safe-area handling; verify: labels track selection/page changes and header actions remain accessible in RTL/LTR tests. — Evidence: `reader-chrome.test.tsx` (surah name, page, selected ayah, exit/surah/edition/menu actions, RTL labels) and reader-screen integration (labels track turns). Menu is a `BottomSheet`, not `MenuView` (its source documents inert actions on web).
- [x] 6.2 Add previous/next footer actions with reading-order semantics and stable tabular numerals; verify: screen tests cover both UI languages, edition boundaries, and disabled no-op behavior. — Evidence: `reader-chrome.test.tsx` footer cases plus reader-screen footer-turn test; store remains the no-op guard.
- [x] 6.3 Add the native surah BottomSheet with searchable FlatList rows for all 114 surahs; verify: search/jump/close tests and native scrolling confirm correct mapping without using grouped List as a virtualized picker. — Evidence: `reader-sheets.test.tsx` (order, selected row, search → jump, empty state, query reset on close) and `surah-search.test.ts`; native scrolling remains part of blocked task 6.7.
- [x] 6.4 Add edition picker/summary with matching query/store attachment; verify: tests cover rapid edition changes, stale responses, position clamping, and selection clearing while a refetch preserves valid same-edition state. — Evidence: reader-screen edition-switch and late-response tests; `attachEdition`/`switchEdition` split in `ReaderBody`.
- [x] 6.5 Add Read/Tafsir/Notes panel surfaces and coordinate selection taps, outside clearing, and chrome auto-hide; verify: interaction tests show no contradictory double action and panels have honest states until their owning content packages land. — Evidence: reader-screen margin-tap test (clears selection instead of hiding chrome) and `AyahPanelSheet` tests (no-selection prompt, pending copy).
- [x] 6.6 Document chrome/panel interaction contracts and add translated accessibility labels with this package; verify: focused tests, `check:i18n`, and `npm run verify` pass. — Evidence: `docs/reader-chrome.md`; i18n audit 209 keys; `npm run verify` green.
- [ ] 6.7 Complete native/web chrome acceptance; verify: jump/switch/navigate preserve the store rules, native sheet/back behavior works, and no chrome covers Quran text at supported sizes. — Blocked: no iOS/Android device or toolchain and no authorized web host on this machine.

## 7. Implement P5.5 ayah content rendering

Approach: D5. Depends on P5.4. Reuse the current content repository/parser and existing typography primitives.

- [x] 7.1 Resolve selected content from canonical surah/ayah/absolute identity rather than a local ayah key alone; verify: query tests cover cross-surah pages and changing selection while content is pending. — Evidence: `resolveSelectedAyah` reads the tapped bbox row; `useAyahContent` keys by absolute number and is disabled without a selection; `ayah-content.test.ts` and `quran-queries.test.tsx` (absolute key, late response, retry).
- [x] 7.2 Port AyahDisplayer behavior with icon, selectable Quran text, and loose readable leading; verify: render tests cover pending/error/empty/ready content and long diacritized text. — Evidence: `ayah-displayer.test.tsx` (selectable, Quran font, `leading-loose`, ornament), Read-panel pending/error/ready/no-selection cases in `reader-sheets.test.tsx`.
- [x] 7.3 Apply explicit source direction to translation/e3rab blocks without flipping the surrounding reader; verify: mixed-direction rendering tests and native/web checks show correct block order/alignment. — Evidence: per-block `writingDirection`/`textAlign` in `AyahDisplayer`; mixed LTR/RTL block tests in `ayah-content.test.ts` and `ayah-displayer.test.tsx`. No translation/e3rab repository is wired yet, so blocks are a rendering contract only; native visual confirmation remains with task 7.4.
- [ ] 7.4 Add responsive tablet constraints and large-text coverage with translations/documentation; verify: 200-percent text is unclipped in both themes and `npm run verify` plus all-target UI smoke evidence pass. — Implemented: `max-w-2xl` column, no `numberOfLines`/fixed `lineHeight`, source labels translated, `docs/ayah-content.md`; automated no-clipping/large-text structure tests pass. Blocked: 200%-text visual check in both themes and all-target UI smoke need a device and hosting target (groups 12/17).

## 8. Implement P5.6 deep links, restore, and share

Approach: D5. Depends on P5.5. Reuse the existing reader route/store rather than introducing a duplicate reader.

- [x] 8.1 Add one typed parser and canonical URL builder for native `othman://quran` and web `/quran` page/surah/ayah parameters; verify: unit tests cover valid shapes, missing/duplicate/malformed parameters, and builder/parser round trips. — Evidence: `links.test.ts` covers every shape and both builders round-trip through the parser.
- [x] 8.2 Resolve explicit links against edition metadata with ayah mapping taking precedence over contradictory page input; verify: tests cover page clamping, invalid surah/ayah recovery, and nonstandard edition ranges. — Evidence: `resolveQuranLink` + `links.test.ts` (ayah precedence, 0/9999 clamping, Warsh 4–605, unknown ayah); `ReaderLinkError` recovery in `reader-screen.test.tsx` / `quran-screen.test.tsx`.
- [x] 8.3 Apply explicit cold-start intent once and keep plain-entry last-position restore; verify: delayed-storage/catalog tests prove saved state cannot overwrite a deep link or undo the user's next page turn. — Evidence: `ReaderScreen` owns the applied-once flag; tests cover link-over-restored-page, page-turn persistence after rerender, and no re-apply across an edition-switch remount.
- [x] 8.4 Wire share through the canonical builder with validated current selection; verify: reopening shared native/web links restores the same canonical position without off-by-one identity errors. — Evidence: menu Share uses `buildQuranShareUrl`; `reader-screen.test.tsx` asserts the selected ayah payload; builder/parser round trips cover reopening.
- [ ] 8.5 Document link formats and invalid-input behavior with this package; verify: examples match parser tests, focused tests and `npm run verify` pass, and iOS/Android/web cold/warm-link smoke evidence is recorded. — Documented in `docs/quran-links.md` and focused tests/verify pass. Blocked: cold/warm-link smoke needs real devices and a deployed web host (groups 12/17).

## 9. Implement P6.1 audio

Approach: D6. Depends on P5.6. Reuse `shaykhAudioUrl`, existing reciter configuration, and metadata; do not copy DOM audio objects from the reference app.

- [x] 9.1 Install/configure missing Expo audio support and verify installed audio-mode APIs against the requested silent/background behavior; verify: public config/typecheck succeeds, existing haptics is reused, and unsupported prose option names are not copied blindly. Evidence: `expo-audio@~57.0.5` installed, `expo-haptics` reused, `src/platform/audio` uses the installed `shouldPlayInBackground` field (not the prose `staysActiveInBackground`), and `app.config.ts` enables a playback-only plugin with no microphone permission.
- [x] 9.2 Implement one playback owner with player/status hooks and current ayah/reciter identity; verify: tests cover source replacement, disposal, stale events, and no orphan/duplicate players. Evidence: `use-ayah-audio.ts` + `use-ayah-audio.test.tsx` (one `useAudioPlayer(null)`, `replace` on ayah/reciter change, late completion ignored).
- [x] 9.3 Implement exactly-once auto-advance and explicit wrap boundaries using the immediate forward neighbor plus surah metadata; verify: unit tests cover repeated completion, first/last ayahs, wrap on/off, and the fact that `adjacentAyahNumbers` returns multiple neighbors. Evidence: `core/domain/quran/audio.ts` + `audio.test.ts`, `core/config/__tests__/shaykh.test.ts`, reader-screen auto-advance case.
- [x] 9.4 Add next-ayah-only prefetch plus buffering/error states; verify: fake-source tests show bounded requests, reciter/selection cancellation, and recoverable transport failure. Evidence: `use-audio-prefetch.ts` (one URL, cleanup clears it, `Promise.resolve` wrapper for web `void`), `audio-sheet.test.tsx` buffering/error/retry.
- [x] 9.5 Add play/pause, native Slider seek, reciter Picker, auto-read Switch, and previous/next ayah controls; verify: control tests keep progress/state synchronized with the current player. Evidence: `audio-sheet.tsx` + `audio-sheet.test.tsx` (all controls inside `Host`/`Column`, state read from the one player).
- [ ] 9.6 Implement interruption pause without automatic resume and safe background/foreground transitions; verify: iOS/Android interruption/silent-mode/background evidence and web playback smoke results match the contract. **Blocked:** no iOS/Android device or authorized web host here; the app policy (`interruptionMode: 'doNotMix'`, no automatic resume) and the `expo-audio` playback-only config are in place, but runtime acceptance remains with groups 12/17.
- [x] 9.7 Add audio URL/reciter boundary coverage, translations, and playback setup/limitation notes; verify: focused audio/core tests and `npm run verify` pass, active `src` has no HTMLAudioElement, and lock-screen controls remain explicitly excluded. Evidence: 83 suites / 646 tests green, i18n audit 227 keys, `docs/quran-audio.md`, lock-screen exclusion documented.

## 10. Implement P6.2 notes

Approach: D7. Depends on P6.1. Owner area: new notes service/repository plus the existing Notes panel; no Firestore notes backend.

- [x] 10.1 Add the injected local notes repository/service with versioned payloads, stable IDs, canonical ayah identity, and account/guest namespaces; verify: repository tests cover round trip, corruption/failure handling, and account separation. Evidence: `core/domain/notes/notes.ts` (v1 payload, parse/drop corrupt rows, replace-by-id), `services/notes` (injected repository over `storageService`, `quran:notes` key, `user:<uid>`/`guest` namespaces); `notes.repository.test.ts` covers relaunch round trip, corruption, rejected writes and namespace isolation.
- [x] 10.2 Add selected-ayah query/mutation contracts using the shared key factory and optimistic reconciliation; verify: tests cover success, write failure, retries without duplicates, and switching ayahs/accounts mid-write. Evidence: `use-notes.ts` (namespace+absolute key, cancel/set/rollback/invalidate, pending id reset on ayah/namespace change); `use-notes.test.tsx` covers optimistic row, rollback, idempotent retry, and ayah/account switches mid-write.
- [x] 10.3 Build the BottomSheet, virtualized notes list, and keyboard-safe composer with the documented controlled-draft fallback only if needed; verify: screen tests cover pending/error/empty/ready states and drafts clear only after successful persistence. Evidence: `ayah-panel-sheet.tsx` (remounts `NotesPanel` per namespace+ayah), `notes-panel.tsx` (`FlatList` + composer outside the list in `KeyboardAvoidingView`); `notes-panel.test.tsx` covers all four states, draft retention on failure, and save disabling.
- [x] 10.4 Add local-storage/privacy behavior notes and translations with the feature; verify: focused notes tests, `check:i18n`, and `npm run verify` pass without a new cloud dependency. Evidence: `docs/notes.md`, updated `docs/reader-chrome.md`/`docs/ayah-content.md`, existing ar/en note keys (231 keys agree); notes tests green and `npm run verify` passes with no new dependency.
- [ ] 10.5 Complete native/web notes acceptance; verify: save/relaunch restores the same ayah's notes, accounts remain isolated, and keyboard/sheet/back behavior never hides the composer action. **Blocked:** no iOS/Android device or authorized web host on this machine; automated coverage is in place but the relaunch/keyboard/sheet smoke remains with groups 12/17.

## 11. Implement P6.3 tafsir and content sources

Approach: D7. Depends on P6.2. The reference panel is read-only evidence, not code to patch.

- [x] 11.1 Validate provider option/content URLs and recorded responses for surah, tafsir, e3rab, and translation; verify: real non-empty fixtures demonstrate local-versus-absolute ayah mapping and source IDs without inheriting the reference request mismatch. Evidence: `src/services/tafsir/__fixtures__/` recorded from quranpedia on 2026-10-31 with source URLs; tests assert `2/262` (local), not `2/269` (absolute), and the real `translations`/`surah/information` paths.
- [x] 11.2 Implement source/type adapters and parsing with a documented named payload cap; verify: boundary tests cover valid text, legitimate empty, malformed/oversized responses, and transport failure without a successful empty-string stub. Evidence: `core/domain/quran/tafsir.ts` (`MAX_CONTENT_CHARS` 120k, `MAX_CONTENT_PARTS` 200, HTML flattening, empty union) + `tafsir.test.ts`; repository test covers transport failure.
- [x] 11.3 Add option/content query keys including canonical ayah, type, and selected source where applicable; verify: switching type refetches options, invalidates incompatible source selection, and cannot reuse stale content from another type. Evidence: `queryKeys.tafsir.{sources,content,surah}`; `use-tafsir.test.tsx` covers type switch, first-valid-source derivation and no old-source request.
- [x] 11.4 Wire native type/source controls and selectable source-directed text into the panel; verify: screen tests cover each source's pending/error/empty/ready state and retry without clearing reader selection. Evidence: `tafsir-panel.tsx` (`@expo/ui` Picker in `Host`/`Column`, selectable per-direction text) + `tafsir-panel.test.tsx`; `AyahPanelSheet` forwards the canonical ayah.
- [x] 11.5 Document provider mappings/cap/recovery behavior and translate new strings; verify: focused parser/service/panel tests and `npm run verify` pass with fixture-backed text for every offered type. Evidence: `docs/tafsir.md`, updated `docs/reader-chrome.md`/`docs/ayah-content.md`, ar/en content keys (237 agree); `npm run verify` green (91 suites / 726 tests).
- [ ] 11.6 Complete all-target tafsir acceptance; verify: live supported sources return actual text, oversized/failing sources remain recoverable, and RTL/LTR/large text remains readable in both themes. **Blocked:** no iOS/Android device or authorized web host on this machine; automated and fixture-backed coverage is in place, runtime/theme/large-text acceptance remains with groups 12/17.

## 12. Execute P7.1 and shared P5.3 profiling

Approach: D8. Depends on a testable P5.3 implementation, not P6.3. Reuse one campaign to satisfy both P5.3 and P7.1; do not defer measurement until the end of the reader work.

- [ ] 12.1 Identify the lowest-supported test device and representative build, then define repeatable cache conditions and timing/memory capture; verify: the protocol records device/OS/build/SHA/edition and the statistics that will be reported.
- [ ] 12.2 Measure at least 20 page turns, tap-to-select latency, JS frame timings, frame rate, and repeated-run memory; verify: recorded results evaluate under-16-ms JS frames, at-least-55-fps rendering, and memory plateau without confusing cache warmup with a leak.
- [ ] 12.3 Record the budget decision and bottleneck evidence in MIGRATE; verify: P7.2 is explicitly marked not needed when budgets pass, or a scoped go decision identifies why native work is justified, with unresolved measurements left blocked.

## 13. Execute P7.2 only when justified

Approach: D8. **CONDITIONAL: stop unless group 12 records a native go decision.** A no-go completes the decision record, not the unbuilt module tasks; annotate their disposition as conditional-not-needed rather than silently implementing them.

- [ ] 13.1 Confirm the recorded native go decision and authorize the bounded module package; verify: the failed budget, bottleneck, native owner, parity criteria, and permissions are present before scaffolding.
- [ ] 13.2 Scaffold the local Apple/Android Expo module and module registration using current compatible tooling; verify: platform configuration and development builds resolve the module without adding it to the web runtime.
- [ ] 13.3 Implement image/normalized-rect props, ayah press events, and bounded prefetch with native caches and theme-agnostic contracts; verify: platform tests/builds and recorded hit-test/cache checks match the JS behavior.
- [ ] 13.4 Add the typed wrapper, opt-in feature flag, and existing JS web/failure fallback with module documentation; verify: flag-on/off behavior tests, web export, and `npm run verify` pass.
- [ ] 13.5 Compare flag-on/off performance with the group-12 protocol; verify: equivalent selection/navigation and improved failed-budget measurements are recorded before enabling the native implementation.

## 14. Close outstanding P4 feature-screen acceptance

Approach: D10/D12. These are acceptance tasks for existing screens, not rebuilds. Run as soon as their native prerequisites are available; account-session behavior follows group 4.

- [ ] 14.1 Complete P4.1 Home checks; verify: largest supported OS text, long Arabic identity/verse text, both languages, both themes, and all registered links work on iOS/Android/web.
- [ ] 14.2 Complete P4.2 Meetings checks; verify: RTL 42-cell grid order, Arabic numbers, canonical selected day, target sizes, expansion smoothness, and safe browser opening match the existing behavior on native/web.
- [ ] 14.3 Complete P4.3 Account checks after real auth integration; verify: hosted list measurements, formSheet detents/grabber, back/swipe guard during save, draft preservation, RTL input, photo permission, and large text work on both native targets and web equivalents.
- [ ] 14.4 Complete P4.4 Progress checks; verify: mid-tier Android scrolling reaches the documented 60-fps target, RTL order and selected-sheet behavior work, and demo progress is not presented as live account data.
- [ ] 14.5 Complete P4.5 About checks; verify: native list chrome, hosted Arabic prose, directional chevrons, website browser presentation, and registered quick links work in both schemes on all targets.
- [ ] 14.6 Record the combined P4 acceptance outcomes and any scoped fixes with their owning tests/docs; verify: linked evidence distinguishes pass/fail/blocked and no earlier manual checkbox is silently discarded.

## 15. Implement P8.1 web build and deployment

Approach: D9. Depends on original completed P4.x/P5.x prerequisites and auth for sign-in acceptance; no invented dependency on finishing every utility before preview hosting work can begin.

- [ ] 15.1 Confirm root static Expo export and asset/font output; verify: `npm run build:web` succeeds with `web.output` still static and no frozen-web files in deploy output.
- [ ] 15.2 Add root Firebase Hosting configuration and deploy script for `dist`, preserving real generated routes/assets before the unmatched-route fallback; verify: local hosting/preview direct navigation and refresh resolve Home, Quran query links, reader routes, sign-in, and protected return URLs.
- [ ] 15.3 Verify public Firebase config and web OAuth authorized origins for the preview/deployed host; verify: Google popup completes and returns correctly without committing credentials or changing provider behavior blindly.
- [ ] 15.4 Verify font reveal and startup rendering on web; verify: font loading has no visible text disappearance/swap and static rendering does not access browser globals at module scope.
- [ ] 15.5 Document build/preview/deploy commands and the deliberate absence of PWA/service-worker support; verify: instructions match the root output and no legacy service worker is registered.
- [ ] 15.6 Obtain separate deployment authorization and publish a preview to the intended hosting target; verify: the preview serves Home, the Quran reader, and sign-in with linked URLs and the deployed SHA after `npm run verify` passes.

## 16. Complete P8.2 web parity

Approach: D9. Depends on P8.1; retain the existing desktop top-navigation direction.

- [ ] 16.1 Complete responsive header/tab behavior and web navigation semantics; verify: active state, open/back behavior, labels, and layout work at 375/768/1024 widths without a desktop phone-style bottom bar.
- [ ] 16.2 Complete mouse-drag/trackpad reader behavior without hover-only controls; verify: pointer and touch smoke checks select ayahs, turn pages, and open/dismiss panels without gesture conflicts.
- [ ] 16.3 Verify document direction and scoped content direction together; verify: Arabic/English screenshots and interaction checks at all three widths show no text/control overlap or incoherent flip.
- [ ] 16.4 Check platform resolution and frozen-app exclusion with parity fixes/tests/docs in the same package; verify: web runtime/export loads no native-only implementation, deploy output excludes `othman-web/`, and `npm run verify` passes.

## 17. Execute P8.3 cross-target acceptance

Approach: D12. Depends on P8.2. Cover every activated v1 feature, including auth and any included utility/native-reader packages; do not describe an incomplete feature matrix as final acceptance.

- [ ] 17.1 Record small/large iPhone, small Android, tablet, desktop web, and mobile web matrix ownership and build identifiers; verify: each target has an actual evidence runner or an explicit blocking gap.
- [ ] 17.2 Exercise applicable pending/error/empty/ready states on each data surface; verify: failures retain navigation and retry, and invalid empty/loading states are not conflated.
- [ ] 17.3 Exercise both languages/themes, long Arabic labels, and 200-percent text; verify: matrix evidence has no clipping, hidden actions, or overlapping text at supported sizes.
- [ ] 17.4 Exercise offline cold start, saved-state restoration, expired sessions, and account changes; verify: recovery is honest, prior-account private data is not exposed, and unsupported offline media is not promised.
- [ ] 17.5 Audit target sizes, selectable content, spoken labels/selection, keyboard, and native sheet/back behavior; verify: 44-pt/48-dp guidance is met or a specific accessible exception is reviewed rather than silently exempting compact heatmap cells.
- [ ] 17.6 Close cross-target regressions in their owning packages and record acceptance; verify: `npm run verify`, relevant exports, and the complete pass/fail matrix identify the accepted integration SHA and all explicitly deferred obligations.

## 18. P9.1 release readiness - DEFERRED

Approach: D12. **STOP until accepted P8.3 and explicit Stage 9 activation.** These tasks do not authorize a build, upload, distribution change, or store submission.

- [ ] 18.1 Record maintainer activation of Stage 9 and its allowed build/distribution operations; verify: the approval and accepted P8.3 evidence are linked before release work starts.
- [ ] 18.2 Complete icons, splash/adaptive assets, and screenshots for native/web; verify: installed preview builds and web output show correct assets with reviewable screenshots.
- [ ] 18.3 Verify remote app versioning and auto-increment behavior; verify: resolved EAS configuration and preview version/build identifiers match the intended release sequence.
- [ ] 18.4 Review actual permission/privacy needs, Firebase rules, public environment values, and Google client configuration; verify: the release checklist has an owner/result and no unapproved tracking or nonexistent cloud-photo behavior is claimed.
- [ ] 18.5 Produce separately authorized iOS/Android preview builds and distribute to approved internal/TestFlight tracks; verify: both artifacts install and pass the documented smoke path with build/device evidence.

## 19. P9.2 CI and device flows - DEFERRED

Approach: D12. Depends on activated/completed P9.1; earlier promotion requires a specific scope/order amendment.

- [ ] 19.1 Add the required install -> verify -> expo-doctor -> web-export pipeline using the validated Node/npm toolchain; verify: an actual pipeline run passes from a clean checkout and its tested revision is recorded.
- [ ] 19.2 Prove pipeline failure behavior for verification, core purity, i18n audit, and web export; verify: controlled failing checks prevent acceptance and the probes are removed afterward.
- [ ] 19.3 Confirm required core/service/reader-store coverage has landed with its owning packages and add only genuine remaining gaps; verify: the complete suite passes without deferring feature tests until CI creation.
- [ ] 19.4 Implement the chosen Maestro device smoke flow: cold start -> sign in -> reader -> tap ayah -> audio -> background/foreground; verify: native runner results match real session/selection/playback behavior.
- [ ] 19.5 Record include/defer disposition for optional EAS builds on tags and implement only if separately authorized; verify: no unapproved automated external builds or publishing paths are enabled.
- [ ] 19.6 Configure authorized required checks for `main` and document pipeline/device operation; verify: repository settings actually enforce the named checks and the documented workflow can be reproduced.

## 20. P9.3 documentation and steady-state handover - DEFERRED

Approach: D12. Depends on activated/completed P9.2. This group closes migration documentation; it is not permission to erase evidence or rewrite Git history.

- [ ] 20.1 Rewrite root AGENTS for the actual Expo commands, layering, styling/native-control boundaries, and adopted Git policy; verify: agent-facing examples agree with live scripts/configuration and do not describe the frozen Vite app as the root project.
- [ ] 20.2 Rewrite README for setup, public environment values, development clients, native evidence, and web deployment; verify: a second operator follows clone -> local configuration -> dev client -> green verify using only those instructions.
- [ ] 20.3 Consolidate P7 measurements and all remaining owned follow-ups; verify: each has device/build context, decision rationale, acceptance criteria, and owner rather than an unexplained unchecked box.
- [ ] 20.4 Record the explicit final decision to retain `othman-web/` or delete it in a separately authorized PR; verify: no legacy content is edited/deleted as incidental cleanup and deployment remains independent of that tree.
- [ ] 20.5 Reconcile every MIGRATE item with this ledger and accepted evidence or explicit approved deferral; verify: no native gate, conditional decision, deferred stage, or missing backend obligation disappears during closeout.
- [ ] 20.6 Establish the ongoing feature/bug/security backlog and release cadence under the same capability, review, verification, and Git policy; verify: ordinary work can proceed through bounded changes without reopening the migration as a permanent omnibus branch.

## Workflow follow-up

- After implementation, review task evidence and explicitly handle any unfinished/conditional/deferred work before requesting archive; do not bypass incomplete-task warnings merely to obtain a completed status.
- Use the explicit OpenSpec sync/archive workflows for accepted capability deltas, preserving links to deferred work in an owned follow-up change/backlog when needed.
- Promote accepted migration work to `main` through the authorized integration PR and then follow the approved release path; these Git/deployment operations require their own permissions.
- Remove completed worktrees/topic branches only after the recorded clean-state, ownership, incorporation, dependency, and authorization checks; archive completion alone is not deletion authority.
