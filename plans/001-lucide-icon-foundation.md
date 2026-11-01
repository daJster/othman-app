# Plan 001: Introduce the Lucide icon foundation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Update this plan's
> status row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 589da39..HEAD -- package.json package-lock.json src/ui/icon.tsx src/core/config/types.ts src/ui/__tests__/icon.test.tsx jest.config.js`
> If any in-scope file changed, compare the excerpts below with live code; on a
> mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: migration
- **Planned at**: commit `589da39`, 2026-11-01

## Why this matters

`lucide-react-native@1.66.0` is installed, but the UI still renders icon-font
glyphs through `expo-symbols` and `@expo/vector-icons`. Lucide gives one stroked
icon set on web, iOS and Android, which is what the icon-led modernization
needs. The logical `IconName` API is already used at ~38 call sites, so replacing
the internals keeps every page unchanged while making the icon language
consistent. This plan also declares `react-native-svg` (currently only a
floating peer in `node_modules`) so a clean install cannot drop it.

## Current state

- `package.json:35` has `"lucide-react-native": "^1.66.0"`; `react-native-svg`
  is **not** in dependencies, although `node_modules/react-native-svg` is
  `15.16.0` (Expo SDK 58 pins that version).
- `src/ui/icon.tsx` maps each logical name to three strings (`ios`, `md`,
  `mdSymbol`) and `Icon` branches on `Platform.OS` at lines 162-186. It imports
  `SymbolView` from `expo-symbols` and `MaterialIcons` from
  `@expo/vector-icons`, and wraps both in `withUniwind`.
- `src/core/config/types.ts` exports `ICON_NAMES` and
  `IconName = (typeof ICON_NAMES)[number]`, then `IconRegistry` maps every name.
- `src/app/(tabs)/_layout.tsx:36-40` uses `getIconGlyph(tab.icon)` and reads
  only `glyph.ios` and `glyph.mdSymbol` for `NativeTabs`. The tab bar cannot
  host React components, so those platform glyph names must survive.
- `src/ui/__tests__/icon.test.tsx` asserts the old host types
  (`ViewManagerAdapter_SymbolModule`, `Text`) and a hand-copied list of 12 names.
- `jest.config.js` whitelists `uniwind` in `transformIgnorePatterns` but not
  `react-native-svg` or `lucide-react-native`.
- Lucide v1 renamed three registry names: `home` → `House`,
  `check-circle` → `CircleCheck`, `alert-circle` → `CircleAlert`;
  `logout` → `LogOut`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Declare SVG | `npx expo install react-native-svg` | exit 0; `package.json` records `15.16.0` |
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npm test -- src/ui/__tests__/icon.test.tsx` | all pass |
| Full verification | `npm run verify` | 95 suites / 734 tests pass |
| Web build | `npm run build:web` | `Exported: dist` |
| Android bundle | `npm run build:android` | `Exported: dist-android` |
| iOS bundle | `npm run build:ios` | `Exported: dist-ios` |

## Scope

**In scope**:
- `package.json`, `package-lock.json`
- `src/ui/icon.tsx`
- `src/core/config/types.ts`
- `src/ui/__tests__/icon.test.tsx`
- `jest.config.js`

**Out of scope**:
- Any call site of `<Icon>`; the `name`, `size`, `tone` API must not change.
- `src/app/(tabs)/_layout.tsx`; only read it to confirm which glyph fields
  `getIconGlyph` must keep.
- Adding `palette`, `languages`, `camera` or other new names; plan 004 owns the
  new icon adoption. Keep `camera` in the registry (it is used by plan 004).
- Removing `@expo/vector-icons` from `package.json`; leave the dependency in
  place for this plan (it may be used transitively).

## Steps

### Step 1: Declare the SVG peer

Run `npx expo install react-native-svg`.

**Verify**: `node -e "console.log(require('./package.json').dependencies['react-native-svg'])"`
prints a version starting with `15.16`.

### Step 2: Replace the registry internals with Lucide

Rewrite `src/ui/icon.tsx`:

- Import Lucide icons by **subpath**, one per line, e.g.
  `import House from 'lucide-react-native/icons/house';`. Do not import from
  the root `lucide-react-native` barrel: it pulls 2,015 icon modules into the
  Metro graph.
- Build `ICON_COMPONENTS` as an explicit table keyed by every `IconName` and
  `satisfies Readonly<Record<IconName, LucideIcon>>`. Use this mapping:

  | Logical name | Import |
  |---|---|
  | `book-open` | `BookOpen` |
  | `chart-line` | `ChartLine` |
  | `check-circle` | `CircleCheck` |
  | `external-link` | `ExternalLink` |
  | `file-text` | `FileText` |
  | `video` | `Video` |
  | `home` | `House` |
  | `user` | `User` |
  | `alert-circle` | `CircleAlert` |
  | `inbox` | `Inbox` |
  | `calendar` | `Calendar` |
  | `chevron-down` | `ChevronDown` |
  | `chevron-left` | `ChevronLeft` |
  | `chevron-right` | `ChevronRight` |
  | `chevron-up` | `ChevronUp` |
  | `clock` | `Clock` |
  | `map-pin` | `MapPin` |
  | `users` | `Users` |
  | `camera` | `Camera` |
  | `info` | `Info` |
  | `logout` | `LogOut` |
  | `menu` | `Menu` |
  | `search` | `Search` |
  | `layers` | `Layers` |
  | `pencil` | `Pencil` |
  | `volume` | `Volume2` |
  | `play` | `Play` |
  | `pause` | `Pause` |
  | `close` | `X` |
  | `eye` | `Eye` |
  | `eye-off` | `EyeOff` |

