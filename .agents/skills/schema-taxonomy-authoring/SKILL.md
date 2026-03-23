---
name: schema-taxonomy-authoring
description: Use when adding or changing MPDG taxonomies:. Define taxonomy key, labels, term model behaviour, and payload intent before editing, then validate the generated taxonomy contract.
---

# Schema Taxonomy Authoring

## Goal
Author taxonomy declarations that produce intentional term-table and payload behaviour.

## Use when
- Editing `taxonomies:` in a stanza.
- Adding controlled term sets or generated taxonomy structures.

## Do not use when
- The task is a plain relation or subtable.

## Read first
1. `docs/ai/mpdg/relations-taxonomies-subtables.md`
2. `config/AGENTS.md`

## Required decisions before editing
- taxonomy key
- labels
- term model override, if any
- payload field
- cardinality
- store-on-model behaviour

## Rules
- Treat taxonomy declarations as generated schema/runtime behaviour, not only labels.
- Keep taxonomy keys and payload intent explicit.
- Ask before introducing a new reusable taxonomy pattern that affects multiple models/apps.

## Definition of done
- Taxonomy intent was stated before editing.
- The generated taxonomy/term behaviour is coherent.
- Validation passes at the graph layer.
