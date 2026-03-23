# Relations, Taxonomies, And Subtables

## Relations
Use `relations:` when the model needs record-backed links with shared CRUD/runtime meaning.

State before editing:
- left model
- edge table
- right model
- cardinality
- payload field
- store-on-model behaviour
- link-on-create behaviour
- hook/processor choice

Rules:
- do not reuse payload fields casually
- treat relation declarations as shared model contracts, not page-only helpers
- if the relation target model is unclear, resolve that first

## Taxonomies
Use `taxonomies:` when the model needs controlled term sets and generated term-table behaviour.

State before editing:
- taxonomy key
- labels
- term model if overriding defaults
- payload field
- cardinality
- whether terms are stored on the model

Rules:
- taxonomy declarations imply generated term-table/runtime behaviour
- keep taxonomy key and payload intent explicit
- ask before introducing a new reusable taxonomy pattern that affects multiple apps

## Subtables
Use the connections block for subsingle/submany data owned by the parent model.

State before editing:
- subtable label/model
- subsingle or submany
- ID strategy
- whether create input is nested
- whether order semantics matter

Rules:
- subtables are structure, not loose related records
- keep parent linkage and ID intent explicit
- if a nested input field targets a subtable, that targeting must remain unambiguous

## AI interpretation
When asked to add a relation, taxonomy, or subtable, the agent should treat it as a model-structure decision with generated consequences, not a one-off data hack.
