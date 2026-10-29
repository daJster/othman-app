# Spec Delta

## Purpose

Allow users to authenticate consistently across native and web targets, restore their session, access private destinations safely, and leave no prior-account state visible after sign-out.

## ADDED Requirements

### Requirement: Non-enumerating email sign-in

The app SHALL offer an email-then-password sign-in flow with pending, cancellation, and recoverable error states. It MUST NOT perform an account-existence lookup or distinguish an unknown email from an incorrect password in sign-in feedback.

#### Scenario: Invalid credentials
- **WHEN** a user submits either an unknown email or a wrong password
- **THEN** the app presents the same invalid-credential category
- **AND** the form remains usable for correction without duplicate submissions

### Requirement: Google authentication across targets

Google sign-in SHALL work on iOS, Android, and web with the configured client identity and return destination. Cancellation MUST leave the user signed out without a fabricated error success. Missing configuration and conflicting credentials MUST produce actionable, recoverable states rather than a stuck pending state.

#### Scenario: User cancels Google sign-in
- **WHEN** the user dismisses the provider flow before authentication completes
- **THEN** the app returns to an interactive sign-in state without creating a session

#### Scenario: Provider credentials conflict
- **WHEN** the provider reports that an account exists with different credentials
- **THEN** the app exposes a safe sign-in recovery path without silently linking accounts

### Requirement: Restored and race-safe sessions

A valid persisted session SHALL survive force-quit and relaunch. Initial session resolution MUST settle before private content is accepted. Results belonging to a signed-out or superseded session MUST NOT replace the current account or reveal prior-account data.

#### Scenario: Cold start with a saved session
- **WHEN** the app restarts with a valid saved session
- **THEN** the user is restored without an unnecessary sign-in round trip
- **AND** private content is not displayed for a different account during resolution

#### Scenario: Account changes during profile loading
- **WHEN** account A's profile response arrives after account B becomes current
- **THEN** account B remains current and account A's response is not displayed

### Requirement: Settled profile resolution

The app SHALL merge available profile fields with the authenticated identity. A missing profile MUST produce an auth-only account. A profile failure MUST end loading and expose recovery without granting additional privileges or trapping the app on its splash/loading screen.

#### Scenario: First sign-in has no profile document
- **WHEN** authentication succeeds and the profile does not exist
- **THEN** the app resolves the authenticated account with its safe fallback fields

#### Scenario: Profile service fails
- **WHEN** the authenticated user's profile request fails
- **THEN** loading settles and an error/retry path is available
- **AND** no elevated role is inferred from the failure

### Requirement: Protected routes and validated return navigation

Meetings, account, and private account subroutes SHALL require an authenticated session on every target. Home and Quran SHALL remain public. Signing in after a protected-route request MUST return to the validated internal destination; arbitrary external return URLs MUST NOT be followed.

#### Scenario: Signed-out deep link to an account subroute
- **WHEN** a signed-out user opens a private account destination
- **THEN** private data is withheld and sign-in is offered
- **AND** successful authentication returns to that valid destination

### Requirement: Session cleanup preserves display preferences

Successful sign-out SHALL remove prior-session query data and reset reader session state while preserving theme and language. In-flight work from the prior session MUST NOT restore cleared state. Relaunch or a later account sign-in MUST NOT reveal the prior account's private cached data.

#### Scenario: Sign-out occurs during an outstanding request
- **WHEN** the user signs out before account or reader-session work completes
- **THEN** late results cannot repopulate cleared prior-session state
- **AND** the chosen theme and language remain unchanged

### Requirement: Profile edits respect backend authorization

Authenticated profile updates SHALL be limited by backend authorization, including restrictions on editing another account or escalating a role. A visible client-side control MUST NOT be treated as sufficient authority. Failed writes MUST preserve the user's draft and expose an error.

#### Scenario: Ordinary account attempts a privileged role change
- **WHEN** an ordinary authenticated user submits a role-escalation write
- **THEN** the backend rejects the unauthorized change
- **AND** the app does not display the change as successfully persisted