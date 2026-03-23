---
name: schema-subtable-authoring
description: Use when adding or changing MPDG subtables in the connections block. Resolve subsingle vs submany, parent linkage, ID strategy, and nested input intent before editing.
---

# Schema Subtable Authoring

## Goal
Author subtables as owned structure with clear parent linkage and generated behaviour.

## Use when
- Adding or changing a subtable inside the connections block.
- Changing nested create/update structure for a model.

## Do not use when
- The task is a relation between independent models.

## Read first
1. `docs/ai/mpdg/relations-taxonomies-subtables.md`
2. `config/AGENTS.md`

## Required decisions before editing
- label/model
- subsingle or submany
- ID strategy
- parent linkage
- nested input field, if any
- ordering behaviour, if any

## Rules
- Use subtables for owned structure, not loose cross-model relationships.
- Keep parent linkage and ID intent explicit.
- If nested input targets the subtable, the mapping must remain unambiguous.

## Definition of done
- The subtable structure and ownership are explicit.
- Validation does not reveal ambiguous targeting or malformed graph output.
