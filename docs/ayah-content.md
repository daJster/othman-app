# Ayah content

The reader's Read panel shows the selected ayah. This document records the
identity and rendering rules so the tafsir (P6.3) and notes (P6.2) packages can
reuse them instead of re-deriving the selection.

## Canonical identity

`ReaderScreen` resolves the selection from the bbox row the tap landed on:

```
page + ayahKey  →  bboxes.byPage[page][ayahKey]
                    └─ surahNumber, absoluteNumber
```

`ayahKey` alone is **not** unique: it is ayah-in-surah, and page 2 of the mushaf
ends al-Fatihah and starts al-Baqarah, so both can be `"1"`. Fetching by that key
would show surah 1's ayah 1 for a tap on surah 2's ayah 1.

`resolveSelectedAyah` (`src/features/quran/ayah-content.ts`) returns
`{ surah, ayah, absoluteNumber }` or `null` when the row is absent. A stale key
from a previous page therefore resolves to nothing rather than to an unrelated
ayah.

The content query (`useAyahContent`) is keyed by the **absolute** number
(1–6236) and is disabled for `null`. Switching the selection starts a different
query key, so a superseded response cannot replace the new selection — the same
identity rule the edition switch uses.

## Rendering

`AyahDisplayer` receives a list of blocks and renders each one with:

- `selectable` text (copy/long-press selection works on every platform);
- explicit `writingDirection` and `textAlign` from the block, never from the UI
  language — an LTR translation stays left-aligned inside an Arabic reader, an
  RTL e3rab excerpt stays right-aligned inside an English one;
- no `numberOfLines` and no fixed `lineHeight`, so 200% text size grows and
  scrolls instead of clipping; the Quran block uses `leading-loose`, which
  follows the OS text scale;
- `font-quran` and a centered layout only for the Quran block; source blocks use
  the UI face;
- a `max-w-2xl` column, so a tablet gets a readable measure instead of a line
  that spans the screen.

The web app inlined `/ayah_icon-*.svg` before and after the text. The Expo bundle
has no such asset, so the Quran block uses the typographic ayah marker (`۝`,
U+06DD) in the Quran font. It is marked `accessible={false}` so a screen reader
reads the ayah itself.

`buildAyahBlocks` always puts the Quran text first and RTL. Sources are added
with the direction they declare, which is how translation/e3rab blocks are
prepared before their repositories land.

## Panel states

| State        | Read panel                              |
| ------------ | --------------------------------------- |
| no selection | asks for an ayah; never requests ayah 1 |
| loading      | `Loading`, bounded to the sheet         |
| error        | `ErrorState` with a retry that re-runs  |
| ready        | scrollable `AyahDisplayer`              |

Notes are implemented in P6.2 (see [`docs/notes.md`](notes.md)); they never
render the Read result as their own. Tafsir keeps its honest "not in this
package yet" copy until P6.3 supplies real content.

## Verification

Covered by `ayah-content.test.ts` (cross-surah identity, block direction),
`ayah-displayer.test.tsx` (selectable, per-block direction, no clipping, tablet
width), `quran-queries.test.tsx` (absolute key, disabled before selection, late
response, retry) and the Read-panel cases in `reader-sheets.test.tsx` /
`reader-screen.test.tsx`.

Real-device large-text and theme checks remain blocked with the other device
acceptance work: this machine has no iOS/Android target.
