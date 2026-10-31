# Spec Delta

## Purpose

Establish honest native and web readiness through reproducible builds, direct-link-compatible hosting, recorded cross-target acceptance, and controlled activation of release work.

## ADDED Requirements

### Requirement: Native boot and first-paint readiness

Development builds SHALL boot on iOS and Android with valid environment configuration and without a Firebase initialization failure. Persisted theme/language and font readiness MUST settle before content reveal, and font failure MUST release rather than permanently retain the splash.

#### Scenario: Relaunch with saved appearance and language
- **WHEN** a development build starts with saved theme and language settings
- **THEN** the first revealed content reflects those settings without an avoidable theme/direction swap
- **AND** font success or failure cannot leave the app permanently on the splash

### Requirement: Native acceptance is evidence-based

Native acceptance SHALL record actual target/build evidence for boot, session persistence, RTL/LTR controls, typography, lists/sheets, permissions, and interactions. Unit rendering and bundle export MUST NOT be substituted for checks that require a device or simulator.

#### Scenario: Native runner is unavailable
- **WHEN** only unit results and platform exports are available
- **THEN** the corresponding native visual/runtime checks remain pending with an assigned evidence owner

### Requirement: Static web export and direct navigation

The web app SHALL retain static export and serve the exported app, assets, and fonts from the root deployment output. Direct navigation and refresh for public, reader, sign-in, and protected-return URLs MUST resolve correctly without serving the frozen legacy app. PWA/service-worker behavior SHALL remain excluded.

#### Scenario: Direct visit to a Quran link
- **WHEN** a user opens or refreshes a deployed `/quran` URL with valid reader parameters
- **THEN** the exported app loads the intended reader position and its assets successfully

#### Scenario: Direct visit to a protected destination
- **WHEN** a signed-out user refreshes a deployed private-route URL
- **THEN** the app loads its sign-in flow and retains a valid internal return destination
- **AND** hosting does not return the unrelated legacy app or an asset fallback as a page

### Requirement: Web interaction and language parity

Web navigation and reader interaction SHALL support desktop and mobile layouts, mouse/trackpad input, and touch without hover-only actions. Arabic RTL and English LTR MUST agree between the page and app content at widths 375, 768, and 1024 pixels. Web startup MUST NOT require a native-only runtime.

#### Scenario: Desktop Arabic reader
- **WHEN** the Arabic reader opens at a supported desktop width
- **THEN** navigation, selection, and reading-order controls remain usable with pointer input
- **AND** the page direction and reader layout agree

### Requirement: Recorded cross-target accessibility and state matrix

Acceptance SHALL cover small/large iPhone, small Android, tablet, desktop web, and mobile web; applicable pending/error/empty/ready states; both languages/themes; 200 percent text; offline startup; and expired sessions. Targets MUST meet 44 pt/48 dp guidance or have an explicitly approved accessible exception, with no silent overflow or hidden primary actions.

#### Scenario: Enlarged Arabic text on a small device
- **WHEN** long Arabic labels render at 200 percent text size on a small supported viewport
- **THEN** text does not clip or obscure adjacent actions
- **AND** controls retain screen-reader labels and reachable actions

#### Scenario: Offline or expired-session startup
- **WHEN** the app starts offline or with an expired authenticated session
- **THEN** it presents the appropriate recoverable state without exposing stale private data or implying unavailable offline downloads

### Requirement: Explicit activation of release work

Stage 9 release, CI, and full documentation work SHALL remain deferred until explicitly activated after its accepted prerequisites, unless a specific earlier promotion is approved. A deferred task MUST stay visible and MUST NOT be executed or represented as complete merely because planning artifacts exist.

#### Scenario: Agent reaches deferred release tasks
- **WHEN** earlier migration packages are implemented but Stage 9 has not been activated
- **THEN** execution stops before builds, publishing, or deferred workflow changes
- **AND** the ledger reports the activation decision still required

### Requirement: Activated release readiness and automation

Once activated, release readiness SHALL require installable preview builds, correct versioning/assets/privacy configuration, backend/OAuth configuration review, reproducible setup documentation, and the documented smoke path. Required CI MUST reject verification, purity, translation-audit, and web-export failures; optional tag builds MUST remain separately authorized.

#### Scenario: Required check fails on a release candidate
- **WHEN** an activated required pipeline fails verification or web export
- **THEN** the candidate cannot be accepted for integration or release

#### Scenario: Preview build is generated but untested
- **WHEN** a preview artifact exists without installation and smoke-path evidence
- **THEN** store-release readiness remains unconfirmed