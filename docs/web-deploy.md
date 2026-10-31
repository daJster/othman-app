# Web build, preview, and deploy

The web app is a **static Expo Router export** (`web.output: 'static'`) served
from the repository-root `dist/` directory. The frozen `othman-web/` Vite app is
reference material only and is never part of the output.

## Commands

| Command             | What it does                                                     |
| ------------------- | ---------------------------------------------------------------- |
| `npm run build:web` | Export the static site to `dist/` (16 routes + assets + fonts).  |
| `npm run check:web` | Assert required routes/assets exist and hosting rules are sound. |
| `npm run preview:web` | Serve `dist/` with the same clean-URL/reader/fallback rules.    |
| `npm run deploy`    | Build, check, then `firebase deploy --only hosting`.             |

`preview:web` defaults to <http://localhost:8088>; set `PORT` to change it.

## Hosting shape

`firebase.json` targets the `kuttab-othman` hosting site in the `othman-kuttab`
project (`.firebaserc`), serves `dist`, and mirrors how Expo names output files:

- `cleanUrls: true` so `/quran` serves `quran.html` and `/about` serves
  `about.html` instead of always falling through to the SPA shell;
- `/reader/:page` → `/reader/[page].html` so direct reader URLs and refreshes
  serve the generated reader route, not an unrelated page;
- `**` → `/index.html` as the final unmatched-route fallback.

The local preview implements the same order, so a passing preview is evidence
for direct navigation and refresh before a real deploy.

> Deploying is a separate authorization (`15.6`). The site/project pair above
> follows the existing app configuration and must be confirmed by the maintainer
> against the intended Firebase target before the first deploy.

## Web auth configuration

The Firebase web config is public and comes from `EXPO_PUBLIC_FIREBASE_*`
(`.env`, gitignored). Google sign-in uses `signInWithPopup`, so the deployed and
preview hosts must be listed in Firebase Authentication → Settings → Authorized
domains, and the OAuth client must allow the same JavaScript origin. No client
secret belongs in this repository.

## Startup and fonts

`BootProvider` withholds the app until theme, language, and `useFonts` settle;
the three bundled families (`Inter-Variable`, `NotoNaskhArabic-Variable`,
`AmiriQuran-Regular`) are emitted under `dist/assets/assets/fonts/`. The static
export is also the guard against module-scope browser globals: it renders every
route in Node during `expo export`.

## PWA

There is intentionally **no service worker, manifest, or offline app shell**.
`check:web` fails if a service-worker/workbox asset appears in `dist/`. Offline
media downloads and PWA installation are out of scope for this migration.
