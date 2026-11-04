# Plan 010: Compose the Qur'an landing page as one reading surface

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Update the status
> row in `plans/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat de327df..HEAD -- "src/app/(tabs)/quran.tsx" src/i18n/locales`
> The working tree contains an uncommitted direction refactor (no layout
> mirroring). Expect `quran.tsx` to differ from `de327df` by removed `isRTL`
> branches; that specific difference is expected, anything else is not.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (rewrites a screen with a routing duty)
- **Depends on**: none (the modules are optional; the page must render with the continue block alone)
- **Category**: direction
- **Planned at**: commit `de327df`, 2026-11-03
- **Issue**: —

## Why this matters

The Qur'an tab currently forwards to the reader and shows one band. The
requested feature set turns it into the place a reader starts their day:
continue, today's hizb, activity, history, a suggested surah. This plan owns the
*composition* only — the page shell, the order, the hierarchy, the responsive
column and the routing duty that already exists — so that the modules can land
independently and the page is never half-broken.

Two defects in the current screen are fixed here because they are composition
problems, not module problems:

1. the primary action sits at the physical left while the copy it answers sits
   at the language's start (right in Arabic), leaving ~124 px of dead band on a
   390 screen;
2. the position line `سورة 1 · 1 / 604` reorders into nonsense in Arabic
   because it is three concatenated translated fragments around a slash.

## Current state

`src/app/(tabs)/quran.tsx` (whole file is 171 lines). Its documented job:

```ts
/**
 * Quran tab — the entry into the mushaf reader.
 * ...
 * This screen therefore has one job — open that route at the right page —
 * and it deliberately does not duplicate the reader or prefetch its data.
 */
```

The render, trimmed:

```tsx
<Screen contentContainerClassName="gap-0 p-0">
  <Page width="default" className="pt-8 pb-10 md:pt-12">
    <Head><title>{`${t('nav.quran')} · ${t('app.name')}`}</title></Head>
    <Section title={t('nav.quran')} description={t('nav.quranDesc')} />
    <View className="mt-8 border-y border-border py-7 md:py-9">
      <View className={cn('gap-5 md:gap-7', edition ? 'flex-row' : 'flex-col')}>
        {edition ? <MushafPreview edition={edition} page={page} onPress={open} /> : null}
        <View className="flex-1 gap-5">
          <View className="gap-1">
            <Text variant="heading">{t('reader.continueTitle')}</Text>
            <Text variant="caption" tone="muted" className="tabular-nums">
              {`${surahLabel} · ${t('reader.pageOf', { page: pageLabel, total: … })}`}
            </Text>
          </View>
          <View /* progressbar */ className="h-0.5 w-full flex-row overflow-hidden bg-border">
            <View className="h-full bg-brass" style={{ width: `${progress * 100}%` }} />
          </View>
          <Button size="lg" label={t('reader.open')} onPress={open}
                  testID="quran-open-reader" className="self-start" />
        </View>
      </View>
    </View>
    <Text variant="caption" tone="muted" className="mt-5">{t('reader.entryHint')}</Text>
  </Page>
</Screen>
```

Routing duty that **must survive the rewrite** (lines 65–99): `parseQuranLink`
replaces the tab with `/reader/[page]` when the URL carries `page`/`surah`/
`ayah`, and an invalid link renders `ErrorState` with a retry to `/quran`.

Design constraints from `DESIGN.md` that apply:

- "**One page grid** … Quran and Account are `max-w-3xl` centred."
- "**Station row** — … No card, no radius, no shadow." and "**Verse band** —
  top and bottom hairline … No card." The house grammar is **hairline bands**,
  not a card grid. Modules added here are bands separated by `border-b
  border-border`, with generous vertical rhythm — not floating cards.
- "Station line: … Rows are 44pt minimum, hairlines not boxes."
- **Direction**: one physical layout for both languages. Nothing may mirror.
  `Text` carries `align`; a button never uses `self-*` to chase the text.

