# Schema Control Plane

This master repo is the control plane for every schema child repo.

## Core model

- `apps/schema` is the canonical shared framework workspace.
- `origin/main` in this repo is the only shared framework line.
- Each child schema repo has two local branches:
  - `main`: exact mirror of shared `origin/main`
  - `app`: app-specific schema state with the latest shared framework already integrated
- Each child schema repo has two remotes:
  - `origin`: shared framework remote
  - `app`: app-owned schema remote

This means:

- shared fixes are promoted into the master repo first
- child repos are then synced from the master repo
- app-owned graph/spec/generated state never becomes shared framework by accident

## Canonical files

- `docs/ai/repo-registry.yaml`: machine-readable registry for known child repos and promotion rules
- `docs/ai/framework-release-log.md`: shared framework release history
- `docs/ai/framework-promotion-ledger.md`: framework-safe work discovered app-side but not yet promoted
- `docs/ai/framework-promotion-playbook.md`: lifecycle for promotion and fanout
- `docs/ai/workstreams/schema-repo-operations/`: durable decision log for improving this operating model

## Required invariants

- The master repo is the only place where shared framework promotions are committed and pushed.
- Child `main` must match child `origin/main`.
- Child `app` must contain the latest child `origin/main` plus app-owned state.
- Shared framework releases are tracked by `schema-master-000N`.
- Child app branches should carry a `.schema-release.yaml` marker that records the latest applied shared release.

## Shared term

Use `normalize <repo-key>` as the short instruction for this full child-repo sync action:

- make child `main` match child `origin/main`
- merge the latest shared framework into child `app`
- update the child release marker
- push child `app/app` when requested
- update the master registry after verification

## Standard operating cycle

1. A framework bug or improvement is discovered in a child repo.
2. The child repo is audited from this master repo.
3. Framework-safe changes are promoted into the master repo.
4. The master repo records the new release in `framework-release-log.md`.
5. The shared release is pushed to `origin/main`.
6. The master repo fans that release out to child repos.
7. The child `app` branch is pushed after it contains the latest shared framework and updated release marker.
8. The registry is updated once the sync round is verified.

## Safety rules

- Do not do ad hoc merges or pushes from child repos when the goal is shared framework promotion.
- Do not use the child repo working tree as the source of truth without auditing dirty state first.
- Do not promote app-owned files:
  - `config/graph.mpdg`
  - `config/specs/**`
  - `config/migrations/**`
  - `config/schema-assets.json`
  - `sites/**`
  - app-specific project settings in `config/app.config.yaml`
- Promotion rules in `repo-registry.yaml` are the starting point, not a substitute for review.

## Operator commands

Use these from `apps/schema`:

- `pnpm run schema:repos:list`
- `pnpm run schema:repos:audit -- <repo-key> --refresh`
- `pnpm run schema:repos:sync -- <repo-key> --apply --push-app --update-registry`
- `pnpm run schema:repos:fanout -- --apply --push-app --update-registry <repo-key...>`
- `pnpm run schema:repos:promote -- <repo-key>`

## Working rule

Every time this system is awkward, capture the fix here in the master repo:

- tighten docs
- sharpen promotion rules
- add or improve a repo-maintenance skill
- harden a script so the next sync round is simpler
