# Acceptance matrix

**Tag:** `0.5-post-migration`
**Web runner:** Playwright 1.64 / Chromium 156 headless, `npm run preview:web`
**Native runner:** none on this machine (no Java/Android SDK, no macOS/iOS, no device)

## Targets

| Target                 | Runner / evidence               | Status  |
| ---------------------- | ------------------------------- | ------- |
| Desktop web (1024)     | Playwright, `docs/web-regression.md` | PASS |
| Tablet web (768)       | Playwright, `docs/web-regression.md` | PASS |
| Mobile web (375)       | Playwright, `docs/web-regression.md` | PASS |
| Small Android          | Expo Go, maintainer device      | PARTIAL (manual smoke; not automated here) |
| Small/large iPhone     | none — no macOS/device          | BLOCKED |
| Native tablet          | none — no device                | BLOCKED |

Web export identifier: static Expo export at tag `0.5-post-migration` (16 routes).
Native build identifiers: no installable builds; `build:ios` / `build:android` JS
exports pass.

## Feature surfaces

| Surface | Web | Native | Notes |
| ------- | --- | ------ | ----- |
| Home | PASS | PARTIAL | layout, links, RTL/LTR, 375/768/1024; sign-in button |
| Quran entry | PASS | PARTIAL | `/quran` direct navigation |
| Reader | PASS | PARTIAL | live catalog/bboxes, ayah tap, drag/touch turn |
| Read panel | PASS | PARTIAL | selected ayah text |
| Tafsir panel | PASS | PARTIAL | live quranpedia text, type switch, surah info |
| Notes panel | PASS | PARTIAL | save + reload persistence; native relaunch not automated |
| Audio | PARTIAL | PARTIAL | panel opens; live playback/interruption not automated |
| Sign-in | PARTIAL | PARTIAL | route/UI verified; Google popup needs authorized origin |
| Meetings | PASS | PARTIAL | all tabs open in development mode; mock data |
| Account | PASS | PARTIAL | mock profile in development mode |
| Progress | PASS | PARTIAL | demo data, detail sheet |
| About | PASS | PARTIAL | static content and links |
| Deep links (web) | PASS | n/a | `/reader/1`, query links resolve |
| Deep links (native) | n/a | BLOCKED | needs device |

## P4 acceptance (task 14.6)

| P4 item | Result |
| ------- | ------ |
| P4.1 Home | Web PASS; native manual PARTIAL |
| P4.2 Meetings | Web PASS; native manual PARTIAL |
| P4.3 Account | Web PASS with mock profile; native PARTIAL |
| P4.4 Progress | Web PASS with demo data; native PARTIAL |
| P4.5 About | Web PASS; native PARTIAL |

## Stage 6 / 8 implementation

| Item | Result |
| ---- | ------ |
| P6.1 Audio | Implementation + tests PASS; device audio acceptance BLOCKED |
| P6.2 Notes | Implementation + browser reload PASS; native keyboard BLOCKED |
| P6.3 Tafsir | Implementation + live web sources PASS; native large-text/theme BLOCKED |
| P8.1 Web build/deploy | Build, hosting config, local preview PASS; hosted preview + popup BLOCKED |
| P8.2 Web parity | 67/67 browser checks PASS |
| P8.3 Cross-target QA | Matrix recorded; web PASS, native BLOCKED |

No earlier manual checkbox is discarded: native rows remain unchecked in
`openspec/changes/complete-expo-migration/tasks.md`.

## Deferred obligations

- Google popup on an authorized origin.
- Authorized hosted preview deploy.
- Native device acceptance (audio, keyboard, large text, accessibility, deep links).
- P7 profiling and the conditional native module.
- Stage 9 release/CI/documentation work, still not activated.
- `Link.Preview` / `Link.Menu`: no list → detail route exists; deferred with the
  P3.2 note in `MIGRATE.md` rather than inventing routes.
