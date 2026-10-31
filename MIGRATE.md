# Migration: othman-web (Vite) → Expo SDK 57 (native + web)

Status: in progress
Reference: `othman-web/` is frozen read-only source material. Never edit it.

## 0. Locked decisions

| Decision        | Value                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Targets         | iOS, Android, **and Expo web** (`web.output: "static"`)                                                     |
| Styling core    | **Uniwind** (Tailwind v4 → className). No NativeWind, no StyleSheet-first, no `tailwind.config.js`          |
| Native controls | `@expo/ui` (`Host`, `BottomSheet`, `List`, `Picker`, `Switch`, `Slider`, `Menu`, `FieldGroup`, `TextInput`) |
| Auth            | Google OAuth + email/password. Apple + Facebook deferred                                                    |
| Server state    | TanStack Query. UI/reader state: Zustand                                                                    |
| Reader          | `expo-image` + normalized-bbox `Pressable` overlays. Native `mushaf-page` module only if profiling fails    |
| Data layer      | Firebase JS SDK + `getReactNativePersistence(AsyncStorage)`                                                 |
| Language        | Arabic-first RTL, English LTR. `I18nManager` + Uniwind `LayoutDirection`                                    |
| Bundle IDs      | `com.kuttab.othman` (iOS + Android), owner `jelkarchis-team`                                                |

## 1. Non-negotiable rules

- Every PR ends green on `npm run verify` — `typecheck`, `typecheck:core`, `check:core` (purity), `lint`, `format:check`, `test`.
- Every UI PR is smoke-checked on **iOS, Android, and web** before it is checked off.
- `className` only on `react-native` core components. **Never** on `@expo/ui` children.
- Never build a className from a variable (`` `bg-${tone}-100` ``). Literals or `tv()` variants only.
- No hex/rgb literals outside `src/global.css` and `src/core/utils/heatmap.ts`.
- No `style={{ color/backgroundColor/... }}` outside `features/quran/**` (bbox geometry) and Reanimated.
- `src/core/**` imports nothing from React/RN/Expo/Firebase/DOM and contains no Tailwind class strings.
- Uniwind ≥ 1.13.0 (CSS cascade), `withUniwindConfig` outermost in Metro.
- Delete, don't leave behind: template screens, `src/theme/*`, `src/constants/theme.ts`, `src/hooks/use-theme.ts`, `src/platform/logic/config/tokens.ts`.

## Recovery baseline (OS-001 group 1, 2026-10-30)

Merge `ba1ed9a` was compared with both parents: `9c452a3` (reader branch) and
`e649a74` (mobile support). It introduced three integration defects:

| File                  | Defect                                                               | Resolution                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`        | 26 duplicated dependency/script lines, so the file is not valid JSON | Restored the `9c452a3` manifest; it is the union of both parents (`zustand`, `expo-haptics`, `expo-image-picker` included) and has one authoritative value per entry |
| `package-lock.json`   | Duplicated root dependency entries and a merge-mangled tree          | Restored the `9c452a3` lockfile; `npm install` leaves it byte-identical, so it is coherent with the recovered manifest                                               |
| `src/app/_layout.tsx` | ~80 lines of the root layout pasted inside `AppShell`                | Restored the `9c452a3` layout, which keeps provider order and registers `(tabs)`, `account/edit`, `account/progress`, `about`, and `reader/[page]`                   |

`.prettierrc` now sets `endOfLine: "auto"`: this Windows checkout has
`core.autocrlf=true`, so the committed LF files arrive as CRLF and the previous
configuration (implicit `lf`) failed `format:check` on 131 untouched files.

Evidence on base `18dbd83` with recovered tree `c7b1a49`:

- `npm install` succeeds and leaves `package-lock.json` unchanged.
- `npm ci --dry-run` reports `up to date`. A full `npm ci` could not unlink
  `node_modules/uniwind/node_modules/lightningcss...node` because an Expo dev
  server (`expo start --port 8099`) holds it; that is an environment lock, not a
  lockfile defect.
- `npm run verify` passes: 65 suites, 479 tests.
- `npx expo config --type public` resolves, and `npx expo-doctor` passes 21/21.
- `npm run build:web`, `npm run build:ios`, and `npm run build:android` all
  export to `dist/` when run sequentially (parallel runs contend for `dist/`).
- No P5.3 type/lint defect surfaced after parsing was repaired; no reader source
  change was needed beyond the layout fix.

Device boot and other native/manual evidence remain outstanding; they are
tracked as unchecked in the ledger and are not implied by the green checks
above.

## 2. PR graph

```
P0.1 ─┬─ P0.2 ─┐
      ├─ P0.3 ─┼─ P0.4
      └─ P1.1 → P1.2 → P1.3 → P1.4 → P1.5
P0.3 → P2.1 → P2.2 → P2.3 → P2.4
P1.5 + P2.4 → P3.1 → P3.2 → P3.3 → P3.4 → P3.5
P3.5 → P4.1 → P4.2 → P4.3 → P4.4 → P4.5
P3.1 + P4.2 → P5.1 → P5.2 → P5.3 → P5.4 → P5.5 → P5.6
P5.6 → P6.1 → P6.2 → P6.3
P5.3 → P7.1 → (P7.2 gated)
P4.x + P5.x → P8.1 → P8.2 → P8.3
P8.3 → P9.1 → P9.2 → P9.3
```

---

## Stage 0 — Foundation

### [x] P0.1 — Repo hygiene + verification baseline · S

Depends: —

- [x] Delete empty `othman-mobile/`.
- [x] Add `exclude` to root `tsconfig.json`: `["othman-web", "dist", "node_modules", "android", "ios"]` — root `tsc` was compiling the legacy Vite app (40+ bogus errors).
- [x] Keep `include` as-is; `src/uniwind-types.d.ts` is covered by `**/*.ts` (generated in P0.3).
- [x] `tsconfig.core.json` already points at `src/core/**/*.ts`; it matches nothing until P1.1. `typecheck:core` is therefore **not** in `verify` yet — P1.1 adds it.
- [x] Add `.prettierrc`: `tabWidth: 2`, `singleQuote: true`, `semi: true`, `printWidth: 80`. (2 spaces chosen to match the existing Expo/`src` code; the root `AGENTS.md` still documents the web app's 4 — fixed in P9.3.)
- [x] Add `.prettierignore`.
- [x] Install `prettier` (it was referenced by scripts but not installed). `prettier-plugin-tailwindcss` is added in P0.3, once `src/global.css` exists.
- [x] Scripts: `typecheck`, `typecheck:core`, `lint`, `format`, `format:check`, `verify`.
- [x] `othman-web/` stays tracked (reference) but is excluded from `tsc`, ESLint, and Prettier.
- [x] Deleted `src/data/configData.ts` — unreferenced legacy file that imported `lucide-react` (not installed) and was the only typecheck failure left after the `exclude`. Its constants already live in `src/platform/logic/config/`.
- [x] Fixed pre-existing lint blockers so the baseline could be green: rewrote `src/hooks/use-color-scheme.web.ts` with `useSyncExternalStore` (the `setState`-in-effect rule), removed an unused `Httpany` type alias in `src/platform/http/client.ts`, and stripped UTF-8 BOMs from `src/platform/{auth,storage}/index.ts` and `src/platform/http/client.ts` (`@typescript-eslint/no-unused-vars` / parse errors).
- [x] Ran `npm run format` across `src` (this is why many template files show formatting-only diffs).
- [x] `npm run verify` passes.

**Done when:** `npm run verify` is green and `git status` shows only intended changes.

---

### [x] P0.2 — Expo config, env, dev client · M

Depends: P0.1

> Change: the plugin list was cut to the packages that are actually installed
> today (`expo-router`, `expo-splash-screen`, `expo-localization`,
> `expo-web-browser`). A config plugin whose package is missing makes
> `expo config` / `prebuild` fail, so `expo-font` (with the font file array),
> `expo-audio`, and `expo-image-picker` add their plugin entries in P2.3, P6.1
> and P4.3 respectively.
>
> Change: the first dev-client build could not be executed from this machine
> (Windows, no Android SDK/`adb`, no macOS/Xcode). Everything that can be
> verified without a device was verified instead — see the notes below. The
> build itself stays a manual step.

- [x] Convert `app.json` → `app.config.ts`; every original value preserved, typed with `ExpoConfig` via `ConfigContext`. `app.json` deleted.
- [x] `ios.bundleIdentifier: "com.kuttab.othman"`, `android.package: "com.kuttab.othman"`; `scheme: "othman"`, `owner: "jelkarchis-team"`, `slug: "kuttab-othman"` kept.
- [x] Plugins: `expo-router`, `expo-splash-screen`, `expo-localization`, `expo-web-browser` (see Change above for the deferred three).
- [x] `ios.infoPlist.UIBackgroundModes: ["audio"]`; `ios.supportsTablet: true`; `ios.config.usesNonExemptEncryption: false`.
- [x] Android `predictiveBackGestureEnabled: false` **kept**, with the reason recorded in `app.config.ts`: the reader's page turn is an edge swipe and predictive back would swallow those touches.
- [x] `web.output: "static"`, `web.bundler: "metro"`.
- [x] `experiments.typedRoutes: true` and `reactCompiler: true` kept.
- [x] `.env.example` with the seven `EXPO_PUBLIC_FIREBASE_*` keys and three `EXPO_PUBLIC_GOOGLE_*` client IDs (native only; web uses `signInWithPopup`). Local `.env` created from the legacy web app's values — everything except the Google client IDs, which P3.3 supplies once the OAuth clients exist.
- [x] `eas.json` with `development` (`developmentClient`, `distribution: internal`, `autoIncrement`, `channel`), `preview`, `production`; `cli.appVersionSource: "remote"`.
- [x] `expo-dev-client` installed via `npx expo install`.
- [x] `npx expo-doctor` → **21/21 checks passed**, no accepted warnings. Getting there also required `npx expo install --fix`: six packages were a patch behind the SDK 57 expectation (`@expo/ui`, `expo`, `expo-constants`, `expo-linking`, `expo-router`, `expo-splash-screen`).
- [x] `npx expo config --type public` resolves: platforms `ios/android/web`, both bundle IDs, `UIBackgroundModes`, `web.bundler/output`, and `.env` is loaded and exported (`env: load .env`).
- [x] Firebase config accepted by the SDK: a throwaway script built the config object from `.env` and ran `initializeApp` → `ok [DEFAULT] othman-kuttab`.
- [x] `npx expo export --platform web` succeeds with the new config (4 static routes exported).
- [ ] **Manual:** `eas build --profile development` (or `npx expo run:ios` / `run:android` on a machine with the toolchains) and boot the dev client on both platforms.

**Done when:** dev client boots on both platforms, Firebase does not throw, `npx expo config --type public` resolves env values. — Two of three verified; the device boot is the outstanding manual step.

---

### [x] P0.3 — Uniwind foundation · M

Depends: P0.1

> Change: the template shell was removed here rather than in P2.1/P3.2.
> Deleting `src/constants/theme.ts` (required by this PR) breaks every template
> component that imports it, so the shell had to go with it. Removed:
> `src/app/explore.tsx`, `components/{animated-icon,animated-icon.web,app-tabs,app-tabs.web,hint-row,themed-text,themed-view,web-badge}`,
> `components/ui/collapsible.tsx`, `animated-icon.module.css`, and the whole
> `src/theme`, `src/hooks`, `src/constants` theme layer. `components/external-link.tsx`
> survived — it is a real primitive (in-app browser) and is reused in P4.5.
>
> Change: font tokens are **not** in `global.css` yet. RN has no font fallback
> list, so a `--font-sans` pointing at a not-yet-bundled family is a rendering
> bug, not a graceful degrade. P2.3 adds them together with the files and the
> `expo-font` plugin.

- [x] `uniwind@1.13.0` (the CSS-cascade release), `tailwindcss@4.3.3`, plus `clsx`, `tailwind-merge`, `tailwind-variants`.
- [x] `metro.config.js` with `withUniwindConfig` outermost, `cssEntryFile: './src/global.css'` (relative, and under `src/` so Tailwind's scan root never reaches `othman-web/`), `dtsFile: './src/uniwind-types.d.ts'`, `polyfills: { rem: 16 }`.
- [x] `src/global.css`: `@import 'tailwindcss'; @import 'uniwind';` → `@theme` (radius scale expanded to px, type scale incl. a `2xs` step) → `@theme static` (reader page geometry, `--motion-*`) → `@layer theme { :root { @variant light / @variant dark } }`.
- [x] Token set covers `background, foreground, card(+foreground), primary/secondary/accent(+foreground), muted(+foreground), destructive(+foreground), border, input, ring`. Added the two the web CSS lacked: `--color-accent` (light was only present via a page-style block) and `--color-destructive-foreground` (missing in both themes).
- [x] Dropped `tw-animate-css`, `shadcn/tailwind.css`, `@fontsource-variable/geist`, `@custom-variant dark`, `--sidebar-*`, `--chart-*`, `--popover-*`, and the `slideIn/Out` keyframes.
- [x] `@/global.css` imported first in `src/app/_layout.tsx`; the old import in `constants/theme.ts` is gone with the file.
- [x] `src/ui/cn.ts` (`twMerge(clsx(...))`).
- [x] `src/uniwind-types.d.ts` generated by a Metro run and committed (CI needs it before Metro ever runs); excluded from Prettier because it is generated.
- [x] `src/app/index.tsx` is a temporary proof screen with zero `StyleSheet`: themed surfaces, `p-4`, `rounded-xl`, palette swatches built from literal class strings (never interpolated), `active:` on a `Pressable`, an Arabic line to eyeball shaping.
- [x] `prettier-plugin-tailwindcss` installed and configured with `tailwindStylesheet: './src/global.css'` + `tailwindFunctions: ["cn", "tv"]`. It resolves the v4 entry, so it stays.
- [x] `.vscode/settings.json` has the Uniwind `classAttributes` / `classFunctions` lists plus a `cn`/`tv` class regex.

**Verification (no devices available on this machine):**

- [x] Web: `npx expo export --platform web` succeeds; the emitted stylesheet contains `oklch` converted to `#rrggbb` + `lab()` wide-gamut fallbacks, and every expected utility (`.bg-background`, `.text-2xl`, `.text-2xs`, `.rounded-xl`, `.pb-10`, `.active\:bg-primary\/80`). The static HTML renders the proof screen.
- [x] Android: `npx expo export --platform android` bundles cleanly (the CSS pipeline is exercised for native too).
- [x] `className` type-checks and `npm run verify` is green.
- [ ] **Manual:** eyeball the proof screen on an iOS and an Android device — `bg-background`/`text-foreground`, `dark:` swap, `oklch` rendering, `p-4` = 16 px, Arabic shaping.

