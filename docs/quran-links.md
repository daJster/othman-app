# Quran links and restore

The reader accepts the same three parameters on both platforms:

| Platform | Shape                                   |
| -------- | --------------------------------------- |
| Native   | `othman://quran?page=&surah=&ayah=`     |
| Web      | `/quran?page=&surah=&ayah=`             |
| Share    | `https://kuttab-othman.web.app/quran?…` |

`src/features/quran/links.ts` owns the parser, the three builders and the
resolver. Route code never re-implements them.

## Parsing

| Input                              | Result                       |
| ---------------------------------- | ---------------------------- |
| no parameters                      | `empty` → restore saved page |
| `page=42`                          | page link                    |
| `surah=2`                          | ayah 1 of surah 2            |
| `surah=2&ayah=255&page=1`          | both; ayah mapping wins      |
| `page=0` / `page=9999`             | parsed, then clamped         |
| duplicated parameter               | `invalid` (duplicate)        |
| `page=abc`, `page=1.5`, `page=-1`  | `invalid` (malformed)        |
| `surah=0`, `surah=115`, `ayah=287` | `invalid` (malformed)        |
| `ayah=255` without `surah`         | `invalid` (conflict)         |

Malformed input is rejected, never coerced: `page=abc` is not page 1. A link
that cannot be read gets a recoverable error screen whose action opens the Quran
tab; no fabricated position is shown.

## Resolution

`resolveQuranLink` runs once the edition and its geometry are attached.

- **Surah/ayah** is authoritative. The edition's `bySurah` table decides the
  page, so `surah=2&ayah=255&page=1` opens page 42 (Hafs) and selects the ayah.
- **Surah without ayah** means ayah 1.
- **An ayah the edition's table does not contain** is `invalid` — recoverable,
  not page 1.
- **Page only** clamps into the edition: Warsh starts at 4, MedinaOld ends at
  605, and `page=9999` lands on the last real scan.

## Apply once

The screen (not `ReaderBody`) owns the "link applied" flag, because
`ReaderBody` remounts per edition. Consequences:

- a link is applied **after** the saved page is restored, so the link wins;
- it is applied **once**, so a later page turn is not undone by a re-render;
- an edition switch does **not** re-apply it, so switching keeps the reader's
  new (possibly clamped) position.

## Share

The reader menu's Share action builds the public web URL from the current
position: `page` plus `surah`/`ayah` when an ayah is selected. On a page with no
selection only `page` is shared, so the recipient lands on the same scan. The
shared link is built by the same builder the app parses, which is what keeps the
round trip free of off-by-one identity errors.

`Share.share` is used from React Native; web uses `navigator.share`. A cancelled
share and an unsupported browser both reject, and both are intentionally
ignored rather than turned into an error modal.

## Verification

- `links.test.ts` — parsing shapes, duplicates/malformed/conflict, builder
  round trips, resolver precedence, clamping, nonstandard ranges, unknown ayah.
- `reader-screen.test.tsx` — link wins over restored page, ayah mapping wins
  over contradictory page, invalid ayah recovery, applied-once, no re-apply on
  edition switch, share payload.
- `quran-screen.test.tsx` — tab forwards page and surah/ayah links, malformed
  link shows recovery.

Cold/warm-link smoke on a real iOS/Android device and a deployed web host is
blocked with the other device acceptance work (groups 12/17).
