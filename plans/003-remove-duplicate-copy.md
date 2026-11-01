# Plan 003: Remove duplicated copy across pages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Update this plan's
> status row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 589da39..HEAD -- "src/app/(tabs)/index.tsx" "src/app/(tabs)/quran.tsx" src/features/meetings/meeting-card.tsx src/app/account/progress.tsx src/features/quran/components/edition-picker-sheet.tsx src/i18n/locales/en/common.json src/i18n/locales/ar/common.json`
> If any in-scope file changed, compare the excerpts below with live code; on a
> mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S-M
- **Risk**: LOW
- **Depends on**: 002 (Progress header owns the page title)
- **Category**: direction / copy
- **Planned at**: commit `589da39`, 2026-11-01

## Why this matters

Five surfaces say the same thing twice. On a calm, text-first screen every
repeated line is noise: the page title read twice, the page number printed
under itself, a date repeated on every card of a single-day list, and a
“Selected” word next to the check that already says it. Removing the duplicate
also removes five translation strings that can drift.

## Current state

| Site | Duplicate |
|---|---|
| `src/app/(tabs)/index.tsx:68-75` | `Section title="Your circle" description="Four ways back into the circle."` — the four station rows below already are the four ways. |
| `src/app/(tabs)/quran.tsx:134-144` | Heading `reader.continueDescription` = `Page 12`; caption is `Surah 2 · 12 / 604`. The page is printed twice. |
| `src/features/meetings/meeting-card.tsx:62-65` | Every card prints `formatLongDate(meeting.date)` although the screen header already prints the selected day once (`meetings.tsx:97-108`) and every query is scoped to that day. |
| `src/app/account/progress.tsx:47,68-72` | `EmptyState title={title}` repeats the page header title, with `pages.account.progress.empty` as the description. |
| `src/features/quran/components/edition-picker-sheet.tsx:97-104` | The selected row renders `reader.editionSelected` (“Selected”) next to a check icon and `accessibilityState.selected`. |

Locale keys that become unused:

- `home.circle.description`
- `reader.continueDescription`
- `reader.editionSelected`

`reader.continueTitle` (“Continue reading”) already exists and is unused; it
becomes the Quran heading.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| i18n audit | `npm run check:i18n` | `i18n: en and ar agree on … keys` |
| Focused tests | `npm test -- src/features/quran/__tests__/quran-screen.test.tsx src/features/quran/__tests__/reader-sheets.test.tsx src/features/progress/__tests__/progress-screen.test.tsx` | all pass |
| Full verification | `npm run verify` | all suites pass |
| Web build | `npm run build:web` | `Exported: dist` |

## Scope

**In scope**:
- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/quran.tsx`
- `src/features/meetings/meeting-card.tsx`
- `src/app/account/progress.tsx`
- `src/features/quran/components/edition-picker-sheet.tsx`
- `src/i18n/locales/en/common.json`
- `src/i18n/locales/ar/common.json`
- `src/features/quran/__tests__/quran-screen.test.tsx`
- `src/features/quran/__tests__/reader-sheets.test.tsx`
- `src/features/progress/__tests__/progress-screen.test.tsx`

**Out of scope**:
- New copy or new translations. Use existing keys only. If a replacement key
  does not exist, STOP rather than writing new English/Arabic.
- The meeting status badge, attendee count, time or location rows.
- The reader's `entryHint`.
- `ProgressSummary`'s subtitle caption; it is context inside a card, not a
  page title.
- Header structure and heading levels (plan 002).

## Steps

### Step 1: Home — drop the count line

In `src/app/(tabs)/index.tsx`, remove the `description` prop from the
`Section` at 68-75 (keep `title`, `titleVariant`, `descriptionVariant`,
`level`, `className`). Then delete `home.circle.description` from both locale
files.

**Verify**: `npm run check:i18n` → exit 0.

### Step 2: Quran — one page number

In `src/app/(tabs)/quran.tsx`:

- Change the heading at 135-137 to
  `{t('reader.continueTitle')}`.
- Keep the caption at 138-143 as
  `${surahLabel} · ${t('reader.pageOf', { page: pageLabel, total: … })}`.
- Delete `reader.continueDescription` from both locales.

Update `src/features/quran/__tests__/quran-screen.test.tsx:47`:

