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

Overrides live in:
```
schema/models.override.ts
```

The manifest is the canonical source for model metadata in UI + composables.
