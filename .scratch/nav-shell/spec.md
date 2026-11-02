# Nav shell — modularity, web bar UX, native tab polish

Status: in progress
Date: 2026-11-02
Feature slug: `nav-shell`

## Assignment

| Field                 | Meaning                                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package / IDs         | Nav shell rebuild (web top bar + native tab bar)                                                                                                                                                                                                          |
| Owner                 | agent-A (maintainer-delegated, interactive session)                                                                                                                                                                                                       |
| Branch / worktree     | `feat/nav-shell-rebuild` · `../othman-worktrees/nav-shell-rebuild`                                                                                                                                                                                        |
| Base SHA              | `1e5b3fc` (RNR primitive layer)                                                                                                                                                                                                                           |
| Prerequisites         | none — `ui/icon-page-modernization` plans 001–008 are DONE                                                                                                                                                                                                |
| Owned paths           | `src/app/(tabs)/_layout.tsx`, `src/app/(tabs)/_layout.web.tsx`, `src/features/navigation/**`, `src/features/settings/**`, `src/components/blocks/user-menu.tsx` (moved into the nav feature), `scripts/e2e-web.mjs`, `DESIGN.md`, `.scratch/nav-shell/**` |
| Authorized operations | commit to this topic branch                                                                                                                                                                                                                               |
| Checks                | focused Jest suites, `npm run verify`, `npm run build:web && npm run check:web`, `npm run e2e:web`                                                                                                                                                        |
| Evidence owner        | maintainer (Pixel + iPhone + browser)                                                                                                                                                                                                                     |
| Tested SHA            | recorded in the PR                                                                                                                                                                                                                                        |

Not authorized: push, merge, deploy, branch/worktree deletion, edits to
`src/app/_layout.tsx`, locale files, `package.json`, or `othman-web/`.

## Decisions

Settled with the maintainer before implementation (recommendations accepted):

1. **Scope** — the two chrome surfaces that exist: the web top bar and the
   native bottom tab bar. No new native top app bar; page titles stay in-page
   (plans 002/003 removed duplicate `h1`s on purpose).
2. **Signed-out destinations** — always render all four destinations. A private
   destination stays visible; its own `RequireAuth`/root redirect sends a
   signed-out visitor to sign-in with `returnTo`. This removes the shrinking
   tab bar and the native navigator remount that
   `NativeTabs` documents for dynamic `hidden`. `visible-tabs.ts`,
   `use-visible-tabs.ts` and their test are deleted with this decision: the
   filter had no consumer left, and a hidden policy that nobody applies is worse
   than none.
3. **Web trailing cluster** — three ghost controls, no border and no chevron:
   theme (palette-class icon only, the active mode marked in its menu),
   language (icon plus the language's own name, icon-only below `sm`) and the
   session menu (avatar when signed in, menu glyph otherwise) with Account,
   Progress and Sign in / Sign out. The old pair of `Select` triggers is gone:
   it carried a border and a chevron, and showed `Auto` / `AR` instead of the
   values a reader recognises.
4. **Mobile web destinations** — icon above a short label at every width, so
   the bar is never a row of unlabeled glyphs. The three trailing controls keep
   a 44 pt target; the language _name_ is the only thing that drops below `sm`
   (icon and `aria-label` remain), because four labelled destinations leave
   ~90 px at 375 and the name does not fit.
5. **Delivery** — three commits on one topic branch: (1) extraction + tests,
   zero visual change; (2) web bar UX; (3) native tab polish. Each commit must
   pass `npm run verify`.
6. **Native tab bar** — keep `NativeTabs`. Make the platform defaults explicit:
   Android `labelVisibilityMode="labeled"` (Material's `auto` drops labels past
   three items), iOS 26 `minimizeBehavior="never"` (the bar is the only chrome;
   hiding it on scroll buys nothing), selected label tinted with the same token
   as the selected icon, and a `testID`/`accessibilityLabel` per destination so
   one device test can drive either shell. No new native top bar.
7. **Menu surface** — the design system has no `--popover-*` pair (menus were
   native when it was written), while RNR's `DropdownMenu` paints `bg-popover`.
   The nav menus override the surface with `bg-background` instead of adding the
   token: the token made Prettier's Tailwind sorter reorder six RNR primitives
   in this worktree, and the sorter could not see the new variable consistently
   there (`node_modules` is junctioned to the main checkout). Porting
   `--popover-*` belongs in a normal checkout that can verify the sorter; until
   then the menu renders on the page ground, which is the only surface the
   design system offers anyway.

## Hard constraints (verified)

- `expo-router`'s headless tabs discover triggers by element identity:
  `parseTriggersFromChildren` in `node_modules/expo-router/build/ui/Tabs.js`
  only recurses into an element whose type **is** `TabList`, and only collects
  `TabTrigger` children **inside** it. A wrapper component that renders
  `<TabList>` registers zero routes silently. `TabList` must stay a direct
  child of `Tabs`, and every `TabTrigger` a direct child of `TabList`.
- `TabList` applies its own `style` after `className` (`flexDirection`,
  `justifyContent`), so `justifyContent` must travel through `style`; padding
  does not, and can use `PAGE_GUTTER`.
- Every tab stays a real `<a href>` on web: middle-click, Cmd/Ctrl-click,
  focus order and the status bar depend on it.
- `src/features/navigation/web-link.ts` owns the click policy and is unit
  tested; do not duplicate the modifier checks in a component.

## Out of scope

- Reader chrome (`src/features/quran/**`, `docs/reader-chrome.md`).
- Sign-in/account screens and the Account settings list.
- `othman-web/` (frozen reference material).

## Evidence

Web (this worktree, `dist` exported and served at :8089):

- `npm run verify` — 98 suites / 753 tests, typecheck, core purity, i18n audit,
  lint (0 errors), format all green.
- `npm run build:web` → `Exported: dist`; `npm run check:web` → passed.
- `npm run e2e:web` — 74/74 checks, including the four labelled destinations at
  375/768/1024, the nav landmark, `aria-current`, the trailing menu opening with
  theme/language/session entries, and a theme choice applying.
- Screenshots inspected at 375/768/1440 in en-light and ar-dark: labels visible
  at every width, active underline flush on the bar hairline, menu opaque and
  anchored to the avatar on both sides of the bar.
- `npm run build:ios` → `Exported: dist-ios`; `npm run build:android` →
  `Exported: dist-android` (bundling only).

Native device evidence: **pending** — this agent cannot drive the maintainer's
Pixel or iPhone. See the hand-off checklist in the PR.
