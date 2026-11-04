# Plan 012: Daily hizb gauge and reading-activity board (catalog modules)

> **Executor instructions**: This plan is **BLOCKED until the two catalog
> components can be retrieved**. Read "Precondition" first. If the retrieval
> path is unavailable, stop immediately and report — **do not hand-write,
> approximate, or "recreate" either component**. Their content belongs to the
> catalog and recreating it is explicitly out of bounds.
>
> **Drift check (run first)**:
> `git diff --stat de327df..HEAD -- "src/app/(tabs)/quran.tsx" src/features/quran`

## Status

- **Priority**: P1
- **Effort**: M (once unblocked)
- **Risk**: MED
- **Depends on**: 009 (reading log), 010 (page composition)
- **Category**: direction
- **Planned at**: commit `de327df`, 2026-11-03
- **Issue**: —
- **Status**: BLOCKED — see Precondition

## Precondition (read before anything)

The two surfaces this plan adds are catalog components:

- `shadcnblocks/contribution-graph` — the reading-activity board
- `sadmann7/gauge` — the daily hizb gauge

They are authorized by the cart
`https://catalogs.dev/cart/888b3981418b12a949bb33811d9d750d`.

Retrieve them in this order:

1. the `get_cart` tool, if it is connected to the session;
2. otherwise `ctlgs cart get https://catalogs.dev/cart/888b3981418b12a949bb33811d9d750d`.

At the time this plan was written **neither existed** (no `get_cart` tool; `ctlgs`
not on PATH), so the plan is BLOCKED. If either call reports a sign-in, team, or
permission problem, stop and report it. Do not switch tools, remove credentials,
skip an item, or rebuild the component by hand to route around the failure.

## Why this matters

Two of the five modules are *glances*, not reading: how much of today's hizb is
done, and whether the last two weeks have any shape. They are the only modules
where a component library earns its place — a gauge and a contribution grid are
harder to get right than they look (arc geometry, cell hit targets, empty
states). Everything else on the page is built from the house grammar; these two
are built from the catalog and adapted to the tokens.

## Data contracts (from plan 009 — do not re-derive)

`src/features/quran/history/use-reading-log.ts`:

- `useDailyHizb(day, target = 10)` → `{ read: number, target: number, done: boolean }`.
  `read` is clamped to `target`; `done` is `read >= target`.
- `useReadingLog()` → `{ entries: ReadingEntry[], ready: boolean }`, where each
  entry has `day` (`YYYY-MM-DD`), `page`, `surah`, `readPages: number[]`.

The hizb target is **10 pages per day** — a hizb is 1/60 of the 604-page mushaf.

## Design constraints

- These are **bands on a hairline page**, not cards on a dashboard: the module
  wrapper is `<View className="border-b border-border py-7 md:py-8">` supplied by
  plan 010. The catalog components sit *inside* that band.
- Restyle the catalog components to the design tokens:
  `--color-brass` for the gauge arc, `--color-accent` / `--color-muted` for
  activity cells, `--color-foreground` for the numerals. No default shadcn zinc
  palette may survive; `DESIGN.md` bans colours outside the token block (the one
  documented exception is `core/utils/heatmap.ts`, which is memorisation data,
  not reading activity — do not reuse it here).
- The gauge's two end states are **cross + empty** and **check + full**, both
  monochrome-dark/brass except the check, which is `--color-success`.
- The completion popup must respect reduced motion: use the app's
  `useReducedMotion()` from `@/ui/motion` and render the state change without
  the scale/opacity animation when it returns true.
- Nothing mirrors between languages (see `DESIGN.md` → Direction).

## Scope

**In scope**

- `src/features/quran/components/daily-hizb-band.tsx` (new)
- `src/features/quran/components/activity-band.tsx` (new)
- the catalog files themselves, vendored under `src/components/ui/` following
  whatever path the cart's install instructions give
- `src/features/quran/__tests__/daily-hizb-band.test.tsx` (new)
- `src/features/quran/__tests__/activity-band.test.tsx` (new)
- `src/app/(tabs)/quran.tsx` — mount the two bands in their slots
- `src/i18n/locales/{en,ar}/common.json`
- `package.json` only if the catalog components require a dependency

**Out of scope**

- Any other page.
- The reader.
- `core/utils/heatmap.ts` (memorisation ramp, different data).
- Hand-rolled substitutes for either catalog component.

## Steps (once unblocked)

### Step 1: Vendor the components

Run the retrieval, follow the cart's install instructions exactly, and vendor
the files where they say. Record in the plan's PR description which command
produced them.

**Verify**: the two component files exist and `npm run typecheck` exits 0.

### Step 2: Daily hizb band

`daily-hizb-band.tsx` renders: the band label (`quran.landing.hizb`), the gauge
with `value = read / target`, the numerals `read / target` in `tabular-nums`,
and the end-state icon (cross at 0, check at `done`). On the transition into
`done`, show the popup once per day — key it on `day` so a re-render does not
replay it.

Strings (both locales, `quran.hizb.*`): `title`, `progress` (`"{{read}} of
{{target}} pages"`), `done`, `hint` (one line naming the source of the number,
e.g. "counted from today's reading").

**Verify**: `npm test -- daily-hizb-band` → cases: 0 pages shows the cross; a
partial day shows the arc at 3/10 and no check; 10 pages shows the full arc,
the check, and the popup once.

### Step 3: Activity band

`activity-band.tsx` renders the contribution grid from
`entries.map(e => ({ day: e.day, count: e.readPages.length }))`, with a
five-step intensity scale mapped to `accent` at 20/40/60/80/100 %, a legend
row ("less … more"), and **no** hover-only information (native has no hover):
each cell is a `Pressable` with an `accessibilityLabel` naming the day and the
page count.

Grid length: **last 14 weeks** on phones, **last 26 weeks** on web ≥ 768 — read
the width from `useIsWide()` (`src/ui/layout.ts`), not from a user agent.

**Verify**: `npm test -- activity-band` → cases: empty log renders a flat grid
with no crash; one day with 4 pages colours exactly one cell at step 3; the
label announces the count.

### Step 4: Mount and gate

Mount both bands in the slots plan 010 left. **Verify**: `npm run verify` →
green; `/quran` at 390 and 1440 shows both bands inside the same column.

## Test plan

- Two new test files with the cases above; mock the hooks, never the store.
- Add both `data-testid`s to the `direction geometry` scenario in
  `scripts/e2e-web.mjs` (`quran-hizb-band`, `quran-activity-band`).

## Done criteria

- [ ] `grep -rn "zinc\|#fff\|bg-white" src/features/quran/components/*band*`
      returns nothing
- [ ] the gauge renders as a fraction, not a binary switch
- [ ] reduced motion: the popup appears without animating
- [ ] `npm run verify` exits 0
- [ ] the catalog files are present and unmodified except for token restyling
      (a reviewer must be able to diff them against the cart source)

## STOP conditions

- The retrieval fails or the cart is not accessible — **stop and report**; do
  not implement a substitute.
- The retrieved components depend on a UI stack that conflicts with the app
  (React Native vs web-only DOM). `contribution-graph` may be web-only: if so,
  the band must render on native too — report rather than shipping a
  web-only page.
- The gauge's API cannot express 0…1 plus two end icons without forking it.

## Maintenance notes

- Both components are third-party. Vendor them under `src/components/ui/` with a
  header comment naming the cart and the commit/date, so a future upgrade can be
  diffed.
- Reading activity and memorisation progress are different measures; do not
  merge their ramps or their legends.
