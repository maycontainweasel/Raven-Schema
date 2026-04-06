---
name: schema-fanout-shared-release
description: Use when a new shared schema release has landed in the master repo and it must be propagated to one or more child schema repos in a controlled way.
---

# Schema Fanout Shared Release

## Goal
Apply one shared release from master to multiple child schema repos.

## Read first
1. `docs/ai/control-plane.md`
2. `docs/ai/repo-registry.yaml`
3. `docs/ai/framework-release-log.md`
4. `docs/ai/framework-promotion-playbook.md`

## Commands
- Dry run:
  - `pnpm run schema:repos:fanout -- passmed lucky`
- Apply:
  - `pnpm run schema:repos:fanout -- --apply --push-app --update-registry passmed lucky`

## Rules
- Fanout happens only after the shared release is already in `origin/main`.
- Audit failures do not get silently ignored; they must be surfaced repo by repo.
- If a repo cannot be safely synced, stop mutating that repo and record the blocker.

## Definition of done
- Each targeted child repo has a clear result: synced, skipped, or blocked.
- The shared release ID and child state are recorded in master when requested.
