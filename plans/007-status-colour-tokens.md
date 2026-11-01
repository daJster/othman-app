# Plan 007: Bring status colours back to the token palette

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Update this plan's
> status row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 589da39..HEAD -- src/global.css src/ui/badge.tsx DESIGN.md`
> If any in-scope file changed, compare the excerpts below with live code; on a
> mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW-MED
- **Depends on**: none
- **Category**: UI / design tokens
- **Planned at**: commit `589da39`, 2026-11-01

## Why this matters

Every colour in the app comes from an OKLCH token in `src/global.css` except
the three meeting-status badges, which hard-code Tailwind’s `emerald` and `sky`
scales with hand-written dark pairs. That is the only palette island left:
those colours do not follow `DESIGN.md`, cannot be tuned with the rest of the
palette, and add a second source of truth for “success” and “info”.

This plan adds two semantic triples (`success`, `info`) with surface, line and
text roles, switches `Badge` to them, and records the new roles in `DESIGN.md`.

## Current state

- `src/global.css:65-125` defines light and dark token blocks. Both define the
  same set; there is no `success` or `info`.
- `src/ui/badge.tsx:13-24`:
  ```ts
  const TONE_SURFACE = {
    positive: 'border-emerald-200 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950',
    info: 'border-sky-200 bg-sky-100 dark:border-sky-800 dark:bg-sky-950',
    neutral: 'border-border bg-muted',
  };
  const TONE_TEXT = {
    positive: 'text-emerald-700 dark:text-emerald-400',
    info: 'text-sky-700 dark:text-sky-400',
    neutral: 'text-muted-foreground',
  };
  ```
- Consumers pass `getMeetingStatusConfig(status).tone` (`meeting-card.tsx:57`);
  `core/` is intentionally free of class strings, so only `badge.tsx` changes.
- `DESIGN.md:18-30` lists the palette roles but not status colours.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Focused test | `npm test -- src/features/meetings/__tests__/meeting-card.test.tsx src/ui/__tests__/surfaces.test.tsx` | all pass |
| Full verification | `npm run verify` | all suites pass |
| Web build | `npm run build:web` | `Exported: dist` |

## Scope

**In scope**:
- `src/global.css`
- `src/ui/badge.tsx`
- `DESIGN.md`
- A test assertion in `src/ui/__tests__/surfaces.test.tsx` (badge variants still
  render) if needed.

**Out of scope**:
- Redesigning the meeting status model or adding statuses.
- Changing `primary`, `destructive`, `brass` or `clay`.
- Using the new tokens anywhere except `Badge` in this plan. A future consumer
  can adopt them.
- Adding `--chart-*` or other unused shadcn roles.

## Steps

### Step 1: Add the token triples

In `src/global.css`, add six variables to the light block and the same six to
the dark block. Suggested starting values (tune only if the contrast check in
Step 4 fails):

**Light**

```css
--color-success: oklch(0.47 0.11 155);
--color-success-soft: oklch(0.96 0.03 155);
--color-success-line: oklch(0.87 0.06 155);
--color-info: oklch(0.47 0.1 245);
--color-info-soft: oklch(0.96 0.02 245);
--color-info-line: oklch(0.88 0.05 245);
```

**Dark**

```css
--color-success: oklch(0.79 0.13 155);
--color-success-soft: oklch(0.22 0.045 155);
--color-success-line: oklch(0.36 0.07 155);
--color-info: oklch(0.8 0.09 245);
--color-info-soft: oklch(0.22 0.04 245);
--color-info-line: oklch(0.36 0.06 245);
```

The comment at `global.css:6-10` says every theme block defines the same set.
Keep that true: six additions per block, no omissions.

**Verify**: `npm run build:web` → `Exported: dist` (a missing token is a build
or runtime error, not a silent fallback).

### Step 2: Point `Badge` at the tokens

In `src/ui/badge.tsx`:

```ts
const TONE_SURFACE = {
  positive: 'border-success-line bg-success-soft',
  info: 'border-info-line bg-info-soft',
  neutral: 'border-border bg-muted',
} satisfies Readonly<Record<StatusTone, string>>;

const TONE_TEXT = {
  positive: 'text-success',
  info: 'text-info',
  neutral: 'text-muted-foreground',
} satisfies Readonly<Record<StatusTone, string>>;
```

Update the doc comment: the roles are semantic (`success`, `info`), not
Tailwind’s palette names, and each has a text-safe value plus a surface and a
line.

Do not touch `TONE_SURFACE.neutral` / `TONE_TEXT.neutral`.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Record the roles in `DESIGN.md`

Add rows to the palette table (after `border`):

| Token | Light | Dark | Job |
|---|---|---|---|
| `success` | deep green text-safe | light green text-safe | Positive status text |
| `success-soft` | pale green | deep green | Positive status surface |
| `success-line` | green hairline | green hairline | Positive status border |
| `info` | deep blue text-safe | light blue text-safe | Informational status text |
| `info-soft` | pale blue | deep blue | Informational status surface |
| `info-line` | blue hairline | blue hairline | Informational status border |

Add one sentence under the table: status colours are semantic roles; a new
status uses a role, never a raw Tailwind palette name.

**Verify**: no build step; visual check in Step 4.

### Step 4: Check contrast and the palette sweep

For each theme, check the badge label against its own surface:

- `success` on `success-soft`
- `info` on `info-soft`

Both must clear **4.5:1**. A quick check with the browser devtools colour
picker on the exported page is sufficient; record the two ratios in the PR
evidence. If a pair is below 4.5:1, lower the light text lightness or raise it
in dark, keeping the surface and line unchanged.

Then run:

```bash
git grep -nE "emerald|sky-|amber-|rose-|green-[0-9]|red-[0-9]" -- src
```

Expected: no matches.

**Verify**: `npm run verify` and `npm run build:web` exit 0.

## Test plan

- Existing meetings tests assert the status label text (`Today`, `Scheduled`),
  not colour classes, so they stay green.
- `src/ui/__tests__/surfaces.test.tsx`: extend the existing `variant="positive"`
  test to assert the label class contains `text-success` and the root class
  contains `bg-success-soft`; add the same two assertions for `variant="info"`
  (`text-info`, `bg-info-soft`). These are structural class assertions, which
  is the established pattern in that file.
- Visual check: the Meetings screen in both themes.

## Done criteria

- [ ] `global.css` defines `success`, `success-soft`, `success-line`, `info`,
      `info-soft`, `info-line` in both theme blocks.
- [ ] `badge.tsx` contains no `emerald`/`sky`/`dark:` colour pairs.
- [ ] `git grep -nE "emerald|sky-" -- src` returns nothing.
- [ ] `success` and `info` labels clear 4.5:1 on their soft surfaces in both
      themes.
- [ ] `DESIGN.md` documents the new roles.
- [ ] `npm run verify` and `npm run build:web` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- Uniwind does not emit a utility for a multi-word token name
  (`bg-success-soft`). Report the missing class instead of renaming the token
  to a raw Tailwind colour.
- A contrast pair cannot reach 4.5:1 without changing the surface hue enough to
  look like a different status. Report the measured pair.
- The badge is also used outside the meeting statuses with a different meaning
  (grep `variant="positive"` / `variant="info"`); if so, confirm the semantic
  fit before proceeding.

## Maintenance notes

- Status colour = semantic role (text, soft surface, line), one triple per
  tone.
- Never use a raw Tailwind palette name in a component; add a token instead.
- A future `warning` tone follows the same three-role shape.
