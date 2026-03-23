# Schema Canon

## What this subtree is
- `apps/schema` is the schema/tooling workspace and the canonical source for schema-driven runtime guidance.
- Authoring truth starts in `config/graph.mpdg`, `config/app.config.yaml`, and `sites/*.yaml`.
- Framework-safe runtime templates live in `module/src/resources/**` and are emitted into consumer apps.

## Read first
- `docs/AI-READ-HERE.md`
- `docs/ai/README.md`
- `docs/ai/mpdg/README.md` for graph/DSL authoring tasks
- `docs/ai/architecture.md`
- `docs/ai/runtime/authority-routing.md`
- `docs/ai/runtime/resource-selection.md`
- `docs/ai/runtime/typesense.md`

## Non-negotiable rules
- Generated manifests, controller docs, and runtime templates are the truth. AGENTS and skills only route to them.
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
- After MPDG changes, run `pnpm run graph:validate` before regeneration or promotion.

## Where examples belong
- Consumer-app-specific examples belong in that app’s local docs and AGENTS files.
- Schema canon should define the contracts, inputs, and routing rules that those examples instantiate.
