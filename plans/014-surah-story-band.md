# Plan 014: The surah story band

> **Executor instructions**: Follow this plan step by step. On a STOP condition,
> stop and report. Update your row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat de327df..HEAD -- "src/app/(tabs)/quran.tsx" src/features/quran src/core/types/quran.ts`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 010 (page slot)
- **Category**: direction
- **Planned at**: commit `de327df`, 2026-11-03
- **Issue**: —

## Why this matters

Every other module on the page is about the reader's own progress. This one is
about the text: a suggested surah with two sentences a reader did not know, and
a tap that opens it. It is the only module that can send someone somewhere they
were not already going, and the only one that makes the page feel curated rather
than instrumented.

It is also the cheapest module, and the safest way to keep it honest is to take
every *fact* (name, place of revelation, ayah count) from the catalog the app
already ships, and let the mock carry only the two-sentence note and a start
page.

## Current state

- `src/core/types/quran.ts` — `SurahMetadata` already carries everything factual
  the card needs:

  ```ts
  export type SurahMetadata = {
    number: number;        // 1–114
    name: string;          // Arabic, as the mushaf prints it
    nameEnglish: string;   // transliteration
    location: SurahLocation; // 'makka' | 'madina'
    ayahCount: number;
  };
  ```

- `src/features/quran/use-quran-catalog.ts` — the query hook that yields the
  catalog (editions + surah metadata). The surah picker
  (`components/surah-picker-sheet.tsx`) already reads names from it.
- `src/features/quran/format.ts` — `formatReaderNumber`.
- The reader route takes `page`, and optionally `surah`/`ayah`:
  `router.push({ pathname: '/reader/[page]', params: { page: String(page) } })`.
- Conventions: mock data is a typed module in the feature folder (as plan 009's
  seed); strings live in both locales; `DESIGN.md` forbids cards and inventing
  claims.

## Scope

**In scope**

- `src/features/quran/story/stories.ts` (new: types + mock array)
- `src/features/quran/story/pick-story.ts` (new, pure, deterministic)
- `src/features/quran/story/pick-story.test.ts` (new)
- `src/features/quran/components/story-band.tsx` (new)
- `src/features/quran/__tests__/story-band.test.tsx` (new)
- `src/app/(tabs)/quran.tsx` — mount the band in its slot
- `src/i18n/locales/{en,ar}/common.json`

**Out of scope**

- The catalog itself (no new surah data).
- Any scholarly claim: the note is descriptive (place, length, one line on
  theme), not interpretive.
- The reader.

## Steps

### Step 1: The mock, shaped so the facts cannot drift

```ts
/** A suggested surah. Facts come from the catalog; only `noteKey` and `page` are ours. */
export type Story = {
  surah: number;      // 1–114, validated against the catalog at render
  page: number;       // page the reader opens at
  /** Locale key, not a string: both languages must define it. */
  noteKey: string;
};
```

Ship **five** stories. Validate at module load with `isSurahNumber` from
`src/core/domain/quran/surah.ts` (throw on an invalid number — a test will
exercise this).

Note copy rules: ≤ 2 sentences, descriptive only ("revealed in Makka, 7 ayat,
the surah that opens the mushaf"), no dates, no causes of revelation, no
ranking ("the greatest…"). Put the notes in the locales, not in the data file.

**Verify**: `npm test -- pick-story` → passes.

### Step 2: Deterministic picker

`pick-story.ts`:

```ts
export function pickStory(stories: Story[], date: Date): Story;
```

Selection is `dayOfYear % stories.length` — **no `Math.random()`** (the web
export is server-rendered and a random pick would hydrate differently). Write
the day-of-year helper locally and unit-test the boundary (Dec 31 → Jan 1 wraps
to index 0).

**Verify**: `npm test -- pick-story` → three cases: stable for the same date,
changes across consecutive days, wraps in a 5-story array.

### Step 3: The band

`story-band.tsx` renders inside the landing page's band wrapper:

- overline: `quran.landing.story`
- the surah name from the catalog (`metadata.name` in Arabic,
  `metadata.nameEnglish` in English), `title`-sized;
- `caption`: place + ayah count, formatted with `formatReaderNumber`;
- the note (`body`), `max-w-md`;
- a text link "Open" / "افتح" with `chevron-right`;
- the whole band is pressable → `router.push('/reader/[page]', { page })`.

If the catalog has not loaded, render the band with the surah **number** and no
place/count (never a broken or empty name). If the catalog surah is missing,
render nothing.

**Verify**: `npm test -- story-band` → 4 cases: renders name from the catalog;
falls back to the number without a catalog; hides when the surah is unknown;
press pushes the page from the story.

### Step 4: Mount and gate

Add `<StoryBand />` in the slot plan 010 left, last in the page order.

**Verify**: `npm run verify`; `/quran` at 390 and 1440 in both languages shows
the band with the same edges (add `quran-story-band` to the geometry scenario).

## Test plan

- `pick-story.test.ts` — 3 cases above.
- `story-band.test.tsx` — 4 cases above, mocking the catalog hook (pattern:
  `surah-picker` tests).

## Done criteria

- [ ] `npm run verify` exits 0
- [ ] `grep -rn "Math.random" src/features/quran/story` returns nothing
- [ ] both locales define every `noteKey`
- [ ] the band renders when the catalog is absent, and hides for an unknown
      surah
- [ ] `git status` shows only in-scope files

## STOP conditions

- `use-quran-catalog` does not expose surah metadata in the shape above.
- The mock's `page` for a surah falls outside the attached edition — the tap
  would open a page the reader cannot show; adjust the mock, do not clamp
  silently.
- A note cannot be written descriptively without making a claim nobody verifies.

## Maintenance notes

- Adding a story means adding one entry and two locale notes; the picker is
  order-sensitive, so appending is safe and inserting re-shuffles the rotation.
- The band is the cheapest place to test a "curated content" idea for this
  product; if more curated content lands, it should share this shape rather than
  invent a second one.
