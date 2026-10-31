# Web regression report (P8.1/P8.2)

**Tested tree:** `d4051c2` (current `659d39f` is formatting-only)
**Date:** 2026-10-31
**Target:** static Expo web export served with the Firebase Hosting rules.

## Result

| Gate                        | Result                                           |
| --------------------------- | ------------------------------------------------ |
| `npm run verify`            | **PASS** — 92 suites / 732 tests                 |
| `npm run build:web`         | **PASS** — 16 static routes, CSS, JS, 3 font files |
| `npm run check:web`         | **PASS** — routes, hosting rules, no PWA/legacy  |
| `npm run e2e:web`           | **PASS** — 61/61 checks                          |

Browser run: Chromium headless, English/light and Arabic/dark, widths 375, 768,
1024. No console errors or page errors in the final run. The suite is documented
and reproducible in [`docs/web-e2e.md`](web-e2e.md).

## Routes verified by direct navigation/refresh

| URL                 | Expected                 | Result |
| ------------------- | ------------------------ | ------ |
| `/`                 | Home                     | PASS   |
| `/quran`            | Quran entry              | PASS   |
| `/about`            | About                    | PASS   |
| `/auth/sign-in`     | Sign-in                  | PASS   |
| `/reader/1`         | Reader page 1            | PASS   |
| `/account`          | redirect to sign-in      | PASS   |
| `/meetings`         | redirect to sign-in      | PASS   |
| `/account/edit`     | redirect to sign-in      | PASS   |
| `/account/progress` | redirect to sign-in      | PASS   |

Signed-out private URLs land on `/auth/sign-in` with the internal `returnTo`
preserved, instead of falling back to Home.

## Interaction checks

- Top navigation is a top bar at every width; it wraps at 375 px and never
  becomes a phone-style bottom bar.
- Tabs are real `<a href>` elements: hrefs, active `aria-current`, and
  modifier-click/new-tab semantics are intact.
- Ayah tap updates the reader header identity.
- Tafsir opens from the reader menu and renders **live** source text.
- Mouse drag turns the page (page 1 → 2), including a drag started over ayah
  text; touch drag also turns the page.
- Document direction is `rtl`/`ar` and `ltr`/`en` as expected; no horizontal
  overflow at 375/768/1024.
- Fonts report `loaded`; the Arabic page uses `NotoNaskhArabic-Variable`.

## Defects found and fixed in this pass

1. **Live Tajweed bbox rejected the whole edition.** Surah 8 ayah 52 has one
   zero-width rectangle; the parser now drops degenerate boxes without clamping
   (`03cb5d3`).
2. **Signed-out `/account` and `/meetings` redirected to Home.** The web tab
   shell only registered visible tabs, so `RequireAuth` was never reached. All
   registry tabs now register; private ones are hidden from the bar
   (`d4051c2`).
3. **Tabs were buttons, not links.** Web tabs now render real anchors while
   preserving router navigation for plain clicks (`d4051c2`).
4. **Dragging over ayah text selected text and cancelled the page turn.**
   Overlay boxes set `userSelect: none` (`d4051c2`).
5. **Audio prefetch produced a guaranteed CORS error on web.** Prefetch is
   skipped on web; playback itself is unaffected (`d4051c2`).
6. **A page turn did not update the reader URL.** Refreshing or sharing the
   address bar jumped back to the page the reader started from. The URL now
   follows the page and drops consumed `surah`/`ayah` params; reload restores
   the current page (`reader-screen.tsx`, unit test + E2E).

## Evidence

- [Home, English/light, 1024](evidence/web/home-en-light-1024.png)
- [Home, Arabic/dark, 375](evidence/web/home-ar-dark-375.png)
- [Reader, English/light, 1024](evidence/web/reader-en-light-1024.png)
- [Reader, Arabic/dark, 375](evidence/web/reader-ar-dark-375.png)

Reproduce:

```bash
npm run build:web
npm run check:web
npm run preview:web
# then open http://localhost:8088
```

## Not covered / blocked

- **15.3:** live Google popup requires the deployed/preview host to be an
  authorized Firebase/OAuth origin. Configuration is documented, but the popup
  itself was not exercised.
- **15.6:** publishing requires separate deployment authorization and target
  confirmation.
- Groups 12–14 and 17–20 remain device-dependent or deferred; they were not run
  in this pass.
- Native layouts/gestures are not inferred from web results.