**Done when:** the proof screen is styled exclusively by `className`, theme switching works on all three targets, `className` type-checks. — Code and web verified; the device eyeball pass is the outstanding manual step.

---

### [x] P0.4 — Test harness · S

Depends: P0.2

> Change: RNTL 14 renders asynchronously — `render()` returns a promise and the
> `screen` singleton is only populated after `await`. Every test awaits it.
>
> Change: Uniwind's `className` support is a **Metro** transform, so in Jest
> `className` is an inert prop. Component tests here assert structure, text and
> behaviour; styling is verified on device and against the exported web CSS.
> `jest.setup.ts` filters the resulting `unknown prop className` warning.
>
> Change: TypeScript 6 stopped auto-including every `@types/*` package, so
> `tsconfig.json` now names `types: ["jest", "node"]` explicitly. Without it
> every test file fails with `Cannot find name 'describe'`.

- [x] `jest-expo`, `jest`, `@types/jest` via `npx expo install --dev`.
- [x] `@testing-library/react-native@14` (+ its `test-renderer` peer, installed transitively).
- [x] `jest.config.js`: `preset: 'jest-expo'`, `rootDir`, `setupFilesAfterEnv`, and `testPathIgnorePatterns` for `othman-web/`, `dist/`, `dist-android/`, `dist-ios/`.
- [x] `npm test` / `npm run test:watch`; `verify` is now `typecheck → lint → format:check → test`.
- [x] `src/ui/__tests__/cn.test.ts` — real assertions for `cn()` (falsy entries, later-wins conflicts, arrays/objects, custom classes untouched).
- [x] `src/ui/__tests__/render-smoke.test.tsx` — renders a `className` tree, queries text, fires a press.
- [x] Maestro chosen for P9.2 device flows (not Detox: no native test build, no Apple/Android toolchain requirement).

**Done when:** `npm run verify` includes a green test run. — Green: 2 suites, 6 tests.

---

## Stage 1 — Core / platform correctness

### [x] P1.1 — Move `src/platform/logic` → `src/core` · M

Depends: P0.1

> Change: `src/core/config/tokens.ts` was deleted here instead of P1.4. It is a
> file of Tailwind class strings, so it would fail the purity check this PR
> adds — and nothing imported it yet. Tone/status _intent_ stays in
> `core/config/meetings.ts`; the class maps move to `src/ui` in P2.1.

- [x] `git mv src/platform/logic src/core` (the target did not exist).
- [x] All `@/platform/logic/...` imports rewritten to `@/core/...`; the three imports _inside_ core (`domain/**`) became relative (`../../types`) so core stays copy-paste portable. `grep -r "platform/logic" src` → 0.
- [x] `tsconfig.core.json` includes `src/core/**/*.ts`; `typecheck:core` added to `verify`.
- [x] `eslint.config.js` restructured. It had a real bug: the wide `src/**` block was declared _after_ the `src/core/**` block, so its `no-restricted-imports` silently replaced the core rules. Blocks now run widest → narrowest, and core's group also blocks `@/ui`, `@/features`, `@/firebase`. Dropped the dead `othman-mobile/**` ignore and added `scripts/**`.
- [x] `scripts/check-core-purity.mjs` — walks `src/core`, flags Tailwind class literals inside string/template literals and any `className` usage, reports `file:line`. Wired into `verify` as `check:core`. Verified it fails on a probe (`bg-red-500` → exit 1) and passes clean.
- [x] `npm run typecheck:core` green with `lib: ["ESNext"]` and no DOM lib.
- [x] Barrels are `export type` only (`src/core/types/index.ts`), no runtime `export *`.

**Done when:** `typecheck:core` covers real code, purity script passes, no `@/platform/logic` string remains. — All three verified.

---

### [x] P1.2 — Firebase + auth correctness · M

Depends: P1.1

> Change: `checkAccountExists` never made it into the port — `grep` finds zero
> references, so there was nothing to remove. The enumeration risk is addressed
> in the error map instead: `auth/user-not-found` collapses into
> `invalid-credential`, so sign-in never distinguishes "no such account" from
> "wrong password".

- [x] `src/platform/auth/index.ts` → `export { authService } from './authService'` — platform-resolved, no hard-coded `.web`.
- [x] `authService.native.ts` renamed to `authService.ts`; the dead `Platform.OS === 'web'` branch and the `react-native` import are gone.
- [x] `initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) })` with an `auth/already-initialized` → `getAuth(firebaseApp)` guard. Without that guard, a Fast Refresh during sign-in throws and the session is lost.
- [x] `authService.web.ts` keeps `getAuth` + `signInWithPopup`.
- [x] Native `signInWithGoogle` returns a typed `{ code: 'not-implemented' }` (new member of `AuthErrorCode`) until P3.3.
- [x] `checkAccountExists` flow: not present (see Change).
- [x] Error mapping extracted to `src/platform/auth/auth.mappers.ts` and shared by both services — one table for the whole app: added `auth/invalid-login-credentials`, `auth/invalid-email`, `auth/user-disabled`, `auth/operation-not-allowed`, `auth/too-many-requests`, `auth/account-exists-with-different-credential`, `auth/timeout`, `auth/user-cancelled`. Non-string codes and unknown codes fall back to `unknown`.
- [x] No `firebase/analytics` import anywhere (grep → 0).
- [x] Tests: `auth.mappers.test.ts` (13 code mappings + fallbacks + `toAuthError` + `toAuthUser`), `core/domain/account/__tests__/merge-profile.test.ts` (profile wins, missing profile, per-field fallback).
- [x] Typing gap closed with `src/platform/auth/firebase-auth-rn.d.ts`: `firebase/auth`'s _types_ resolve to the browser API (no `getReactNativePersistence`), while Metro resolves `@firebase/auth` through the `react-native` condition (verified: `@expo/metro-config` sets `unstable_conditionsByPlatform: { android: ['react-native'], ios: ['react-native'] }`, and `@firebase/auth/dist/rn/index.js` exports the helper). The declaration documents that split instead of sprinkling `@ts-expect-error`.
- [ ] **Manual:** sign in on a device, force-quit, relaunch, confirm the session is restored from AsyncStorage.

**Done when:** signing in on device survives an app restart; web sign-in still works. — Code, types and tests green; the restart check needs a device.

---

### [x] P1.3 — Storage correctness · S

Depends: P1.1

> Change: the two implementations were near-identical copies. The JSON
> encoding, missing-key handling and error containment moved into
> `createStorageService(backend, label)`, so `storageService.ts` and
> `storageService.web.ts` are now ~10 lines each and the behaviour is tested
> once, against a fake backend.

- [x] `src/platform/storage/index.ts` → `export { storageService } from './storageService'`.
- [x] `storageService.native.ts` renamed to `storageService.ts`; both files built on the shared factory.
- [x] Web adapter probes `localStorage` **once** and caches the result (the old code wrote a probe key on every read), and touches `window` only inside functions so static rendering cannot throw at module scope.
- [x] `STORAGE_KEYS` audited: `language`, `theme`, `quranEdition`, `lastVisitedPage`. Dropped `sidebarState` (no sidebar in the native app; the web value is not portable).
- [x] `getItem` never throws and never yields `undefined`: missing key, corrupt JSON, non-serializable value and a throwing backend all resolve to the fallback.
- [x] Tests: `storage.backend.test.ts` — JSON round-trip (object/string/number), missing key, corrupt payload, throwing backend, non-serializable values, `clear()`.

**Done when:** no barrel resolves a `.web` file on native; corrupt storage never throws. — Both verified by the tests above.

---

### [x] P1.4 — HTTP client + data-model alignment · M

Depends: P1.1

> Change: `src/core/config/tokens.ts` was deleted in P1.1, not here — it is a
> file of Tailwind class strings and would have failed the purity gate this
> release added. `core/config/meetings.ts` keeps the intent (`tone`, `pulse`,
> `avatarSize`, `bordered`) and its header now says so.

- [x] `AbortSignal.any` removed from `src/platform/http/client.ts`; the timeout and the caller signal feed a single internal `AbortController` by hand, and both the timer and the listener are torn down in `finally`.
- [x] Timeout abort → `HttpTimeoutError` (`url`, `timeoutMs`), caller abort → `HttpAbortError`. Both are distinct classes, so a screen can ignore a cancel and surface a timeout. `timeoutMs: 0` disables the timeout.
- [x] `HttpError` carries `status` + `url`; the success path branches on `content-type: application/json` and falls back to text. No `any` left in the module.
- [x] `Meeting.date` is now `DateKey` (`YYYY-MM-DD`), defined in `src/core/types/date.ts` and re-exported from the types barrel. Meeting payloads no longer carry a `Date`.
- [x] `formatDateKey` returns `DateKey` from **local** calendar parts (`toISOString()` would shift the day across midnight); added `isDateKey` (rejects `2026-02-30`, `2026-4-2`) and `parseDateKey` (local **noon**, so the day survives timezone and DST conversion).
- [x] `meetingsCache` is `Map<DateKey, Meeting[]>` with `MEETINGS_CACHE_MAX_SIZE` exported; `fetchMeetingsForDate` takes and forwards a `DateKey`.
- [x] `setDoc` is a static import in `profile.repository.ts` (the dynamic `await import('firebase/firestore')` inside `update()` bought nothing and hid the dependency).
- [x] Tests: `date-key.test.ts` (padding, both ends of a local day, invalid keys, noon round-trip), `cache.test.ts` (miss, replace, single-entry eviction at 24, bounded growth over 72 days, clear), `http/__tests__/client.test.ts` (JSON vs text, POST body, `HttpError`, timeout ≠ caller abort, pre-aborted signal, `timeoutMs: 0`, timer + listener cleanup).

**Done when:** `npm run verify` green; no `AbortSignal.any` or `Date` meeting payloads remain. — Green (8 suites, 52 tests); both greps are clean.

Note: `src/platform/http/json-cache.ts` still has no consumer. It is deleted in
P3.4 when TanStack Query takes over server-state caching, rather than kept alive
through the design-system work.

---

### [x] P1.5 — Repositories + service boundaries · M

Depends: P1.4

> Change: `fullNavigate` and `lib/localStorage.ts` were never ported — grep finds
> no reference outside the frozen web app, so there was nothing to delete. The
> only web-only helper that survived is `src/components/external-link.tsx`, and
> it is reused in P4.5.
>
> Change: `src/platform/firebase/firebase.ts` **stays** in `platform/`. It is the
> SDK bootstrap (one app instance shared by `platform/auth` and `services/`),
> and moving it into `services/` would make `platform/auth` depend on the
> service layer — an inversion of the layering the rest of `src/` follows. The
> rule therefore blocks the bootstrap in presentation code, not in `platform/`.
>
> Change: the Firestore repository moved out of `platform/firebase/repositories/`
> (that directory is gone). `platform/` now holds per-platform implementations
> only; anything that talks to the backend lives in `services/`.

- [x] `src/services/profile/` — `profile.types.ts` (`ProfileRepository`), `firestore-profile.repository.ts` (the only module that knows the `users` collection; emails queried lowercase, writes `merge: true`), `profile.service.ts` (`createProfileService(repository)`), `index.ts` (singleton barrel).
- [x] `getAccount(authUser)` merges the auth record with the Firestore profile through `mergeAuthWithProfile`. A **missing** profile document resolves to the auth-only account (new user ≠ load failure); only a real backend error rejects.
- [x] `src/services/meetings/` — `meetings.types.ts` (`MeetingsRepository`, `MeetingsService`), `mock-meetings.repository.ts`, `meetings.service.ts`, `index.ts`.
- [x] `createMeetingsService(repository)` keeps the caching decision in `core` (`fetchMeetingsForDate`) and injects only _where_ a day comes from; `invalidate()` drops the cache. Swapping mock → Firestore is a one-line change in `index.ts`.
- [x] Mock JSON is treated as an external boundary: rows are checked with `isDateKey` and a bad date is skipped with a warning instead of silently landing under an unmatched cache key.
- [x] ESLint: presentation (`app`, `ui`, `features`, `providers`, `components`, `hooks`) may not import `firebase/*`, `@/platform/firebase*` or a concrete `@/services/*/firestore-*`; the service barrels stay allowed. Verified with a throwaway probe (3 errors, one per offending import) and removed.
- [x] Neither service module imports the Firebase SDK at the factory level: `profile.service.ts` / `meetings.service.ts` take a repository, so tests never boot Firebase.
- [x] Tests: `profile.service.test.ts` (merge precedence, missing profile, backend failure propagates, lookup by uid, update forwarding + failure, `findByEmail`) and `meetings.service.test.ts` (one read per day, per-day caching, empty day cached, failure not cached, `invalidate`). The fake `ProfileRepository` is the fake Firestore layer — the seam the service depends on.

