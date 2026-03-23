# Typesense Authoring

## Purpose
The `typesense:` mini-language defines both:
- the Typesense document shape returned by the generated Typesense view/function
- the Typesense collection schema used for indexing/querying

These two shapes must stay in lock-step.

## Required decisions before editing
- collection name
- query/search fields
- facet/filter fields
- sortable fields
- default sorting field
- object/array field shape if nested data is included

## Non-negotiable rules
- Every field declared in the Typesense schema must be returned by the generated Typesense view/function.
- Do not rely on raw DB rows “probably containing” a field. Make the generated Typesense contract explicit.
- If the document can omit a field, either supply a safe value or mark the schema field optional where appropriate.
- Query/filter/sort metadata must reference fields that actually exist in the schema.

## Definition of done
- `pnpm run graph:validate` does not report Typesense parity errors
- the generated document shape and schema agree
- the collection name and metadata are intentional, not accidental defaults

## AI interpretation
When asked to “create a Typesense view”, the agent should interpret that as:
1. define the document shape
2. define the schema shape
3. ensure both match exactly
4. validate before regeneration/import
