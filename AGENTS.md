# AGENTS.md

## Contributor & Git policy

Read `CONTRIBUTING.md` before starting work. It defines assignment records,
one-branch/one-worktree isolation, shared-file ownership, commit/push/merge/
deploy permissions, PR evidence fields, cleanup rules, and the scope boundaries
(demo meetings/progress, local photos, deferred Stage 9). The full P9.3 rewrite
of this file remains deferred.

## Commands

| Command                | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Dev server on **port 8080**                         |
| `npm run build`        | Vite build (outputs to `dist/`)                     |
| `npm run deploy`       | Firebase hosting deploy (`dist/` → `kuttab-othman`) |
| `npm run lint`         | ESLint                                              |
| `npm run format`       | Prettier format                                     |
| `npm run format:check` | Check formatting                                    |

**No test framework is configured.**

## Build & Deploy

- Firebase hosting serves `dist/` (Vite output)
- Entry point: `index.html` (Vite entry, root level) — no other `index.html` exists
- `root/index.html` hardcodes `lang="ar" dir="rtl" class="dark"` — these are overridden at runtime by i18n but the defaults matter for first paint
- Build artifact `dist/` is gitignored

## Tech Stack

- **React 19** + **Vite 8** + **TypeScript** (strict mode, `verbatimModuleSyntax`)
- **Tailwind v4** (via `@tailwindcss/vite`, no `tailwind.config.js` needed — minimal `src/tailwind.config.js` exists but only has `darkMode: 'class'`)
- **shadcn/ui** style components in `src/components/ui/` — uses Radix primitives + CVA variants
- **React Router v7** — routes defined as `route` objects, code-split via `lazy`
- **Firebase** (Auth, Firestore, Functions, Analytics) — env vars `VITE_FIREBASE_*` in `.env`
- **i18next** + `react-i18next` — Arabic/English, RTL auto-switches on `languageChanged`

## TypeScript

- Use `import type { ... }` for type-only imports
- No `enum` or `namespace` — use `erasableSyntaxOnly` alternatives
- `@/*` alias points to `src/`

## Prettier

- `tabWidth: 4`, `singleQuote: true`, `semi: true`, `printWidth: 80`
- Includes `prettier-plugin-tailwind-css` — format will sort Tailwind classes

## Routing

- `src/router/routes.tsx` defines all routes
- Route modules export `{ path, element }` objects
- Auth-protected routes wrapped in auth guard in router config
- Two layout wrappers: `MainLayout` (nav + footer) and `MinimalLayout` (clean/print)

## Authentication

- `AuthProvider` in `src/providers/` wraps the app in `App.tsx`
- Uses `onAuthStateChanged` + `fetchAccountData()` (Firestore profile merge)
- Context exposes `{ account, loading, error }`

## i18n & RTL

- `src/i18n/i18n.ts` initializes i18next and sets `document.dir` on `languageChanged`
- `ar` → RTL, `en` → LTR
- Translation files: `src/i18n/locales/{ar,en}/common.json`

## Firebase

- Exports: `auth`, `db`, `analytics`, `functions`, `googleAuthProvider`, `facebookAuthProvider`
- `.env` is gitignored — needs `VITE_FIREBASE_*` vars to work

## Project Structure

```
src/
├── components/ui/    # shadcn-style Radix + CVA components
├── firebase/         # Firebase init + auth/db/meetings helpers
├── hooks/            # Shared React hooks
├── i18n/             # i18next setup + locale files
├── layouts/          # MainLayout, MinimalLayout
├── lib/              # utils.ts (cn(), etc.)
├── pages/            # Route pages with route.tsx exports
├── providers/        # AuthProvider, ThemeProvider, etc.
├── router/           # routes.tsx + guards
└── types/            # Shared TypeScript types
```

## Key Gotchas

- **Root `index.html`** is the Vite entry — modifying it changes the dev/build experience
- **Dark mode**: default class applied in HTML, toggled via `ThemeProvider`
- **PWA**: served from `public/js/` (manifest + service worker in `public/js/`)
- **`src/pages/` route files** export `{ path, element }` — NOT default exports
