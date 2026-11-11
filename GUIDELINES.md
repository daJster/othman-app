**MANDATORY EXECUTION MODE: PARALLEL-FIRST DEVELOPMENT**

For every development task, first identify opportunities for parallel execution. Delegate independent tasks to separate agents immediately, establish exclusive file ownership, and define shared interfaces before implementation. Do not execute independent tasks sequentially. The coordinating agent must manage dependencies, integrate completed work continuously, and prevent conflicting modifications. Optimize for maximum development speed while preserving application stability and code quality. Do not wait for an agent to finish its entire assignment when other independent work can already proceed.

# Git Workflow: Continuous Commits, Pushes & Integration

## Objective

Git version control must be an integral part of the parallel development workflow.

I want important implementation milestones to be committed continuously rather than accumulating all changes into one large commit at the end.

The objective is to:
- Preserve development progress.
- Make completed work available to other agents.
- Minimize the risk of losing implementation work.
- Facilitate parallel development.
- Make integration and rollback easier.
- Maintain a clean and understandable Git history.

## Commit After Every Important Implementation

Agents must create Git commits whenever they complete a meaningful and independently reviewable implementation milestone.

Examples:
- Panel UI integration completed.
- A reusable component implemented.
- Continue Reading section completed.
- Daily Reading Goal refactored.
- Annual Activity tracker refactored.
- Navigation behavior implemented.
- Responsive layout completed.
- Important bug fixed.
- Shared design tokens established.

Do not wait until the entire assigned task is finished to create the first commit.

Avoid creating commits for every trivial code modification. Commits should represent meaningful, coherent units of work.

## Commit Message Convention

Use clear, descriptive commit messages following conventional commit conventions.

Examples:

- `feat(reader): refactor continue reading cards`
- `feat(reader): implement daily reading progress gauge`
- `feat(activity): expand annual reading heatmap`
- `feat(ui): integrate Panel UI components`
- `style(reader): improve responsive dashboard layout`
- `fix(reader): restore correct Quran reading position`
- `fix(activity): correct daily completion state`
- `refactor(ui): standardize shared design tokens`

Each commit should describe what was actually implemented.

## Push Changes Continuously

Push important completed commits to the appropriate remote branch whenever doing so is necessary to make progress available to other agents or to facilitate integration.

In particular:
- Push completed shared components when other agents depend on them.
- Push completed independent features so the coordinator can integrate them.
- Push important milestones before moving to another substantial implementation task when this facilitates collaboration.
- Do not wait until the end of the entire development task to publish all changes.

## Parallel Git Coordination

Git operations must respect the parallel agent architecture.

Rules:
- Each agent should work on an isolated branch or another explicitly coordinated workflow.
- Do not allow multiple agents to push competing changes directly to the same branch without coordination.
- Use feature branches when supported by the repository workflow.
- The coordinating agent is responsible for integrating completed branches.
- Resolve merge conflicts deliberately rather than overwriting another agent's changes.
- Never use destructive Git operations to resolve conflicts without explicit authorization.

Before committing, check the files included in the commit to avoid accidentally including another agent's unfinished changes.

## Integration and Synchronization

When an agent completes a meaningful milestone:

1. Commit its changes.
2. Push the commit when sharing is needed.
3. Notify the coordinating agent.
4. Make the implementation available for integration.
5. Continue with the next independent task.

The coordinating agent should integrate completed work incrementally instead of waiting for every agent to finish.

## Git Safety Requirements

- Never overwrite uncommitted work belonging to another agent.
- Never force-push shared branches.
- Never reset or discard another agent's work.
- Never commit secrets, credentials, environment files, or sensitive configuration.
- Verify the working tree before committing.
- Run relevant checks before committing when practical.
- Do not claim a commit or push succeeded unless Git confirms it.
- If remote access or permissions prevent pushing, preserve the local commit and report the blocker.

## Final Git Report

At the end of the task, provide:
- A summary of completed implementations.
- The commit hashes.
- The branches used.
- Which changes were pushed.
- Which changes were integrated.
- Any remaining uncommitted work.
- Any unresolved merge conflicts.

**Final principle: Commit meaningful progress continuously, push when collaboration or integration requires it, and never let Git coordination become a bottleneck for parallel development.**