# Plan 008: Make `Page` own the column

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Update this plan's
> status row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 589da39..HEAD -- src/ui/page.tsx src/ui/list-section-header.tsx src/features/account/profile-header.tsx src/features/account/account-settings-web.tsx "src/app/(tabs)/account.tsx" "src/app/(tabs)/meetings.tsx" "src/app/(tabs)/quran.tsx" src/app/account/progress.tsx "src/app/(tabs)/_layout.web.tsx"`
> If any in-scope file changed, compare the excerpts below with live code; on a
> mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: UI / layout
- **Planned at**: commit `589da39`, 2026-11-01

## Why this matters

`Page` was introduced to own the measured column, but every screen still
overrides it:

| Screen | Current | Effective gutter |
|---|---|---|
| Home | `<Page width="wide">` | 20px |
| Quran | `<Page className="… md:px-8">` | 20px, 32px at `md` |
| Meetings | `<Page className="… px-0">` + list `p-4` | 16px |
| Account (web) | `<Page className="px-0 …">` + rows `px-4` | 16px |
| Progress | `<Page className="p-4 … lg:max-w-4xl">` | 16px, 56rem at `lg` |

So the app has three gutters and three widths. On a desktop the Progress page
is wider than every other pushed page, and the nav’s 20px gutter does not
match the 16px content on Meetings and Account. `Page` is not actually the
contract it claims to be.

This plan makes `Page` own **one gutter and two widths**, and moves the
full-bleed children onto the same constant.

## Current state

- `src/ui/page.tsx:13-31`:
  ```tsx
  const WIDTHS = { default: 'max-w-3xl', wide: 'max-w-6xl' };
  <View className={cn('mx-auto w-full px-5', WIDTHS[width], className)} />
  ```
- `src/app/(tabs)/quran.tsx:113` adds `md:px-8`.
- `src/app/(tabs)/meetings.tsx:70` adds `px-0`; the list content is `p-4`
  (`:76`).
- `src/app/(tabs)/account.tsx:125` adds `px-0`; the Section adds `px-4`
  (`:126`), `SettingsRow` adds `px-4` (`account-settings-web.tsx:53`),
  `ListSectionHeader` adds `px-4` (`list-section-header.tsx:22`), and
  `ProfileHeader` adds `p-4` (`profile-header.tsx:44`).
- `src/app/account/progress.tsx:76` adds `p-4 … lg:max-w-4xl`.
- `src/app/(tabs)/_layout.web.tsx:44-46` computes the nav gutter as
  `width < 640 ? 16 : 20`, which is the intended scale.
- `DESIGN.md:56-58` states the contract: nav and page share one gutter; Home
  is `max-w-6xl`; Quran/Account/Meetings are `max-w-3xl`; nothing stretches
  past those widths at 1440.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Focused test | `npm test -- src/ui/__tests__/page.test.tsx` | all pass |
| Full verification | `npm run verify` | all suites pass |
| Web build + export check | `npm run build:web && npm run check:web` | export + checks pass |
| Web e2e | `npm run e2e:web` | all pass |

## Scope

**In scope**:
- `src/ui/page.tsx`
- `src/ui/list-section-header.tsx`
- `src/features/account/profile-header.tsx`
- `src/features/account/account-settings-web.tsx`
- `src/app/(tabs)/account.tsx`
- `src/app/(tabs)/meetings.tsx`
- `src/app/(tabs)/quran.tsx`
- `src/app/account/progress.tsx`
- `src/app/(tabs)/_layout.web.tsx` (comment only)
- `src/ui/__tests__/page.test.tsx` (new)
- `DESIGN.md` if a sentence needs updating to match

**Out of scope**:
- About: it intentionally keeps its full-width native list shell.
- Sign-in: its `max-w-md` column is a deliberate modal measure, not a page.
- The reader: full-screen, no page column.
- Changing the two widths (`3xl`, `6xl`) themselves.
- Vertical rhythm: screens keep their own top/bottom padding.
- Focus/targets (plan 005) and copy (plan 003).

## Steps

### Step 1: Make `Page` own the gutter

In `src/ui/page.tsx`:

```tsx
/**
 * The one horizontal gutter.
 *
 * 16px on a phone, 20px from `sm` up. List surfaces that own their own row
 * padding use this constant instead of repeating `px-4`; the web navbar's
 * inline padding is the same scale (16 below 640, 20 above).
 */
export const PAGE_GUTTER = 'px-4 sm:px-5';

