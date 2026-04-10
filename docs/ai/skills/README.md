# Schema Skill Menu

Open this file when you want a copy-ready prompt for schema work.

Canonical skill-system rules now live in:
- `docs/ai/skill-architecture.md`
- `docs/ai/tenant-governance.md`
- `docs/ai/versioning-model.md`
- `docs/ai/templates/framework-candidate-note.md`
- `docs/ai/workstreams/schema-operating-system/README.md`
- `docs/ai/workstreams/schema-operating-system/prompt-recipes.md`

## How To Use This Menu
- Naming the skill explicitly is the most reliable option.
- Agents may choose the right skill proactively when the task is clear, but explicit naming is still better for important work.
- If a task touches a model and you are not sure where to start, begin with `schema-model-primer`.
- For consumer-app pages, pair a directory skill with `schema-record-workspace` when the task includes the single-record page.

## Repo Operations

### Design Dump Capture
- Skill: `schema-capture-design-dump`
- Use for: capturing an important debugging lesson, bad pattern, or design idea into the Schema v1.5 / Lyric v2 workstreams before it gets lost
- Prompt:
```text
Use schema-capture-design-dump for this lesson.
Capture the problem, why it is bad or important, whether it belongs in Schema v1.5 or Lyric v2, and update the right workstream docs.
```

### Tenant Registration
- Skill: `schema-register-tenant`
- Use for: adding a new tenant schema repo to the master registry before sync, promotion, or governance work begins
- Prompt:
```text
Use schema-register-tenant for <repo-key>.
Register the tenant in the master registry, then audit it and report what blocks normalization.
```

### Master Orientation
- Skill: `schema-master-orient`
- Use for: recovering the master-repo operating model, latest shared release, and known child repos after a fresh instantiation
- Prompt:
```text
Use schema-master-orient first.
State the latest shared release, the repo keys currently registered, and which child repo or promotion flow you are about to touch.
```

### Child Repo Audit
- Skill: `schema-audit-child-state`
- Use for: checking one child repo’s remotes, branch state, dirty state, and release marker before sync or promotion work
- Prompt:
```text
Use schema-audit-child-state for <repo-key>.
Audit remotes, local main, local app, dirty state, and the release marker before suggesting any mutations.
```

### Child Repo Sync
- Skill: `schema-sync-child-repo`
- Use for: bringing one child repo up to the latest shared framework from the master repo
- Short command phrase: `normalize <repo-key>`
- Prompt:
```text
Use schema-sync-child-repo for <repo-key>.
Audit first, then sync the child so local main mirrors origin/main and local app contains the latest shared framework plus app-owned state.
```

### Shared Release Fanout
- Skill: `schema-fanout-shared-release`
- Use for: applying one shared framework release to multiple child repos from the master repo
- Prompt:
```text
Use schema-fanout-shared-release for the target repo set.
Report repo-by-repo success, blockers, and any child repos that still need manual attention.
```

### Child Framework Promotion
- Skill: `schema-promote-child-framework`
- Use for: classifying and pulling framework-safe work out of a child repo into the master repo
- Prompt:
```text
Use schema-promote-child-framework for <repo-key>.
Classify framework-safe, review-required, app-owned, and unknown paths before copying anything into the master repo.
```

### Tenant Framework Candidate Handoff
- Skill: `schema-report-framework-candidate`
- Use for: capturing a tenant-discovered framework fix in a durable note before or alongside master promotion work
- Prompt:
```text
Use schema-report-framework-candidate for <repo-key>.
Capture the bug summary, changed paths, verification, and whether downstream regeneration will be required after adoption.
```

### Shared Framework Feature
- Skill: `schema-framework-feature-round`
- Use for: implementing one reusable schema-engine capability in master, documenting it, and preparing the later child-repo rollout
- Prompt:
```text
Use schema-framework-feature-round for this capability.
Implement it in apps/schema, say whether it is engine-only or requires app-side regeneration, and tell me which child repos should sync it afterwards.
```

### Shared Release Adoption
- Skill: `schema-adopt-framework-release`
- Use for: carrying a shared framework release into a tenant all the way through normalization, regeneration when required, and verification
- Prompt:
```text
Use schema-adopt-framework-release for <repo-key>.
Normalize first, then decide whether regeneration is required, run the right verification, and update the release marker/reporting state.
```

