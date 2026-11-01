# UI primitives — review and slice plan

Status: proposed
Date: 2026-11-01
Branch: `ui/title`
Owner: repository maintainer
Scope: `src/ui` first; feature consumers second; reader mechanics excluded.

## Problem

The primitive layer is used and tested, but it carries app-level settings code,
unused components, and two duplicated sources of truth. The repetition that
actually costs lines (`flex-row`, `items-center`, page containers) lives in
feature screens, so cleaning `src/ui` alone tops out around 200 production
lines. This plan therefore separates the foundation from the screen adoption.

## Decisions

- Slice 1 cleans `src/ui` only. Slice 2 adds `Page` and `Section` and adopts
  them in the six non-reader screens.
- Existing screens keep their visual output; this is a code-only refactor.
- Dead code is deleted, including its tests.
- `IconName` is derived from the glyph table instead of a manual union.
- The state/settings layer gets a written assessment, not code, in this branch.
- No `Row`/`Stack` abstraction: `flex-row items-center` is already compact, and
  a wrapper would hide layout without a meaningful saving.

## Findings

### P1 — dead app code in the primitive layer

| Item | Lines | Evidence |
| --- | ---: | --- |
| `src/ui/theme-toggle.tsx` | 39 | No render site; only `theme-provider.test.tsx`. |
| `src/ui/language-toggle.tsx` | 47 | No render site; only its own test. |
| `src/ui/blur.tsx` | 14 | Only `media.test.tsx`. |
| `CardHeader` / `CardTitle` / `CardContent` / `CardFooter` / `CardDescription` | ~30 | Only `Card` is consumed by meetings and progress; the subcomponents appear only in tests. |
| `TONE_DOT_CLASSES` | 5 | Exported, never imported. |

`ThemeToggle` and `LanguageToggle` are settings features that depend on
`@/providers` and `@/i18n`; they do not belong in `src/ui` even when a settings
surface exists.

### P1 — duplicated icon names

`IconName` in `src/core/config/types.ts` is a 39-line manual union; `ICONS` in
`src/ui/icon.tsx` repeats every key. `satisfies` already enforces exhaustiveness,
so the union can be derived once the glyph data has a single owner.

### P2 — raw palette island

`src/ui/tone.ts` is the only place using Tailwind's `emerald-*` / `sky-*`
classes instead of the OKLCH roles in `global.css`. Converting it is a visual
change, so it stays out of this slice; record it for a later visual pass.

### P2 — boundary and API drift

- `states.tsx` repeats the centered shell three times.
- `Button` takes `label` or `children`; `Badge` takes `label` or string
  children. Two spellings of the same contract.
- `Input` passes `aria-invalid` through an untyped spread.
- `Screen` / `ScreenView` split is justified by their different props; keep it.

### What stays

`Card`, `Progress`, `Separator`, `Skeleton`, `Pressable`, `NativeSheetContent`,
`ListSectionHeader`, `Image`, `BlurView`'s `withUniwind` pattern (once the dead
component goes), `Screen`/`ScreenView`, `Text`, `Button`, `Input`, `Badge`,
`Avatar`, `SegmentedControl`, `states`.

## Slice 1 — primitives cleanup

Goal: remove dead code, remove the duplicated icon-name source, fold the
single-consumer tone file into `Badge`, and de-duplicate the state shell. No
visual change.

1. Delete `theme-toggle.tsx`, `language-toggle.tsx`, `blur.tsx` and their tests
   (`language-toggle.test.tsx`; the ThemeToggle block in
   `theme-provider.test.tsx`; the BlurView block in `media.test.tsx`).
2. Reduce `card.tsx` to the `Card` surface; remove its five unused
   subcomponents and update `surfaces.test.tsx`.
3. Delete `TONE_DOT_CLASSES`; move `TONE_SURFACE_CLASSES` / `TONE_TEXT_CLASSES`
   into `badge.tsx`, their only consumer, and delete `tone.ts`.
4. Extract a private `StateShell` in `states.tsx` for the shared centered
   layout; keep `Loading`, `ErrorState`, `EmptyState` APIs unchanged.
5. Move the icon-name list to a pure data module with one owner, derive
   `IconName`, and make `ui/icon.tsx` consume it. Verify `check:core` and the
   `satisfies IconRegistry` exhaustiveness still hold.
6. Replace the `aria-invalid` spread in `input.tsx` with a typed prop.
7. Update tests and run the full verification pass.

Expected: ~200 production lines and ~100–150 test lines removed; one fewer
source of truth for icon names. The target is deletion and clarity, not a
line-count quota.

## Slice 2 — `Page` and `Section`

Goal: replace the hand-rolled page containers and heading blocks in the six
non-reader screens.

- `Page`: `mx-auto w-full max-w-*`, horizontal gutters, vertical rhythm,
  optional scroll. One component instead of the current `max-w-6xl` vs
  `max-w-3xl` variants repeated per screen.
- `Section`: the heading + optional overline + optional description block used
  by Quran, Meetings, Account, About and Progress.
- Adopt in Home, Quran, Meetings, Account, About, Progress.
- Exclude the reader modal, sign-in, and account/edit: specialised layouts,
  recently rebuilt, and higher risk.
- Verify screenshot parity at 390 and 1440 in light and dark before claiming
  the slice complete.

## Read-only state assessment

- **One Zustand store** (`reader-store`): correct for transient reader state
  (page, selection, turn direction, edition). Vanilla store + selector hooks is
  the right pattern; keep it.
- **React Query** owns server data; `toAsyncResult` keeps empty and loading
  distinct. Do not move server data into Zustand.
- **Theme and language** duplicate the same hydrate → validate → persist →
  `ready` pattern in ~285 lines across two providers, and `BootProvider` waits
  on both flags. If a settings surface is built, unify them into one
  `preferences` store with one `ready` flag and one persisted object.
- **No settings surface exists.** The two toggles were the only controls and
  are dead; settings would be a new feature under `src/features/settings`, not a
  primitive.
- **Recommendation:** keep the current split (server / session / preferences),
  add Zustand only where transient client state needs it, and do not create a
  global app store.

## Non-goals

- Reader mechanics: page turn, bbox geometry, audio, tafsir data.
- Feature component rewrites beyond adopting `Page`/`Section`.
- Store or settings implementation.
- Visual restyling, including `tone.ts` token migration.

## Verification

- `npm run verify` (typecheck, core purity, i18n audit, lint, format, tests).
- `npm run build:web` and `npm run check:web`.
- `npm run e2e:web`.
- `impeccable detect` on changed paths.
- Screenshot parity at 390/1440, light/dark, for slice 2.
