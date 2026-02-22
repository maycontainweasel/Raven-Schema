Title: Model Manifest (Admin Data Map)
Scope: global
Applies to: Admin UI, useCRUD

The generator produces a model manifest:

```
@schema/models
```

It provides:
- table name
- slug policy
- data location (local vs remote)
- schema mode + bootstrap table policy metadata
- and (rich manifest) taxonomy/subtable/typesense/router/crud metadata for Helios model manager

Generated outputs:
- `modules/schema-kit/runtime/generated/models.ts` (base runtime map for UI/composables)
- `modules/schema-kit/runtime/generated/models.manifest.json` (canonical runtime manifest)
- `modules/schema-kit/runtime/generated/models.manifest.ts` (typed export of canonical runtime manifest)
- `modules/schema-kit/runtime/generated/admin-models.json` (rich admin metadata, machine-readable)
- `modules/schema-kit/runtime/generated/admin-manifest.ts` (typed export of compatibility admin projection)

Overrides live in:
```
schema/models.override.ts
```

Runtime resolution order (Helios model manager):
1. `models.manifest.json` (canonical, preferred)
2. `admin-models.json` (compatibility projection)
3. graph parsing fallback (optional, controlled by `HELIOS_ADMIN_ENABLE_GRAPH_FALLBACK`)

MPDG can now include optional model settings after fields:
```
Model, table | Desc {
  // fields
} & {
  schemaType: "schemaless" | "schemafull",
  dataLocation: "local" | "remote",
  bootstrap: { ensureTable: true },
  admin: { enabled: true },
  typesense: { enabled: true }
} [caps] (connections)
```

Unknown model-settings keys are preserved as passthrough metadata and surfaced as warnings.
