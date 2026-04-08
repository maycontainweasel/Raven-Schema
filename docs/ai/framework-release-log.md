# Schema Framework Release Log

Use this as the canonical changelog for the shared schema framework published from `apps/schema` to `origin/main`.

## Canonical topology

- This `apps/schema` repo is the master schema workspace.
- `origin` points to GitHub: `git@github.com:mpireco/Schema.git`
- `bitbucket` is the legacy remote kept only as a reference while older repos are migrated.
- In consumer repos, `origin/main` is the shared framework line and `app/app` is the app-owned schema line.

## Version format

Use a simple monotonic counter:

- `schema-master-0001`
- `schema-master-0002`
- `schema-master-0003`
- `schema-master-0004`
- `schema-master-0005`

Increment the counter once for every framework promotion pushed to `origin/main`.

## Update rule

Before pushing a shared schema/framework change to `origin/main`:

1. Add the next release entry at the top of the table in this file.
2. Summarize only the shared framework changes that other schema repos should absorb.
3. Record the source app or worktree if the change was first developed outside this master repo.
4. Record the commit SHA once the promotion commit exists.
5. Call out required follow-up for consumer repos such as Lucky, Passman, Helios, or Orbits.

Use `docs/ai/framework-promotion-ledger.md` for app-side promotion candidates. Use this file for the shared master history that consumer repos should compare themselves against.

## Entries

| Release | Date | Commit | Source | Summary | Consumer Follow-up |
| --- | --- | --- | --- | --- | --- |
| `schema-master-0005` | 2026-04-08 | `f005bd3` | Orbit tenant promotion round | Hardens generated create flows so record ids are normalized through `fn::ridParam(...)`, and changes create-time relation linking to emit direct `fn::createEdge(...)` statements instead of nested attach-helper calls. This fixes Orbit task creation where `fn::createTask(...)` could create the task record but still fail while linking it to its project. | Normalize affected child repos onto this release. Any tenant that emits create functions with create-time relations should regenerate and re-import its schema so the updated create-function and edge-linking behavior reaches the local database. |
| `schema-master-0004` | 2026-04-06 | `6d9fcb0` | Helios promotion round | Adds a shared `surrealmcp:generate` capability so schema repos can generate a repo-local Surreal MCP docker compose file plus a managed `.codex/config.toml` server block from `app.config.yaml`. Also hardens the master repo audit parser so child release markers with numeric-looking SHAs are read consistently. | Normalize child repos onto this release. For any repo that should expose a local Surreal MCP proxy, add a `surrealMcpExport` block to `config/app.config.yaml` and run `pnpm -C apps/schema run surrealmcp:generate` from that child schema repo. |
| `schema-master-0003` | 2026-04-06 | `3832a49` | Master control-plane + site tooling round | Adds the schema child-repo control plane in master, including repo registry, sync/audit/promotion commands, repo-operation skills, and the `normalize <repo-key>` operating term. Also adds the reusable site dev URL banner flow so generated site apps print `NUXT_SITEURL` before Nuxt starts by wrapping their `dev` script with `scripts/schema-dev.mjs`. | Normalize child repos onto this release. For site apps that should show the local nginx URL banner, rerun `site:env` or another site package/env sync path inside each child schema repo so the wrapped `dev` script and helper file are written into the target app. |
| `schema-master-0002` | 2026-04-04 | `fc7a177` | PassMed + Lucky promotion backlog | Shared-framework promotion assembled in master from downstream app repos. Includes generator/runtime/auth hardening, Surreal/TRPC transport fixes, updated instance/post bootstrap SURQL, AI process docs, a reusable `uAccess` / `uSubscription` / `uTrial` access lifecycle with shared user resource views and capability coverage, plus shared question/session bootstrap functions for session creation, per-question state, and attempt processing. | Rebase app-side schema repos onto this promotion, keep app-owned graph/spec/site files local to `app/app`, and retest any custom auth, question, session, or commerce flows before promoting app-specific code. |
| `schema-master-0001` | 2026-04-04 | `4c01f26` | GitHub baseline | Baseline shared framework head after adopting GitHub `origin/main` as the canonical master remote for this workspace. Includes the already-promoted MPDG guidance, parser validation, Typesense guidance, and runtime hardening work present on the shared branch. | Cherry-pick or reconcile into app-side schema repos as needed before new framework work starts. |
