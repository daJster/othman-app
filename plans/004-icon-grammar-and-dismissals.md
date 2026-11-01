# Plan 004: One icon grammar and two dismissal shapes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Update this plan's
> status row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 589da39..HEAD -- src/ui/icon.tsx src/core/config/types.ts src/features/settings src/app/about.tsx src/features/account/edit-profile-form.tsx src/features/meetings/meeting-card.tsx src/features/quran/components/reader-header.tsx src/features/quran/components/edition-picker-sheet.tsx src/features/quran/components/surah-picker-sheet.tsx src/features/quran/components/audio-sheet.tsx src/features/quran/components/ayah-panel-sheet.tsx src/features/quran/components/reader-menu-sheet.tsx src/features/progress/surah-detail-sheet.tsx`
> If any in-scope file changed, compare the excerpts below with live code; on a
> mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 001 (Lucide registry), 002 (`PageHeader` for pushed pages)
- **Category**: UI/UX
- **Planned at**: commit `589da39`, 2026-11-01

## Why this matters

Icons are the app’s fastest language, but today some rows have a leading icon
and some do not, one row shows the same glyph twice, three primary actions are
text-only, and dismissal is expressed in five different ways. The result reads
as assembled rather than designed.

This plan fixes the grammar, not the art:

- **Every settings row has a leading icon.**
- **One row has at most one cue for the same idea** (an external link gets a
  globe, not two link glyphs).
- **Primary actions carry an icon plus their word** (Join, Change photo).
- **Dismissal has exactly four shapes, one per context:**

| Context | Shape | Label |
|---|---|---|
| Pushed page | chevron icon button | `action.back` |
| Full-screen modal (reader) | X icon button | `reader.exit` |
| Sheet / menu | X icon button | `action.close` |
| Form with unsaved draft | text Cancel | `action.cancel` |

## Current state

- `src/features/settings/theme-dropdown.tsx` and `language-dropdown.tsx` render
  rows with no leading icon; `settings-dropdown.tsx:63-73` and
  `settings-dropdown.web.tsx:70-87` have no icon slot.
- `src/app/about.tsx:113-121` renders `external-link` as both `leading` and
  `trailing`.
- `src/features/account/edit-profile-form.tsx:212-219` renders a text-only
  “Change photo”.
- `src/features/meetings/meeting-card.tsx:121-125` renders a text-only “Join”.
- Sheet headers repeat the same hand-built row:
  `edition-picker-sheet.tsx:58-64`, `surah-picker-sheet.tsx:74-82`,
  `audio-sheet.tsx:88-96`, `ayah-panel-sheet.tsx:96-104`,
  `reader-menu-sheet.tsx:84-92`. `surah-detail-sheet.tsx:51-61` puts a badge in
  the row and a second full-width “Close” button at 89-93.
- `src/features/quran/components/reader-header.tsx:74-82` exits a full-screen
  modal with a chevron.
- `src/app/auth/sign-in.tsx:256-265` already dismisses with an X icon.
- `src/ui/icon.tsx` (after plan 001) has no `palette`, `languages`, `globe` or
  `primary-foreground` tone.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Focused tests | `npm test -- src/ui/__tests__/sheet-header.test.tsx src/features/quran/__tests__/reader-sheets.test.tsx` | all pass |
| Full verification | `npm run verify` | all suites pass |
| Web build | `npm run build:web` | `Exported: dist` |
| Native bundles | `npm run build:android` / `npm run build:ios` | exports succeed |

## Scope

**In scope**:
- `src/core/config/types.ts` (`ICON_NAMES`)
- `src/ui/icon.tsx` (icon components + one tone)
- `src/ui/sheet-header.tsx` (new)
- `src/features/settings/settings-dropdown.types.ts`,
  `settings-dropdown.tsx`, `settings-dropdown.web.tsx`,
  `theme-dropdown.tsx`, `language-dropdown.tsx`
- `src/app/about.tsx`
- `src/features/account/edit-profile-form.tsx` (photo button only)
- `src/features/meetings/meeting-card.tsx` (Join only)
- `src/features/quran/components/reader-header.tsx` (exit shape only)
- The six sheet files listed above
- Tests: `src/ui/__tests__/sheet-header.test.tsx` (new),
  `src/features/quran/__tests__/reader-sheets.test.tsx`

**Out of scope**:
- Any new icon beyond `palette`, `languages`, `globe` and the existing `camera`,
  `video`, `close`.
- Replacing the native tab glyphs (`getIconGlyph`) — they must stay SF/Material
  Symbol names.
- Changing a sheet’s title copy, rows, or which actions exist.
- Moving Account’s native rows to RN (that is not this plan).
- Focus rings and tap-target sizes (plan 005).

## Steps

### Step 1: Add the four registry entries

In `src/core/config/types.ts`, add to `ICON_NAMES`:

```ts
'palette',
'languages',
'globe',
```

In `src/ui/icon.tsx`, add subpath imports and table entries:

| Logical name | Import |
|---|---|
| `palette` | `Palette` |
| `languages` | `Languages` |
| `globe` | `Globe` |

Add a tone:

```ts
const TONE_CLASS = {
  foreground: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  'primary-foreground': 'text-primary-foreground',
  destructive: 'text-destructive',
} as const;
```

`IconTone` derives from the map, so no separate union edit is needed.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Add the shared sheet header

Create `src/ui/sheet-header.tsx`:

```tsx
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button } from './button';
import { Icon } from './icon';
import { Text } from './text';

