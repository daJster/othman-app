# Spec Delta

## Purpose

Provide a reproducible, reviewable development process that lets maintainers supervise isolated coding agents during migration and continue ordinary app development afterward.

## ADDED Requirements

### Requirement: Reproducible verified integration

The project SHALL support a clean dependency installation and its documented verification command on the intended integration revision. Verification evidence MUST identify the tested revision, and malformed manifests or failing required checks MUST block acceptance.

#### Scenario: Corrupted baseline
- **WHEN** a manifest or lockfile cannot be parsed
- **THEN** the baseline is reported as blocked rather than inheriting an earlier green status
- **AND** feature acceptance waits for a verified repair

#### Scenario: Integrated changes differ from the tested branch
- **WHEN** conflict resolution or dependency integration changes the reviewed tree
- **THEN** required verification is rerun against the resulting revision before acceptance

### Requirement: Traceable migration supervision

The supervisory ledger SHALL map every remaining migration requirement, including outstanding acceptance inside completed stages, to its original P ID, dependencies, owner, evidence, and disposition. Implementation, automated verification, device acceptance, conditional-not-needed decisions, and explicit deferrals MUST remain distinguishable.

#### Scenario: UI code exists without device evidence
- **WHEN** implementation and unit tests exist but required native smoke evidence is unavailable
- **THEN** the corresponding acceptance gate remains blocked or pending
- **AND** the stage is not represented as fully validated

#### Scenario: Deferred or conditional work
- **WHEN** a package is deferred or a conditional optimization is not needed
- **THEN** the ledger retains its rationale, decision owner, and remaining obligations
- **AND** no feature implementation is falsely reported as delivered

### Requirement: Isolated and bounded agent assignments

Each concurrent coding assignment SHALL have an exclusive writable worktree and branch, an identified base revision, owned paths, prerequisites, acceptance criteria, and permitted Git operations. Overlapping shared-file changes MUST have an integration owner rather than concurrent uncoordinated writers.

#### Scenario: Two agents require the same integration file
- **WHEN** independent packages both need a shared manifest, layout, or locale entry
- **THEN** ownership and integration order are established before either agent combines the changes
- **AND** neither agent overwrites the other's uncommitted work

### Requirement: Explicit Git authorization and coherent commits

Agents MUST distinguish permission to implement, commit, push, create a PR, merge, deploy, rewrite history, and delete resources. Commits SHALL be scoped, explicitly staged, and use Conventional Commit subjects. Topic pushes require authorization; direct pushes to integration branches and destructive shared-history changes MUST NOT occur without specific delegation.

#### Scenario: Implementation is authorized but pushing is not
- **WHEN** an agent completes an assigned code change without topic-push permission
- **THEN** it reports the result without pushing, merging, deploying, or deleting branches

#### Scenario: History rewrite is requested
- **WHEN** an exclusively owned topic branch needs a specifically approved force-push
- **THEN** a lease-protected push is used and dependent work is accounted for
- **AND** permission does not extend to rewriting shared integration history

### Requirement: Review and acceptance evidence

A PR SHALL state its migration/change IDs, dependencies, tested revision, checks, limitations, and rollback approach. Required verification, independent review, and iOS/Android/web smoke evidence for UI changes MUST precede merge. Draft or explicitly authorized failing-check exceptions MUST NOT bypass acceptance gates.

#### Scenario: Draft PR has pending manual acceptance
- **WHEN** a draft PR exposes code whose device checks are pending
- **THEN** the missing evidence is visible and merge remains blocked

### Requirement: Dependency-aware integration

PRs SHALL preserve the approved migration dependency graph. A dependent PR MUST identify its parent and merge only after its prerequisites are accepted. When squashing or rebasing changes prerequisite identities, dependent branches MUST be reconciled and reverified before acceptance.

#### Scenario: Parent PR is squash-merged
- **WHEN** a child PR depends on commits from the squashed parent
- **THEN** its base and effective diff are reviewed against the incorporated result
- **AND** duplicated or lost prerequisite changes are not silently merged

### Requirement: Safe worktree and branch cleanup

Cleanup MUST require authorization, ownership confirmation, a clean worktree, incorporated changes, and no active dependents. Squash-merged work SHALL be checked through PR disposition and incorporated content rather than ancestry alone. Uncommitted user work and apparently stale cached remote refs MUST NOT be deleted automatically.

#### Scenario: Candidate worktree contains changes
- **WHEN** a completed assignment's worktree still contains uncommitted or unowned work
- **THEN** automated removal stops and the work is preserved for its owner

### Requirement: Controlled scope and migration handover

The frozen legacy app SHALL remain unmodified. Scope changes and reordered deferred stages MUST require explicit approval. Migration closure SHALL reconcile remaining obligations into validated results or an owned deferred backlog, and ongoing development SHALL retain the same verification, review, and authorization policy.

#### Scenario: Migration functionality is accepted before release work
- **WHEN** feature and cross-target acceptance pass while Stage 9 remains deferred
- **THEN** the project distinguishes migration readiness from store-release readiness
- **AND** release tasks remain visible and unexecuted until activated