**Done when:** `grep -r "firebase/" src/features src/ui` returns nothing. — Holds (those directories have no Firebase import), and the rule is enforced by ESLint plus the tests above.

---

## Stage 2 — Design system

### [x] P2.1 — Uniwind primitives · L

Depends: P0.3

> Change: no `font-*` family utilities yet. RN has no font fallback list, so
> naming a family before the files are bundled (P2.3) renders tofu instead of
> degrading. `Text` keeps RN's default `allowFontScaling` and the font work
> lands with the fonts themselves.
>
> Change: the primitives are built on `tv()` (tailwind-variants) rather than
> `cn()` alone, because every one of them has variants. `cn()` is still the
> default for components with no variants (`card`, `skeleton`, `screen`).
> Slots are used wherever RN cannot inherit a colour (badge, avatar).
>
> Change: the template components listed for deletion were already removed with
> the template shell in P0.3 — nothing was left to delete here.
>
> Change: three primitives were added beyond the list: `tone.ts` (binds the
> `StatusTone` intent from `core/config` to class strings), `states.tsx` and
> `screen.tsx` (every later screen needs them), plus `avatar.tsx`.
>
> Change: `Separator` uses ARIA-style `role` (`'none' | 'separator'`) because
> RN's `accessibilityRole` union has no `separator`. `Input` no longer sets an
> accessibility state for `invalid`: RN has no `accessibilityState.invalid`
> and no `aria-invalid`, so validity is visual (border) plus the error text the
> form renders. Documented on both components.

- [x] `src/ui/text.tsx` — `variant` (`title|heading|subtitle|body|label|caption|overline`) × `tone` (`default|muted|primary|destructive`) via `tv()`. `allowFontScaling` left at RN's default so Arabic follows the OS text size.
- [x] `src/ui/button.tsx` — full port (`default|secondary|outline|ghost|destructive|link` × `sm|md|lg|icon`). `active:opacity-80` replaces the web's 1px translate; `hover:`/`focus-visible:` dropped (touch has neither); sizes start at 36px because the 44pt target rule is a guideline, not a suggestion. `label` shorthand or `children` + `ButtonText` for composed content — RN does not inherit text colour.
- [x] `src/ui/card.tsx` — `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`; padding and gap live on the root because on a phone the card _is_ the content block.
- [x] `src/ui/badge.tsx` — one `variant` prop for both sets (`default|secondary|outline|destructive` + the status tones `positive|info|neutral`); slots for root/label; a string child is treated as the label.
- [x] `src/ui/tone.ts` — `TONE_SURFACE_CLASSES` / `TONE_TEXT_CLASSES` / `TONE_DOT_CLASSES`, split because RN has no colour inheritance. Complete literals only (Tailwind scans statically).
- [x] `src/ui/separator.tsx` — horizontal/vertical (`self-stretch` rather than a height); decorative by default.
- [x] `src/ui/skeleton.tsx` — deliberately static; motion belongs to Reanimated (P4.4), and an animating primitive would need teardown in every test. Hidden from assistive tech.
- [x] `src/ui/avatar.tsx` — `xs|sm|md|lg`, `expo-image` with initials fallback, `accessibilityLabel` from the name.
- [x] `src/ui/input.tsx` — 44px height, `invalid` border variant, `placeholderTextColorClassName="accent-muted-foreground"`, `selectionColorClassName`/`cursorColorClassName="accent-primary"` (the only theme-aware way to colour non-style props).
- [x] `src/ui/screen.tsx` — `Screen` (`contentInsetAdjustmentBehavior="automatic"`, `keyboardShouldPersistTaps="handled"`) and `ScreenView` (non-scrolling). Neither applies safe-area insets: that belongs to the shell (P3.2), and doing both would double the gap.
- [x] `src/ui/states.tsx` — `Loading`, `ErrorState` (retryable), `EmptyState` (optional CTA). Loading accepts `ViewProps`, so it carries a `testID`/label like the others.
- [x] `src/ui/image.tsx`, `src/ui/blur.tsx` — `withUniwind(...)` once at module level, re-exported; never wrapped in two files.
- [x] `src/ui/icon.tsx` — `ICONS satisfies IconRegistry<IconSet>` (`SF Symbol | Material Icon`), SF Symbols on iOS / Material Icons on web+Android, `accent-` tone map. `alert-circle` and `inbox` were added to `IconName` for the states; the `satisfies` turns a missing mapping into a compile error instead of a blank square.
- [x] Template components already deleted in P0.3.
- [x] One render test per primitive: `text`, `button`, `surfaces` (card/badge/separator/skeleton), `avatar`, `input`, `screen`, `states`, `icon`, `media` (image/blur) — 63 assertions in `src/ui`.

**Done when:** every primitive renders on iOS/Android/web in light+dark; no `StyleSheet` for colors/spacing. — No `StyleSheet` import anywhere in `src/ui`. Rendering is proven in Jest (iOS branch + a swapped `Platform.OS` for the Android icon branch) and in the web export; **the light/dark eyeball pass on a device is still outstanding** (no Android SDK/Xcode on this machine — see P0.2).

Note: `jest-expo` does not transform `uniwind`, whose entry is untranspiled ESM. It is
added to `transformIgnorePatterns` in `jest.config.js` so tests exercise the real
`withUniwind` instead of a mock. `jest.setup.ts` filters the two warnings that are
artifacts of styling being a Metro transform (unknown `className` prop, and
`accent-*` classes that cannot resolve without the emitted stylesheet).

Note: RNTL 14 removes a render when its test ends, so tests never call
`unmount()` mid-test — it leaves an act scope open and later renders in the same
file commit nothing.

---

### [x] P2.2 — Theme state · S

Depends: P2.1

> Change: the stored value is the **mode** (`light|dark|system`), never the
> resolved scheme. Persisting "dark because the phone was dark" would freeze the
> app on dark after the user switches the system to light. Default is `system`;
> `useColorScheme()` resolves it for JS-side decisions (`isDark`), while Uniwind
> owns the actual switch (`Uniwind.setTheme` also syncs `Appearance`, so native
> alerts and dialogs follow).
>
> Change: the splash gate lived in this provider only until P2.3, which moved it
> to `BootProvider` (it needs the font state too). This provider now exposes
> `ready` and always renders its children — gating is a parent's job.
>
> `ScopedTheme` around the mushaf page is not wired yet: the page does not exist
> (P5.3), and wrapping nothing proves nothing. The mechanism is Uniwind's and is
> recorded there.

- [x] `src/providers/theme-provider.tsx` — `ThemeProvider`, `useThemeMode()`, `isThemeMode()` guard and the `ThemeMode` type. Persists through `storageService` under `STORAGE_KEYS.theme`.
- [x] `SplashScreen.preventAutoHideAsync()` ran at **module scope**, not in an effect: an effect runs after the first frame, which is exactly the frame that would flash the wrong theme. (P2.3 moved it, with the gate, into `BootProvider`.)
- [x] `useThemeMode()` → `{ mode, isDark, ready, setMode }`. `isDark` resolves `system` through `useColorScheme()` and treats an unknown scheme as dark (the app ships dark by default).
- [x] `setMode` applies synchronously and writes to storage without awaiting it — the UI must never wait on a disk write, and a failed write is not a reason to refuse the switch.
- [x] An unknown stored value (`'sepia'`, a legacy boolean, …) falls back to `system` instead of being trusted.
- [x] Theme toggle in `src/ui/theme-toggle.tsx` — a three-option segmented control, not a switch: a binary control cannot express "follow the system". Each option is a `radio` with `accessibilityState.selected`, so the active mode is announced. Labels are literal until P2.4.
- [x] Mounted in `src/app/_layout.tsx` as the outermost provider, outside `Stack`.
- [x] `STORAGE_KEYS` and its types are re-exported from the `@/platform/storage` barrel — presentation may not reach into `storage.types` directly.
- [x] Tests: `src/providers/__tests__/theme-provider.test.tsx` (children mount before hydration with `ready: false`, stored mode applied, no write on hydrate, unknown value → `system`, correct key read, `setMode` applies + persists, pinned dark resolves `isDark`, toggle marks the active radio and switches). Storage and `Uniwind.setTheme` are mocked at the boundary.

**Done when:** theme survives relaunch, follows system changes, no flash. — Reads/writes and `system` delegation are covered by the tests; **the relaunch/system-change check on a device is outstanding** (no Android SDK/Xcode here — see P0.2). Web: the store is `localStorage` behind the same interface.

---

### [x] P2.3 — Fonts + splash · M

Depends: P2.1

> Change: the splash gate moved out of `ThemeProvider` into a new
> `src/providers/boot-provider.tsx`, which is the only place that knows about
> both asynchronous inputs (theme hydration + `useFonts`). `ThemeProvider` always
> renders its children now — a gating parent that returned `null` would unmount
> the gate itself and the splash would never be released.
>
> Change: a **font error releases the splash**. A missing font degrades
> typography (tofu, then a swap); a stuck splash bricks the app. The gate treats
> `error !== null` as settled.
>
> Change: `expo-font`'s config plugin embeds the files in native builds, so they
> exist before the first frame; `useFonts` is still the gate because web has no
> plugin and because the gate must have something to await.
>
> Fonts, all SIL Open Font License 1.1, downloaded from the Google Fonts
> repository into `assets/fonts/`:
>
> - `Inter-Variable.ttf` → `--font-ui` (Latin UI: numerals, English strings)
> - `NotoNaskhArabic-Variable.ttf` → `--font-arabic` (Arabic UI; Naskh, not the
>   Quranic style — readable at chrome sizes and correct for non-Quran prose)
> - `AmiriQuran-Regular.ttf` → `--font-quran` (the mushaf page only)
>
> Naming contract: the `useFonts` key, the file basename and the `--font-*` value
> are the same string (`Inter-Variable`, …). React Native has no font fallback
> list, so a mismatch renders nothing rather than degrading — the identity makes
> a rename fail loudly in review instead of at runtime.

- [x] `assets/fonts/` — 3 files (~1.3 MB total). Variable fonts for UI: one file covers every weight, which is why there is no `Inter-Bold.ttf`.
- [x] `expo-font` config plugin in `app.config.ts` with the three paths; `--font-ui` / `--font-arabic` / `--font-quran` in `src/global.css` match the file basenames exactly.
- [x] Splash held until fonts resolve: module-scope `preventAutoHideAsync()` in `boot-provider.tsx`, released in an effect once `themeReady && languageReady && (fontsLoaded || fontError)`.
- [x] Template `AnimatedSplashOverlay` — there is none in this repo; the Expo SDK 57 template ships no such component, so nothing to delete. The native splash (icon + `backgroundColor` in `app.config.ts`) is the whole splash.
- [x] `src/providers/font-provider.tsx` — `FONT_SOURCES` (keys = basenames) + `useAppFonts()`; the hook is a separate module so tests can stub font loading without touching `expo-font`.
- [x] Tests: `src/providers/__tests__/boot-provider.test.tsx` (no render while theme or language is pending, no render while fonts load, reveal + hide once when all settle, reveal on font error, hide is idempotent across re-renders).
- [x] Families are applied in P2.4 (`useUiFontClass` in `src/ui/font.ts`, used by `Text` and `Input`): `font-arabic` for `ar`, `font-ui` otherwise, `font-quran` opt-in for the mushaf.

**Done when:** correct shaping, no tofu, no font swap after splash. — **Device verification outstanding** (no Android SDK/Xcode on this machine, see P0.2): Arabic shaping on Android, mushaf line height, and the absence of a swap after the splash need a real device. What is verified here: the gate logic (tests), the plugin config (`npx expo config --type public`), and the files themselves.

---

### [x] P2.4 — i18n + RTL · L

Depends: P2.2

