# Plan 002: One page header and one correct h1 per page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Update this plan's
> status row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 589da39..HEAD -- src/ui/section.tsx src/ui/states.tsx src/app/about.tsx src/app/account/progress.tsx src/features/account/edit-profile-form.tsx src/app/auth/sign-in.tsx`
> If any in-scope file changed, compare the excerpts below with live code; on a
> mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW-MED
- **Depends on**: 001 (the shared `Icon` API)
- **Category**: a11y / UI
- **Planned at**: commit `589da39`, 2026-11-01

## Why this matters

Three pushed screens build their own header, and each one drifted:

- About and Progress render a text “Back” button next to a `subtitle` title
  with no heading role at all.
- Edit profile renders a centred `subtitle` title with no heading role.
- The error routes (fixed in plan 006) render an `ErrorState` whose title is
  never a heading.

A screen reader therefore cannot navigate any of those pages by heading, and
the visible page title changes size between pages. This plan introduces one
header primitive, one heading-semantics helper, and uses them so every page has
exactly one level-1 heading.

## Current state

- `src/ui/section.tsx:34-47` sets `aria-level` only when `level === 2`, and
  `role="heading"` only when `level === 2`. Level 1 relies on
  `accessibilityRole="header"` alone.
- `src/app/about.tsx:53-64` hand-builds:
  ```tsx
  <View className="flex-row items-center gap-2 border-b border-border px-2 py-2">
    <Button variant="ghost" accessibilityLabel={t('action.back')} ...>
      <Icon name={backIcon} />
      <Text variant="label">{t('action.back')}</Text>
    </Button>
    <Text variant="subtitle">{title}</Text>
  </View>
  ```
  `backIcon` is computed at `about.tsx:42`.
- `src/app/account/progress.tsx:103-114` repeats the same block; `backIcon`
  at line 48.
- `src/features/account/edit-profile-form.tsx:183-198` renders `Cancel` on the
  start, a centred `subtitle` title, and an empty spacer, with no heading role.
- `src/ui/states.tsx:64-104` renders `ErrorState` with a `subtitle` title and
  no heading semantics; `EmptyState` at 114-138 does the same. `ErrorState`
  has no action slot other than `onRetry`; the error routes in plan 006 need
  one.
- `src/app/auth/sign-in.tsx:268-273` already renders the page title with
  `accessibilityRole="header"`. It keeps its own header row (wordmark + close)
  because it is a modal, not a pushed page; do not change it in this plan.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Focused tests | `npm test -- src/ui/__tests__/page-header.test.tsx src/ui/__tests__/states.test.tsx` | all pass |
| Full verification | `npm run verify` | all suites pass |
| Web build | `npm run build:web` | `Exported: dist` |

## Scope

**In scope**:
- `src/ui/heading.ts` (new)
- `src/ui/page-header.tsx` (new)
- `src/ui/section.tsx`
- `src/ui/states.tsx`
- `src/app/about.tsx`
- `src/app/account/progress.tsx`
- `src/features/account/edit-profile-form.tsx`
- Tests: `src/ui/__tests__/page-header.test.tsx` (new),
  `src/ui/__tests__/states.test.tsx`,
  `src/features/about/__tests__/about-screen.test.tsx`,
  `src/features/progress/__tests__/progress-screen.test.tsx`,
  `src/features/account/__tests__/edit-account-screen.test.tsx`

**Out of scope**:
- `src/app/+not-found.tsx`, `src/app/error/[code].tsx` (plan 006 adopts the
  error action slot).
- `src/features/quran/components/reader-header.tsx`: it owns four controls and
  is not a page header.
- `src/app/auth/sign-in.tsx`.
- Copy changes (plan 003).
- Dismissal icon shapes (plan 004); this plan keeps the chevron back control.

## Steps

### Step 1: Add shared heading semantics

Create `src/ui/heading.ts`:

```ts
/**
 * Heading semantics for the `role`/`aria-level` pair.
 *
 * React Native maps `role="heading"` on web, but RNW does not infer a level;
 * `aria-level` has to travel as a cast prop because RN's types do not declare
 * it yet. One helper keeps every page title, section title and state title
 * using the same pair.
 */
