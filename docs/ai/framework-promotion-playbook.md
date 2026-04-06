# Schema Framework Promotion Playbook

Use this when framework work is discovered in a child schema repo and must become shared truth in the master `apps/schema` repo, then be propagated back out to child repos.

## Canonical model

- `apps/schema` is the only master schema repo.
- `origin/main` in the master repo is the shared framework line.
- Each child schema repo keeps:
  - local `main`: exact mirror of shared `origin/main`
  - local `app`: app-specific schema repo with the latest shared framework already integrated

The authoritative repo inventory lives in `docs/ai/repo-registry.yaml`.

## Control-plane files

- `docs/ai/control-plane.md`
- `docs/ai/repo-registry.yaml`
- `docs/ai/framework-release-log.md`
- `docs/ai/framework-promotion-ledger.md`
- `docs/ai/workstreams/schema-repo-operations/`

## Shared versus app-owned

Shared framework work belongs in master `origin/main`:

- schema tooling under `src/**`
- shared scripts under `scripts/**`
- shared runtime/module code under `module/**`
- shared AI guidance under `AGENTS.md`, `docs/ai/**`, `.agents/**`
- shared bootstrap assets that genuinely belong to the framework

App-owned state stays in child `app`:

- `config/graph.mpdg`
- `config/specs/**`
- `config/migrations/**`
- `config/schema-assets.json`
- `sites/**`
- app-specific project settings in `config/app.config.yaml`
- generated assets tied to one app’s model set

Promotion rules for first-pass classification live in `docs/ai/repo-registry.yaml`.

## Promotion workflow

1. Audit the child repo from master.
2. Classify framework-safe versus app-owned changes.
3. Pull framework-safe changes into the master working tree.
4. Review and commit the master promotion.
5. Update `framework-release-log.md`.
6. Push master `origin/main`.
7. Fan the shared release back out to affected child repos.

## Command surface

From `apps/schema`:

```bash
pnpm run schema:repos:audit -- <repo-key> --refresh
pnpm run schema:repos:promote -- <repo-key>
pnpm run schema:repos:promote -- <repo-key> --apply-safe
```

After the shared release is committed and pushed:

```bash
pnpm run schema:repos:sync -- <repo-key> --apply --push-app --update-registry
```

For multiple repos:

```bash
pnpm run schema:repos:fanout -- --apply --push-app --update-registry passmed lucky
```

## Sync workflow

Child sync is controlled from the master repo, not ad hoc from the child repo.

The child sync result must be:

- child `main` == child `origin/main`
- child `app` contains the latest shared `origin/main`
- child `app` still contains app-owned schema state
- child `.schema-release.yaml` records the latest applied shared release

If the child repo is dirty or the live checkout is sitting on `main` or `app`, the sync should refuse and report the blocker.

## Validation checklist

Before pushing master `origin/main`:

- only framework-safe files are in the promotion commit
- `framework-release-log.md` has the next release entry
- the shared repo still type-checks where practical

After syncing a child repo:

- child `main` matches child `origin/main`
- child `app` contains child `origin/main`
- child `app` is pushed when required
- the child release marker reflects the latest shared release
- the registry is updated when the round is officially verified

## Working rule

If a child-to-master promotion is painful, fix the process in the master repo immediately:

- tighten the registry
- improve the scripts
- update the skills
- record the decision in the repo-operations workstream