> Change: the language lives in a **module-level store** (`src/i18n/language-store.ts`,
> read through `useSyncExternalStore`), not in a React context. Direction must be
> readable _above_ every provider (`LayoutDirection` wraps the theme provider),
> which a context cannot do without a provider above itself. The store also
> keeps `Text` free of `storageService`: the read path (`@/i18n`) and the write
> path (`LanguageProvider`, which imports AsyncStorage) are separate modules.
>
> Change: `i18next` is initialised at module scope with `initAsync: false`, so
> the very first render already has resources. The device locale is only the
> _first guess_; `LanguageProvider` reconciles the stored preference and exposes
> `ready`, which `BootProvider` gates on — otherwise the splash lifts a moment
> before Arabic appears and the whole UI visibly flips.
>
> Change: `I18nManager` and `LayoutDirection` are both used, on purpose.
> `LayoutDirection` flips `rtl:` variants and the logical utilities in place;
> `I18nManager.forceRTL` is the only thing that moves React Native's _own_
> controls (text-input alignment, native alert button order). The flag is read at
> process start, so a direction change reports `restartRequired` and
> `LanguageToggle` says so in a dialog. There is no "restart now" button: the app
> ships without `expo-updates`, so there is no supported programmatic relaunch.
>
> Change: language names are shown natively in both locales (`العربية` /
> `English`) rather than translated — a user looking for their language should
> recognise it without already reading the UI language.
>
> The legacy marketing/footer namespaces (`heroTitle`, `miracles`, `footer.cookies`,
> …) were **not** ported: they describe features that are not built, and P4.1 is
> explicitly the PR that removes marketing claims for unimplemented features.
> `page.meetings.*` and `pages.account.progress.*` are kept verbatim from the web
> app's (inconsistent) namespaces so P4.2/P4.4 can port screens 1:1.

- [x] `i18next@26` + `react-i18next@17`; locales at `src/i18n/locales/{ar,en}/common.json`. Resources are bundled, not fetched: a network-backed locale would reintroduce the swap this PR exists to prevent.
- [x] Language persisted through `storageService` (`STORAGE_KEYS.language`), initial value from `expo-localization` (`getLocales()[0].languageCode` narrowed by `isLanguage`), fallback `en`.
- [x] `scripts/i18n-audit.mjs` wired into `verify` as `check:i18n`. It fails on key drift (plural suffixes normalised, because Arabic has six categories and English two), on `{{placeholder}}` drift, and on a `t('…')` key in source that does not exist. Empty values are warnings: some are deliberate.
- [x] Missing keys filled: `error.*` (400/401/403/404/500 phrase pairs), `page.meetings.*` (header, list empty), `pages.account.progress.*` (title, legend, empty, recent tasks), `meeting.*` (statuses, attendees plurals, details), plus `language.*`, `theme.*`, `state.*`, `action.*`.
- [x] `I18nManager.allowRTL(true)` + `forceRTL` at boot and on change; the flip prompts a restart (see above).
- [x] `<LayoutDirection rtl={isRTL}>` wraps the navigator in `src/app/_layout.tsx`; `useDirection()` (and `useLanguageState()`) live in `src/i18n/use-language.ts` and re-export from `@/i18n`.
- [x] Web: `document.documentElement.lang/dir` set on boot and on change, guarded by `Platform.OS === 'web' && typeof document !== 'undefined'` so static rendering in Node does not crash.
- [x] Physical-margin sweep: none to change. The P2.1 primitives were built with symmetric padding and `items-*`, never `pl/pr/ml/mr` or `text-left/right`, so nothing depended on the previous direction. The sweep is enforced going forward by review, not by a lint rule (no such rule exists for Tailwind class names).
- [x] Direction-aware typeface: `src/ui/font.ts` (`useUiFontClass`) returns `font-arabic` for `rtl` and `font-ui` for `ltr`; `Text` uses it for `family="auto"` and exposes `family="arabic" | "ui" | "quran"`; `Input` uses it too, because `TextInput` does not inherit `Text`'s default.
- [x] `ThemeToggle` and the new `LanguageToggle` share `src/ui/segmented-control.tsx` (a `radiogroup`, not buttons) and take their labels from i18n.
- [x] `MEETING_STATUS_CONFIG.label` → `labelKey` (`meeting.status.*`), and the guest nav row's literal Arabic title → `nav.quranFull`, so `core/` holds keys and no display text.
- [x] Jest: `jest.setup.ts` installs the library's AsyncStorage mock. Without it, any test whose import graph reaches `storageService` fails at module load — a presentation test should never need to know that.
- [x] Tests: `src/providers/__tests__/language-provider.test.tsx` (stored value applied before `ready`, key read, unsupported value ignored, switch updates language + direction + `i18n.t`, persistence, restart reporting, no-op when unchanged), `src/ui/__tests__/language-toggle.test.tsx` (both options, selection, restart alert), `src/ui/__tests__/text.test.tsx` (family follows direction; explicit family wins).
- [ ] **Verify both languages on the proof screen and a form** — code path is exercised in tests and on web export, but the visual pass (shaped Arabic in an `Input`, `rtl:` variants, keyboard alignment) needs a device. Outstanding with the rest of the P0.2 device work.

**Done when:** `ar` RTL / `en` LTR on all three targets; audit reports zero missing keys. — The audit is green (80 keys, both languages). Web is verified by export; **iOS/Android RTL and Arabic input alignment are outstanding** (no simulator/device here).

---

## Stage 3 — Shell, navigation, auth

### [x] P3.1 — Root layout + providers · M

Depends: P1.5, P2.4

> Change: `LanguageProvider` sits **above** `LayoutDirection`, not below it.
> `LayoutDirection` reads `useDirection()`, so the provider that owns the
> language must already be mounted — otherwise the direction scope cannot be a
> child of the thing it reads. `LanguageProvider` renders nothing itself
> (`return children`), which is why it can afford to be outermost.
>
> Change: `AuthProvider` is **not** in the stack yet. It is the first bullet of
> P3.3, and adding a placeholder auth provider now would either fake a session
> or gate the app on a Firebase call this PR cannot test. The consequence is
> explicit: nothing is auth-gated yet, and the meetings/account tabs are public
> until P3.3 wires `Stack.Protected`. Recorded here so it is not mistaken for an
> oversight.
>
> `SafeAreaListener` → `Uniwind.updateInsets` is required for the `*-safe`
> utilities (`Screen` relies on the shell for insets); without it `pb-safe`
> resolves to nothing on native.
>
> The `QueryClient` is a module singleton (`src/services/query/query-client.ts`),
> not `useState(() => new QueryClient())`: P3.3 needs to clear the whole cache on
> sign-out from outside React, and the reader will prefetch from a store action.

- [x] Root order: `@/global.css` → `GestureHandlerRootView` → `SafeAreaProvider` → `SafeAreaListener(→ Uniwind.updateInsets)` → `LanguageProvider` → `LayoutDirection` → `ThemeProvider` → `QueryClientProvider` → `BootProvider` → `Stack`. (`AuthProvider` joins between `QueryClientProvider` and `BootProvider` in P3.3.)
- [x] `QueryClient` defaults: `staleTime: 5m`, `gcTime: 30m`, `retry: 2`; mutations never retry (a retried write is a duplicate write). Asserted in `src/services/query/__tests__/query-client.test.ts`.
- [x] `Stack` `screenOptions` from theme tokens: `contentStyle` is `useResolveClassNames('bg-background')`, so the transition gap is the app's own background in both schemes. `Stack.Protected` is P3.3.
- [x] Splash + font gating preserved: `BootProvider` still withholds the tree until theme + language + fonts settle (or fonts fail).
- [x] No `document`/`window`/`localStorage` at module scope. The only DOM access is inside event/effect handlers, guarded by `Platform.OS === 'web' && typeof document !== 'undefined'`.

**Done when:** boots on all three targets; deep-link cold start works. — Web is verified by static export; **native boot and deep-link cold start remain outstanding** with the P0.2 device work (no simulator here).

---

### [x] P3.2 — Navigation tree · L

Depends: P3.1

> Change: one table (`src/features/navigation/route-registry.ts`, added in P3.5 —
> `tabs.ts` was its interim name) feeds both shells. `NativeTabs` and the web
> `expo-router/ui` bar read the same `tab` / `href` / `icon` / `titleKey`, so a
> tab cannot exist on one target and be missing on the other, and tab order has
> a single definition.
>
> Change: the web bar is a **top** row, not a bottom bar. A wide viewport has no
> thumb to reach for, and a top row doubles as the header for a web layout. It
> uses `TabTrigger asChild` so the `Pressable` keeps the app's own styling while
> the router keeps the behaviour.
>
> `href` is intentionally dropped from the `Pressable` in `TabButton`: the
> trigger's `onPress` already navigates, and `Pressable` has no `href` in its
> types. Real anchor semantics (middle-click, open in new tab) are a P8.2
> web-parity item, not shell work.
>
> `Link.Preview` / `Link.Menu` are **not** wired: there is no list → detail row
> yet on any screen (those land with meetings P4.2). Adding them to placeholder
> empty states would demo nothing.
>
> Change: `Stack.Screen options.title` is unused. Native tabs show their own
> labels and the root stack has no header; web page titles go through
> `expo-router/head` (`<Head><title>`), which is a no-op on native.
>
> The native tab bar needs glyph names, not components, so `src/ui/icon.tsx`
> gained a third column: `mdSymbol` (Material **Symbols**, `menu_book`) next to
> `md` (Material **Icons**, `menu-book`). They are different sets with different
> spellings and cannot share a column without lying to the type system.

- [x] `src/app/(tabs)/_layout.tsx` with `NativeTabs` (`expo-router/unstable-native-tabs`): Home, Quran, Meetings, Account. Colours come from tokens via `useResolveClassNames` (the native bar takes `ColorValue`s, not classNames).
- [x] Web shell via `expo-router/ui` (`Tabs`, `TabList`, `TabTrigger`, `TabSlot`) in `_layout.web.tsx`; Metro picks it by platform.
- [x] Template routes removed: `src/app/index.tsx` (proof screen) moved to `(tabs)/index.tsx`; no `explore` route ever existed in this repo.
- [x] Reader outside tabs: `src/app/reader/[page].tsx` is a root-stack sibling declared with `presentation: 'fullScreenModal'` and `headerShown: false`, so it covers the tab bar. It validates `page` to 1–604 and shows the 404 state otherwise.
- [x] `(tabs)/{quran,meetings,account}.tsx` are honest placeholders (`EmptyState` + `Head` title), not fake data screens; each names the PR that replaces it.
- [x] Web static routes resolve: `expo export --platform web` emits `/`, `/quran`, `/meetings`, `/account` (plus `/_sitemap` and the dynamic `reader/[page]` shell). No Firebase rewrite is needed for the tab bar; a dynamic reader URL will need one when P5.3 lands.
- [ ] `Link.Preview` / `Link.Menu` — deferred, no list → detail rows exist yet (P4.2).

**Done when:** every route reachable on all targets; no 404 from the tab bar. — Web is verified by export and route list. **Native tab bars (icons, tint, RTL ordering) need a device** with the rest of the P0.2 work.

---

### [ ] P3.3 — Authentication · L

Depends: P3.2

> **Implemented; stage acceptance blocked on a device.** This pass replaced the
> skipped version: `AuthProvider` now owns session observation and the account
> query, private routes are gated, and native Google uses an authorization code
>
> - PKCE exchange before `signInWithCredential`. The registry's `access` field is
>   the single source for tab filtering and route guards, so `Stack.Protected`
>   was not needed.
>
> The demo session (`features/account/demo-session.ts`) is deleted and the
> profile barrel points at Firestore. `demo-profile.repository.ts` survives only
> as an injectable test fixture. Sign-in is a modal so a protected deep link can
> resume its destination after authentication.
>
> Not verifiable on this machine: Google client IDs are absent from `.env`, so
> the provider-console contract and the sign-in flow need a development build;
> Firestore rules need console/emulator access; there is no iOS/Android
> toolchain. Those are tasks 4.2, 4.10 and 4.11 in the OpenSpec ledger.
> Setup steps for the next operator are in `docs/auth-setup.md`.

- [x] Port `AuthProvider` (`onAuthStateChanged` → profile → `mergeAuthWithProfile`); `loading` never stuck on profile failure. Profile errors settle into `ErrorState` with a retry; the account query is keyed by uid and disabled while signed out.
- [x] `npx expo install expo-auth-session expo-crypto` (`expo-auth-session@~57.0.16`, `expo-crypto@~57.0.4`).
- [x] Native Google: authorization code + PKCE → `AccessTokenRequest` → `GoogleAuthProvider.credential` + `signInWithCredential` in `platform/auth/google.ts` and `authService.ts`. Implicit `id_token` is not used because Google no longer supports it on installed apps.
- [x] Web Google: `signInWithPopup` kept in `authService.web.ts`; the native module refuses to run on web.
- [x] Client IDs via `EXPO_PUBLIC_GOOGLE_*` with a platform-bound selection (no web fallback), redirect URI `othman://auth`/`EXPO_PUBLIC_GOOGLE_REDIRECT_URI`, and console setup documented in `docs/auth-setup.md`.
- [x] Sign-in screen (`auth/sign-in.tsx`, modal): Google + email→password two-step, loading/error/retry, no `checkAccountExists`, no enumeration through profile lookup.
- [x] Registry-derived tab filtering + `RequireAuth` on `meetings`, `account`, `account/edit` and `account/progress`: signed-out access redirects to sign-in with a sanitized internal `returnTo`; home, quran and the reader stay public.
- [x] Sign-out cancels and removes account/progress/meetings query data, resets the reader's transient selection/direction, and keeps theme, language, edition and last page.
- [x] Handle `auth/account-exists-with-different-credential` with a recovery message and no silent linking.
- [x] Focused tests: `auth-provider` (8), Google boundary (18), sign-in screen (11), return-to (7), visible tabs (4), reader reset, plus the migrated account/edit suites.

