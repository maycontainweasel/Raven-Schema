---
name: schema-master-orient
description: Use when starting work in the master schema repo and you need to recover the cross-repo operating model, the child-repo registry, the latest shared release, and the standard sync lifecycle before making changes.
---

# Schema Master Orient

## Goal
Recover the current schema control-plane state before doing cross-repo work.

## Use when
- You were instantiated fresh in `apps/schema`.
- The task involves child schema repos, shared release tracking, promotion, or fanout.
- You need to know which repo is master and how child `main` and `app` branches are supposed to behave.

## Read first
1. `AGENTS.md`
2. `docs/AI-READ-HERE.md`
3. `docs/ai/control-plane.md`
4. `docs/ai/repo-registry.yaml`
5. `docs/ai/framework-release-log.md`
6. `docs/ai/framework-promotion-playbook.md`
7. `docs/ai/workstreams/schema-repo-operations/README.md`

## Commands
- `pnpm run schema:repos:list`
- `pnpm run schema:repos:list -- --verify`

## Rules
- Treat `apps/schema` as the only shared framework control plane.
- Treat child `main` as a mirror of shared `origin/main`.
- Treat child `app` as the integrated app branch that must include the latest shared framework.
- If the registry and live repo state disagree, audit before changing anything.

## Definition of done
- You can state the latest shared release ID.
- You know which child repos are registered.
- You know which repo key you are operating on next.