## Commands you will need

| Purpose     | Command                          | Expected on success        |
| ----------- | -------------------------------- | -------------------------- |
| Typecheck   | `npm run typecheck`              | exit 0                     |
| Screen test | `npm test -- quran-screen`       | all pass                   |
| i18n        | `npm run check:i18n`             | en/ar agree                |
| Full gate   | `npm run verify`                 | exit 0                     |
| Visual      | `npm run web` then `/quran`      | page renders at 390 / 1440 |

## Scope

**In scope**

- `src/app/(tabs)/quran.tsx`
- `src/i18n/locales/en/common.json`, `src/i18n/locales/ar/common.json`
- `src/features/quran/__tests__/quran-screen.test.tsx`
- `scripts/e2e-web.mjs` (extend the `direction geometry` scenario only)

**Out of scope**

- The reader modal (`src/app/reader/[page].tsx`, `reader-screen.tsx`).
- `MushafPreview` — reuse as-is.
- Any module implementation (011–014). Import them; do not write them here.
- `Section`'s API and `Page`'s widths.

## Steps

### Step 1: Add the page's own strings

In **both** locale files, under a new `quran.landing` object, add (English /
Arabic values are yours to phrase, but keep them short — this is UI copy):

- `quran.landing.position` — one interpolated string that renders the position
  as a sentence, e.g. `"{{surah}} · page {{page}} of {{total}}"`. **One key with
  named placeholders**, never concatenated fragments. In Arabic, phrase it so
  the numbers sit inside a single run — e.g.
  `"سورة {{surah}} · الصفحة {{page}} من {{total}}"`.
- `quran.landing.resume` — the section label for the primary band (the existing
  `reader.continueTitle` may be reused instead; if so, skip this key).
- `quran.landing.hizb`, `quran.landing.activity`, `quran.landing.history`,
  `quran.landing.story` — the four supporting band labels.

Do not duplicate `reader.open` or `reader.continueTitle`.

**Verify**: `npm run check:i18n` → `en and ar agree on N keys` with N ≥ 244 + 5.

### Step 2: Rewrite the screen's structure

Keep everything above the `return` — the store hooks, `useRestoreReader`,
`parseQuranLink`, the redirect effect, the invalid-link branch and `open()`.

Replace the render with this order (each band is a `<View className="border-b
border-border py-7 md:py-8">` inside the existing `<Page width="default">`):

1. `<Section title={t('nav.quran')} description={t('nav.quranDesc')} />` — the
   page header stays.
2. **Resume band** — `<ResumeBand />` from plan 011. Until 011 lands, keep the
   existing continue block here verbatim so the page never loses its primary
   action.
3. **Daily hizb band** — `<DailyHizbBand />` from plan 012. Render `null` when
   the module is absent.
4. **Activity band** — `<ActivityBand />` from plan 012.
5. **History band** — `<HistoryBand />` from plan 013.
6. **Surah story band** — `<StoryBand />` from plan 014.
7. Remove the trailing `reader.entryHint` line: the band above already explains
   the action, and three lines said the same thing.

If a module file does not exist yet, **omit its element** (do not stub a card,
do not invent placeholder copy). The page must be complete-looking with the
modules that exist.

### Step 3: Fix the primary action's placement

Inside the resume band, the action must not sit at a physical edge opposite the
copy. Use one of these, in order of preference:

- make the whole band pressable (`Pressable` wrapping the title row + preview),
  with the visible `Button` as a non-interactive visual (or a `Button` with
  `pointerEvents="none"` inside), or
- place the action in the title row, inline after the surah name, so the
  distance between label and action is the row's `gap`.

Do not reintroduce `self-start`/`self-end` on the button as a mirroring device.

**Verify**: at 390 the label and the action are within one `gap-4` of each
other in the same visual block.

### Step 4: Delete the dead progress hairline

The `h-0.5` brass bar renders nothing at 1/604 and duplicates the position line.
Remove it from this screen. (`MushafPreview` and the reader keep their own
affordances; this is only the landing band.)