**Done when:** Google works on iOS/Android/web; session restores; protected routes redirect and return. — **Code and tests are green (`npm run verify`); the device/web smoke run and the provider-console contract are blocked** (no Google client IDs, no device toolchains, no rules access). Session restoration is covered by the persistence unit contract only, not by a relaunch on hardware.

---

### [x] P3.4 — Server-state plumbing · M

Depends: P3.3 (skipped — see the gap note below)

> Change: **P3.3 is not built**, so both hooks that need a user take one as an
> argument (`useAccount(authUser)`) instead of reading a context. Nothing here
> is auth-coupled: when `AuthProvider` lands, the screens pass
> `account` into the same hooks and no query code changes. That is cheaper than
> writing a provider now whose only consumer would be a test.
>
> Change: the four query booleans are collapsed into one discriminated union by
> `src/features/query/async-state.ts` (`pending | error | empty | ready`). A
> screen that branches on `isPending`/`data` directly eventually renders "empty"
> during the first load, which is the exact bug `ui/states.tsx` exists to
> prevent. `isFetching` stays outside the union so a background refetch keeps the
> content mounted instead of flashing a spinner.
>
> Change: `AsyncState.error` carries a `retry` closure rather than the screen
> calling `refetch` itself, so `<ErrorState onRetry={state.retry} />` is the
> whole error path.
>
> The hooks live in `src/features/**`, not `src/services/**`: `services` may not
> import UI, and a React hook is UI. `services/query/` holds only the client and
> the key factory — the parts that must be importable from outside React
> (sign-out in P3.3 clears the cache from a callback, not a component).
>
> `useMeetingsByDate` sets a **one-minute** `staleTime` instead of the global
> five: "today" changes while the user watches it, and a meeting that started two
> minutes ago should not keep reading "starts soon".
>
> Change: no persisted query cache. TanStack stays in memory; anything that must
> survive a relaunch (reader page, language) goes through `storageService` +
> Zustand explicitly. A persisted query cache needs a versioned serializer, a
> hydration gate and a migration story, all of which buy nothing while every
> endpoint is cheap to refetch.
>
> Change: the web's duplicate `switchEditionInner` and the serial
> edition→metadata waterfall have **no counterpart in this app yet** — they were
> `othman-web`'s edition picker, and the reader is P5.3. Deferred to P5.3, where
> the two editable fetches become one `Promise.all` behind a query hook. Recorded
> rather than silently dropped.

- [x] `@tanstack/react-query` installed; `QueryClient` singleton + defaults landed with P3.1 (`src/services/query/query-client.ts`).
- [x] `src/services/query/keys.ts` typed key factory: `['othman', domain, ...params]`, `as const`, with `meetings.root` / `account.root` as the invalidation boundaries. No inline key arrays anywhere.
- [x] Query hooks: `useMeetingsByDate`, `useRefreshMeetings` (`src/features/meetings/use-meetings.ts`); `useAccount`, `useUpdateAccount` (`src/features/account/use-account.ts`). No `useEffect` fetching.
- [x] Loading/error/empty contract: `toAsyncResult` + `AsyncState`, tested as a pure function; `ErrorState`'s default retry label is now `t('action.retry')` instead of a hard-coded English string.
- [x] In-memory cache only — decision documented above.
- [x] Web `switchEditionInner` / edition→metadata waterfall — closed early in P5.1: `quranService.loadCatalog()` fetches editions + metadata in parallel, and the bbox repository does the same for its two tables.

**Done when:** no component calls `fetch`; keys never inline. — Both hold. **P3.3's `AuthProvider` is still missing**, so `meetings`/`account` remain reachable without a session until that PR lands; the hooks themselves are ready for it.

---

### [x] P3.5 — Route registry + error routes · S

Depends: P3.3 (skipped — see P3.4)

> Change: the registry **replaced** `core/config/nav.ts` and the interim
> `features/navigation/tabs.ts`; it did not extend them. The ported trees
> described a web sidebar with six admin/superadmin routes and a dozen account
> sub-routes that no PR in this plan builds. A nav row pointing at a route that
> does not exist is a guaranteed 404, so the rows were **deleted, not hidden** —
> hiding leaves the data to rot and the strings uncollected. They come back with
> their screens.
>
> The registry also carries `access: 'public' | 'private'`, so P3.3's
> `Stack.Protected` reads the same table the tab bars read. Two sources for "is
> this private" would eventually disagree, and the gate is the wrong place to
> discover a typo.
>
> Change: `fullNavigate` → `router.replace`. The legacy helper wrapped a full
> page load, which does not exist in a single-page native app; `router.replace`
> is the same intent (no history entry for a destination the back gesture must
> not return to). Used directly at the call sites — wrapping it in a one-line
> helper would only hide which navigator is in play.
>
> `src/app/reader/[page].tsx` (P3.2) validates its parameter instead of trusting
> it; the reader itself is P5.3, so the validation lives with the stub rather
> than being retrofitted later.

- [x] `src/app/+not-found.tsx` and `src/app/error/[code].tsx` (400/401/403/404/500 from the existing `error.*` strings). Unknown or non-numeric codes resolve to 404 rather than inventing copy: `/error/418` is a URL that does not describe a state this app knows.
- [x] `src/features/navigation/route-registry.ts`: `APP_ROUTES` (tab, href, titleKey, descriptionKey, icon, access) + derived `TABS`; helpers `getRoute`, `isAppHref`, `requiresAuth`. Only routes that exist are listed.
- [x] `core/config/nav.ts` hrefs are gone with the file; the registry holds Expo Router paths (`/meetings`, not `/my-meetings`). `NavItem`/`NavVariant`/`RoleNavId` removed from `core/config` — `core` keeps translation _keys_, never display text.
- [x] Icons resolve through the P2.1 registry (`getIconGlyph` → `{ ios, md, mdSymbol }`), asserted in `src/features/navigation/__tests__/route-registry.test.ts` alongside the four-tab order, href uniqueness and the private/public split.
- [x] Both shells read `TABS`; `src/features/navigation/tabs.ts` deleted.
- [x] Tests: `route-registry.test.ts` (order, uniqueness, access, legacy paths reported missing) and `error-screens.test.tsx` (404 copy, known code, unknown code, non-numeric code, `replace('/')`).

**Done when:** no reachable 404 from any nav surface. — Every registry entry has a route file, and the only 404 left is `+not-found` for URLs the app never generated. `Link.Preview`/`Link.Menu` remain a P4.2 item.

---

## Stage 4 — Feature screens

### [x] P4.1 — Home · M

Depends: P3.5

> Change: the hero is a **token gradient**, not the mosque photograph. The web
> hero was a viewport-high image with the calligraphy overlaid; on a phone that
> either cropped the Arabic or pushed every action below the fold. The gradient
> runs lighter at the top and closes on solid `primary`, which is the only
> pairing in the block that clears AA at body size (`text-primary-foreground`).
>
> Change: the legacy feature grid advertised **tafsir, search and bookmarks**.
> None of them ships in this app, so all three are gone rather than disabled —
> the cards are derived from `APP_ROUTES` and can only point at routes that
> exist. About joins the list in P4.5.
>
> Change: the verse uses the automatic UI family, not `font-quran`: `en` shows
> a translation and Amiri Quran has no Latin glyphs. In `ar` the automatic
> family is Noto Naskh, which renders the diacritics.

- [x] `(tabs)/index.tsx` composes `features/home/{hero,verse-card,feature-card}.tsx`; `Screen` supplies the `ScrollView`, automatic inset adjustment and `keyboardShouldPersistTaps`. Padding sits on the inner sections so the gradient stays full-bleed.
- [x] `HOME_LINKS` (`features/home/feature-links.ts`) filters `APP_ROUTES` down to quran/meetings/account. A row without a `descriptionKey` is dropped instead of rendering a blank line; a test asserts every card resolves through `getRoute`.
- [x] Hero: `bg-gradient-to-b from-primary/85 to-primary`; the exported web stylesheet contains the matching `linear-gradient(...)` and `color-mix` stops. No fixed height — the basmalah, app name and tagline wrap.
- [x] No claim for an unbuilt feature remains; a test asserts `Tafsir`, `Search` and `Bookmarks` do not render.
- [x] Locales: `home.hero.opening`, `home.verse.{title,text,reference}`, `home.explore.title` in both languages, with the legacy Al-Isra 9 text kept verbatim in `ar`.
- [x] Tests: `features/home/__tests__/home-screen.test.tsx` (identity, basmalah, verse, one link per registry row, tab descriptions, removed marketing claims) and `feature-links.test.ts` (registered routes, order, self-description).
- [x] Large text / long Arabic title: no fixed heights and no `numberOfLines`; the hero title is `text-3xl` and wraps. `npm run verify` covers the code side.
- [ ] **Manual:** eyeball at the largest OS text size, both languages and both themes on iOS + Android (no device on this machine).

**Done when:** correct in `ar`/`en`, light/dark, all targets. — Code, locales and web CSS verified; the device eyeball pass is the outstanding manual step.

---

### [x] P4.2 — Meetings · L

Depends: P3.5

> Change: the Hijri conversion is **Umm al-Qura**, not the arithmetic Islamic
> calendar the web library used. A one-day error sends the user to the wrong
> day's meetings, so `core/utils/hijri.ts` carries a year-mask table generated
> once from ICU's `islamic-umalqura` data (1395–1510). Doing the conversion at
> runtime would depend on the engine: Hermes' `Intl` calendar support differs
> between iOS and Android.
>
> Change: the grid is **always 42 cells starting Sunday** and the canonical
> value is the Gregorian `Date`/`DateKey`. Switching to Hijri relabels the cells
> (`14 Shawwal 1447`) but never moves the selection or the fetched day.
>
> Change: attendee **tooltips became visible labels**. A phone has no hover; the
> collapsing stack shows the first avatars plus a `+n` counter, and the expanded
> details list the names and the organizer as ordinary text.
>
> Change: expansion uses Reanimated (`layout={LinearTransition}` + `FadeIn`/
> `FadeOut`) instead of the web's height transition.
>
> Change: the meet link opens in `expo-web-browser`, and only `https:` is
> accepted — the URL is backend data, so any other scheme is dropped rather than
> handed to the OS.

- [x] `(tabs)/meetings.tsx` composes `features/meetings/{meeting-calendar,meeting-card,meeting-card-skeleton,attendee-stack}.tsx`, `calendar-format.ts` and `open-meet-link.ts`. The calendar is the `ListHeaderComponent` of the `FlatList`, so the day picker and the rows scroll as one surface.
- [x] `core/utils/hijri.ts` (`hijriToGregorianDate`, `gregorianDateToHijri`, `try…`, month/year lengths) + `core/utils/calendar.ts` (`buildCalendarMonth`, `shiftCalendarMonth`, `canShiftCalendarMonth`). Both live in `core/`: pure TS, no React, no locale.
- [x] `useMeetingsByDate(dateKey)` query with `meeting.found` counts; `FlatList` uses `contentInsetAdjustmentBehavior="automatic"` and a `RefreshControl` bound to `useRefreshMeetings`.
- [x] Status pill reuses `Badge` with `getMeetingStatusConfig(status).tone` — tone words in `core`, class literals in `ui/tone.ts`, nothing dynamic. `MeetingStatusConfig.labelKey` is now a literal union so the typed `t()` accepts it.
- [x] Attendee stack (`ATTENDEE_LIST_CONFIG.maxVisible`, `+n`) + names in expanded details. No long-press menu.
- [x] Join opens the in-app browser; `openMeetLink` rejects every non-`https:` scheme and swallows a "no browser" failure.
- [x] Four states: skeleton cards while pending, `ErrorState` with the query's retry, `EmptyState` for a day with nothing, cards when ready. The calendar stays mounted in all four.
- [x] 44 pt targets: day cells `h-11`, month chevrons `h-11 w-11`, Details `min-h-11`, Join and Today at the default `h-11` size.
- [x] Tests: `hijri.test.ts` (known Umm al-Qura dates, two-year round trip, month/year lengths, range rejection), `calendar.test.ts` (42 cells, Sunday start, canonical keys, month shifting, table clamping), `meeting-calendar.test.tsx`, `meeting-card.test.tsx`, `meetings-screen.test.tsx`, `open-meet-link.test.ts`.
- [x] `__mocks__/react-native-reanimated.js`: the real library cannot load under Jest (`react-native-worklets` reaches a missing native module at import time, and the shipped `react-native-reanimated/mock` imports the real entry point). The manual mock keeps `Animated.View` a plain `View` and makes animation builders chainable no-ops.
- [ ] **Manual:** RTL grid order, Arabic day numbers, 44 pt targets and expansion smoothness on iOS + Android (no device on this machine).

**Done when:** date change fetches once; RTL grid order correct; 44 pt targets. — Date change is keyed by `DateKey` and covered by a test; RTL order and touch sizes are verified in code, the device pass is the outstanding manual step.

---

### [x] P4.3 — Account · L

Depends: P4.2

