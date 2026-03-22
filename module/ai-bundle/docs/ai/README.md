# Schema Consumer AI Canon

This folder is the schema-managed guidance bundle for schema-consuming apps. It explains how to read the emitted runtime, how to reason about authority, and how to choose the right workflow before coding.

## Read order
1. `architecture.md`
2. `runtime/authority-routing.md`
3. `runtime/typesense.md`
4. `docs/controllers/<model>.md`
5. `modules/schema-kit/runtime/generated/models.ts`
6. `modules/schema-kit/runtime/generated/models.manifest.ts`
7. `modules/schema-kit/runtime/generated/databases.ts`

## Vocabulary
- `source authority`: the model is authored in the source database first, then echoed to target instances when applicable.
- `instance authority`: the model is authored directly in one or more target instance databases and is not first written to the source database.

Current runtime metadata may still serialize the non-source class as `tenant`, `remote`, or `instance`. Normalize those to `instance authority` before choosing a workflow.

## Skills
- Schema-managed repo skills live under `.agents/skills/schema-*`.
- Use them as workflow routers; use generated metadata and controller docs as factual truth.
