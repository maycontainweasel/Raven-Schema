# Schema Docs Guidance

## Purpose
- `docs/ai/**` is the canonical AI/operator guidance for schema runtime behavior.
- `docs/ai/mpdg/**` is the canonical AI/operator guidance for graph DSL authoring.
- Older docs in this folder may still hold useful evidence, but they are not automatically canonical.

## Writing rules
- Keep schema docs abstract unless the document is explicitly marked as a reference implementation.
- Route to runtime templates, generated metadata, and controller docs instead of duplicating large explanations.
- Route graph-authoring questions to `docs/ai/mpdg/**` and `scripts/mpdg-to-spec.ts` instead of relying on old examples alone.
- Use `source authority` and `instance authority` in prose; if current code still says `tenant` or `remote`, explain that as an implementation alias.
- Keep consumer-app examples in consumer-app docs. If a schema doc mentions one, it must be labeled as evidence, not definition.

## Update rule
- If a schema runtime rule changes, update the nearest `docs/ai/**` file and any affected skill in `../.agents/skills/**`.
