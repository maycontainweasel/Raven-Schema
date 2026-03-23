# Stanza Authoring

## What a stanza is
A stanza is one top-level MPDG definition in `config/graph.mpdg`:
- header: label, model, optional description
- fields block: `{ ... }`
- optional model settings block: `& { ... }`
- capabilities block: `[ ... ]`
- connections block: `( ... )`

Treat the whole stanza as one unit. Do not reason about `views:`, `typesense:`, or relations in isolation from the stanza that owns them.

## Required decisions before editing
- label
- model key
- ID strategy
- model authority if instance mode is active
- whether CRUD/router/resource/Typesense are required
- whether the model needs relations, taxonomies, or subtables
- whether the change introduces a new reusable contract

## Authoring rules
- Put model-level runtime behaviour in the model settings block, not in ad hoc comments or implied conventions.
- If instance mode is active, declare authority explicitly.
- Use the caps block to express capabilities. Do not encode capability intent indirectly in field names or comments.
- Use the connections block for subtables and edge declarations, not the extras block.
- Keep reusable resource and Typesense intent visible in the stanza rather than relying on page-level workarounds later.

## Generated outputs a stanza can affect
- live/staging specs
- generated Surreal functions
- generated views and resource functions
- generated Typesense collections and view functions
- generated routers and manifests
- generated docs

## Ask first when
- adding a new reusable resource selector
- adding a new cross-model relation shape that changes shared runtime behaviour
- adding a stanza whose authority or ID policy is ambiguous
- changing a stanza in a way that will alter public runtime contracts for existing consumer apps

## AI interpretation
When asked to “create a stanza”, the agent should interpret that as:
1. define or extend one model in `graph.mpdg`
2. decide the full stanza contract before editing
3. make the graph change in the correct block
4. validate the graph
5. only then regenerate downstream specs/assets
