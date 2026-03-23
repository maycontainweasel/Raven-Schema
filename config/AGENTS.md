# MPDG Authoring

## What lives here
- `graph.mpdg` is the source-of-truth DSL for schema stanza authoring.
- `specs/**`, `specs_stage/**`, and `migrations/**` are generated outputs or generated inputs downstream of the graph.
- `app.config.yaml` controls graph input/output paths, instance mode, and generator defaults.

## Read first for graph work
- `../docs/ai/mpdg/README.md`
- `../docs/ai/mpdg/stanza-authoring.md`
- `../docs/ai/mpdg/views-and-resources.md` when changing `views:`
- `../docs/ai/mpdg/typesense-authoring.md` when changing `typesense:`
- `../docs/ai/mpdg/relations-taxonomies-subtables.md` when changing those blocks
- `../docs/ai/mpdg/validation-workflow.md`

## Non-negotiable rules
- Do not invent MPDG syntax from nearby examples alone. Check the MPDG canon and parser behaviour first.
- Treat one top-level table definition as a stanza, including fields, model settings, caps, and connections.
- When instance mode is active, declare model authority explicitly in the stanza model settings block.
- Do not invent resource selectors or Typesense fields by guesswork. Keep the generated view/function shape aligned with the generated schema.
- Run `pnpm run graph:validate` after graph changes. Run regeneration only after validation is clean enough for the task.
- If validation reveals a repeated agent misunderstanding, fix the nearest MPDG doc or skill in the same change.