```ts
expect(screen.getByText('Continue reading')).toBeTruthy();
```

The existing assertion at line 109 (`'Surah 2 · 12 / 604'`) already covers the
page number exactly once. Do not add a test that counts occurrences of “Page”.

**Verify**: `npm test -- src/features/quran/__tests__/quran-screen.test.tsx`
→ all pass.

### Step 3: Meetings — drop the repeated date from the card

In `src/features/meetings/meeting-card.tsx`:

- Delete the `MetaRow` whose `icon="calendar"` (62-65).
- Remove the now-unused `formatLongDate` and `parseDateKey` imports if nothing
  else in the file uses them.
- Update the doc comment: the card shows time and place; the selected day is
  the screen’s header, so the card does not repeat it.
- The `MetaRow` icon union becomes `'clock' | 'map-pin'`.

The Meetings screen keeps its single date line. No locale key is removed:
`meeting.found` is still the count line.

**Verify**: `npm test -- src/features/meetings/__tests__/meeting-card.test.tsx`
→ all pass.

### Step 4: Progress — one title

In `src/app/account/progress.tsx`, change the empty state to:

```tsx
<EmptyState title={t('pages.account.progress.empty')} />
```

(no `description`). The header now carries “Progress” and the page title is
not repeated. Keep `title` for the document title and header.

Update `src/features/progress/__tests__/progress-screen.test.tsx:76`: the
assertion for “No progress recorded yet.” still passes because it is now the
title. Add:

```ts
expect(screen.getAllByText('Progress')).toHaveLength(1);
```

**Verify**: `npm test -- src/features/progress/__tests__/progress-screen.test.tsx`
→ all pass.

### Step 5: Edition picker — the check is the selection

In `src/features/quran/components/edition-picker-sheet.tsx:97-104`, replace the
selected fragment with the check icon only:

```tsx
{selected ? (
  <Icon name="check-circle" size={18} tone="primary" />
) : null}
```

Do not add a visually hidden “Selected” string: the row already exposes
`accessibilityState={{ selected }}`, and the check is a visual duplicate of
that state. Delete `reader.editionSelected` from both locales.

Update `src/features/quran/__tests__/reader-sheets.test.tsx:197`: remove
`expect(screen.getByText('Selected')).toBeTruthy()` and replace it with:

```ts
expect(screen.getByTestId('edition-row:1').props.accessibilityState).toMatchObject(
  { selected: true },
);
expect(screen.getByTestId('edition-row:2').props.accessibilityState).toMatchObject(
  { selected: false },
);
```

**Verify**: `npm test -- src/features/quran/__tests__/reader-sheets.test.tsx`
→ all pass.

### Step 6: Locale cleanup and full verification

Delete the three keys from **both** `en/common.json` and `ar/common.json`:

- `home.circle.description`
- `reader.continueDescription`
- `reader.editionSelected`

Run `npm run check:i18n` (parity must still hold), then `npm run verify` and
`npm run build:web`.

**Verify**: every command exits 0.

## Test plan

- `quran-screen.test.tsx`: heading is “Continue reading”; the position caption
  still shows the page once.
- `reader-sheets.test.tsx`: the selected edition is asserted through
  `accessibilityState`, not the word “Selected”.
- `progress-screen.test.tsx`: “Progress” appears exactly once.
- No new test framework or snapshot is introduced.

## Done criteria

- [ ] Home no longer states how many ways there are.
- [ ] Quran prints the page number once.
- [ ] Meeting cards no longer print the selected day’s date.
- [ ] Progress empty state does not repeat the page title.
- [ ] Edition selection is conveyed by the check and `accessibilityState` only.
- [ ] The three locale keys are removed from both languages.
- [ ] `npm run check:i18n`, `npm run verify` and `npm run build:web` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- A removal needs a replacement string that does not already exist in both
  locales.
- A test depends on the exact duplicated string in a way that cannot be
  rewritten to assert the surviving copy.
- `formatLongDate` is still used elsewhere in `meeting-card.tsx` after the
  deletion.

## Maintenance notes

- A screen header owns the day/context; cards show only what differs between
  rows.
- A numeric fact belongs in one place on a screen. When in doubt, keep it in
  the caption (with context) and let the heading be a verb phrase.
- Selection state is `accessibilityState.selected` plus one visual cue. Never
  add a word that repeats the cue.