export type HeadingLevel = 1 | 2;

export const HEADING_ROLE = {
  accessibilityRole: 'header',
  role: 'heading',
} as const;

export function headingAriaLevel(level: HeadingLevel) {
  return { 'aria-level': level } as Record<string, unknown>;
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Make `Section` correct at both levels

In `src/ui/section.tsx`:

- Import `HeadingLevel`, `HEADING_ROLE`, `headingAriaLevel`.
- Remove the local `ariaLevel` conditional.
- Render the title with `{...HEADING_ROLE}` and `{...headingAriaLevel(level)}`
  for **both** levels. `titleVariant` still defaults to `title`, and `level`
  still defaults to `1`.
- Keep the existing `titleTestID` and description behaviour.
- Change the prop type to `level?: HeadingLevel` (the union is 1 | 2).

Existing call sites do not change: Home passes `level={2}`, Account/Meetings/
Quran use the default, Progress uses `level` only through its grid `Section`
(default 1? — see caution below).

**Caution**: `src/app/account/progress.tsx:80-85` renders the grid title with
`titleVariant="label"` and no `level`, so it is currently an h1. Pass
`level={2}` there; the page header is the h1.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Add `PageHeader`

Create `src/ui/page-header.tsx`:

```tsx
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useDirection } from '@/i18n';
import { Button } from './button';
import { HEADING_ROLE, headingAriaLevel } from './heading';
import { Icon } from './icon';
import { Text } from './text';

export type PageHeaderProps = {
  /** The page's single level-1 heading. */
  title: string;
  /** Pushed page: renders a labelled chevron back control. */
  onBack?: () => void;
  /** Replaces the back control (e.g. a text Cancel on a form sheet). */
  start?: ReactNode;
  /** Trailing control, e.g. a Save action. */
  end?: ReactNode;
  testID?: string;
  backTestID?: string;
};
```

Rules:

- The row is `flex-row items-center gap-2 border-b border-border px-2 py-2`.
- When `start` is absent and `onBack` is present, render a `Button`
  `variant="ghost" size="icon"` whose `accessibilityLabel` is
  `t('action.back')`, `testID` is `backTestID`, and child is
  `<Icon name={isRTL ? 'chevron-right' : 'chevron-left'} size={20} />`.
  This mirrors the reader header and removes the duplicated “Back” word.
- When `start` is present, render it instead of the back button.
- The title is `<Text variant="title" numberOfLines={1} className="flex-1"
  {...HEADING_ROLE} {...headingAriaLevel(1)}>{title}</Text>`.
- `end` is rendered after the title.
- The component uses `useTranslation` only for the default back label and
  `useDirection` only for the chevron.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Adopt the header on About and Progress

**About** (`src/app/about.tsx`):

- Delete the `backIcon` local and the hand-built header block (53-64).
- Render `<PageHeader title={title} onBack={() => router.back()}
  backTestID="about-back" />` in the same position.
- Keep `chevron` for the list rows.
- Imports: add `PageHeader`, remove `Button` only if no other use remains (the
  file has none after this change — check).

**Progress** (`src/app/account/progress.tsx`):

- Delete the `backIcon` local and the header block (103-114).
- Render `<PageHeader title={title} onBack={() => router.back()}
  backTestID="progress-back" />`.
- The empty state still repeats the page title; plan 003 owns that copy change.
  Do not alter it here.
- Keep `title` for the document `<title>` and the header.
- Imports: add `PageHeader`; remove `Button` and `Icon` if no other use remains.

**Verify**: `npm run typecheck` → exit 0.

### Step 5: Adopt the header on Edit profile

In `src/features/account/edit-profile-form.tsx`, replace the hand-built header
(183-198) with:

```tsx
<PageHeader
  title={t('account.edit.title')}
  start={
    <Button
      variant="ghost"
      label={t('action.cancel')}
      onPress={onCancel}
      disabled={update.isPending}
      testID="account-edit-cancel"
    />
  }
/>
```

The form sheet keeps a text Cancel because it discards a draft; that is the
documented “form dismissal” shape in plan 004. Remove the spacer comment and
the now-unused `View` wrapper only where it is not the header container.
`PageHeader` already renders the border and row.

**Verify**: `npm run typecheck` → exit 0.

### Step 6: Give the state primitives a heading level and an action

In `src/ui/states.tsx`:

- Import `HEADING_ROLE`, `headingAriaLevel`, `type HeadingLevel`.
- `ErrorStateProps` gains:
  ```ts
  /** 1 when the state is the whole page, 2 when it sits under a page header. */
  headingLevel?: HeadingLevel;
  /** Primary action, e.g. “Back to home”. Rendered after the retry. */
  actionLabel?: string;
  onAction?: () => void;
  ```
- `EmptyStateProps` gains `headingLevel?: HeadingLevel` for symmetry.
- Both default `headingLevel` to `2`.
- Replace the title `Text` in both with:
  ```tsx
  <Text
    variant="subtitle"
    className="text-center"
    {...HEADING_ROLE}
    {...headingAriaLevel(headingLevel)}
  >
    {title}
  </Text>
  ```
- `ErrorState` renders, after the retry block:
  ```tsx
  {actionLabel && onAction ? (
    <Button label={actionLabel} onPress={onAction} />
  ) : null}
  ```
  Keep the retry button `variant="outline" size="sm"` unchanged.
- Update the component doc comment to say that an inline error is level 2 and a
  full-page error passes `headingLevel={1}`.

**Verify**: `npm run typecheck` → exit 0.

## Test plan

Add `src/ui/__tests__/page-header.test.tsx`:

1. Renders the title as the page's header and as `aria-level` 1.
2. The back control uses the translated `Back` label and calls `onBack`.
3. `start` replaces the back control (no `Back` label in the tree).
4. `end` is rendered after the title.

Update `src/ui/__tests__/states.test.tsx`:

- Default `ErrorState`/`EmptyState` titles carry `aria-level` 2.
- `headingLevel={1}` carries `aria-level` 1.
- `actionLabel`/`onAction` renders one primary button and fires it.
- Existing retry tests stay unchanged.

Update page tests:

- `about-screen.test.tsx`: assert `screen.getByRole('header')` has text
  `About`; keep the `about-back` press.
- `progress-screen.test.tsx`: assert the header is present in the empty state
  and that “Progress” is the only header text.
- `edit-account-screen.test.tsx`: assert `screen.getByRole('header')` has text
  `Edit profile`.

**Verify**: `npm test -- src/ui/__tests__/page-header.test.tsx
src/ui/__tests__/states.test.tsx` → all pass.

## Done criteria

- [ ] `src/ui/heading.ts` and `src/ui/page-header.tsx` exist.
- [ ] About, Progress and Edit profile use `PageHeader`; no hand-built page
      header remains.
- [ ] Each of those three pages exposes exactly one `accessibilityRole="header"`
      title at level 1.
- [ ] `Section` sets heading semantics for both levels.
- [ ] `ErrorState` and `EmptyState` accept `headingLevel`; `ErrorState` accepts
      `actionLabel`/`onAction`.
- [ ] `npm run verify` and `npm run build:web` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- `PageHeader` cannot render the title as a header under Jest (report the
  actual node shape instead of weakening the assertion).
- A page already has another heading at level 1 that this plan would duplicate
  (report the page and both nodes).
- Changing `Section` breaks a test that asserts `role` is absent at level 1.
- The edit sheet's native header/grabber already renders a title; if the OS
  adds a second visible title, stop and report rather than hiding the app's
  own heading.

## Maintenance notes

- New pushed pages use `PageHeader` with `onBack`; new form sheets use it with
  `start`.
- A page's header is its only level-1 heading. Group titles use
  `Section level={2}`; inline states keep the default level 2.
- `headingAriaLevel` is a cast because RN's types do not declare `aria-level`;
  keep that cast in one file rather than at every call site.
