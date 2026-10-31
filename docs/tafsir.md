# Tafsir and content sources

The reader's Tafsir panel offers four categories preserved from the reference
panel: **tafsir**, **e3rab**, **translation**, and **surah information**. All
text comes from the live quranpedia API; no content is bundled or fabricated.

## Layers

| Layer      | File                                              | Responsibility                                   |
| ---------- | ------------------------------------------------- | ------------------------------------------------ |
| Domain     | `src/core/domain/quran/tafsir.ts`                 | Boundary parsing, HTML flattening, size caps.    |
| Repository | `src/services/tafsir/tafsir.repository.ts`        | quranpedia URLs and transport.                   |
| Service    | `src/services/tafsir/tafsir.service.ts`           | Use-cases over the repository.                   |
| Query      | `src/features/quran/use-tafsir.ts`                | Cache keys, type/source identity, retries.       |
| Surface    | `src/features/quran/components/tafsir-panel.tsx`  | Native pickers and the four content states.      |

## Provider mapping (validated 2026-10-31)

| UI type     | Option list                                   | Content                                      |
| ----------- | --------------------------------------------- | -------------------------------------------- |
| `tafsir`    | `GET /v1/ayah/{surah}/{ayah}/tafsir`          | `GET /v1/ayah/{surah}/{ayah}/book/{bookId}`  |
| `e3rab`     | `GET /v1/ayah/{surah}/{ayah}/e3rab`           | same book endpoint                           |
| `translation` | `GET /v1/ayah/{surah}/{ayah}/translations`  | same book endpoint                           |
| `surah`     | none                                          | `GET /v1/surah/information/{surah}`          |

Two reference-panel defects were corrected:

1. **Local, not absolute, ayah numbers.** Ayah 2:262 is absolute 269. The
   reference sent the absolute number for options and the local number for
   content; the option endpoint happened to ignore it. This app sends
   `surah/ayah` to both.
2. **Real service names.** The API rejects `surah` and `translation`
   (`Unknown service type`). Surah information is its own endpoint and
   translations use the plural `translations` book list.

Recorded fixtures and the exact URLs live in
`src/services/tafsir/__fixtures__/README.md`.

## Payload cap and parsing

- `MAX_CONTENT_CHARS = 120_000` is enforced on the joined text of one book.
- `MAX_CONTENT_PARTS = 200` bounds the number of book parts.
- Exceeding either throws `ContentTooLargeError`; the panel shows a retryable
  error instead of rendering an unbounded response.
- Book bodies contain HTML (`<span>`, `<br>`, entities). The parser converts
  them to plain text: `<br>` becomes a line break, block closers become
  paragraph breaks, tags are stripped, then entities are decoded.
- Direction comes from `book.language.direction`: Arabic tafsir/e3rab is RTL, an
  English translation is LTR even inside an RTL reader.
- A response with no text is a distinct **empty** result. It is never converted
  to a successful empty string, and transport/parse failures stay errors.

## Query identity and selection rules

```
['othman', 'tafsir', 'sources', type, absoluteAyah]
['othman', 'tafsir', 'content', type, absoluteAyah, sourceId]
['othman', 'tafsir', 'surah', surah]
```

- A type change starts a new option query, so one type's list cannot answer for
  another.
- The selected source is cleared on type/ayah change. Content is disabled until
  the new option list resolves **and** contains the chosen id, so the previous
  type's source is never requested under the new type.
- Content requests are keyed by source id as well as type, so two sources of the
  same ayah cannot reuse each other's text.

## Panel states

| State   | Sources surface          | Body surface                        |
| ------- | ------------------------ | ----------------------------------- |
| pending | `Loading`                | `Loading`                           |
| error   | `ErrorState` + retry     | `ErrorState` + retry (this source)  |
| empty   | "no sources" + retry     | "no text for this ayah"             |
| ready   | native source `Picker`   | selectable text with source direction |

Surah information renders titled sections with the same pending/error/empty/ready
rules. A body failure never clears the reader selection or the other panels.

## Verification

- `src/core/domain/quran/__tests__/tafsir.test.ts` — source parsing, HTML
  flattening, direction, empty vs. error, both caps.
- `src/services/tafsir/__tests__/tafsir.repository.test.ts` — recorded fixtures,
  local-vs-absolute URL assertions, service paths, transport failure.
- `src/features/quran/__tests__/use-tafsir.test.tsx` — source selection, type
  switch invalidation, no stale source, surah info, retry, empty.
- `src/features/quran/__tests__/tafsir-panel.test.tsx` — four states, retry,
  direction, type change, surah sections.

Live all-target acceptance (device themes, 200% text, oversized/failing live
sources) remains blocked with groups 12/17 on this machine.
