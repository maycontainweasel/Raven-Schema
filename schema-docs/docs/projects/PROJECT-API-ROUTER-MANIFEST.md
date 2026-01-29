Title: Project — API Router Manifest
Scope: SchemaDocs /api
Applies to: Generated TRPC routers only (no custom routers yet)

This project defines the manifest that powers the /api testing UI and the AI‑readable docs for generated TRPC endpoints.

## Intent

- Produce a machine‑readable manifest of generated routers and their endpoints.
- Provide a stable contract for UI generation, docs generation, and code snippet export.
- Keep the manifest in sync with the generated router source.

## Inputs

- Generated routers: `schema-docs/server/trpc/routers/generated/*.ts`
- Generated router index: `schema-docs/server/trpc/routers/generated/index.ts`

## Output

- `schema-docs/app/data/router-manifest.json`
  - `models`: map of model key → router + source file
  - `routers`: map of router variable → endpoints + child routers

## Current Generator

- Script: `schema-docs/scripts/generate-router-manifest.cjs`
- Extracts:
  - endpoint name (property key)
  - method (query / mutation)
  - input wrapper + schema name when `RequestSchema(...)` is used
  - child router references

## Manifest Shape (v0)

```
{
  "generatedAt": "...",
  "source": "schema-docs/server/trpc/routers/generated",
  "models": {
    "question": { "router": "questionRouter", "file": "question.ts" }
  },
  "routers": {
    "questionRouter": {
      "name": "questionRouter",
      "file": "question.ts",
      "endpoints": [
        { "name": "create", "method": "mutation", "input": { "wrapper": "RequestSchema", "schema": "QuestionCreateInput" } }
      ],
      "children": [
        { "name": "taxonomy", "ref": "QuestionQcatRouter" }
      ]
    }
  }
}
```

## Known Gaps (next)

- Resolve input schema → field list (Zod parsing) for dynamic form generation.
- Surface resource keys, taxonomy keys, and typesense collections.
- Capture return types and notes (record vs record id).

## How to Regenerate

```
node apps/tools/passmed-schema/schema-docs/scripts/generate-router-manifest.cjs
```

## Reporting

Use the report format in `docs/projects/SCHEMA-DOCS-WORKING-SITE.md`.
