---
name: schema-sync-child-repo
description: Use when one child schema repo must be brought up to the latest shared framework release from the master repo while preserving app-owned state on the child app branch.
---

# Schema Sync Child Repo

## Goal
Normalize one child schema repo so its shared and app branches are sane again.

## Read first
1. `docs/ai/control-plane.md`
2. `docs/ai/repo-registry.yaml`
3. `docs/ai/framework-release-log.md`
4. `docs/ai/framework-promotion-playbook.md`
5. `docs/ai/workstreams/schema-repo-operations/validation-checklist.md`

## Commands
- Audit first:
  - `pnpm run schema:repos:audit -- <repo-key> --refresh`
- Apply sync:
  - `pnpm run schema:repos:sync -- <repo-key> --apply --push-app --update-registry`

## Rules
- Run from the master repo, not from the child repo.
- Child `main` must end exactly at child `origin/main`.
- Child `app` must end with the latest shared framework integrated plus app-owned state.
- Refuse unsafe syncs when the child repo is dirty or when `main` or `app` is actively checked out.
- Update the child release marker when the sync succeeds.

## Definition of done
- Child `main` equals child `origin/main`.
- Child `app` contains the latest shared framework.
- Child `app` is pushed when requested.
- The master registry reflects the verified state when requested.