## Guardian Skills

### Tenant Fix Guardian
- Skill: `schema-guardian-tenant-fix`
- Use for: any tenant-discovered bug where the AI must default to the safe path before deciding what becomes shared framework work
- Prompt:
```text
Use schema-guardian-tenant-fix for <repo-key>.
Default to the safe tenant-first path, classify engine work vs app-owned work, and tell me whether promotion and downstream regeneration are required.
```

Recommended follow-up:
- If the fix should travel back to master, use `schema-report-framework-candidate` before or during the promotion round.

### Auth Flow Guardian
- Skill: `schema-guardian-auth-flow`
- Use for: any auth/password/session task where the AI must not casually change shared contracts
- Prompt:
```text
Use schema-guardian-auth-flow first.
State the current auth assumptions, what is risky, and which verification skills must run after the change.
```

## Operational Verification

### Anti-Pattern Review
- Skill: `schema-anti-pattern-review`
- Use for: checking generator, helper, router, or promotion work against the known bad-pattern library before treating it as safe
- Prompt:
```text
Use schema-anti-pattern-review for these changes.
Check them against the known schema anti-patterns and report concrete findings first.
```

### Router Flow Hardening
- Skill: `schema-router-flow-hardening`
- Use for: building or fixing a schema-generated router flow end to end, with tests and validation at each layer
- Prompt:
```text
Use schema-router-flow-hardening for this route or router fix.
State the input contract, verify helper/function/router/controller layers, and make sure the full flow is covered by tests.
```

### Password Refresh
- Skill: `schema-auth-password-refresh`
- Use for: password-hash changes, refreshes, or migrations
- Prompt:
```text
Use schema-auth-password-refresh for this auth change.
State whether the change is generator/runtime source, tenant data migration, or both, and what downstream regeneration/verification is required.
```

### Login Verification
- Skill: `schema-auth-login-verify`
- Use for: proving a user can still log in after an auth change
- Prompt:
```text
Use schema-auth-login-verify after the auth change.
Report the exact login path exercised, the environment used, and whether the expected auth artifacts were created.
```

### Session Cookie Verification
- Skill: `schema-session-cookie-verify`
- Use for: proving session-cookie and refresh behavior still works after auth/runtime changes
- Prompt:
```text
Use schema-session-cookie-verify after the auth change.
Verify cookie creation, scope, and refresh behavior explicitly.
```

### MCP Connectivity Check
- Skill: `schema-mcp-connect-check`
- Use for: verifying schema-controlled MCP configuration and connectivity
- Prompt:
```text
Use schema-mcp-connect-check for this MCP setup.
Report the config source, expected endpoint, and whether the server is actually reachable.
```

## Consumer App Workflows

### Source-Authority Directory
- Skills: `schema-source-directory`, `schema-record-workspace`
- Use for: source-authored content or admin directories with TypeSense-backed search, create, and a custom record workspace
- Prompt:
```text
Build a source-authority content directory using schema-source-directory and schema-record-workspace.
Before coding, confirm the route base, model key, router key, record identifier policy, create fields, directory columns, default deployment selection, publication behaviour, record tabs, and explicit TypeSense sync behaviour.
```

### Instance-Authority Directory
- Skills: `schema-instance-directory`, `schema-record-workspace`
- Use for: records that are authored directly on one or more target instances and not first on mothership
- Prompt:
```text
Build an instance-authority directory using schema-instance-directory and schema-record-workspace.
Before coding, confirm the target-instance rule, route base, record identifier policy, create fields, directory columns, and explicit TypeSense sync behaviour.
```

### Create Dialog Only
- Skill: `schema-create-dialog`
- Use for: adding or tightening a create modal/drawer without rebuilding the full directory
- Prompt:
```text
Use schema-create-dialog to add or update this create flow.
Confirm the required fields, default deployment selection, post-create redirect rule, and explicit TypeSense sync behaviour before coding.
```

### Record Workspace
- Skill: `schema-record-workspace`
- Use for: single-record management pages with tabs, card-level saves, publication controls, deployment controls, and delete flows
- Prompt:
```text
Use schema-record-workspace to build or update this single-record page.
Before coding, confirm the record lookup contract, update/delete endpoints, authority routing, which tabs/cards exist, and the explicit post-mutation TypeSense sync behaviour.
```

