---
name: schema-audit-child-state
description: Use when you need to inspect one child schema repo from the master repo and determine whether its remotes, branches, dirty state, and applied shared release are sane before any sync or promotion work.
---

# Schema Audit Child State

## Goal
Produce a reliable state report for one child schema repo before mutating anything.

## Read first
1. `docs/ai/control-plane.md`
2. `docs/ai/repo-registry.yaml`
3. `docs/ai/framework-release-log.md`
4. `docs/ai/framework-promotion-playbook.md`

## Command
- `pnpm run schema:repos:audit -- <repo-key> --refresh`

## Rules
- Audit before sync.
- Audit before promotion.
- If the repo is dirty, record that clearly before proposing any branch movement.
- If `main` or `app` is checked out in the live child repo, treat branch rewrites as unsafe until confirmed.

## Definition of done
- You can state whether remotes match the registry.
- You can state whether child `main` matches child `origin/main`.
- You can state whether child `app` contains the latest shared framework.
- You can state whether the child release marker is current, missing, or stale.
