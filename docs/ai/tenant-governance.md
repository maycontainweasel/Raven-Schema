# Tenant Governance

Use this file for the operating rules of tenant schema repos.

## Terms

- `master repo`: this repo at `apps/schema`
- `tenant schema repo`: a child schema repo inside a consuming turbo repo
- `shared framework`: the reusable engine published from master `origin/main`
- `app-owned state`: graph/specs/migrations/sites/generated output and tenant-specific config

Use `tenant` as the preferred human-facing term for child schema repos.

## Canonical registry

Every tenant must be registered in:

- `docs/ai/repo-registry.yaml`

Registration is required before a tenant can be treated as part of the managed schema ecosystem.

At minimum a tenant entry must record:

- repo key
- human name
- turbo repo path
- tenant schema repo path
- shared remote
- app remote
- local branch names
- release marker path
- active project list
- last verified status block

## Required branch model

Each tenant schema repo should have:

- local `main`: exact mirror of shared `origin/main`
- local `app`: tenant-owned schema state with latest shared framework integrated

Each tenant schema repo should have:

- `origin`: shared framework remote
- `app`: tenant app-owned schema remote

## Required lifecycle for tenant-discovered framework fixes

When a tenant discovers a framework bug:

1. Reproduce and fix it in the tenant where the problem is visible.
2. Regenerate there if required.
3. Verify the real tenant behavior there.
4. Classify the changed files:
   - framework-safe
   - framework-review
   - app-owned
   - unknown
5. Record a promotion candidate note.
6. Promote only the framework-safe work into master.
7. Publish a shared release.
8. Adopt that release back into affected tenants.

## Promotion candidate contract

Any tenant proposing shared framework work should record:

- tenant repo key
- bug summary
- why it is framework-safe
- source files changed
- generated/app-owned files changed
- verification performed
- whether downstream regeneration is required

This can live in:

- a workstream note
- the framework promotion ledger
- a future structured promotion-note template

## Adoption rule

After a shared release lands, affected tenants must:

1. normalize to the latest shared `origin/main`
2. update the release marker
3. regenerate if the shared change affects emitted assets
4. rerun the relevant verification flow

Normalization alone is not enough for generator fixes.

## App-owned paths

Treat these as tenant-owned unless a deliberate framework-generalization round says otherwise:

- `config/graph.mpdg`
- `config/app.config.yaml`
- `config/specs/**`
- `config/migrations/**`
- `config/schema-assets.json`
- `sites/**`
- tenant-specific generated assets

## Working rule

If a tenant creates repeated confusion in how it proposes or adopts framework changes, record the fix in:

- this file
- the skill architecture
- the workstream
- the registry rules

Do not leave the convention only in chat history.