> Change: **the account is a fixture until P3.3.** Authentication was skipped, so
> there is no Firebase user to read a profile for. `services/profile/index.ts`
> points at `demo-profile.repository.ts` (in-memory, partial-merge `update`) and
> `features/account/demo-session.ts` holds one signed-in `AuthUser` in a module
> store. That keeps the whole surface explorable — edit, save, sign out, sign
> back in — while the screens already speak the real `ProfileService`. P3.3 swaps
> the two files and deletes the demo pair; nothing in `app/` changes.
>
> Change: the settings rows are `@expo/ui` `List`/`ListItem` (SwiftUI List /
> Compose LazyColumn / a plain list on web), but the **form text fields are the
> app's `Input`**, not `@expo/ui` `TextInput`. The latter is backed by an
> `ObservableState` and worklets, so its value does not live in React state — a
> form that must keep an invalid draft on screen after a failed save cannot use
> it. `@expo/ui` still supplies the one genuinely native control here: the role
> `Picker` for administrators.
>
> Change: the **phone number is a single E.164-style input** (`+`, 8–15 digits,
> separators stripped), not a dial-code picker. `core/config/phone.ts` ships only
> FR/MA and the profile fixture is Saudi; a two-country picker would be a
> regression in reach, so the field accepts any country until a real dial-code
> table replaces it.
>
> Change: the role is **read-only for everyone below `admin`**, shown as a
> `Badge`. An administrator gets the native `Picker`, and only a changed value is
> written.
>
> Change: the editor is a **`formSheet`** with a grabber and `usePreventRemove`
> armed only while the write is pending. The hook is not exported from
> `expo-router` until SDK 58, so the route imports
> `expo-router/build/react-navigation/core/usePreventRemove` — the
> implementation the native stack already uses.
>
> Change: a picked photo stays a **device-local URI** until P3.3 adds the storage
> upload. The write still persists the string, so the screen shows it; a fresh
> install would not have the file.

- [x] `(tabs)/account.tsx` hosts a `ProfileHeader` (avatar `xl`, name, email, role `Badge`, Edit) inside the native list via `RNHostView`, then a Progress row and a Sign out row. Sections are `RNHostView` + `Text` because `List` has no section API; `FieldGroup` does, but it owns a second scroll surface.
- [x] `core/domain/account/profile-validation.ts`: `ProfileDraft`, `validateProfileDraft` (name 2–60, optional `^\+[0-9]{8,15}$`), `normalizePhoneNumber`, `isProfileDraftDirty`, `toProfileDraft`. Returns codes, never sentences — `core` has no locale.
- [x] `features/account/edit-profile-form.tsx`: draft in `useState`, Save enabled only for a dirty **and** valid draft, only changed fields patched (`null` clears the phone), avatar via `expo-image-picker` (`mediaTypes: ['images']`, 1:1 crop), email read-only, role gated by `canEditRoles`.
- [x] Pending: fields, Cancel and Save disabled; the route's `usePreventRemove` blocks swipe/back; the failure banner keeps every typed value.
- [x] Success closes through a **one-shot `useRef`** guard: an effect reacts to `isPending` going false, so a re-render with a new `onSaved` identity cannot fire `back()` twice and pop the screen underneath.
- [x] Keyboard: `KeyboardAvoidingView` + the Save footer **outside** the `ScrollView`, so the primary action is never under the keyboard.
- [x] Sign out is behind `Alert.alert` (destructive confirm), then `EmptyState` with "Use the demo account" so the signed-out state is reachable and reversible.
- [x] `toAsyncResult` gained an overload: **without** an `isEmpty` rule it returns `AsyncPresentResult<T>`, where `status: 'empty'` is unrepresentable. An account always has a uid, so the screens no longer carry a dead `empty` branch.
- [x] `account/progress.tsx` exists as a stub with a working back affordance; P4.4 fills it.
- [x] `expo-image-picker@57.0.20` + its config plugin (`photosPermission` only — no camera or microphone strings). `camera`, `info`, `logout` icons; `Avatar size="xl"`.
- [x] Locales: `account.*` (sections, role labels, demo note, signed-out, sign-out dialog, edit form, validation, a11y) and `action.edit` in both languages.
- [x] Tests: `profile-validation.test.ts` (normalization, boundaries, error codes, dirty comparison), `demo-profile.repository.test.ts` (uid/email lookup, partial merge, null clear, reset), `account-screen.test.tsx` (loading, header + rows, navigation, retry, sign-out, sign-in), `edit-account-screen.test.tsx` (initial draft, minimal patch, phone normalization, both validation errors, failed write keeps draft, cancel discards, read-only vs admin role, photo pick, pending disables everything).
- [x] `__mocks__/@expo/ui.js`: the package renders native host adapters that expose no text or press handlers under Jest, so the universal components are mapped to RN primitives (behavioural mock; layout is verified on device).
- [ ] **Manual:** `@expo/ui` list row measurement inside the account screen, formSheet detent + grabber, swipe-during-save guard, RTL chevrons and Arabic input, photo-library permission prompt, large text on iOS + Android (no device on this machine).

**Done when:** edit → save → persist → header updates; cancel discards. — Covered end-to-end by `edit-account-screen.test.tsx` against the profile service; the device pass on native chrome is the outstanding manual step.

---

### [x] P4.4 — Progress · M

Depends: P4.3

> Change: **the fixture stores a percentage per surah, not an ayah count.** The
> legacy mock carried `totalAyat` and `checkpointAyahNumber`, but no such table
> exists in this app yet — it is exactly the metadata P5.1 ports from the real
> source. Inventing 114 ayah counts here would create a second source of truth
> and a lie in the detail sheet, so the mock answers only what the heatmap asks:
> how much of this surah is memorised. The repository interface takes the same
> shape, so the account-backed implementation drops in unchanged.
>
> Change: **the mock is deterministic, never `Math.random()`.** A random fixture
> repaints the grid on every launch, moves the summary counts mid-session and
> makes a screenshot impossible to compare. `demo-progress.repository.ts` derives
> each row from the surah number — Juz' Amma mostly done, Al-Fatiha and the first
> twenty scattered, the long middle patchy — and anchors "last reviewed" to a
> fixed date so labels do not drift with today.
>
> Change: **the cell is 24–32 px, not a 44 pt target.** 114 squares at 44 pt
> would not fit a phone; the accessible control is the _sheet_, which opens from
> any cell and is a normal, full-size target, while each cell still carries a
> spoken label (`Surah 12: 40% memorised`) and `accessibilityState.selected`.
> The size steps live in `heatmap-geometry.ts` (pure, unit-tested) rather than
> `md:`/`lg:` classNames, because a fractional cell would break every row.
>
> Change: **no "Continue reading" action.** The web summary linked into the
> reader, but a surah still has no page mapping until P5 ports the mushaf
> metadata; a button that guesses would be worse than none.

- [x] `account/progress.tsx` + `features/progress/*` (`progress-summary`, `progress-legend`, `surah-heatmap`, `surah-detail-sheet`, `heatmap-geometry`, `progress-format`, `surah-band`, `use-surah-progress`).
- [x] 114-cell heatmap: `flex-row flex-wrap` of squares, colour from `core/utils/heatmap.ts`. The inline `backgroundColor` is the one documented exception to the colour rule — the value is a ramp position, not a token.
- [x] Cell `Pressable` with `data-selected` (web) and `accessibilityState.selected` (native); tapping opens an `@expo/ui` `BottomSheet` instead of the web tooltip. `dataSet` is not in React Native's types, so `ui/pressable.tsx` widens `Pressable` once rather than casting at each call site.
- [x] Summary card: overall percent, progress bar, memorised/started/total counts, legend. Surahs count equally in the average — weighting by ayat would need the table P5.1 owns.
- [x] `useWindowDimensions` drives the geometry, with the cell stepping at 768/1024 px and 6–20+ columns; the grid has a capped width and is centred, not stretched.
- [x] Four states: loading, error + retry, empty (no rows), ready. The header stays mounted in all four, so leaving never depends on the read succeeding. `useDeferredValue` is not used yet — there is no filter to defer.
- [x] `ui/progress.tsx`: a clamped 0–100 bar with `accessibilityValue`; negative, oversized and non-finite values render as an empty/full track instead of overflowing.
- [x] Locales: `pages.account.progress.{gridTitle,summary,surah,band,cell,detail}*` in both languages.
- [x] Tests: `surah-progress.test.ts` (clamping, bands, averages, empty list), `heatmap-geometry.test.ts` (no overflow, width from whole columns, breakpoints, clamping), `surah-heatmap.test.tsx` (114 cells, labels, selection + dataset), `progress-screen.test.tsx` (four states, summary counts, select → sheet → close, back), `demo-progress.repository.test.ts` (order, bounds, null-date rule, determinism, detached rows), `ui/progress.test.tsx` (a11y value, clamping).
- [ ] **Manual:** 60 fps scrolling on a mid-tier Android device, RTL grid order (surah 1 at the inline start), native sheet detent/back-button behaviour, large text (no device on this machine).

**Done when:** 60 fps on mid-tier Android; selection works in RTL. — Selection, summary and state handling are covered by tests; the frame-rate and RTL checks are in code (no layout animation, `flex-row` starts at the inline start) and remain in the manual device pass.

---

### [x] P4.5 — About + footer surface · S

Depends: P4.1

> Change: **the footer became one screen with no columns.** The legacy footer was
> four columns of marketing plus links to `/terms`, `/privacy`, `/cookies`,
> `/faq`, `/tafsir`, `/features`, `/contact`, `/download` and `/desktop` — routes
> the web app never built, so every one of them 404'd. Reproducing that on a
> phone would be a footer that is both unreachable and wrong. The About screen
> keeps what is true: what the app is, the destinations that exist, the one
> external link that resolves, and the copyright.
>
> Change: **legal is a copyright line, not four dead links.** There is no terms,
> privacy or cookie page in this project to link to, and a mobile app has no
> cookies to disclose. When those documents exist they get rows here; inventing
> URLs today would violate the PR's own "no dead links" rule.
>
> Change: **no `Footer` exists in the Expo app to delete.** The web `Footer`
> stays in `othman-web/` as reference material along with the rest of the Vite
> app. What P4.5 removes is the _concept_: no layout appends a footer, and the
> footer namespaces were already dropped in P2.4. If a web-only footer is ever
> wanted again it belongs behind `Platform.OS === 'web'`, not in a shared layout.
>
> Change: **About is registered in `APP_ROUTES` although it is not a tab.** Home
> cards come from the registry, and `FeatureCard` takes an `AppHref`; a
> hand-written `/about` card outside the table is exactly the dead-link risk the
> table exists to remove. Non-tab rows opt into Home with `showOnHome`, and
> `TABS` still filters them out, so the tab bar is unchanged.
>
> Change: the previous account-only `openMeetLink` guard moved to
> `platform/browser.ts` as `openHttpsLink`; the meeting helper now delegates. One
> https-only boundary for every external link, including About's website.

- [x] `src/app/about.tsx` — identity block (name, tagline, description, version from `expo-constants`), Explore (the four tabs), Resources (website), Legal (copyright) as `@expo/ui` `List` sections. The list section title moved out of Account into `ui/list-section-header.tsx` so the two screens cannot drift.
- [x] Quick links come from `TABS` and navigate with `router.navigate`, not `push`: About sits on the root stack above the tabs, and pushing a tab would stack a second copy of the app.
- [x] External links via `expo-web-browser`, through the shared https-only guard.
- [x] `WEBSITE_URL` in `core/config/urls.ts`; the legacy marketing/legal routes are deliberately absent.
- [x] About is reachable from Home (fourth card, after Account) and from an Account settings row; `P4.3`'s account test now covers `/about` too.
- [x] Locales: `nav.about`, `nav.aboutDesc`, `pages.about.*` in both languages. The English description is the legacy copy; the Arabic one was rewritten because the legacy value was a two-word stub (`منصة تعليمية`).
- [x] Tests: `about-screen.test.tsx` (identity + version, every tab row, navigate, website guard, back, copyright), `browser.test.ts` (https only, no-browser), plus updated `route-registry`, `feature-links`, `home-screen` and `account-screen`.
- [ ] **Manual:** native list chrome in both schemes, RTL chevrons and Arabic line height in the hosted prose blocks, external browser presentation on iOS + Android (no device on this machine).

**Done when:** no dead links. — Every row resolves to a registered in-app route or to `WEBSITE_URL`; the legacy dead paths are not offered.

---

## Stage 5 — Quran reader

### [x] P5.1 — Quran repositories · L

Depends: P3.4

