# Spec Delta

## Purpose

Provide a correct, accessible image-based Quran reader whose selection, navigation, content, and shared links stay consistent across supported editions and platforms.

## ADDED Requirements

### Requirement: Edition-correct page rendering

The reader SHALL display a page within the selected edition's actual range and preserve the scan's proportions. Ayah hit regions MUST align with the visible scan after fitting, resizing, and direction changes; letterboxing MUST NOT shift the regions onto unrelated text.

#### Scenario: Container shape differs from the scan
- **WHEN** a supported edition is displayed in a container with a different aspect ratio
- **THEN** the complete fitted scan and its hit regions share the same content rectangle
- **AND** tapping a known ayah selects that ayah rather than an adjacent one

#### Scenario: Edition has a nonstandard scan range
- **WHEN** navigation reaches an edition-specific first or last page
- **THEN** the reader respects that edition's range rather than assuming every edition ends at page 604

### Requirement: Grouped ayah selection

Every visible bbox belonging to an ayah SHALL select that ayah and share its highlight. Tapping outside ayah boxes MUST clear selection. Selection identity MUST retain the surah as well as ayah number when content is requested across pages or editions.

#### Scenario: Ayah wraps across multiple lines
- **WHEN** the user taps any of that ayah's separate line regions
- **THEN** all of its regions indicate the same selected ayah
- **AND** unrelated intervening text is not included in its hit region

#### Scenario: Page crosses a surah boundary
- **WHEN** the user selects an ayah on a page containing more than one surah
- **THEN** subsequent content and utility requests identify the selected surah and ayah correctly

### Requirement: Recoverable reader loading failures

The reader SHALL distinguish catalog, geometry, and page-image loading failures and provide recovery for each failed boundary. A successful metadata response MUST NOT cause a failed scan to appear as a ready but silently blank page. Exit navigation MUST remain available while loading or failing.

#### Scenario: Scan fails after metadata succeeds
- **WHEN** the page image cannot be loaded despite valid catalog and bbox data
- **THEN** the user sees an image failure and retry path rather than an unexplained blank scan
- **AND** the user can still leave the reader

### Requirement: Stable navigation and edition switching

Page turns and edition switches SHALL follow the existing position/clamping contract and clear stale selection. Same-edition data refreshes MUST preserve the current position and any still-valid selection. Stale edition responses MUST NOT replace the user's newly selected edition.

#### Scenario: Edition changes while a previous request is pending
- **WHEN** the user selects a new edition before the old edition's data resolves
- **THEN** the new edition remains selected and its image and geometry agree

#### Scenario: Data refresh occurs during reading
- **WHEN** the attached edition's geometry refreshes with the selected ayah still present
- **THEN** the current page and valid selection remain unchanged

### Requirement: Predictable gestures and bounded prefetch

Committed horizontal turns SHALL navigate in mushaf reading order without treating vertical intent as a page turn. Boundary no-ops MUST NOT advance, animate a nonexistent page, or produce success feedback. Neighbor prefetch MUST remain within two pages on either side and avoid obsolete work during rapid turns.

#### Scenario: Rapid turns settle on a distant page
- **WHEN** the reader rapidly crosses several pages
- **THEN** deferred prefetch follows the settled page rather than queuing every intermediate neighbor
- **AND** out-of-edition pages are not requested

### Requirement: Usable reader chrome

The reader SHALL provide surah/ayah context, page position, exit, next/previous, searchable surah navigation, edition selection, and Read/Tafsir/Notes panels. Chrome and auto-hide behavior MUST preserve selection rules, remain reachable in RTL/LTR, and not obscure Quran text.

#### Scenario: User searches and selects a surah
- **WHEN** the user chooses one of the 114 surahs from the searchable picker
- **THEN** the reader navigates to the mapped position with correct labels and selection behavior
- **AND** the picker and chrome do not cover the scan after dismissal

### Requirement: Accessible source-aware ayah content

Ayah content SHALL be selectable and readable in the appropriate script and source direction. Quran text, translations, and e3rab MUST remain unclipped at 200 percent text scaling and in tablet layouts, in both light and dark themes.

#### Scenario: Mixed-direction content at enlarged text size
- **WHEN** Arabic Quran text and an LTR source are opened at 200 percent text size
- **THEN** each block retains its appropriate direction and readable line layout without clipping

### Requirement: Canonical deep links and restore precedence

Native `othman://quran` and web `/quran` links SHALL accept validated page/surah/ayah parameters. Explicit cold-start links MUST override saved position and apply once. Plain entry MUST restore saved position. Invalid pages clamp to the edition; invalid surah/ayah requests MUST yield a recoverable state. Share links MUST reopen the same canonical selection.

#### Scenario: Cold-start link conflicts with saved position
- **WHEN** the app opens a valid explicit link to a different position than the saved one
- **THEN** the linked position wins and later hydration does not undo it

#### Scenario: Link includes a valid ayah and contradictory page
- **WHEN** valid surah and ayah parameters identify a different page from the supplied page
- **THEN** the edition's ayah mapping determines the position and the requested ayah is selected

#### Scenario: Invalid ayah request
- **WHEN** a link contains a surah or ayah outside the valid metadata mapping
- **THEN** the reader exposes recovery without crashing or requesting fabricated content

### Requirement: Evidence-gated performance optimization

Reader acceptance SHALL include recorded 20-page-turn frame and memory measurements on the lowest supported test device, targeting JS frames under 16 ms, at least 55 fps, and plateauing memory. A native optimization MUST require a recorded failed-budget decision and preserve behavior plus a working web fallback.

#### Scenario: JavaScript implementation meets the budget
- **WHEN** the recorded P7.1 measurements satisfy the reader budgets
- **THEN** the native-module branch is recorded as not needed and is not scaffolded

#### Scenario: Native implementation is justified
- **WHEN** a recorded bottleneck and failed budget justify the native branch
- **THEN** acceptance compares both implementations using the same behavior and performance checks
- **AND** web continues to support the reader without native code