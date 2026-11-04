# Plan 013: The history entry card and its page

> **Executor instructions**: Follow this plan step by step. On a STOP condition,
> stop and report. Update your row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat de327df..HEAD -- src/app/_layout.tsx "src/app/(tabs)/quran.tsx" src/features/quran`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (new content page with factual copy)
- **Depends on**: 010 (page composition)
- **Category**: direction
- **Planned at**: commit `de327df`, 2026-11-03
- **Issue**: —

## Why this matters

The Qur'an tab is about to carry four glances and one promise: that this app
takes the mushaf seriously. A short, well-made page on how the mushaf came to
exist is the only place on the surface that talks about the text itself rather
than the reader's progress. It is entered from a plate card in the landing page.

**The copy is the risk.** Historical writing about the Quran must not be
invented, dated loosely, or sourced to nothing. This plan builds the surface and
the data shape; the text is constrained to uncontested milestones, each carrying
a source string, and the plan stops rather than publish a claim nobody verified.

## Current state

- `src/app/_layout.tsx` declares the root `Stack`; screens outside `(tabs)` are
  registered explicitly (e.g. `<Stack.Screen name="about" />`). A new
  non-tab route must be added there or it opens outside the app's chrome
  conventions.
- `src/features/quran/components/mushaf-preview.tsx` — the page thumbnail,
  reused by the landing page.
- `src/core/domain/quran/page.ts` — `quranPageImageUrl(edition, page)` and
  `isPageInEdition`.
- `src/ui/page.tsx` — `Page width="default"` is `max-w-3xl`; use it for the new
  page so it shares the reader's column.
- `DESIGN.md`: "**One page grid** … Quran and Account are `max-w-3xl`
  centred"; no cards — hairline bands and a reading measure.

## Scope

**In scope**

- `src/app/quran/history.tsx` (new route)
- `src/app/_layout.tsx` (one `<Stack.Screen>` entry)
- `src/features/quran/history-content/` (new: `timeline.ts` types + data,
  `history-screen.tsx`)
- `src/features/quran/components/history-band.tsx` (the landing entry card)
- `src/features/quran/__tests__/history-band.test.tsx` (new)
- `src/i18n/locales/{en,ar}/common.json`

**Out of scope**

- Any claim with a date or a name that the executor cannot verify from the
  sources already cited in the data file.
- Images beyond the mushaf scan already in the app (no stock photography, no
  museum artefacts we do not have rights to).
- The other landing bands.

## Steps

### Step 1: Data shape and constrained copy

`src/features/quran/history-content/timeline.ts`:

```ts
export type HistoryMilestone = {
  id: string;
  /** Short label for the era, e.g. "Revelation" — translated. */
  eraKey: string;
  /** 1–2 sentences. See the copy rules below. */
  bodyKey: string;
  /** Human-readable attribution, shown as a caption. Never invent one. */
  source: string;
};
```

Rules for the data:

- Between **five and seven** milestones. Only uncontested sequence: revelation
  and memorisation during the Prophet's lifetime; the written collection;
  the standardisation of the codex; the development of the mushaf's script and
  vocalisation; the printed mushaf; the digital page this app displays.
- **No exact year** unless it is one every textbook agrees on. Prefer era
  labels ("first century") over year numbers.
- Every milestone carries a `source` string (a named, checkable work), and the
  page renders it as a caption. If the executor cannot name a source for a
  sentence, that sentence does not ship.
- The final milestone is the app's own artefact: the edition currently attached,
  with its `name`/`riwaya` from the catalog — that one needs no external source.

**Verify**: `npm run typecheck` → exit 0; the file contains no year numeral that
is not inside a `source` string.

### Step 2: The page

`src/features/quran/history-content/history-screen.tsx`, rendered by
`src/app/quran/history.tsx` (default export, no `(tabs)`):

- `<ScreenView>` + `<Page width="default">`, a back control (`PageHeader` from
  `src/ui/page-header.tsx`), one `Section` title, then a single reading column:
  each milestone is a band separated by `border-t border-border py-6`, era as an
  `overline`, body at the reading measure (`max-w-md`), source as `caption`
  `tone="muted"`.
- No cards, no timeline dots, no decorative glyphs.
- Arabic and English both render right/left respectively through the `Text`
  primitive; nothing mirrors.

**Verify**: `npm run typecheck`; open `/quran/history` in the dev server at 390
and 1440 — one column, readable measure, back control present.

### Step 3: Register the route

In `src/app/_layout.tsx` add `<Stack.Screen name="quran/history" />` beside the
existing screens.

**Verify**: `npm test -- about` (route tests that assume the stack still pass);
manual open of `/quran/history` shows the app chrome, not a bare screen.

### Step 4: The landing entry card

`src/features/quran/components/history-band.tsx` — a band whose plate is the
reader's current page scan, cropped (`quranPageImageUrl` when an edition is
attached), with a hairline plate fallback when it is not. Overlay: the label
(`quran.landing.history`), one line of promise, and a `chevron-right`. The whole
band is a `Pressable` that pushes `/quran/history`.

**Verify**: `npm test -- history-band` → renders the fallback plate with no
edition; the press resolves to `/quran/history`.

### Step 5: Gate

**Verify**: `npm run verify`; add `quran-history-entry` to the geometry scenario
in `scripts/e2e-web.mjs` and confirm the band's edges match across languages.

## Test plan

- `history-band.test.tsx`: fallback plate, label, press → route.
- `history-screen`: assert the milestone count and that every rendered source
  string is non-empty (this is the guard against invented copy).

## Done criteria

- [ ] `npm run verify` exits 0
- [ ] every milestone renders a non-empty source caption
- [ ] no year numeral appears without a source
- [ ] `/quran/history` is reachable from the band and from a direct URL
- [ ] the page is one column at 390, 768 and 1440

## STOP conditions

- A milestone cannot be given a checkable source: drop the milestone or stop.
- The route collides with `(tabs)/quran` in a way that changes the tab's URL —
  stop; the landing page's path must stay `/quran`.
- The scan image cannot be cropped without a visible seam.

## Maintenance notes

- This is the page most likely to attract well-meaning copy edits. The
  `source` field is a contract: a new milestone without one fails review.
- If a real historical asset is licensed later, the plate may use it; until
  then the mushaf scan is the honest image.