const WIDTHS = {
  default: 'max-w-3xl',
  wide: 'max-w-6xl',
} as const;
```

Render:

```tsx
className={cn('mx-auto w-full', PAGE_GUTTER, WIDTHS[width], className)}
```

Update the component doc: `Page` owns the column and the gutter; screens pass
only vertical rhythm. A screen must not override `px-*`; if a child list owns
full-bleed rows, the child uses `PAGE_GUTTER` and the screen drops its own
`px-0`.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Remove the Quran and Progress overrides

- `quran.tsx:113`: `className="pt-8 pb-10 md:pt-12"` (drop `md:px-8`).
- `progress.tsx:76`: `className="gap-6 py-4 pb-8"` (drop `p-4` and
  `lg:max-w-4xl`). The page width is now the shared `max-w-3xl` at every
  breakpoint.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Move Meetings and Account onto the shared gutter

**Meetings** (`src/app/(tabs)/meetings.tsx`):

- `<Page width="default" className="flex-1">` (drop `px-0`).
- FlatList `contentContainerClassName={cn(PAGE_GUTTER, 'gap-3 py-4 pb-10')}`
  (replace `p-4`).
- Import `PAGE_GUTTER` and `cn`.

The list content now aligns with the navbar and Home.

**Account web** (`src/app/(tabs)/account.tsx` and children):

- `<Page width="default" className="pb-10">` (drop `px-0`).
- Web `Section` at `:126`: drop `px-4`, keep `pt-6 pb-2`.
- `account-settings-web.tsx:53`: drop `px-4` from the row classes (the Page
  owns it).
- `profile-header.tsx:44`: use `py-4` plus `px-4` **only on native**
  (`Platform.OS === 'web' ? '' : 'px-4'`), because the native list is not
  inside `Page`.
- `list-section-header.tsx:20-25`: add an `inset?: boolean` prop (default
  `true`). Keep `px-4 pt-6 pb-2` when inset; use `pt-6 pb-2` when
  `inset={false}`. Do **not** branch on `Platform`: About renders this header
  on web inside a full-width `List` and still needs the inset. Pass
  `inset={false}` only from the Account web branch
  (`account.tsx:133`, `account-settings-web.tsx:105,125`), where `Page`
  provides the gutter.

Do not change the native list path: `RNHostView` blocks stay inside
`@expo/ui` `List`, outside `Page`.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Record the shared scale in the navbar

In `src/app/(tabs)/_layout.web.tsx:44-46`, keep the numeric gutter (Expo
Router merges `styles.tabList` after className, so the inline style must stay).
Add a comment:

```ts
// Same scale as PAGE_GUTTER in src/ui/page.tsx: 16 below 640, 20 above.
// Keep the two in sync: the nav and the page column must share one edge.
```

Do not import `PAGE_GUTTER` here; a class cannot win against the router's
inline `paddingHorizontal`.

**Verify**: `npm run typecheck` → exit 0.

### Step 5: Add a structural test for the column

Create `src/ui/__tests__/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import { Page } from '@/ui/page';

describe('Page', () => {
  it('owns the default column, gutter and measure', async () => {
    await render(<Page testID="page" />);

    const className = screen.getByTestId('page').props.className;
    expect(className).toContain('mx-auto');
    expect(className).toContain('w-full');
    expect(className).toContain('px-4');
    expect(className).toContain('sm:px-5');
    expect(className).toContain('max-w-3xl');
  });

  it('uses the wide measure only when asked', async () => {
    await render(<Page testID="wide" width="wide" />);

    expect(screen.getByTestId('wide').props.className).toContain('max-w-6xl');
  });

  it('keeps the caller vertical rhythm', async () => {
    await render(<Page testID="page" className="pt-8" />);

    expect(screen.getByTestId('page').props.className).toContain('pt-8');
  });
});
```

(Jest treats `className` as an inert prop; this asserts the contract string,
which is the established pattern in `surfaces.test.tsx` and `screen.test.tsx`.)

**Verify**: `npm test -- src/ui/__tests__/page.test.tsx` → all pass.

### Step 6: Visual check at three widths

Run the web build and check 390, 768 and 1440:

- Every page’s left/right content edge aligns with the navbar’s edge.
- No horizontal scrollbar; no row touching the viewport edge.
- Progress is no wider than Account/Meetings/Quran at 1440.
- Meetings’ pull-to-refresh and virtualisation still work (the list is still
  the only scroll container).
- Arabic RTL mirrors the gutter rather than reversing it incorrectly.

**Verify**: `npm run build:web && npm run check:web` and `npm run e2e:web` pass.

## Test plan

- New `src/ui/__tests__/page.test.tsx` asserts the gutter and both widths.
- `src/ui/__tests__/screen.test.tsx` is unchanged: `Screen` still owns only
  its own scroll padding, and pages pass `contentContainerClassName="gap-0 p-0"`.
- No visual snapshot tests.

## Done criteria

- [ ] `Page` renders `px-4 sm:px-5` and exports `PAGE_GUTTER`.
- [ ] No screen passes `px-*`/`p-*` to `Page` to override the gutter.
- [ ] Quran, Progress, Meetings and Account use one 16/20px gutter and one
      `max-w-3xl` width.
- [ ] `lg:max-w-4xl` and `md:px-8` are gone.
- [ ] Meetings and Account web rows no longer double their horizontal padding.
- [ ] The navbar comment names the shared scale.
- [ ] `npm run verify`, `npm run build:web`, `npm run check:web` and
      `npm run e2e:web` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- A native `@expo/ui` `List` path starts using `Page` padding and loses its
  platform inset.
- Removing `lg:max-w-4xl` makes the Progress heatmap unreadable at 1440
  (report the measured cell size instead of reintroducing a width escape).
- The Meetings list content no longer fills the Page column after removing
  `px-0` (report the FlatList host layout).
- The navbar and page edges cannot align without changing the router’s inline
  style; stop rather than adding a second gutter constant.

## Maintenance notes

- `Page` owns horizontal padding; screens own vertical rhythm.
- A full-bleed child imports `PAGE_GUTTER`; it never repeats a pixel value.
- Two widths only: `default` (48rem) and `wide` (72rem). A third width needs a
  design reason, not a local override.
