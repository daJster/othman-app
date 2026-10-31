# Acceptance matrix

**Integration SHA:** `a921523` (native export/peer fix) plus this docs commit
**Web runner:** Playwright 1.64 / Chromium 156 headless, `npm run preview:web`
**Native runner:** none on this machine (no Java/Android SDK, no macOS/iOS, no device)

## Targets

| Target                 | Runner / evidence               | Status  |
| ---------------------- | ------------------------------- | ------- |
| Desktop web (1024)     | Playwright, `docs/web-regression.md` | PASS |
| Tablet web (768)       | Playwright, `docs/web-regression.md` | PASS |
| Mobile web (375)       | Playwright, `docs/web-regression.md` | PASS |
| Small Android          | none — no device/SDK            | BLOCKED |
| Small/large iPhone     | none — no macOS/device          | BLOCKED |
| Native tablet          | none — no device                | BLOCKED |

Web export identifier: static Expo export from `a921523` (16 routes).
Native build identifiers: none; `build:ios` / `build:android` JS exports pass,
but no installable build or device run exists.

## Feature surfaces

| Surface | Web | Native | Notes |
| ------- | --- | ------ | ----- |
| Home | PASS | BLOCKED | `home` renders, links, RTL/LTR, 375/768/1024 |
| Quran entry | PASS | BLOCKED | `/quran` direct navigation |
| Reader | PASS | BLOCKED | live catalog/bboxes, ayah tap, drag/touch turn |
| Read panel | PASS | BLOCKED | selected ayah text (component + web smoke) |
| Tafsir panel | PASS | BLOCKED | live quranpedia text in browser smoke |
| Notes panel | PASS | BLOCKED | panel states in Jest; no device relaunch check |
| Audio | PARTIAL | BLOCKED | controls covered by Jest; live audio not exercised |
| Sign-in | PARTIAL | BLOCKED | route renders; Google popup needs authorized origin |
| Meetings | BLOCKED | BLOCKED | signed-out redirect verified; signed-in data is mock |
| Account | BLOCKED | BLOCKED | signed-out redirect verified; profile needs real session |
| Progress | BLOCKED | BLOCKED | signed-out redirect verified; demo data only |
| About | PASS | BLOCKED | static content and links |
| Deep links (web) | PASS | BLOCKED | `/reader/1`, query links resolve |
| Deep links (native) | n/a | BLOCKED | needs device |

## P4 acceptance (task 14.6)

| P4 item | Result |
| ------- | ------ |
| P4.1 Home | Web PASS (both languages/themes, 375/768/1024); native BLOCKED |
| P4.2 Meetings | Signed-out redirect PASS; signed-in grid/list BLOCKED (mock data, no device) |
| P4.3 Account | Signed-out redirect PASS; signed-in form/photo BLOCKED (no session/device) |
| P4.4 Progress | Signed-out redirect PASS; heatmap live check BLOCKED |
| P4.5 About | Web PASS; native list chrome BLOCKED |

No earlier manual checkbox is discarded: native rows remain unchecked in
`openspec/changes/complete-expo-migration/tasks.md`.

## Deferred obligations

- Google popup on an authorized origin (15.3).
- Authorized preview deploy (15.6).
- Native device acceptance (3.x, 5.11, 6.7, 7.4, 8.5, 9.6, 10.5, 11.6, 14.x).
- P7 profiling and the conditional native module (12.x, 13.x).
- Stage 9 release/CI/documentation work (18–20), still not activated.
- `Link.Preview` / `Link.Menu`: no list → detail route exists; deferred with the
  P3.2 note in `MIGRATE.md` rather than inventing routes.
