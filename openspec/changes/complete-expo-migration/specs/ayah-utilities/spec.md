# Spec Delta

## Purpose

Provide reliable selected-ayah notes and tafsir panels with clear loading boundaries, local data durability, and readable source-specific content.

## ADDED Requirements

### Requirement: Durable and scoped local notes

Notes SHALL persist across app restarts using the v1 local repository. Each note MUST retain stable identity and its canonical surah/ayah context. Account or guest namespaces MUST prevent one signed-in account from seeing another account's personal local notes. Cloud note synchronization SHALL remain deferred.

#### Scenario: Relaunch after adding a note
- **WHEN** a note is successfully saved and the app restarts
- **THEN** the note is available for the same ayah in the same local account or guest namespace

#### Scenario: Account changes on the same device
- **WHEN** a different account opens the notes panel
- **THEN** the prior account's personal notes are not displayed as that account's data

### Requirement: Failure-safe note creation

The notes panel SHALL expose pending, empty, ready, and recoverable error states. An optimistic addition MUST be reconciled with persistence success or failure; the composer MUST clear only after success and retain the user's draft after failure.

#### Scenario: Note write fails
- **WHEN** persistence rejects an optimistically displayed note
- **THEN** the UI reconciles the failed addition and exposes retry
- **AND** the original draft remains available without a duplicated successful note

### Requirement: Keyboard-safe note interaction

The note list and composer SHALL remain usable in the selected-ayah panel while the keyboard is visible. The save action MUST remain reachable, and switching ayahs MUST NOT submit a pending draft under a different ayah identity.

#### Scenario: Selection changes while a note is being saved
- **WHEN** the current ayah changes before a note write finishes
- **THEN** the saved note remains associated with the ayah it was submitted for
- **AND** the new panel does not inherit an unrelated success or cleared draft

### Requirement: Real bounded tafsir by source

Every offered tafsir/content type SHALL resolve actual source text for the selected ayah or an explicit empty/error state. Responses MUST respect a configured payload-size bound. Cached content MUST distinguish ayah and source/type, and oversized or malformed responses MUST NOT be rendered as valid text.

#### Scenario: Content type changes
- **WHEN** the user switches to another supported content type for the same ayah
- **THEN** the panel displays that type's content or its own loading/error/empty state
- **AND** it does not reuse another type's text as the result

#### Scenario: Source response exceeds the limit
- **WHEN** a source returns content above the configured bound
- **THEN** the panel exposes a bounded failure and recovery path rather than rendering an unbounded payload

### Requirement: Source-aware readable content

Tafsir text SHALL be selectable and follow the source's reading direction. A source failure MUST expose retry for that source instead of becoming successful empty text or clearing unrelated panels.

#### Scenario: Selected source is unavailable
- **WHEN** one tafsir source request fails
- **THEN** its panel shows an error with retry
- **AND** other source results and reader selection remain intact