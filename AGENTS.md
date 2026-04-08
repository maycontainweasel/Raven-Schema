# Schema Canon

## What this subtree is
- `apps/schema` is the schema/tooling workspace and the canonical source for schema-driven runtime guidance.
- Authoring truth starts in `config/graph.mpdg`, `config/app.config.yaml`, and `sites/*.yaml`.
- Framework-safe runtime templates live in `module/src/resources/**` and are emitted into consumer apps.

## Read first
- `docs/AI-READ-HERE.md`
- Fresh session rule: start with `docs/AI-READ-HERE.md`, then follow its read order before making assumptions about the repo.
- `docs/ai/README.md`
- `docs/ai/control-plane.md` for cross-repo governance, sync, and promotion work
- `docs/ai/repo-registry.yaml` for the canonical child-repo registry
- `docs/ai/tenant-governance.md` for tenant lifecycle rules
- `docs/ai/versioning-model.md` for shared and tenant versioning
- `docs/ai/skill-architecture.md` for how schema skills should be structured and enforced
- `docs/ai/templates/framework-candidate-note.md` for tenant-discovered framework-fix handoff notes
- `docs/ai/skills/README.md` when the task is about choosing or naming a schema skill
- `docs/ai/mpdg/README.md` for graph/DSL authoring tasks
- `docs/ai/architecture.md`
- `docs/ai/runtime/authority-routing.md`
- `docs/ai/runtime/resource-selection.md`
- `docs/ai/runtime/typesense.md`
- `docs/ai/workstreams/README.md` when the task spans multiple rounds or repos
- `docs/ai/workstreams/schema-operating-system/README.md` for long-running schema ecosystem improvement work spanning skills, versioning, naming, and tenant governance
- `docs/ai/workstreams/schema-operating-system/backlog.md` for the active operating-system tracks and priorities
- `docs/ai/workstreams/mpdg-editor-tooling/README.md` for Zed support, editor tooling, and future MPDG diagnostics/completions/formatting work
- `docs/ai/framework-promotion-playbook.md` for cross-repo framework promotion work
- `docs/ai/framework-release-log.md` to identify the latest shared master release
- `pnpm run schema:changelog` when you need the current shared release, unreleased notes, and local changed files from the master repo

## Non-negotiable rules
- Generated manifests, controller docs, and runtime templates are the truth. AGENTS and skills only route to them.
- `apps/schema` is the only control plane for shared schema promotion and child-repo sync.
- Child schema repos must keep local `main` as the shared mirror and local `app` as the integrated app branch.
- Use the human-facing terms `source authority` and `instance authority`.
- Current runtime metadata may still encode the non-source class as `tenant`, `remote`, or `instance`; normalize all three to instance authority before reasoning about behavior.
- Do not turn consumer-app examples into schema canon. Keep schema guidance abstract and reusable.
- For `config/graph.mpdg` work, treat the MPDG canon in `docs/ai/mpdg/**` as the authoring guidance and `scripts/mpdg-to-spec.ts` as the reference implementation.
- For `config/graph.mpdg` work, choose the closest MPDG skill proactively before editing.
- Before using fragment-based model UI or `/admin/[model]` runtime pages in a consumer app, check `config/app.config.yaml -> ui.projectSettings.<project>.enabled`. If it is `false`, treat committed custom pages as the authority for that app.
- If framework behavior changes, edit `module/src/resources/**` and the matching schema docs/skills, not only emitted app copies.
- Browser Typesense access must stay server-backed.
- Generated Surreal table definitions must default to `PERMISSIONS FULL` for normal tables, views, relation edges, and taxonomy/relation helper tables unless a schema input explicitly locks them down.
- When a task needs model data, choose the narrowest existing runtime contract that satisfies the fields needed. Do not invent resource keys or assume an `Admin` resource exists.
- If no existing runtime contract fits, inspect the graph/spec inputs and ask the user before adding a new reusable resource surface.
- Do not report TypeSense refresh or rebuild success when fetched records were only partially indexed. Surface partial imports as failures.
- If `instancesEnabled === false`, treat the app as single-database and use the generated default instance.
- When a repeated agent mistake is corrected, update the nearest `AGENTS.md` file or schema skill in the same change.
- For active multi-round schema efforts, keep scope, decisions, and validation in `docs/ai/workstreams/**` instead of leaving them only in chat context.
- Use `docs/ai/workstreams/schema-operating-system/**` for long-running work that improves how the schema ecosystem itself is operated, not just one feature or one tenant.
- After MPDG changes, run `pnpm run graph:validate` before regeneration or promotion.
- When a shared schema change is promoted to `origin/main`, update `docs/ai/framework-release-log.md` in the same change. If the work originated app-side, update `docs/ai/framework-promotion-ledger.md` too.
- During any schema-work round in `apps/schema`, update the `## Unreleased` section in `docs/ai/framework-release-log.md` before ending the round if local master changes remain unshipped.
- Treat reusable engine work like generator fixes, site tooling, runtime-template changes, and shared dev ergonomics as a shared framework feature round in `apps/schema` first, then fan it out to child repos afterwards.
- Treat tenant registration, tenant proposal rules, versioning, skill conventions, and naming-transition work as schema operating system work and record it in that workstream.
- If a tenant discovers a likely shared-framework fix, record a framework-candidate note before or during master promotion work.
- If a cross-repo sync or promotion process is awkward, capture the fix in the control-plane docs, workstream, registry, or repo-maintenance skills before ending the round.

## Where examples belong
- Consumer-app-specific examples belong in that app’s local docs and AGENTS files.
- Schema canon should define the contracts, inputs, and routing rules that those examples instantiate.
