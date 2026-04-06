# Schema Repo Operations

This workstream tracks how the master schema repo governs child schema repos.

## Goal

Keep schema promotions and child-repo sync rounds sane, repeatable, and recoverable.

## Current objectives

- maintain one canonical child-repo registry
- keep shared release tracking visible
- reduce ad hoc git handling across child repos
- give fresh AIs enough local context to resume this work without chat history

## Canonical references

- `docs/ai/control-plane.md`
- `docs/ai/repo-registry.yaml`
- `docs/ai/framework-promotion-playbook.md`
- `docs/ai/framework-release-log.md`

## Working rule

If a sync round exposes confusion, manual toil, or repeated mistakes, record the fix in this workstream before the context is lost.