export type SheetHeaderProps = {
  title: string;
  onClose: () => void;
  /** Keep the existing test IDs so sheet tests do not change. */
  closeTestID?: string;
  /** Optional trailing detail before the close control, e.g. a Badge. */
  end?: ReactNode;
};
```

Render one row: `flex-row items-center justify-between gap-2`; a
`min-w-0 flex-1` title (`variant="subtitle"`, `numberOfLines={1}`), optional
`end`, and:

```tsx
<Button
  variant="ghost"
  size="icon"
  accessibilityLabel={t('action.close')}
  onPress={onClose}
  testID={closeTestID}
>
  <Icon name="close" size={20} tone="muted" />
</Button>
```

This is the **sheet/menu dismissal shape**: X only, label from
`action.close`. No visible “Close” word.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Adopt `SheetHeader` in every sheet

Keep each sheet’s existing close `testID`:

| File | `closeTestID` |
|---|---|
| `edition-picker-sheet.tsx` | `edition-picker-close` |
| `surah-picker-sheet.tsx` | `surah-picker-close` |
| `audio-sheet.tsx` | `audio-close` |
| `ayah-panel-sheet.tsx` | `ayah-panel-close` |
| `reader-menu-sheet.tsx` | `reader-menu-close` |
| `surah-detail-sheet.tsx` | `surah-detail-close` |

Replace only the title/close row; leave every other child in place. In
`surah-detail-sheet.tsx`:

- Pass `end={<Badge variant={…} label={…} />}` so the band badge stays next to
  the surah title.
- Delete the bottom full-width `<Button label={t('action.close')} …>` at
  89-93; the header X replaces it.
- Remove the now-unused `Button` import.

**Verify**: `npm test -- src/features/quran/__tests__/reader-sheets.test.tsx`
→ all pass (the tests press the same test IDs).

### Step 4: Give settings rows a leading icon

**Types** (`settings-dropdown.types.ts`): add

```ts
import type { IconName } from '@/core/config';
// inside SettingsDropdownProps
icon?: IconName;
```

**Native** (`settings-dropdown.tsx`): destructure `icon`; in the `row` branch,
wrap the label in a `min-w-0 flex-1 flex-row items-center gap-3` group and
render `<Icon name={icon} tone="muted" />` before the label when `icon` is set.
Do not change the `compact` branch (the navbar has no room).

**Web** (`settings-dropdown.web.tsx`): same leading-icon group before the
label. Keep the real `<select>` and its `aria-label`.

**Consumers**:

```tsx
// theme-dropdown.tsx
icon="palette"
// language-dropdown.tsx
icon="languages"
```

**Verify**: `npm test -- src/features/settings/__tests__/preferences-section.test.tsx`
→ all pass.

### Step 5: Fix the About external link

In `src/app/about.tsx:113-121`, change the website row to:

```tsx
leading={<Icon name="globe" />}
trailing={<Icon name="external-link" tone="muted" />}
```

One glyph says “web”, the other says “leaves the app”. The visible label and
supporting text do not change.

**Verify**: `npm test -- src/features/about/__tests__/about-screen.test.tsx`
→ all pass.

### Step 6: Make Join and Change photo icon-led

**Meeting card** (`meeting-card.tsx:121-125`): compose the button:

```tsx
<Button
  className="self-start"
  onPress={() => void openMeetLink(meeting.meetLink)}
