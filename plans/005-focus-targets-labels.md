# Plan 005: Focus visibility, 44pt targets and input labels

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Update this plan's
> status row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 589da39..HEAD -- src/ui/button.tsx src/ui/input.tsx src/ui/segmented-control.tsx src/features/settings/settings-dropdown.web.tsx src/features/account/account-settings-web.tsx src/features/home/feature-card.tsx src/features/meetings/meeting-calendar.tsx src/features/meetings/meeting-card.tsx "src/app/(tabs)/_layout.web.tsx" "src/app/(tabs)/index.tsx" src/features/account/edit-profile-form.tsx`
> If any in-scope file changed, compare the excerpts below with live code; on a
> mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S-M
- **Risk**: LOW
- **Depends on**: none
- **Category**: a11y
- **Planned at**: commit `589da39`, 2026-11-01

## Why this matters

The web build ships with no `focus-visible` style anywhere in `src/ui`. A
keyboard user can tab through the app with no visible focus. Separately, every
`size="sm"` button — error retry, empty-state action, the reader’s page turns,
sheet closes — is 36px, under the 44pt platform target; the Home sign-in link
patches only itself with `min-h-11`. And the edit-profile inputs have no
accessible names, so a screen reader announces “text field” three times.

These are the last correctness gaps before the visual follow-ups.

## Current state

- `src/ui/button.tsx:27` base has no focus classes; `:38` defines
  `sm: 'h-9 gap-1.5 px-3'`. The doc comment at 17-18 says sizes start at 36px.
- `src/ui/input.tsx:23` base has no focus classes; `:31` uses
  `focus:border-ring` only.
- `src/ui/segmented-control.tsx:61-67` renders `h-9` Pressables inside a
  container with `p-1`; the comment claims the 4pt padding “clears” 44pt.
- `src/app/(tabs)/index.tsx:81` patches the Home sign-in `Button` with
  `className="min-h-11 shrink-0"`.
- `src/features/settings/settings-dropdown.web.tsx:40-45` renders a raw
  `<select>` with no focus style; `:70-87` renders the row without one.
- `src/features/account/account-settings-web.tsx:48-56` rows have no focus
  style.
- `src/features/home/feature-card.tsx:38-43` rows have no focus style.
- `src/features/meetings/meeting-calendar.tsx:133-146` day cells and
  `:201-211` month buttons have no focus style.
- `src/features/meetings/meeting-card.tsx:84-88` details toggle has no focus
  style.
- `src/app/(tabs)/_layout.web.tsx:113-135` renders a real `<a>`; the inner View
  has no focus style.
- `src/features/account/edit-profile-form.tsx:232-297` renders three inputs
  with visible labels but no `accessibilityLabel`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Focused tests | `npm test -- src/ui/__tests__/button.test.tsx src/ui/__tests__/input.test.tsx src/features/account/__tests__/edit-account-screen.test.tsx` | all pass |
| Full verification | `npm run verify` | all suites pass |
| Web build + export check | `npm run build:web && npm run check:web` | export + checks pass |
| Web e2e | `npm run e2e:web` | all pass |

## Scope

**In scope**:
- `src/ui/focus.ts` (new)
- `src/ui/button.tsx`
- `src/ui/input.tsx`
- `src/ui/segmented-control.tsx`
- `src/features/settings/settings-dropdown.tsx` and `.web.tsx`
- `src/features/account/account-settings-web.tsx`
- `src/features/home/feature-card.tsx`
- `src/features/meetings/meeting-calendar.tsx`
- `src/features/meetings/meeting-card.tsx` (details toggle only)
- `src/app/(tabs)/_layout.web.tsx`
- `src/app/(tabs)/index.tsx`
- `src/features/account/edit-profile-form.tsx` (input labels only)
- Tests: `src/ui/__tests__/button.test.tsx` if it asserts size classes,
  `src/features/account/__tests__/edit-account-screen.test.tsx`

**Out of scope**:
- Changing the visual density of `md`/`lg` buttons.
- Replacing `Pressable` call sites that are not listed; a future pass can
  audit the reader gestures.
- Native focus (there is no keyboard focus ring on iOS/Android).
- Icon grammar (plan 004) and grid/copy (plans 003/008).
- Any new colour token; the ring uses the existing `ring` token.

## Steps

### Step 1: Add one focus-ring constant

Create `src/ui/focus.ts`:

```ts
/**
 * The web focus treatment.
 *
 * Uniwind compiles these classes to CSS on web and ignores them on native, so
 * one constant keeps every keyboard-reachable control visually identical
 * without branching on `Platform`. `ring` is a token, not a raw colour.
 */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
