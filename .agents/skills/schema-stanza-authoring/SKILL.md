---
name: schema-stanza-authoring
description: Use when creating, extending, or refactoring a stanza in config/graph.mpdg. Resolve the full stanza contract first, then edit the correct MPDG blocks and validate before regeneration.
---

# Schema Stanza Authoring

## Goal
Author one model stanza intentionally, with the generated outputs and runtime consequences understood before editing.

## Use when
- Creating a new model stanza.
- Extending a stanza with new fields, model settings, capabilities, or connections.
- Refactoring a stanza whose structure or authority is unclear.

## Do not use when
- The task is only about a consumer-app page or runtime implementation.
- The task only needs a small change inside `views:`, `typesense:`, `relations:`, `taxonomies:`, or subtables and a more specific MPDG skill fits better.

## Read first
1. `docs/ai/mpdg/README.md`
2. `docs/ai/mpdg/stanza-authoring.md`
3. `config/AGENTS.md`
4. `scripts/mpdg-to-spec.ts` if the DSL behaviour is ambiguous

## Required decisions before editing
- label and model key
- ID strategy
- explicit authority if instance mode is active
- required capabilities
- whether the stanza needs views, Typesense, relations, taxonomies, or subtables
- expected generated outputs

## Rules
- Treat the stanza as one unit, not as isolated fragments.
- Keep authority explicit when instance mode is active.
- Put reusable contract changes in schema, not in consumer app workarounds.
- Ask before introducing a new reusable resource surface or ambiguous shared behaviour.
- Run `pnpm run graph:validate` before regeneration.

## Definition of done
- The stanza contract was stated before editing.
- The graph change is valid enough to regenerate safely.
- The expected generated outputs are clear.