**Verify**: `grep -n "progressbar" "src/app/(tabs)/quran.tsx"` → no matches.

### Step 5: Rewrite the meta line

Render the position with the single interpolated key from Step 1:

```tsx
<Text variant="caption" tone="muted" className="tabular-nums">
  {t('quran.landing.position', {
    surah: surahLabel,
    page: pageLabel,
    total: formatReaderNumber(QURAN_PAGE_COUNT, language),
  })}
</Text>
```

**Verify**: in Arabic at 390 the line reads as one sentence, with `1 / 604`
never split across the string in the DOM (`document.body.innerText` shows the
page number adjacent to "من"/"of").

### Step 6: Responsive check

`Page width="default"` is `max-w-3xl`; the page stays a **single column at every
width**. At 1440 the bands are 768 px wide and centred (`mx-auto` from `Page`).
Do not add a two-column arrangement: the supporting modules are a reading
sequence, and two columns would make the order arbitrary.

**Verify**: at 1440 `document.querySelector('[role="navigation"]')` and the page
column are both centred on the same axis (their centre x differs by ≤ 1 px).

### Step 7: Extend the geometry guard

In `scripts/e2e-web.mjs`, inside `await scenario('direction geometry', …)`, add
the quran page to the measured set:

```js
const quranLandmarks = [
  { selector: '[role="navigation"]', edges: ['left', 'right'] },
  { selector: '[data-testid="quran-resume-band"]', edges: ['left', 'right'] },
  { selector: '[data-testid="quran-history-band"]', edges: ['left', 'right'] },
];
```

Measure `/quran` at 390 and 1440 in `en` and `ar` and compare the same way.
Add `testID="quran-resume-band"` / `testID="quran-history-band"` to those bands
(they are allowed to be absent until their plans land — the loop skips missing
selectors).

**Verify**: `npm run build:web && npm run preview:web` then `npm run e2e:web`
→ the `direction geometry` scenario reports no failures.

### Step 8: Screen test

Update `src/features/quran/__tests__/quran-screen.test.tsx`:

- keeps: the link redirect, the invalid-link error, the open action.
- adds: the page renders the section title; the position line is produced from
  one `t()` call with named params (assert the rendered string contains the
  surah and the page number, not the raw template).

**Verify**: `npm test -- quran-screen` → all pass.

## Test plan

- `quran-screen.test.tsx`: existing cases plus the two above. Pattern: the file
  already mocks `expo-router` and the reader store; extend those mocks rather
  than adding a renderer.
- No new snapshot tests: the screen is behavioural, and snapshots on a page with
  five optional modules are noise.

## Done criteria

- [ ] `npm run verify` exits 0
- [ ] `npm run check:i18n` passes with the five new keys in both locales
- [ ] `/quran` at 390 and 1440, in Arabic and English, shows the same physical
      column and band edges (`e2e:web` geometry scenario)
- [ ] the invalid-link branch still renders `ErrorState` with a retry
- [ ] no module stub/placeholder content exists in the file
- [ ] `git status` shows only in-scope files

## STOP conditions

- `parseQuranLink` or the redirect effect differs from the excerpt (routing
  duty changed).
- A module's component name or props differ from the ones named here — read the
  module plan and use its actual API; if it conflicts, stop and report.
- `Page`/`Section` no longer expose `width="default"` / `description`.
- The geometry scenario fails for reasons outside this page (nav or hero).

## Maintenance notes

- The screen's top comment must be rewritten in this plan: it currently says the
  screen "has one job — open that route". That sentence becomes false and would
  license deleting the modules later. `DESIGN.md`'s Quran section needs the same
  correction (see plan 014's maintenance note).
- Module order is a product decision (resume → hizb → activity → history →
  story). Re-ordering is a design change, not a refactor.
- A reviewer should check that the page still renders with **zero** modules
  (fresh checkout, before 011–016): it must not throw or show empty bands.
