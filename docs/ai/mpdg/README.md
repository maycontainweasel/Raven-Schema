# MPDG Authoring Canon

This folder is the canonical guidance for authoring `config/graph.mpdg`.

Use it when the task is about:
- creating or editing a stanza
- changing `views:`
- changing `typesense:`
- adding relations, taxonomies, or subtables
- validating whether the graph change is coherent before generation

## Read order
1. `stanza-authoring.md`
2. `views-and-resources.md` when `views:` or reusable resources are involved
3. `typesense-authoring.md` when `typesense:` is involved
4. `relations-taxonomies-subtables.md` when changing those blocks
5. `validation-workflow.md`
6. `modularisation-and-mermaid.md` when the task is about splitting the graph or Mermaid output

## Current source of truth
- Human authoring source: `config/graph.mpdg`
- Reference implementation of the language: `scripts/mpdg-to-spec.ts`
- Existing broad syntax/profile notes: `docs/graph-dsl-profile.md`
- Tag/program glossary: `docs/mpdg-tag-glossary.md`

## Related skills
- `schema-stanza-authoring`
- `schema-resource-view-authoring`
- `schema-typesense-authoring`
- `schema-relation-authoring`
- `schema-taxonomy-authoring`
- `schema-subtable-authoring`
- `schema-graph-validation`

Choose the closest matching skill proactively before editing. If more than one applies, use the narrowest authoring skill first and end with `schema-graph-validation`.

If the broad docs and the parser disagree, the parser wins.

## Vocabulary
- `stanza`: one top-level MPDG model definition, including fields, optional model settings, capabilities, and connections.
- `resource`: a reusable named data shape generated from `views:` and exposed through generated/runtime contracts.
- `Typesense document shape`: the fields returned by the generated Typesense view/function.
- `Typesense schema`: the collection fields declared for Typesense indexing.

## AI interpretation contract
Before editing `graph.mpdg`, the agent should be able to state:
- which stanza is changing
- what outputs that stanza is expected to generate
- which mini-language is being touched
- what validation command will be run afterwards
- whether the change introduces a new reusable contract that needs user approval

## Non-negotiable rules
- Do not invent MPDG syntax from examples alone. Check this canon and the parser first.
- Do not invent new reusable resource selectors or Typesense fields by guesswork.
- If a graph change creates a new reusable contract, ask before adding it.
- Run `pnpm run graph:validate` after graph changes and before regeneration/promotion.
- If a repeated misunderstanding appears, update the nearest MPDG doc or skill in the same change.
