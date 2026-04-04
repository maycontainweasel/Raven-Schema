# Schema Framework Promotion Playbook

Use this when a schema change is made inside an app-side schema repo and needs to become shared framework truth in the master `apps/schema` workspace on `origin/main`, then be applied into other schema app repos such as Lucky.

## Purpose

Consumer schema repos have two distinct roles:

- `origin/main`: shared schema framework template
- `app/app`: app-specific schema repo with graph state, generated assets, site specs, and project context

Do not treat those as normal long-lived branches of one codebase. They serve different purposes.

## Remote topology

In the master schema workspace (`/Users/michaelpeters/Dev/mpd/projects/mpd-schema/apps/schema`):

- `origin` is GitHub and is the canonical shared framework remote.
- `bitbucket` is the old shared remote kept only for reference while repos are migrated.
- local `main` should track `origin/main`.

In a consumer app schema repo:

- `origin` should point at the shared GitHub schema repo.
- `app` should point at the app-owned schema remote.
- local `main` tracks `origin/main`.
- local `app` tracks `app/app`.

## Core rule

Do not merge `main` into `app`.

`main` omits generated app state by design, so merging it into `app` creates destructive noise. Promote framework changes by commit or patch, then cherry-pick those framework commits into each app-side schema repo.

## What belongs in `origin/main`

Framework-safe changes only:

- schema tooling under `src/**`
- schema module runtime templates under `module/**`
- schema-owned AI guidance under `AGENTS.md`, `docs/AGENTS.md`, `docs/ai/**`, `.agents/**`, `module/ai-bundle/**`
- package or config changes required for shared tooling

## What stays app-side

App-owned or generated state:

- `config/graph.mpdg`
- `config/specs/**`
- `config/migrations/**`
- `config/schema-assets.json`
- `sites/**`
- app-specific `config/app.config.yaml` project settings unless the setting is genuinely shared framework behaviour
- generated site/runtime output tied to one app's models

## Current framework bundle for the agent-guidance rollout

For the work done in PassMed, the framework-worthy file families are:

- `.agents/skills/schema-*`
- `AGENTS.md`
- `docs/AGENTS.md`
- `docs/AI-INSTRUCTIONS.md`
- `docs/AI-READ-HERE.md`
- `docs/admin-runtime-reference.md`
- `docs/admin-runtime-toolkit-plan.md`
- `docs/admin-runtime-recipe-tutorial.md`
- `docs/ai/**`
- `module/AGENTS.md`
- `module/ai-bundle/**`
- `package.json`
- `src/cli.ts`
- `src/lib/schemaKitModule.ts`
- `src/lib/routerGenerator.ts`
- `src/types/config.ts`

For this rollout, exclude:

- `config/**`
- `sites/**`
- `schema.zip`
- app-owned graph/spec/migration changes

## Promotion workflow from app repo to `origin/main`

Use the app-side schema repo that contains the latest framework work. In the current case, that is PassMed.

1. Start from a clean promotion branch off local `main`.
2. Bring over only the framework file families listed above from the app-side work.
3. Commit those files as a framework promotion commit.
4. Add the next entry to `docs/ai/framework-release-log.md`.
5. Test the schema workspace.
6. Push that commit to `origin/main`.
7. Cherry-pick that same commit onto the local `app` branch so the app-side schema repo also contains the shared framework commit.

### Recommended command shape

From the schema repo root:

```bash
git switch main
git pull origin main
git switch -c promote/<topic>

# Bring over only framework files from the source branch or worktree.
git checkout <source-branch> -- \
  .agents \
  AGENTS.md \
  docs/AGENTS.md \
  docs/AI-INSTRUCTIONS.md \
  docs/AI-READ-HERE.md \
  docs/admin-runtime-reference.md \
  docs/admin-runtime-toolkit-plan.md \
  docs/admin-runtime-recipe-tutorial.md \
  docs/ai \
  module/AGENTS.md \
  module/ai-bundle \
  package.json \
  src/cli.ts \
  src/lib/schemaKitModule.ts \
  src/lib/routerGenerator.ts \
  src/types/config.ts

git status --short
git commit -m "Promote schema agent guidance and resource hardening"
git push origin HEAD:main
```

After `origin/main` is updated:

```bash
git switch app
git pull app app
git cherry-pick <framework-commit-sha>
git push app HEAD:app
```

## Propagation workflow for another app schema repo

Use this for Lucky or any other schema consumer repo that also has `origin/main` and `app/app`.

1. Fetch both remotes.
2. Update local `main` from `origin/main`.
3. Cherry-pick the new shared framework commit(s) from `origin/main` onto local `app`.
4. Run generation or AI sync as needed for that app repo.
5. Validate emitted AGENTS, skills, and generated routers in the consumer apps.

### Recommended command shape

```bash
git fetch origin
git fetch app

git switch main
git pull origin main

git switch app
git pull app app
git cherry-pick <framework-commit-sha>
```

## Lucky-specific notes

Lucky schema lives at:

- `/Users/michaelpeters/Dev/lucky/apps/schema`

Its active schema projects include:

- `heliosadmin`
- `public`
- `dashboard`
- `learning`
- `live`

Lucky is currently on local branch `app` and only has a local modification in `config/graph.mpdg`, so it is a good target for this rollout once the framework commit exists.

### Lucky post-cherry-pick validation

Run from `/Users/michaelpeters/Dev/lucky/apps/schema`:

```bash
pnpm exec tsx src/cli.ts schema-ai:sync --project heliosadmin,public,dashboard,learning,live
pnpm exec tsx src/cli.ts generate --no-sync-graph --project heliosadmin,public,dashboard,learning,live
```

Then verify:

- `AGENTS.md` exists in each target app
- `.agents/skills/schema-resource-selection` exists in each target app
- `docs/ai/runtime/resource-selection.md` exists in each target app
- generated `server/trpc/routers/generated/*` resource procedures fail soft on unsupported selectors

## Validation checklist

Before pushing to `origin/main`:

- `git diff --name-only main...HEAD` only shows framework files
- `docs/ai/framework-release-log.md` includes the next shared release entry
- no app graph/spec/migration files are included accidentally
- schema AI bundle files and source files match

After updating another app repo:

- `git status --short` only shows expected framework and generated sync changes
- consumer app type-check passes where possible
- at least one schema-driven page confirms the new guidance is present
- at least one bad resource lookup returns `null` and logs a server warning instead of crashing the page

## Working rule going forward

When a change is clearly shared schema behaviour, make it promotable immediately:

- keep the implementation in shared schema files
- keep app-only graph/spec changes separate
- record the framework file family in this playbook if the rollout introduces a new shared area
