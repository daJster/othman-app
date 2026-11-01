# Plan 006: Compose both error routes through one state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report — do not improvise. Update this plan's
> status row in `plans/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 589da39..HEAD -- src/app/+not-found.tsx "src/app/error/[code].tsx" src/ui/states.tsx src/features/navigation/__tests__/error-screens.test.tsx`
> If any in-scope file changed, compare the excerpts below with live code; on a
> mismatch, STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 002 (`ErrorState` action slot + heading level)
- **Category**: shadcn / consistency
- **Planned at**: commit `589da39`, 2026-11-01

## Why this matters

The 404 and the generic error route render the same state in two different
compositions:

- 404 passes its navigation through `retryLabel`/`onRetry`, so the button says
  “Back to home” but behaves like a retry; it is an outline `sm` button.
- `/error/[code]` renders an `ErrorState` with `className="flex-none p-0"`,
  then a separate primary `Button` outside it.

They produce different button styles, different spacing and different
semantics for the same page-level state. One primitive with an explicit action
slot removes the drift and lets plan 002’s heading level apply to both.

## Current state

- `src/app/+not-found.tsx:26-31`:
  ```tsx
  <ErrorState
    title={t('error.404.title')}
    description={t('error.404.description')}
    retryLabel={t('action.goBackHome')}
    onRetry={() => router.replace('/')}
  />
  ```
- `src/app/error/[code].tsx:46-61`:
  ```tsx
  <ScreenView className="items-center justify-center gap-4 p-6">
    <Head>…</Head>
    <ErrorState className="flex-none p-0" title={…} description={…} />
    <Button label={t('action.goBackHome')} onPress={() => router.replace('/')} />
  </ScreenView>
  ```
- After plan 002, `ErrorState` accepts `headingLevel`, `actionLabel` and
  `onAction`. The retry slot remains for inline, retryable failures.
- `src/features/navigation/__tests__/error-screens.test.tsx` presses the
  “Back to home” label and asserts `router.replace('/')`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0 |
| Focused tests | `npm test -- src/features/navigation/__tests__/error-screens.test.tsx` | all pass |
| Full verification | `npm run verify` | all suites pass |
| Web build | `npm run build:web` | `Exported: dist` |

## Scope

**In scope**:
- `src/app/+not-found.tsx`
- `src/app/error/[code].tsx`
- `src/features/navigation/__tests__/error-screens.test.tsx`

**Out of scope**:
- `src/ui/states.tsx`; plan 002 owns the API.
- Inline retryable errors on data screens (Meetings, Progress, Account, Edit).
- Error copy or codes.

## Steps

### Step 1: Rewrite the 404 route

In `src/app/+not-found.tsx`, replace the state with:

```tsx
<ErrorState
  headingLevel={1}
  title={t('error.404.title')}
  description={t('error.404.description')}
  actionLabel={t('action.goBackHome')}
  onAction={() => router.replace('/')}
/>
```

Keep the `<Head>` title and the comment about `replace`. The `ScreenView` needs
no classes: `ErrorState` centres itself with `flex-1`.

Do not pass `retryLabel`/`onRetry`.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Rewrite the generic error route

In `src/app/error/[code].tsx`:

- Remove the `className` from `ScreenView`; use a plain `<ScreenView>`.
- Replace the `ErrorState` + separate `Button` with one `ErrorState`,
  `headingLevel={1}`, `actionLabel={t('action.goBackHome')}`,
  `onAction={() => router.replace('/')}`.
- Delete the now-unused `Button` import.

The resolved-code logic, `ERROR_KEYS`, unknown-code fallback to 404 and the
`<Head>` title all stay exactly as they are.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Update the route tests

In `src/features/navigation/__tests__/error-screens.test.tsx`:

- Keep every existing copy/navigation assertion.
- Add to both suites:
  ```ts
  expect(screen.getByRole('header')).toHaveTextContent(/* title */);
  expect(screen.getAllByRole('button')).toHaveLength(1);
  ```
- Change nothing about the mocked router.

The single-button assertion is the regression guard: it fails if a second
composition button is reintroduced.

**Verify**: `npm test -- src/features/navigation/__tests__/error-screens.test.tsx`
→ all pass.

## Test plan

- `error-screens.test.tsx`: one level-1 header, one button, `replace('/')` on
  press, existing 400/403/404/500 copy unchanged.
- `src/ui/__tests__/states.test.tsx` already gains action-slot coverage in plan
  002; do not duplicate it here.

## Done criteria

- [ ] Both routes render exactly one `ErrorState` with `headingLevel={1}`.
- [ ] Navigation is `actionLabel`/`onAction`, not `retryLabel`/`onRetry`.
- [ ] Both routes show one primary button with the same label and size.
- [ ] `/error/418` still falls back to 404.
- [ ] `npm run verify` and `npm run build:web` exit 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- Plan 002’s `ErrorState` action slot is missing or has a different name.
- A test requires the old outline “retry” styling on the 404 page.
- The error route’s `ScreenView` centring changes once the state owns `flex-1`
  (report the actual layout rather than adding spacer views).

## Maintenance notes

- A page-level error is `ErrorState headingLevel={1}` with one explicit
  `actionLabel`; a retryable inline failure is the default level 2 with
  `onRetry`.
- “Retry” means repeat the failed operation. Navigation is never a retry.
- Do not compose a second button around a state primitive; if the state needs
  another action, add it to the primitive.