### Resource Selection
- Skill: `schema-resource-selection`
- Use for: deciding which generated resource/view to load when a page or store only needs a subset of fields
- Prompt:
```text
Use schema-resource-selection to choose the narrowest existing runtime contract for this page or component.
Do not invent a new resource key unless the current graph/spec contracts genuinely do not cover the required fields.
```

## Schema Authoring Workflows

### Model Or Stanza Authoring
- Skills: `schema-stanza-authoring`, `schema-graph-validation`
- Use for: creating or extending a stanza in `config/graph.mpdg`
- Prompt:
```text
Use schema-stanza-authoring to add or extend this stanza in graph.mpdg, then finish with schema-graph-validation.
Before editing, state the model key, authority, CRUD/router intent, views, TypeSense intent, relations, taxonomies, and subtables.
```

### Resource Or View Authoring
- Skills: `schema-resource-view-authoring`, `schema-graph-validation`
- Use for: adding or changing `views:` blocks, function-backed resources, or admin/public resource shapes
- Prompt:
```text
Use schema-resource-view-authoring to change this resource/view contract, then finish with schema-graph-validation.
Do not invent resource selectors blindly; confirm the existing contracts first.
```

### TypeSense Authoring
- Skills: `schema-typesense-authoring`, `schema-graph-validation`
- Use for: adding or changing a TypeSense view/schema block in MPDG
- Prompt:
```text
Use schema-typesense-authoring to update this TypeSense block, then finish with schema-graph-validation.
Confirm that every generated TypeSense field is returned by the generated view/function with the correct schema-safe type.
```

### Relation Authoring
- Skills: `schema-relation-authoring`, `schema-graph-validation`
- Use for: adding or changing `relations:` blocks
- Prompt:
```text
Use schema-relation-authoring to add or update this relation, then finish with schema-graph-validation.
Before editing, confirm payload field, cardinality, storage expectations, and generated edge behaviour.
```

### Taxonomy Authoring
- Skills: `schema-taxonomy-authoring`, `schema-graph-validation`
- Use for: adding or changing taxonomies and term tables
- Prompt:
```text
Use schema-taxonomy-authoring to add or update this taxonomy, then finish with schema-graph-validation.
Before editing, confirm the taxonomy key, term model, payload field, hierarchy rules, and attach/detach expectations.
```

### Subtable Authoring
- Skills: `schema-subtable-authoring`, `schema-graph-validation`
- Use for: adding or changing subtable blocks
- Prompt:
```text
Use schema-subtable-authoring to add or update this subtable, then finish with schema-graph-validation.
Before editing, confirm parent linkage, ID strategy, and generated table expectations.
```

## Validation And Safety

### Graph Validation
- Skill: `schema-graph-validation`
- Use for: every MPDG change before regeneration or promotion
- Prompt:
```text
Use schema-graph-validation after the MPDG change and report any warnings or failures before declaring the work complete.
```

### Model Primer
- Skill: `schema-model-primer`
- Use for: any task where the model contract is unclear and you need to classify authority, endpoints, and generated surfaces first
- Prompt:
```text
Use schema-model-primer first.
State the model key, table key, router key, authority, slug or sub-id policy, TypeSense status, and the exact generated/runtime contracts you will use before coding.
```

## Recommended Pairings
- Cross-repo work: `schema-master-orient` + one of the repo-operation skills
- New tenant onboarding: `schema-register-tenant` + `schema-audit-child-state`
- Shared engine capability: `schema-framework-feature-round`, then `schema-fanout-shared-release` when the release is ready
- Tenant-discovered bug: `schema-guardian-tenant-fix`, then promotion/adoption skills as needed
- Auth change: `schema-guardian-auth-flow` + the relevant auth/session verification skills
- Directory + record page: `schema-source-directory` + `schema-record-workspace`
- MPDG edit + safety pass: the relevant MPDG authoring skill + `schema-graph-validation`
- Unclear model behaviour: `schema-model-primer` before anything else

## Current Rule Of Thumb
- Schema tasks belong here in `apps/schema`.
- Consumer-app examples belong in the consuming app.
- If you correct a repeated mistake, update the nearest skill or AGENTS file in the same change.
