# Selected-ayah notes

The reader's Notes panel stores personal notes for the selected ayah. Notes are
**device-local** in this release (P6.2). They survive app restarts, but they are
not synchronized to Firestore or shared across devices. There is no notes
backend, and adding one is a separate scope decision.

## Layers

| Layer      | File                                                | Responsibility                              |
| ---------- | --------------------------------------------------- | ------------------------------------------- |
| Domain     | `src/core/domain/notes/notes.ts`                    | Payload shape, parsing, add/remove helpers. |
| Repository | `src/services/notes/local-notes.repository.ts`      | `storageService` read/write.                |
| Service    | `src/services/notes/notes.service.ts`               | Use-cases over the repository.              |
| Query      | `src/features/quran/use-notes.ts`                   | Cache keys, optimistic write, rollback.     |
| Surface    | `src/features/quran/components/notes-panel.tsx`     | Sheet list + composer.                      |

`src/services/notes/index.ts` is the only place that constructs the service;
screens never import the repository.

## Stored payload

One key holds every namespace:

```
storage key: quran:notes
{
  "version": 1,
  "byNamespace": {
    "user:<uid>": [ { id, ayah: { surah, ayah, absoluteNumber }, text, createdAt } ],
    "guest": [ … ]
  }
}
```

- `version` is checked first. An unknown version reads as **no notes**; it is not
  reinterpreted with today's rules.
- `ayah` carries the canonical identity (surah + ayah + absolute number), not an
  ayah-in-surah string. Page 2 crosses a surah boundary, so `"1"` alone is
  ambiguous.
- A corrupt row is dropped, not thrown. A hand-edited payload degrades to "no
  notes" instead of taking the panel down.
- `id` is generated before the write and kept across a retry. `withNote`
  replaces by id, so retrying a rejected save cannot append a duplicate.

## Account and guest namespaces

`notesNamespace(userId)` returns `user:<uid>` or `guest`. The namespace is part
of the stored shape **and** of the query key:

```
['othman', 'notes', namespace, absoluteNumber]
```

Consequences:

- A signed-in user never sees another account's notes, even on the same device.
- Signing out clears the `notes` query root (the provider's cache reset), so the
  next account cannot read a previous account's cached rows. The persisted
  payload stays under its old namespace; signing back in restores it.
- Guest notes stay under `guest`; they are not merged into an account.

## Optimistic write and retry

`useAyahNotes` adds the note to the cache before persistence resolves, then
reconciles:

- Success invalidates the ayah's list, so storage is the source of truth.
- Failure restores the previous cached list and exposes `addError`.
- The composer clears the draft only after success; a failure keeps the text.
- A retry with the same text reuses the note id. A changed draft is a new note.
- Switching ayah or namespace discards the pending id, so a draft can never be
  saved under a different ayah's identity.

## Panel behavior

- The Notes panel is a `BottomSheet` inside `AyahPanelSheet`, remounted per
  `namespace + absoluteNumber`, so drafts do not leak between ayat.
- The list is a virtualized `FlatList`; the composer sits **outside** it, inside
  a `KeyboardAvoidingView`, so the save action stays reachable while the
  keyboard is open.
- Pending, empty, ready and recoverable error states each have a distinct
  surface; an empty result is never shown while the first read is in flight.
- With no selected ayah the panel asks for a selection instead of writing to a
  placeholder ayah.

## Privacy notes

- Notes may contain personal reflections; they are stored unencrypted in the
  app's local storage. Device backups and OS-level storage protection are the
  only safeguards at this stage.
- No analytics or network request is made for notes. Removing the app (or
  clearing app data) deletes them.
- Do not claim cloud sync, cross-device restore or shared notes. Those are
  deferred.

## Verification

- `src/core/domain/notes/__tests__/notes.test.ts` — payload versioning, corrupt
  rows, insert/replace/remove, canonical identity.
- `src/services/notes/__tests__/notes.repository.test.ts` — round trip across a
  new repository instance (relaunch), namespace isolation, rejected writes,
  corrupt payloads, copies.
- `src/features/quran/__tests__/use-notes.test.tsx` — pending/empty/ready,
  namespace keys, optimistic row, rollback, retry identity, ayah/account
  switches.
- `src/features/quran/__tests__/notes-panel.test.tsx` — four states, draft
  retention, save disabling, retry affordance.

Native/web runtime acceptance (relaunch restore, keyboard/sheet/back behavior)
remains blocked with the other device work: this machine has no iOS/Android
target or authorized web host.