> Change: **the payloads are mapped once, at the boundary.** `editions.json`,
> `quran.json`, both bbox tables and the ayah API spell their fields in
> snake_case (`page_num`, `number_of_ayat`, `absolute_number`) and wrap ayah
> text in `{code, status, data}`. `core/domain/quran/parse.ts` is the only code
> that knows that; every consumer sees the camelCase models in
> `core/types/quran.ts`. That is also what makes the reader portable: the CDN
> can rename a field without a `find and replace` through the UI.
>
> Change: **a broken payload is rejected, not repaired.** A clamped box would
> silently select the wrong words; a skipped surah would leave a hole in the
> 114-row picker that nothing else notices; `first_page > last_page` would make
> every navigation action produce an empty range. The parsers throw
> `QuranDataError` with the offending `source` and the exact JSON path, so the
> query error screen (P5.3) has something to retry and a bug report names the
> bad file. Transport failures keep their own types (`HttpError`,
> `HttpTimeoutError`, `HttpAbortError`): "the CDN said 503" and "the CDN sent
> nonsense" are different problems.
>
> Change: **editions are keyed by their CDN key, not by name.** `editions.json`
> is `{"1": …, "2": …, "3": …}`, while `core/config/quran.ts` is keyed by
> `Tajweed` / `MedinaOld` / `Warsh1`. `QuranEdition` therefore carries both
> `key` (preference, query key, cache identity) and `name` (page geometry). A
> stored `editionKey` that no longer exists falls back to the first edition
> rather than launching into a blank reader.
>
> Change: **`last_page` is not capped at 604.** MedinaOld's scans run to page
> 605, so the standard mushaf length is a property of each edition's payload,
> not a constant the parser can impose. `QURAN_PAGE_COUNT` is used only for the
> ayah API's `page`, which is always the standard mapping.
>
> Change: **only the normalised bbox files are read.** The CDN also publishes
> absolute-pixel boxes; those are kept on the model because the payload carries
> them, but the reader scales the mushaf, and a pixel rectangle measured on the
> 412×600 scan lands on the wrong words at any other size.
>
> Change: **both loads are parallel, and that closes the P3.4 deferral.**
> `quranService.loadCatalog()` fetches `editions.json` + `quran.json` together,
> and `createBboxesRepository` fetches the surah-indexed and page-indexed tables
> together. The web provider fetched editions → metadata serially; P3.4 recorded
> the waterfall as "deferred to P5.3". There is nothing to serialise, so the
> service fixes it now and P5.3 only has to call it.
>
> Change: **no second cache.** TanStack Query owns server state, and adding
> `platform/http/json-cache` here would give the same bytes two expiry rules.
> The repositories are fetch-and-validate; P5.3 supplies the query hooks.
>
> Change: `SURAH_COUNT` moved from `core/domain/progress` to
> `core/domain/quran/surah.ts`, next to `MAX_AYAH_IN_SURAH` and
> `QURAN_PAGE_COUNT`: it is a fact about the mushaf that both the reader and the
> heatmap use.
>
> The fixtures are **copies of the live payloads**, trimmed to pages 1–2 where
> size matters (the real bbox files are ~2.8 MB each) but complete for the 114
> surahs, because the metadata parser enforces the count. A hand-written "valid"
> payload could only prove that the parser agrees with the test author.

- [x] `src/services/quran/`: `editions.repository`, `metadata.repository`, `bboxes.repository` (norm + reversed norm), `content.repository`, plus `quran.service` (the facade) and `quran.types` (interfaces).
- [x] Typed models in `src/core/types/quran.ts`: `Bbox`, `SurahMetadata`, `QuranEdition`, `SurahAyahBboxes`, `PageAyahBboxes`, `EditionBboxes`, `AyahContent`.
- [x] Pure parsers in `src/core/domain/quran/parse.ts`; `QuranDataError` in `core/domain/quran/errors.ts`; page arithmetic (`formatPageNumber`, clamping, image URL) in `core/domain/quran/page.ts`; edition fallback in `core/domain/quran/editions.ts`.
- [x] Parallel prefetch: `loadCatalog()` and `loadBboxes()` both use `Promise.all`, with tests that assert both requests start before either resolves.
- [x] Fixtures under `src/services/quran/__fixtures__/`: `editions.json`, `surah-metadata.json` (all 114), `surah-bboxes.json` (surahs 1–2), `page-bboxes.json` (pages 1–2), `ayah-content.json`.
- [x] Tests: `parse.test.ts` (valid payloads + one broken field at a time), `page.test.ts` (padding, clamping, image URL), `editions.test.ts` (fallback, typed error), `quran.service.test.ts` (parallel ordering, propagation), `quran.repositories.test.ts` (fixtures through a fake `HttpClient`, URL assertions, malformed payloads).
- [x] `src/platform/http/index.ts` barrel added (first non-test consumer of the HTTP client).

**Done when:** typed data offline-from-fixture; no crash on bad payload. — Every repository is exercised against the recorded fixtures with no network, and every malformed case rejects with `QuranDataError` before it can reach a screen. Nothing renders yet (that is P5.3), so the user-visible half of "no crash" is the query error state P5.3 wires to this error type.

---

### [x] P5.2 — Reader state · L

Depends: P5.1

> Change: **the store owns decisions, not data.** TanStack Query already owns
> the catalog and the bbox tables, so duplicating them in Zustand would mean two
> expiry rules for the same bytes. The store holds only what the user chose —
> page, surah, selected ayah, edition, page-turn direction — plus the two
> attached objects navigation needs (the `QuranEdition` and its
> `EditionBboxes`). A bbox refetch therefore cannot move the reader, and a page
> turn cannot invalidate a query.
>
> Change: **a vanilla Zustand store, with React hooks as a thin layer.** Page
> turns come from a gesture callback, the keyboard, a deep link and the footer
> button, none of which are renders. `reader-store.ts` imports no React, so all
> navigation rules are unit-tested without a renderer; `use-reader.ts` exposes
> one selector per slice (`useReaderPage`, `useReaderSurah`, `useReaderAyahKey`,
> `useReaderDirection`, …). Selecting the whole state is possible but not the
> default, which is what keeps a page turn from re-rendering the 114-row surah
> picker.
>
> Change: **the page label comes from the smallest absolute ayah number.** The
> web reader used `Object.keys(page.ayat)[0]`, but that map is keyed by
> ayah-in-surah: on a page that ends one surah and starts the next, the keys
> restart at `"1"` and the label names the surah the page _ends_ with. P5.2
> derives it from `absoluteNumber` instead, and the fixture deliberately lists
> the next surah first so the regression cannot come back silently.
>
> Change: **switching editions keeps the reader's place.** The web provider
> reset to `first_page` on every switch, so one accidental tap on the edition
> menu threw away the position. The page is now clamped into the new edition
> (Warsh starts at page 4, MedinaOld ends at 605) and the key is persisted. A key
> the catalog no longer has falls back to the first edition, same as boot.
>
> Change: **restore is two-phase.** Storage is read before the catalog, and
> attaches only the _preference_ (`preferredEditionKey`, `restoredPage`). The
> screen can then fetch the preferred edition's bbox tables directly instead of
> fetching the default and immediately switching. `restoredPage` is consumed by
> the first `attachEdition`; a later call (a refetch) keeps the page the user is
> actually on. Once an edition is attached, `editionKey` wins over the stored
> preference, so re-attaching cannot silently switch editions.
>
> Change: **`direction` is reading order, not screen direction.** `forward`
> means "the next page in the mushaf", which in an Arabic UI slides in from the
> left. Naming it after the reading order keeps `if (isRtl)` out of the
> animation. A no-op at either end of the edition clears the pending direction
> so a tap on a disabled edge cannot leave an animation waiting to fire.
>
> Selection is cleared by a page turn and by an edition switch, but preserved
> across a bbox refetch when the same ayah is still on the page. Page writes are
> fire-and-forget: a failed preference write must never block a turn. Fractional
> pages round and `NaN` falls back to the first page, so P5.6's deep links can
> hand the store unvalidated numbers. `formatPageNumber` is reused from
> `core/domain/quran/page.ts` (already tested in P5.1) rather than copied into
> the store.

- [x] `zustand` 5.0.16 installed.
- [x] `features/quran/store/reader-store.ts`: `editionKey`, `page`, `surah`, `ayahKey`, `direction`, `status`, plus `preferredEditionKey` / `restoredPage` / `edition` / `bboxes` and the actions `restore`, `attachEdition`, `switchEdition`, `goToPage`, `goNextPage`, `goPrevPage`, `goToSurah`, `goToAyah`, `selectAyah`, `clearSelection`, `clearDirection`.
- [x] Navigation helpers ported and tested, including the legacy boundary bug (surah label) and the reset-on-switch behaviour; `formatPageNumber` reused from core.
- [x] `editionKey` and `lastVisitedPage` persisted through the injected `StorageService`; `useRestoreReader` reads them on mount; corrupt values are ignored, not repaired.
- [x] Selector hooks in `features/quran/store/use-reader.ts`; the singleton is wired to `storageService` in `reader-store.instance.ts`, so the factory tests stay free of native modules.
- [x] Tests: `reader-store.test.ts` (55 assertions across initial state, restore, attach, switch, jumps, page turns, selection) and `use-reader.test.tsx` (restore-on-mount + render-count proof that a same-surah page turn does not re-render the surah subscriber).

**Done when:** every navigation action has tests; page turn re-renders only what changed. — All eleven actions are covered without a renderer; `use-reader.test.tsx` asserts that moving from page 1 to page 2 (same surah) renders the page probe once and the surah probe zero times, while moving into surah 2 renders both.

---

### [ ] P5.3 — Mushaf page + ayah hit-testing · XL

Depends: P5.2

> **Implemented; runtime acceptance blocked.** Rendering, hit-testing, turns and
> prefetch are covered by tests. The 20-turn frame/memory profile needs a device
> and is tracked as group 12; correctness on real scans needs a device too.

- [x] `mushaf-page.tsx`: `withUniwind(expo-image)` via `@/ui/image`, `contentFit="contain"`, `cachePolicy="memory-disk"`. The aspect box is **measured**, not a class: the page is fitted to its container with the edition's own ratio (`getEditionPageSize(edition.name)`, falling back to the `--reader-page-*` tokens). A fixed `aspect-[412/600]` letterboxes any edition whose scan is not 412×600, and `contain` would then put every bbox off the text by the letterbox.
- [x] `ayah-overlay.tsx`: one `Pressable` per bbox, geometry in `style` (percentages from `bboxToRect`), highlight through the shared `Pressable` state rather than `data-selected` (Uniwind resolves the class on the native side; there is no `data-*` attribute outside the DOM).
- [x] Bboxes are grouped per ayah; every line of a wrapped ayah is its own pressable (a union rectangle would cover the text between lines). A full-page clear button sits first in hit-test order so tapping a margin clears without swallowing an ayah tap.
- [x] **No `ScopedTheme`/light scope.** See the contrast decision below.
- [x] Page turn: gesture-handler pan + Reanimated entrance, `expo-haptics` through `usePageTurn`, `--motion-page-turn`.
- [x] Prefetch ±2 pages after a 250 ms settle timer; every turn cancels the previous timer. Failures are contained (`Promise.resolve(...).catch`), and page/hit-testing are unaffected.
- [x] **Spike result.** `useCSSVariable` returns a `string` on web, a `number` on native, and `undefined` when the stylesheet has not loaded (Jest, first frame). `--motion-page-turn` is a **duration in milliseconds**, not a value Reanimated animates: it is read once, coerced by `cssNumber` to a number (`FALLBACK_DURATION = 260` when absent), and passed as `withTiming`'s `duration`. That path is supported on both platforms, so no hex/`@theme` fallback and no separate static class is needed. Geometry tokens (`--reader-page-width/height/max-width`) take the same route. The one thing that is _not_ supported is using a CSS variable directly as an animated style value, which is why it is converted at the boundary rather than referenced inside `useAnimatedStyle`.
- [ ] Profile: 20 page turns, JS frame < 16 ms, flat memory. **Blocked:** no device or profiling session; group 12.

**Contrast decision (5.9).** The reader keeps the app's ambient theme and does **not** apply a local light scope. The page is a scan (an image), so text contrast is a property of the artwork, not of our tokens; the only surfaces we paint are the edition's own `themeColor` surround (data, passed through `style`) and the selection highlight, which is a translucent token that reads on both the cream scan and the dark surround. A forced-light reader would break the rest of the chrome (header/footer in P5.4) and is not justified by the art. If a scan is ever unreadable in dark mode, the fix belongs in the edition data (a light `themeColor` surround), not a global reader theme.

**Done when:** correct ayah on both editions; 55+ fps. — Hit-testing is proven by geometry/overlay tests for every box and boundary pages; **fps and real-scan correctness remain blocked** on device profiling (group 12).

---

### [x] P5.4 — Reader chrome · L

Depends: P5.3

- [x] Header: surah/ayah label, page indicator, `Menu`, back/exit.
- [x] Footer: next/prev with RTL semantics, `tabular-nums`.
- [x] Surah picker `BottomSheet` with `FlatList` (114 rows — not `@expo/ui` `List`) + search.
- [x] Edition picker + summary.
- [x] Utilities bar (Read / Tafsir / Notes) with `BottomSheet` panels.
- [x] Auto-hide chrome on tap.

**Implementation.** `ReaderScreen` is a column — `ReaderHeader`, the fitted page, `ReaderFooter` — so the chrome can never overlay the scan; hiding it makes `MushafPage` refit rather than reveal hidden text. Header shows the surah (Arabic/Latin by UI language), the page number, `· Ayah N` while selected, edition name, menu and a labelled exit that stays mounted through load/failure. Footer owns reading-order previous/next: chevrons mirror with direction, labels are translated, boundaries are disabled (not hidden) and the store makes the turn a no-op anyway.

Sheets are `@expo/ui` `BottomSheet` throughout. The native `MenuView` was deliberately rejected: its own source says the trigger renders but actions never fire on web, and the reader ships on web too. The surah picker is a virtualized `FlatList` with diacritic-insensitive Arabic, Latin-transliteration and number matching, and clears its query on close. The edition picker only _requests_ an edition: `ReaderBody` is keyed by edition, fetches that edition's geometry first, and attaches it in one store write (`attachEdition` for boot/same edition, `switchEdition` which clamps the page and clears selection), so a superseded request can never attach stale boxes. The Read/Tafsir/Notes panels are honest surfaces: they name the selected ayah and state that content arrives with P5.5/P6.3/P6.2 instead of rendering a blank or endless spinner.

