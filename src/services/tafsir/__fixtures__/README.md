# Tafsir fixtures

Recorded from the live quranpedia API on 2026-10-31 (UTC), not hand-written.
They exist to prove the request shape and the local-versus-absolute ayah
mapping: ayah 2:262 is **absolute** number 269, so a request that sends 269 as
the ayah path is wrong even though it returns 200.

| File                    | Source URL                                                    |
| ----------------------- | ------------------------------------------------------------- |
| `options-tafsir.json`   | `GET /v1/ayah/2/262/tafsir` (first 3 of the live list)        |
| `options-e3rab.json`    | `GET /v1/ayah/2/262/e3rab` (first 3)                          |
| `options-translations.json` | `GET /v1/ayah/2/262/translations` (first 3)               |
| `book-tafsir.json`      | `GET /v1/ayah/2/262/book/3`                                   |
| `book-e3rab.json`       | `GET /v1/ayah/2/262/book/180`                                 |
| `book-translation.json` | `GET /v1/ayah/2/262/book/1947`                                |
| `surah-information.json`| `GET /v1/surah/information/2` (three sections)                |

Notes recorded while validating:

- The reference panel requested options with `surah/absoluteNumber` and content
  with `surah/ayahKey`. Options tolerate the absolute number today, but the
  documented book endpoint is local, so this app uses `surah/ayah` for both.
- The reference's `surah` and `translation` types are not service names. The API
  rejects `surah` and `translation` with `Unknown service type`; the real paths
  are `/surah/information/{surah}` and the `translations` book list.
- Book bodies include HTML (`<span>`, `<br>`, entities). The parser converts
  them to plain text before rendering.
