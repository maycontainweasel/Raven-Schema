---
name: schema-promote-child-framework
description: Use when framework work was discovered in a child schema repo and needs to be reviewed and pulled into the master schema repo without dragging in app-owned graph, generated assets, or site state.
---

# Schema Promote Child Framework

## Goal
Classify and pull framework-safe child changes into the master repo.

## Read first
1. `docs/ai/control-plane.md`
2. `docs/ai/repo-registry.yaml`
3. `docs/ai/framework-promotion-playbook.md`
4. `docs/ai/framework-promotion-ledger.md`
5. `docs/ai/framework-release-log.md`

## Commands
- Report candidate changes:
  - `pnpm run schema:repos:promote -- <repo-key>`
- Copy strictly safe files into master working tree:
  - `pnpm run schema:repos:promote -- <repo-key> --apply-safe`

## Rules
- Promotion starts from the master repo.
- App-owned graph/spec/migration/site files never come over automatically.
- Treat `framework-safe` paths as low-risk and `framework-review` paths as review-required before promotion commits.
- If the child work is still only in a dirty working tree, audit that explicitly before declaring the promotion complete.

## Definition of done
- You can name the framework-safe, framework-review, app-owned, and unknown file buckets.
- Only intended framework files are copied into the master working tree.
- Promotion candidates are ready for a normal master-repo review and commit.
