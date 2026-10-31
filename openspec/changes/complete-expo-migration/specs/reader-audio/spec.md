# Spec Delta

## Purpose

Let users listen to the selected ayah with predictable controls, correct reciter/source identity, and reliable playback lifecycle behavior on native and web targets.

## ADDED Requirements

### Requirement: Selected-ayah playback controls

The reader SHALL provide play/pause, seek, reciter selection, automatic-read selection, and previous/next ayah actions. The displayed playback state and source MUST correspond to the current ayah and reciter; changing either MUST prevent stale source events from controlling the new selection.

#### Scenario: Reciter changes while a source is loading
- **WHEN** a user selects another reciter before the previous audio source resolves
- **THEN** playback and progress follow the newly selected source
- **AND** late events from the previous source do not replace it

### Requirement: Native silent-mode and background playback

Native playback SHALL support the planned silent-mode and background-audio behavior. Foreground/background transitions MUST NOT create duplicate players or advance the ayah twice. Lock-screen media controls SHALL remain outside this migration's v1 scope.

#### Scenario: Active audio moves to the background
- **WHEN** native playback is active and the app backgrounds with the required capability configured
- **THEN** playback follows the configured background behavior without duplication
- **AND** foregrounding shows the actual current playback state

### Requirement: Exactly-once automatic advancement

Automatic reading SHALL advance once when the current ayah finishes, using canonical adjacent-ayah ordering. It MUST stop at the surah boundary unless wrapping is enabled. Repeated completion notifications and obsolete playback events MUST NOT trigger extra advancement.

#### Scenario: Completion notification repeats
- **WHEN** the current playback reports completion more than once
- **THEN** the reader advances at most once for that playback instance

#### Scenario: Final ayah finishes without wrapping
- **WHEN** the last ayah of a surah finishes and wrapping is disabled
- **THEN** automatic playback stops rather than requesting an out-of-range ayah

### Requirement: Buffering and bounded audio prefetch

The player SHALL expose buffering and recoverable source failures rather than appearing to play unavailable media. Prefetch SHALL be limited to the next relevant ayah and MUST follow changes in current ayah or reciter without initiating offline bulk downloads.

#### Scenario: Audio transport fails
- **WHEN** the current source cannot load
- **THEN** the controls show a recoverable failure and do not claim active playback
- **AND** the current ayah remains selected for retry

### Requirement: Interruption and resource lifecycle

An interruption SHALL pause playback without automatically resuming when the interruption ends. Leaving or replacing the playback owner MUST release its active resources and prevent late callbacks from affecting the current reader session.

#### Scenario: Interruption ends
- **WHEN** an external interruption pauses the audio and later ends
- **THEN** playback remains paused until the user explicitly resumes

#### Scenario: Reader closes while audio is pending
- **WHEN** the playback owner is dismissed before source loading completes
- **THEN** pending callbacks cannot start an orphan player or move the reader afterward