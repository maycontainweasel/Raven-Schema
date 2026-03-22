# Consumer Docs

## Purpose
- `docs/ai/**` is the local, schema-managed guidance bundle for this app.
- `docs/controllers/**` is the model-specific controller/runtime reference set.

## Writing rules
- Keep app-specific docs additive. Do not restate the abstract schema contract unless the app genuinely diverges.
- If a doc is only an example, label it as an example and do not let it redefine the contract.
- If a framework-wide rule changes, fix it in `apps/schema` rather than only patching the local copy.
