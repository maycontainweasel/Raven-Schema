---
name: schema-typesense-authoring
description: Use when adding or changing a stanza typesense: block. Keep the generated Typesense document shape and collection schema in lock-step and validate parity before regeneration.
---

# Schema Typesense Authoring

## Goal
Author Typesense contracts that index cleanly and match the generated document shape exactly.

## Use when
- Editing `typesense:` in MPDG.
- Adding search/facet/filter/sort fields.
- Fixing a Typesense schema/document mismatch.

## Do not use when
- The task only changes non-Typesense views/resources.

## Read first
1. `docs/ai/mpdg/typesense-authoring.md`
2. `docs/ai/runtime/typesense.md`
3. `config/AGENTS.md`

## Required decisions before editing
- document fields
- schema fields
- query/filter/facet fields
- sortable/default sort fields
- optional vs required fields

## Rules
- Every schema field must be returned by the generated Typesense view/function.
- Metadata such as query/filter/sort must reference real schema fields.
- Do not trust raw data availability; make the Typesense contract explicit.
- Run `pnpm run graph:validate` after the change.

## Definition of done
- Validation shows no Typesense parity errors.
- The document shape and collection schema agree.
