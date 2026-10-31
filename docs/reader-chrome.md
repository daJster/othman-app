# Reader chrome and panels

The mushaf reader is `/reader/[page]`. Its chrome is the header, the footer and
four sheets. This document records the interaction rules the chrome owns, so a
later content package (P5.5, P6.2, P6.3) does not have to rediscover them.

## Layout: chrome is a column, never an overlay

```
┌───────────────────────────┐
│ header (pt-safe)          │
├───────────────────────────┤
│ fitted scan + ayah boxes  │
├───────────────────────────┤
│ footer (pb-safe)          │
└───────────────────────────┘
```

The scan is not behind the chrome. `MushafPage` measures the space it is given,
so hiding the chrome makes the page larger rather than revealing hidden text.
This is the structural reason the chrome can never cover Quran text at any
supported size — there is no z-order to get wrong.

Insets come from `SafeAreaListener` → `Uniwind.updateInsets` (see
`src/app/_layout.tsx`), which is what makes `pt-safe` / `pb-safe` resolve.

## Auto-hide: one tap, one outcome

A tap on a page margin (the overlay backdrop) does exactly one of these:

| State                | Tap on margin                    |
| -------------------- | -------------------------------- |
| An ayah is selected  | Clears the selection.            |
| Nothing is selected  | Shows/hides header and footer.   |

Clearing a selection and hiding the controls in the same tap would be a
contradiction: the reader would lose the ayah they were about to act on and lose
the panel button in the same gesture. The accessibility label follows the same
rule (`Clear the selected ayah` vs `Show or hide reader controls`).

The backdrop only exists on pages that have bbox rows. A page with no geometry
keeps its chrome visible; there is no invisible tap target pretending to work.

## Header

- Exit (labelled, not icon-only) — always reachable, including while the
  catalog or geometry is loading or failing.
- Surah title — opens the surah picker.
- Second line — the page, always; plus `· Ayah N` while an ayah is selected.
- Edition name — opens the edition picker.
- Menu — opens the reader menu.

## Footer

Previous/next are **reading-order** actions. In a mushaf "next" moves left, so
the chevrons mirror with the UI language; the labels are translated, and the row
mirrors through `flex-row` in RTL.

At an edition boundary the control is disabled rather than hidden: hiding it
would move the other button under the reader's thumb, and a disabled control can
explain itself to a screen reader. The store also makes the turn a no-op, so the
disabled prop is a UI contract, not the only guard.

The position counter uses `tabular-nums` so the number does not change width on
every turn.

## Sheets

All four use `@expo/ui` `BottomSheet`. The native `MenuView` is deliberately not
used: its own documentation says the trigger renders but actions never fire on
web, and the reader is a cross-platform surface.

### Surah picker

A virtualized `FlatList` of all 114 surahs (D5 explicitly rules out the native
grouped `List` as a picker). Search matches the Arabic name (ignoring
diacritics), the Latin transliteration, or the number. Choosing a row calls
`goToSurah`, which maps surah + ayah to a page through the edition's `bySurah`
table; the selection is cleared and the page is clamped by the store.

Closing the sheet clears the query, so reopening starts from the full list.

### Edition picker

Rows show name, riwaya and page range — the range is why a jump keeps the page
and clamps rather than pretending editions share numbering.

Choosing a row only **requests** an edition. The reader fetches that edition's
geometry and attaches it in one store write; only then does the header show the
new name. A request that is superseded before its query resolves belongs to a
component that no longer exists, so its response can never replace the newer
selection. The first attach (boot) uses `attachEdition`; a different edition
uses `switchEdition`, which clamps the page and clears the selection.

### Menu

Lists the five destinations: Surahs, Editions, Read, Tafsir, Notes. The header
and footer expose the two most-used ones directly.

### Read / Tafsir / Notes panels

P5.4 owns the surface only. Each panel states which ayah it is about (surah name
+ ayah number, assembled from the selected row). P5.5 fills Read and P6.2 fills
Notes (see [`docs/notes.md`](notes.md)); Tafsir still shows an honest "not part
of this package yet" message until P6.3 supplies its content. With no selection,
the panel asks for one instead of rendering an empty box or a spinner that never
resolves.

## Accessibility and RTL

- Every icon-only control has a translated `accessibilityLabel`.
- Selection state is exposed with `accessibilityState.selected`; boundaries with
  `accessibilityState.disabled`.
- Labels and numbers are translated/formatted with the active language; icons
  mirror, row order follows the document direction.
- The chrome is not hidden behind a long-press: every destination is reachable
  with a single tap.

## What is still unverified

Device acceptance (task 6.7) is blocked on this machine: no iOS/Android device
or toolchain, and no hosting target for the web build. The sheet drag, native
back-button dismissal and the "chrome never covers text" check at real device
sizes have to be run before P5.4 is accepted.
