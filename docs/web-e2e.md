# Web E2E (Expo)

Browser regression for the Expo web build. It exercises **platform logic only**
— routing, guards, storage hydration, responsive layout, reader navigation,
local notes, panels, deep links, and recovery states. It does not sign in and
does not assert against backend data.

## Launch the app

### Development server (Expo)

```bash
npm install
cp .env.example .env      # fill EXPO_PUBLIC_FIREBASE_*; Google IDs optional on web
npm run web               # expo start --web
```

`npm start` and pressing `w` is equivalent. The dev server prints its URL
(usually <http://localhost:8081>). Web needs no Google client ID because it uses
the Firebase popup; `.env` must contain the public Firebase web config.

### Production-like static export

```bash
npm run build:web         # static export to dist/
npm run preview:web       # http://localhost:8088 (Firebase rewrite rules)
```

`preview:web` mirrors `firebase.json`: generated routes first, the reader shell
for `/reader/:page`, then the SPA fallback.

## Run the E2E suite

```bash
npx playwright install chromium   # once
npm run build:web
npm run preview:web               # leave running
npm run e2e:web                   # in a second terminal
```

- Target another host with `E2E_BASE_URL=https://…`.
- Keep failure screenshots/results with `E2E_SCREENSHOTS=1` (writes
  `e2e-artifacts/`).
- The script exits non-zero on the first failed run summary.

## What it checks

| Area | Checks |
| ---- | ------ |
| Launch | localhost 200, title, public tabs, active tab, no runtime errors |
| Layout | 375 / 768 / 1024: no horizontal overflow, top nav, no console errors |
| Storage | Arabic/RTL + dark and English/LTR + light hydrate and survive reload |
| Guards | `/account`, `/meetings`, `/account/edit`, `/account/progress` redirect to sign-in with `returnTo` |
| Sign-in UI | invalid email rejected, valid email advances, empty password rejected, no fabricated error, back |
| Quran entry | tab opens the reader at a real page |
| Reader | page image + overlays load, tap selects, live tafsir, type switch, surah info, audio sheet opens |
| Notes | save, guest/versioned local payload, survive reload |
| Turns | mouse drag page 1 → 2, URL becomes `/reader/2`, reload restores page 2 |
| Deep links | `?surah=2&ayah=255` resolves to page 42 / Ayah 255, `/reader/9999` clamps to 604, invalid link recovers |
| Recovery | blocked bbox requests show retry; retry recovers |
| 404 | unknown URL and `/error/404` render the not-found screen |

Latest run: **61/61 checks passed** (see `docs/web-regression.md`).
