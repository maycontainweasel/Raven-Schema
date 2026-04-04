# Schema Skill Menu

Open this file when you want a copy-ready prompt for schema work.

## How To Use This Menu
- Naming the skill explicitly is the most reliable option.
- Agents may choose the right skill proactively when the task is clear, but explicit naming is still better for important work.
- If a task touches a model and you are not sure where to start, begin with `schema-model-primer`.
- For consumer-app pages, pair a directory skill with `schema-record-workspace` when the task includes the single-record page.

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
- Directory + record page: `schema-source-directory` + `schema-record-workspace`
- MPDG edit + safety pass: the relevant MPDG authoring skill + `schema-graph-validation`
- Unclear model behaviour: `schema-model-primer` before anything else

## Current Rule Of Thumb
- Schema tasks belong here in `apps/schema`.
- Consumer-app examples belong in the consuming app.
- If you correct a repeated mistake, update the nearest skill or AGENTS file in the same change.
