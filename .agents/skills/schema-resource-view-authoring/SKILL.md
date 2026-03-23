---
name: schema-resource-view-authoring
description: Use when adding or changing a reusable resource in MPDG views:. Choose the narrowest correct resource contract, avoid invented selectors, and validate the generated shape before regeneration.
---

# Schema Resource View Authoring

## Goal
Create or change a reusable schema-backed resource/view without inventing selector names or over-broad data shapes.

## Use when
- Editing `views:` in a stanza.
- Adding a generated-function or function-backed resource.
- Deciding whether a new reusable resource is needed.

## Do not use when
- The task is page-only data shaping.
- Typesense is the only thing changing and no reusable non-Typesense resource is involved.

## Read first
1. `docs/ai/mpdg/views-and-resources.md`
2. `docs/ai/runtime/resource-selection.md`
3. `config/AGENTS.md`

## Workflow
1. Write down the exact fields needed.
2. Confirm whether an existing resource already fits.
3. If a new resource is required, name it intentionally and keep it narrow.
4. Validate unique selector names and generated shape.

## Rules
- Do not invent selectors like `Admin` or `Public` by assumption.
- Treat resource additions as reusable schema contracts.
- Ask before introducing a new reusable selector when the need is ambiguous.

## Definition of done
- The resource name is intentional and unique per model.
- The returned shape is explicit.
- Validation does not flag duplicate or malformed view/resource output.