Auto-hide is one tap, one outcome: a margin tap clears a selection if one exists, otherwise it toggles the chrome. Panel buttons are in the chrome, so the gesture that hides the chrome can never also drop the selection the panel needs.

**Evidence.** `reader-chrome.test.tsx` (header labels/actions/RTL, footer order/boundaries/`tabular-nums`), `reader-sheets.test.tsx` (surah search/jump/reopen, edition range+select, menu destinations, panel states), `surah-search.test.ts` and `format.test.ts`; the reader-screen integration covers exit, chrome toggle, margin-clears-selection, footer turn, surah jump, edition switch with clamping and a stale-response race. `docs/reader-chrome.md` records the interaction contracts. i18n audit reports 209 matching keys; `npm run verify` is green.

**Done when:** jump/switch/navigate preserve selection rules; chrome never covers text. — Selection/store rules and structure (chrome is a column, not an overlay) are proven by tests; **real-device acceptance (sheet drag, native back dismissal, "no chrome covers text" at device sizes) remains blocked** on device access (group 12/17).

---

### [x] P5.5 — Ayah content rendering · M

Depends: P5.4

- [x] Port `AyahDisplayer`: icon + RTL text, `selectable`, `--font-quran`, loose leading.
- [x] Translation/e3rab direction handling via per-block explicit direction.
- [x] 200% text scaling without clipping; tablet max width.

**Implementation.** The Read panel resolves the selected ayah through its bbox row (`resolveSelectedAyah`) and fetches it by **absolute** ayah number (1–6236), so a page that crosses a surah boundary cannot show another surah's ayah with the same in-surah key. `useAyahContent` is disabled until a selection exists, and a superseded response is isolated by its query key.

`AyahDisplayer` renders a block list: Quran text first, always RTL, `font-quran`, centered, `selectable`, with a typographic ayah marker (`۝`) replacing the web's PNG ornaments. Translation/e3rab blocks carry their own explicit `writingDirection`/`textAlign` instead of relying on `LayoutDirection`, which avoids flipping the surrounding reader when the UI language differs from the source language. There is no `numberOfLines` and no fixed `lineHeight`: the column grows and scrolls, and the quran block uses `leading-loose` so leading follows the OS text scale. The column is capped at `max-w-2xl` for tablet measure.

**Evidence.** `ayah-content.test.ts` (cross-surah identity, stale key, block direction), `ayah-displayer.test.tsx` (selectable, per-block direction, no clipping, tablet width), `quran-queries.test.tsx` (`useAyahContent`: disabled before selection, absolute key, late response, retry) and Read-panel cases in `reader-sheets.test.tsx` / `reader-screen.test.tsx`. `docs/ayah-content.md` records the contract.

**Done when:** correct in both themes; no clipping at large text. — Direction, selection identity and the no-clipping structure are proven by tests; **the 200%-text and both-theme visual check remains blocked** on a device (group 12/17), and no translation/e3rab repository is wired yet (only the block contract exists).

---

### [x] P5.6 — Deep links + restore · S

Depends: P5.5

- [x] `othman://quran?page=…&surah=…&ayah=…`; web `/quran?page=…`.
- [x] Typed params + validation (invalid page clamps, invalid surah shows retry).
- [x] Cold start into a deep link skips the last-visited restore.
- [x] Share action using the same URL builder.

**Implementation.** `src/features/quran/links.ts` is the single parser/builder/resolver for three parameters on both routes. Parsing rejects duplicates, malformed numbers and an ayah without a surah instead of coercing them; a link that cannot be read renders `ReaderLinkError`, whose action opens the Quran tab. The `/quran` tab forwards valid links to `/reader/[page]` with the same parameters.

Resolution runs after the edition's geometry attaches: a surah/ayah link maps through `bySurah` and therefore wins over a contradictory `page`; a page-only link clamps into the edition's own range (Warsh 4–605). An ayah the edition does not contain is a recoverable invalid state, not page 1.

The "applied once" flag lives in `ReaderScreen`, not `ReaderBody`: `ReaderBody` remounts on an edition switch, so a per-body flag would re-apply the link and undo the reader's new position. A cold-start link is applied after the saved page restore, so it wins; a later page turn or edition switch is never overwritten. The menu's Share action builds the public web URL from the same builder (`page` plus `surah`/`ayah` when selected).

**Evidence.** `links.test.ts` (parse/builder round trips, duplicates, malformed, conflict, ayah precedence, clamping, nonstandard ranges, unknown ayah), `reader-screen.test.tsx` (link beats stored page, ayah beats contradictory page, invalid-ayah recovery, applied-once, no re-apply on edition switch, share payload) and `quran-screen.test.tsx` (forwarding and malformed-link recovery). `docs/quran-links.md` records the formats and invalid-input behavior.

**Done when:** every link shape opens the right page; invalid params degrade gracefully. — Parser, resolver, restore precedence and share are proven by tests; **cold/warm-link smoke on real iOS/Android devices and a deployed web host remains blocked** on device/hosting access (groups 12/17).

---

## Stage 6 — Audio + utilities

### [ ] P6.1 - Audio · L

Depends: P5.6

> **Implemented; device acceptance blocked.** One player, one step rule and the
> panel are covered by tests. Silent-mode, interruption, background/foreground
> and web playback smoke need devices and a deployed host (group 9.6 / group 17).

- [x] `npx expo install expo-audio`; `expo-haptics` was already installed and is reused for page turns.
- [x] `setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' })`. The installer's prose said `staysActiveInBackground`; that field does not exist in the installed `AudioMode`, so the supported `shouldPlayInBackground` is used instead. Applied once per process (`src/platform/audio`), with a retryable failure.
- [x] `useAudioPlayer(null)` + `useAudioPlayerStatus`; no `HTMLAudioElement` in active `src`. One player is created per reader and `player.replace({ uri })` changes ayah/reciter, so a closed sheet or a re-render cannot create a second player.
- [x] Auto-advance uses `stepAyah` with surah metadata, not `adjacentAyahNumbers` (which returns the previous ayah and three forward neighbours for prefetch). Stop at surah end unless wrap is enabled; wrap crosses surahs and 114:last ↔ 1:1. Completion is guarded by `armed` + `finishedFor` so repeated frames advance once and a late completion from a replaced source is ignored.
- [x] Prefetch exactly one next item (`useAudioPrefetch`); buffering and transport errors are separate states, and a failed source offers a retry that replaces the same source.
- [x] Controls: play/pause, `@expo/ui` `Slider` seek, native reciter `Picker`, auto-read `Switch`, wrap `Switch`, ±ayah skip. Previous/next are disabled at a boundary, never hidden.
- [x] Lock-screen controls out of scope for v1 - documented in `docs/quran-audio.md`.
- [x] `interruptionMode: 'doNotMix'` gives the call/other player audio focus; the app never auto-resumes after an interruption. Device behaviour remains part of the blocked smoke test.
- [x] Tests: URL/reciter boundaries (`shaykh.test.ts`), installed audio-mode fields (`audio-mode.test.ts`), step/wrap and absolute-number mapping (`audio.test.ts`), source replacement/stale completion/retry (`use-ayah-audio.test.tsx`), panel controls (`audio-sheet.test.tsx`), and reader wiring/auto-advance (`reader-screen.test.tsx`). `npm run verify` is green (83 suites / 646 tests).

**Evidence.** `docs/quran-audio.md`; i18n audit reports 227 matching keys; `app.config.ts` enables `expo-audio` playback-only (no microphone permission).

**Done when:** plays in silent mode, advances exactly once, survives interruption. - Advancement, source identity and the panel are proven by tests; **silent-mode/interruption/background and web playback on real targets remain blocked** on device/hosting access.

---

### [ ] P6.2 — Notes · M

Depends: P6.1

- [ ] `NoteUtility` → `BottomSheet` + `FlatList` + `TextInput`, keyboard-aware footer.
- [ ] `src/services/notes/` over mock now, Firestore later.
- [ ] Optimistic add + pending/error; input clears only after success.
- [ ] Notes scoped to the selected ayah; empty ≠ loading.

**Done when:** note persists across restart (mock storage); keyboard never hides the composer.

---

### [ ] P6.3 — Tafsir · M

Depends: P6.2

- [ ] Port `TafsirUtility`; fix the web bug that always resolves `{ text: '' }`.
- [ ] Content types via `@expo/ui` segmented control / `Picker`.
- [ ] Cap payload size, `selectable`, RTL/LTR per source.
- [ ] Error/empty/retry per source; cache per (ayah, type).

**Done when:** each content type returns real text; failures show retry.

---

## Stage 7 — Native module (gated)

### [ ] P7.1 — Reader profiling + decision record · S

Depends: P5.3

- [ ] Measure on the lowest supported device: page-turn JS frame, tap-to-select latency, memory over 20 pages.
- [ ] Record numbers + go/no-go here. **If the budget is met, close P7.2 as "not needed".**

---

### [ ] P7.2 — `modules/mushaf-page` (only if P7.1 says go) · XL

Depends: P7.1

- [ ] `npx create-expo-module --local modules/mushaf-page --platform apple,android`.
- [ ] `expo-module.config.json` with `apple.modules` + `android.modules`.
- [ ] Native view: image + rects, `onAyahPress`, `prefetch(pages)`; `NSCache` / `LruCache`.
- [ ] Props stay theme-agnostic.
- [ ] TS wrapper + web fallback to the JS implementation.
- [ ] Feature flag; keep the JS path for web.

**Done when:** flag-on matches flag-off behaviour and beats the JS budget.

---

## Stage 8 — Web target

### [ ] P8.1 — Web build + deploy · M

Depends: P4.x, P5.x

- [ ] `npx expo export --platform web` → `dist/`.
- [ ] Firebase Hosting (`kuttab-othman`) serves `dist/`; SPA rewrite to `index.html`; deploy script at the root.
- [ ] `EXPO_PUBLIC_*` Firebase config in the web build; Google popup works on the deployed origin.
- [ ] Fonts load on web; no FOIT.
- [ ] PWA/service worker not ported (documented).

**Done when:** preview deploy serves Home, Quran reader, and sign-in.

---

### [ ] P8.2 — Web parity sweep · M

Depends: P8.1

- [ ] Responsive web header/tabs (not a phone bottom bar on desktop).
- [ ] Reader: mouse drag + trackpad, no hover-only affordances.
- [ ] DOM `dir` + Uniwind `LayoutDirection`; no break at 1024/768/375 px.
- [ ] No native-only module at web runtime.
- [ ] `othman-web/` removed from the deploy path (stays as reference).

**Done when:** the deployed web app matches v1 scope.

---

### [ ] P8.3 — Cross-target QA pass · M

Depends: P8.2

- [ ] Device matrix: small iPhone, large iPhone, small Android, tablet, desktop web, mobile web.
- [ ] Four states on every data screen.
- [ ] 200% text, long Arabic titles, offline cold start, expired session.
- [ ] Tap targets ≥ 44 pt / 48 dp; `selectable` text; screen-reader labels.

**Done when:** matrix recorded here with pass/fail.

---

## Stage 9 — Release + CI (DEFERRED)

### [ ] P9.1 — Build + store readiness · M

Depends: P8.3

- [ ] Icons (iOS/Android/web), splash, adaptive icon, screenshots.
- [ ] `eas build --profile preview` both platforms; internal track / TestFlight.
- [ ] Versioning (`appVersionSource: remote`, `autoIncrement`).
- [ ] Privacy strings (photo library for avatar; no tracking).
- [ ] Release checklist (env, Firebase rules, Google client IDs).

**Done when:** a preview build installs and passes the smoke path.

---

### [ ] P9.2 — CI + tests · M

Depends: P9.1

- [ ] GitHub Actions: install → `verify` → `expo-doctor` → `expo export --platform web`.
- [ ] Optional: EAS build on tag.
- [ ] Unit coverage for `core`, services, reader store.
- [ ] Maestro/Detox: cold start → sign in → reader → tap ayah → audio → background/foreground.
- [ ] CI fails on core purity and i18n audit.

**Done when:** CI required on `main`.

---

### [ ] P9.3 — Documentation + wrap-up · S

Depends: P9.2

- [ ] Rewrite root `AGENTS.md` for the Expo app (commands, layering, Uniwind rules, `@expo/ui` boundary).
- [ ] Rewrite `README.md` (setup, env, dev client, web deploy).
- [ ] Record P7.1 numbers and open follow-ups.
- [ ] Final decision on `othman-web/` (keep as reference or delete in its own PR).
- [ ] Close out this file: every box true or explicitly deferred.

**Done when:** clone → `.env` → dev client → green `verify` using only the README.

---

## 3. Deferred / out of scope for v1

- Apple sign-in, Facebook sign-in.
- Admin / superadmin dashboards (hidden by the route registry).
- Firebase Analytics (native unsupported; web deferred).
- Offline download of mushaf pages / audio.
- Lock-screen media controls (needs a native module).
- PWA / service worker.
- Persisted TanStack Query cache.
- E2E on web (unit + device flows only).