```

Do not add `focus:` variants: the ring must appear for keyboard focus, not on
every mouse press.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Raise the small target to 44pt

In `src/ui/button.tsx`:

- Change the `sm` size to `h-11 gap-1.5 px-3`.
- Update the base doc comment: sizes start at 44px, the platform target; `sm`
  differs from `md` in type size and padding, not height.

In `src/ui/segmented-control.tsx`:

- Change the option height from `h-9` to `h-11`.
- Change the container padding from `p-1` to `p-0.5` so the control does not
  become 52px tall.
- Replace the comment at 62-64 with: each segment is itself a 44pt target;
  the container is only 2pt of visual inset.

In `src/app/(tabs)/index.tsx`, remove the now-redundant
`className="min-h-11 shrink-0"` from the Home sign-in `Button` (keep
`shrink-0`).

Do **not** raise `layout`/cell heights: calendar days, month arrows and
segments are already 44pt after this change.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Apply the ring to shared primitives

- `Button`: compose `className={cn(button({ variant, size, className }), FOCUS_RING)}`.
  Import `cn` (the file currently does not) and `FOCUS_RING`.
- `Input`: `className={cn(input({ size, invalid }), FOCUS_RING, fontClass, className)}`.
- `SegmentedControl`: prepend `FOCUS_RING` to the option Pressable classes.
- `SettingsDropdown` native trigger: prepend `FOCUS_RING` to the Pressable
  classes (inert on native, useful when the native file is used in a browser
  test).
- `SettingsDropdown.web.tsx`: add `FOCUS_RING` to the `<select>` className and
  to the row container? The row is not interactive; only the select needs it.
  The select is a raw DOM element, so the class applies directly.
- `AccountSettingsWeb` row: prepend `FOCUS_RING`.
- `FeatureCard` Pressable: prepend `FOCUS_RING` inside `cn`.
- `MeetingCalendar` day cell and `MonthButton`: prepend `FOCUS_RING`.
- `MeetingCard` details Pressable: prepend `FOCUS_RING`.
- Web `TabLink`: add `className: FOCUS_RING` to the anchor props object (raw
  DOM; the utility is emitted globally because the constant lives in `src`).

`focus-visible:ring-offset-2` needs a background to offset against; every
listed surface is on `bg-background` or `bg-card`, both present.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Label the edit-profile inputs

In `src/features/account/edit-profile-form.tsx`, add `accessibilityLabel` to
each input, using the same visible label key:

```tsx
// name
accessibilityLabel={t('account.edit.displayName')}
// email
accessibilityLabel={t('account.edit.email')}
// phone
accessibilityLabel={t('account.edit.phone')}
```

Keep the visible `<Text variant="label">` elements; the label is for assistive
technology, not a replacement for the visible one. Do not add
`placeholder`-only naming.

**Verify**: `npm test -- src/features/account/__tests__/edit-account-screen.test.tsx`
→ all pass.

### Step 5: Verify on web and in the export

Run `npm run build:web && npm run check:web`, then `npm run e2e:web`.

Manual keyboard check (the plan’s only visual gate):

1. Open the exported site.
2. Press Tab from the top: the wordmark/tab row, each tab, the navbar
   selectors, Home stations, the hero CTA, the reader footer controls.
3. Every stop must show a 2px ring with a 2px offset against the page.
4. Nothing must show a ring after a mouse click.

**Verify**: the export checks and e2e pass; the keyboard check is recorded in
the PR evidence.

## Test plan

- `src/ui/__tests__/button.test.tsx`: if it currently asserts the `h-9` class,
  update it to the new `h-11`; otherwise leave it.
- `src/ui/__tests__/input.test.tsx`: no change expected; the ring is a class,
  and Jest does not compute styles.
- `edit-account-screen.test.tsx`: add assertions that the three inputs expose
  `accessibilityLabel` values `Display name`, `Email`, `Phone`.
- No snapshot tests.

## Done criteria

- [ ] `FOCUS_RING` is applied to Button, Input, SegmentedControl, both settings
      dropdowns, Account web rows, Home stations, calendar controls, the
      meeting details toggle and the web tab anchors.
- [ ] `sm` buttons are 44px; segments are 44px; Home no longer patches its own
      height.
- [ ] Edit-profile inputs have accessible names.
- [ ] `npm run verify`, `npm run build:web`, `npm run check:web` and
      `npm run e2e:web` exit 0.
- [ ] Keyboard check shows a ring on every primary control and no ring after a
      mouse click.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- `focus-visible:*` classes are not emitted into the web export (check the
  built CSS). Report the missing utilities instead of switching to `focus:`.
- The ring is clipped by an `overflow-hidden` ancestor (the Home hero’s
  rounded field is the likely candidate). Report the affected control; do not
  remove the hero’s clipping.
- Raising `sm` to 44px changes a layout that depends on the old 36px height
  (e.g. a fixed header). Report the screen instead of shrinking the target
  back.

## Maintenance notes

- Every new keyboard-reachable control composes `FOCUS_RING`; do not invent a
  second ring style.
- 44pt is a floor for the control’s interactive box, not for its visible
  paint.
- A visible label and an `accessibilityLabel` are both required on form fields;
  one does not replace the other.
