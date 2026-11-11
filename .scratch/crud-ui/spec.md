# CRUD UI — meetings, accounts, Qur'an records

Status: implemented (web verified; phone deferred by request)
Owner: agent session 2026-11-11

## Problem

The mock backend exposes complete CRUD for meetings, accounts and the reader's
records (progress, bookmarks, notes), and `src/features/backend/` already has the
hooks — but no screen calls them. The app can read demo data and edit its own
profile; it cannot create, rename, delete or own anything else.

Audit of the current state (verified in the running app, web at 390 px and the
Pixel 10 emulator):

| Domain    | Server CRUD | UI today                                           | Gap                                        |
| --------- | ----------- | -------------------------------------------------- | ------------------------------------------ |
| Meetings  | full + RSVP | calendar, cards, join link                         | no create/edit/delete, no RSVP             |
| Accounts  | full        | profile header, own edit sheet, sign-out           | no member list/create/disable/delete, no self-delete |
| Reader    | progress/bookmarks/notes | progress heatmap is read-only; notes panel appends; no bookmark UI | update/delete missing everywhere, bookmarks invisible |

Two correctness problems found while auditing:

1. `useInvalidateMeetings` invalidates TanStack only. The day cache inside
   `meetingsService` survives, so a refetch after a write replays the old day.
2. The account screen's dev fallback renders `mockAccountProfile` while signed
   out, which makes write affordances look available with no session behind
   them.

## Decisions (user unavailable; each branch resolved to the recommended default)

1. **Scope** — UI for every write the server already owns, not new endpoints.
   Meetings: create/edit/delete (admin) + RSVP (any signed-in member). Accounts:
   list/create/edit role & status/delete (admin) + delete own account
   (self). Reader: progress, bookmarks and notes C/R/U/D.
2. **Where actions live** — next to the thing they change. "New session" in the
   meetings header; edit/delete on the card itself; "Members" in Account; reader
   records as a fourth tab-adjacent destination under Quran, reachable from the
   Quran landing and the reader menu.
3. **Forms** — dedicated routes presented as `formSheet` on native (the same
   pattern as `account/edit`), normal pages on web. No inline card editing.
   Drafts are local until Save succeeds; failures keep the draft.
4. **Destructive actions** — `AlertDialog`, always naming the object. Never a
   typed confirmation: this is a demo cohort, not a billing console.
5. **Authorisation in the UI** — hide what the role cannot do, then let the
   server refuse anyway. Signed-out visitors get one quiet sign-in action, never
   a disabled control that cannot explain itself.
6. **Feedback** — a toast for list-level successes; inline error text in forms;
   the failed write leaves the draft intact.
7. **Reader records** — one screen, three sections (Memorisation, Bookmarks,
   Notes) via `SectionRail`, because they are three views of one reading life.
   Display preferences (theme, edition) stay in the reader menu where they are
   used.
8. **Language of entered data** — the meeting form captures the canonical
   fields only (`title`, `description`, `location`, `organizer`). Arabic
   variants remain optional server fields; the form does not double itself for a
   demo cohort.
9. **Data path** — screens use `src/features/backend/` hooks only. No screen
   imports `backendClient` directly.
10. **No new visual world** — Operate mode: Page/Section, hairlines, one primary
    action per surface. No new palette, no cards-inside-cards.

## Files

- `src/features/backend/errors.ts` — backend error → locale key.
- `src/features/auth/use-session-role.ts` — real session role, no mock fallback.
- `src/features/meetings/meeting-form.ts` + `meeting-form-screen.tsx`.
- `src/app/meetings/edit.tsx` (create when no `id`).
- `src/features/meetings/meeting-actions.tsx` (RSVP + admin actions).
- `src/features/account/member-form.tsx`, `member-list.tsx`.
- `src/app/admin/members.tsx`, `src/app/admin/members/edit.tsx`.
- `src/features/quran/records/*` + `src/app/quran/records.tsx`.
- i18n keys in both locales.

## Verification

`npm run verify` passes (typecheck, core purity, i18n, lint, Prettier, 14 server
tests, 902 Jest tests). `npm run build:web` exports all 21 routes, including
`/admin/members`, `/admin/members/edit`, `/meetings/edit` and `/quran/records`.

Live web checks at 390×844 (Arabic):

- signed in as `admin@kuttab.test`; member list filters and searches;
- created a member, promoted them to admin, and confirmed the row and role
  updated without a reload;
- created a session and confirmed the server's 201 plus the calendar refetch;
- `/quran/records` renders the three sections; the screen requests progress,
  catalog, bookmarks and notes from the server (verified in the mock log).

The Pixel 10 pass was skipped at the user's request (performance); the layout is
the same tree at the same breakpoints, and the native-only paths (form sheets,
`@expo/ui` list rows) were not re-run.

Known environment issue: the Expo dev server intermittently returns a 500
"Requiring unknown module" for a newly added static route while files are being
edited; a warm restart or the production export renders the same route. This is
a dev-server/bundler symptom, not a screen error.