>
  <Icon name="video" size={16} tone="primary-foreground" />
  <ButtonText>{t('action.join')}</ButtonText>
</Button>
```

Import `ButtonText` from `@/ui/button`. The word stays, because the icon alone
is not an unambiguous action; the icon makes it scannable.

**Edit profile** (`edit-profile-form.tsx:212-219`): compose the existing ghost
button:

```tsx
<Button
  variant="ghost"
  size="sm"
  disabled={update.isPending}
  onPress={() => void pickPhoto()}
  testID="account-change-photo"
>
  <Icon name="camera" size={18} tone="muted" />
  <ButtonText variant="ghost" size="sm">
    {t('account.edit.photo')}
  </ButtonText>
</Button>
```

Import `ButtonText` and `Icon`.

**Verify**: `npm test -- src/features/meetings/__tests__/meeting-card.test.tsx src/features/account/__tests__/edit-account-screen.test.tsx`
→ all pass.

### Step 7: Unify the reader exit shape

In `src/features/quran/components/reader-header.tsx:74-82`, change the exit
icon to `<Icon name="close" size={20} />`. Keep:

- `variant="ghost"`, `size="icon"`;
- `accessibilityLabel={t('reader.exit')}`;
- `testID="reader-back"`;
- `onPress={onExit}`.

Remove the RTL chevron swap for this control and update the file comment: the
reader is a full-screen modal, so it dismisses like one; only the footer’s
previous/next arrows mirror.

Also remove the now-unused `isRTL` read if nothing else needs it — the title
still needs `language`, not direction.

**Verify**: `npm test -- src/features/quran/__tests__/reader-chrome.test.tsx`
→ all pass.

## Test plan

Add `src/ui/__tests__/sheet-header.test.tsx`:

1. Renders the title and one close button labelled `Close`.
2. Pressing the close button calls `onClose`.
3. `end` renders before the close control.
4. The close control is an X icon, not a text button: assert
   `getByLabelText('Close')` exists and `queryByText('Close')` is null.

Update `reader-sheets.test.tsx` only if an assertion depended on the visible
“Close” word (it currently presses test IDs, so it should not).

**Verify**: `npm test -- src/ui/__tests__/sheet-header.test.tsx
src/features/quran/__tests__/reader-sheets.test.tsx` → all pass.

## Done criteria

- [ ] Registry has `palette`, `languages`, `globe`; `Icon` has a
      `primary-foreground` tone.
- [ ] Every settings row shows a leading icon; compact navbar controls do not.
- [ ] About shows a globe + one external-link glyph.
- [ ] Join and Change photo are icon + word.
- [ ] All six sheets use `SheetHeader`; their existing close test IDs still
      work; the detail sheet no longer has a second close button.
- [ ] Reader exit is an X with the `reader.exit` label.
- [ ] Pushed pages use the chevron back from plan 002; forms use text Cancel.
- [ ] `npm run verify`, `npm run build:web`, `npm run build:android` and
      `npm run build:ios` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- A Lucide subpath above does not resolve (the installed version differs).
- A sheet’s close control is provided by the platform sheet itself as well as
  the header; report a double close instead of deleting the platform one.
- A test asserts the visible “Close” word in a place where the plan removes it
  and cannot be rewritten to the label/test ID.
- Adding a leading icon changes the native `MenuView` trigger layout in a way
  that clips Arabic text (visual check on device); stop and report.

## Maintenance notes

- Four dismissal shapes only: chevron (pushed page), X (modal), X (sheet),
  text Cancel (dirty form). A fifth shape needs a written reason.
- A row’s leading icon names the destination; the trailing glyph is the
  direction or an external-link cue. Never repeat the same glyph in both slots.
- Icon + word for actions whose icon is ambiguous (Join, Change photo).
  Icon-only for universally understood dismissals, always with
  `accessibilityLabel`.
- `primary-foreground` is for glyphs inside a filled `primary` button; using
  `foreground` there breaks in one of the two themes.
