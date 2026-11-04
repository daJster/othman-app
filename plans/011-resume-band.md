# Plan 011: The resume band — where you are, and the last three places you were

> **Executor instructions**: Follow this plan step by step, verifying each step.
> On a STOP condition, stop and report. Update your row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat de327df..HEAD -- "src/app/(tabs)/quran.tsx" src/features/quran/components`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (replaces the page's primary action)
- **Depends on**: 009 (reading log), 010 (page composition)
- **Category**: direction
- **Planned at**: commit `de327df`, 2026-11-03
- **Issue**: —

## Why this matters

"Continue reading" is the reason the Qur'an tab exists. Today it shows a page
number and a button. A reader returning after three days wants three things the
screen does not answer: *which surah and ayah was I in*, *which mushaf page was
it*, and *what were the last places I stopped*. The log from plan 009 answers
all three; this band is where they are shown, in that order, with the current
position unmistakably first.

## Current state

`src/app/(tabs)/quran.tsx` currently renders the continue block (before plan 010
rewrites the screen). Plan 010 leaves that block in place until this plan lands.

- `src/features/quran/components/mushaf-preview.tsx` — a 96 px (112 at `md`)
  page thumbnail, `aspectRatio: 412 / 600`, whole surface pressable, with a
  hairline placeholder when the edition does not carry the page. **Reuse it
  unchanged.**
- `src/features/quran/store/use-reader.ts` — `useReaderPage()`,
  `useReaderSurah()`, `useReaderEdition()`.
- `src/features/quran/format.ts` — `formatReaderNumber(value, language)`.
- `src/features/quran/history/use-reading-log.ts` (plan 009) —
  `useResumeEntry()` returns `ReadingEntry | null`, `usePreviousEntries(max)`
  returns `ReadingEntry[]`.
- Design constraints: the band is a **hairline band**, not a card (`DESIGN.md`:
  "No card, no radius, no shadow"); the primary action must sit next to the copy
  it belongs to (plan 010, step 3); the layout must not mirror between
  languages.

## Commands you will need

| Purpose   | Command                          | Expected        |
| --------- | -------------------------------- | --------------- |
| Typecheck | `npm run typecheck`              | exit 0          |
| Tests     | `npm test -- resume-band`        | all pass        |
| i18n      | `npm run check:i18n`             | en/ar agree     |
| Gate      | `npm run verify`                 | exit 0          |

## Scope

**In scope**

- `src/features/quran/components/resume-band.tsx` (new)
- `src/features/quran/components/reading-row.tsx` (new, the small row used for
  the three previous readings)
- `src/features/quran/__tests__/resume-band.test.tsx` (new)
- `src/app/(tabs)/quran.tsx` (swap the continue block for `<ResumeBand />`)
- `src/i18n/locales/{en,ar}/common.json`

**Out of scope**

- `MushafPreview` internals.
- The reading log and its store (plan 009).
- The other bands.

## Steps

### Step 1: Strings

Add to both locales under `quran.resume`:

- `quran.resume.title` — "Continue reading" (may reuse `reader.continueTitle`
  instead; if so, skip).
- `quran.resume.at` — `"{{surah}} · ayah {{ayah}}"` (used only when the log
  entry has an `ayahKey`).
- `quran.resume.page` — `"Page {{page}} of {{total}}"`.
- `quran.resume.previous` — "Previous readings".
- `quran.resume.open` — the button label (reuse `reader.open` if it reads well).
- `quran.resume.sample` — a short, quiet note used when the log is the demo
  seed: "Sample history" / "سجل تجريبي". One line, caption size.

Phrase each as a single interpolated string; never concatenate fragments around
a slash (see plan 010's bidi note).

**Verify**: `npm run check:i18n` → passes, count increased.

### Step 2: Build the band

`src/features/quran/components/resume-band.tsx`:

```
<View testID="quran-resume-band">
  <Pressable onPress={open}>                 ← the whole band is the target
    <MushafPreview edition={page} … />       ← only when edition is attached
    <Text variant="heading">{surah name or number}</Text>
    <Text variant="caption">{at / page}</Text>
    <Button label={t('quran.resume.open')} /> ← visual affordance inside the pressable
  </Pressable>

  <View className="h-px bg-border" />
  <Text variant="overline" tone="muted">{t('quran.resume.previous')}</Text>
  {previous.map(entry => <ReadingRow … />)}   ← up to three, newest first
</View>
```

Rules:

- `previous` is empty for a fresh install with no seed: then the section and its
  hairline are **not rendered** (no empty heading, no "no readings" copy).
- The three rows are `Pressable` rows, min height 44, hairline separated, each
  showing the time as **relative** ("yesterday", "2 days ago") computed from
  `entry.at` — add the relative formatter in this plan, pure and unit-tested in
  `src/features/quran/history/relative-day.ts` if it grows past a few lines.
- Rows never mirror: the chevron is `chevron-right` in both languages.
- The current position is visually first and must not be confused with the
  three previous rows: different type size (`heading` vs `label`) and the
  current band has the preview.

### Step 3: Wire it into the page

In `src/app/(tabs)/quran.tsx`, replace the continue block with `<ResumeBand />`.
Keep `open()` in the screen and pass it down, or let the band call
`router.push` itself — pick one and keep the screen's `testID="quran-open-reader"`
on the primary action so the existing e2e keeps working.

**Verify**: `npm test -- quran-screen` → the open action still resolves to
`/reader/[page]` with the stored page.

### Step 4: Tests

`src/features/quran/__tests__/resume-band.test.tsx`:

1. renders the current surah and page from the log;
2. renders at most three previous readings, newest first;
3. hides the "previous" section when the log has only today;
4. shows the sample note when the log came from the seed;
5. the whole band triggers `onOpen` (press on the title area, not just the
   button).

Mock the reading-log hook, not the store. Pattern:
`src/features/quran/__tests__/quran-screen.test.tsx`.

**Verify**: `npm test -- resume-band` → 5 passing.

### Step 5: Gate

**Verify**: `npm run verify` → green; then `/quran` at 390 and 1440 in Arabic:
the title and the action are in one visual block, and the three previous rows
sit below a hairline.

## Test plan

- Five cases above in a new file; no changes to existing suites.

## Done criteria

- [ ] `npm run verify` exits 0
- [ ] `/quran` with an empty log renders no "previous" heading
- [ ] the primary action is inside the same pressable as the title
- [ ] `grep -rn "self-start\|self-end" src/features/quran/components/resume-band.tsx`
      returns nothing
- [ ] `git status` shows only in-scope files

## STOP conditions

- `useResumeEntry` does not exist (plan 009 not executed or renamed) — the plan
  cannot invent it; stop and report.
- `MushafPreview` no longer accepts `{ edition, page, onPress }`.
- The screen does not yet have a `<ResumeBand />` slot (plan 010 not executed).

## Maintenance notes

- If the log grows a "current session" concept (a bookmark inside today's
  reading), this band is where it surfaces; keep the current-position block
  first.
- Relative time is locale-sensitive. If a third language lands, revisit the
  formatter rather than adding branches here.