- Delete `cog`, `megaphone`, `trash`, `university` from `ICON_NAMES` in
  `src/core/config/types.ts`; they have no call site. Keep `camera`.
- Replace `IconSet`/`getIconGlyph` with a **tab-only** table:
  ```ts
  type TabGlyph = { ios: SFSymbol; mdSymbol: AndroidSymbol };
  const TAB_GLYPHS = {
    home: { ios: 'house', mdSymbol: 'home' },
    'book-open': { ios: 'book', mdSymbol: 'menu_book' },
    video: { ios: 'video', mdSymbol: 'videocam' },
    user: { ios: 'person', mdSymbol: 'person' },
  } satisfies Partial<Record<IconName, TabGlyph>>;
  ```
  `getIconGlyph(name)` returns `TAB_GLYPHS[name]` and must keep the same
  return fields `ios`/`mdSymbol` used by the native tab layout. If the native
  layout needs a name not in this table, STOP and report.
- `Icon` resolves the tone with `useResolveClassNames`:
  ```ts
  const TONE_CLASS = {
    foreground: 'text-foreground',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
    destructive: 'text-destructive',
  } as const;
  const { color } = useResolveClassNames(TONE_CLASS[tone]);
  ```
  Render the Lucide component with `color={color}`, `size={size}`,
  `strokeWidth={1.8}`, `accessible={false}`,
  `importantForAccessibility="no-hide-descendants"`, and
  `{...({ 'aria-hidden': true } as Record<string, unknown>)}`.
- Keep `IconProps` and `IconTone` exactly as they are.
- Remove the `Platform`, `withUniwind`, `SymbolView`, `MaterialIcons` imports.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Update the icon test

Rewrite `src/ui/__tests__/icon.test.tsx`:

- Remove the platform host-type assertions.
- Render `<Icon name="home" size={24} tone="destructive" />` and assert the
  rendered `Svg` has `width`/`height` 24 and the destructive colour class was
  resolved (if Uniwind returns an empty value under Jest, assert the icon
  rendered non-null and the `color` prop is a string; do not pin a hex).
- Iterate `ICON_NAMES` and render each name; assert each renders a non-empty
  tree. This replaces the hand-copied 12-name list.
- Add `react-native-svg` and `lucide-react-native` to the
  `transformIgnorePatterns` allowlist in `jest.config.js`, next to `uniwind`.
- If Jest still fails to parse `react-native-svg` after the allowlist, add a
  focused `jest.mock('react-native-svg', ...)` at the top of this test that
  renders a host `View`; do not mock it globally.

**Verify**: `npm test -- src/ui/__tests__/icon.test.tsx` → all pass.

### Step 4: Full verification

Run `npm run verify`, then `npm run build:web`, `npm run build:android`,
`npm run build:ios`.

**Verify**: every command exits 0; the web export prints `Exported: dist`.

## Test plan

- New/updated: `src/ui/__tests__/icon.test.tsx` (structure, every `ICON_NAMES`
  entry, tone, size).
- Existing suites must stay green: `npm run verify` (95 suites / 734 tests).
- A visual smoke check is done in plan 004 after icons are adopted.

## Done criteria

- [ ] `package.json` declares `react-native-svg` at the Expo pin.
- [ ] `src/ui/icon.tsx` imports Lucide by subpath and has no
      `Platform`, `SymbolView`, `MaterialIcons`, or `withUniwind` reference.
- [ ] `getIconGlyph` still returns `ios`/`mdSymbol` for the four tab icons.
- [ ] `ICON_NAMES` no longer contains `cog`, `megaphone`, `trash`, `university`.
- [ ] `npm run verify`, `npm run build:web`, `npm run build:android`,
      `npm run build:ios` all exit 0.
- [ ] No files outside the scope list are modified (`git status`).
- [ ] `plans/README.md` status row updated.

## STOP conditions

- `npx expo install react-native-svg` resolves a version other than `15.16.x`.
- A Lucide subpath named above does not resolve (the package version differs).
- `NativeTabs` needs a glyph outside the four tab names.
- The icon test cannot render `react-native-svg` after the allowlist and the
  focused mock; report the error instead of widening the scope.

## Maintenance notes

- Adding an icon now requires three edits: `ICON_NAMES`, `ICON_COMPONENTS`, and
  the icon test loop. The `satisfies` map makes a missing entry a compile error.
- The native tab bar still uses SF Symbols / Material Symbols through
  `TAB_GLYPHS`; do not replace those with Lucide components.
- iOS content icons lose the system SF Symbol look; review the visual pass in
  plan 004 before shipping.
