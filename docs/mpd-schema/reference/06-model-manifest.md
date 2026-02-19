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
- and (rich manifest) taxonomy/subtable/typesense metadata for Helios model manager

Generated outputs:
- `modules/schema-kit/runtime/generated/models.ts` (base runtime map for UI/composables)
- `modules/schema-kit/runtime/generated/admin-models.json` (rich admin metadata, machine-readable)
- `modules/schema-kit/runtime/generated/admin-manifest.ts` (typed export of rich admin metadata)

Overrides live in:
```
schema/models.override.ts
```

The manifest is the canonical source for model metadata in UI + composables.
