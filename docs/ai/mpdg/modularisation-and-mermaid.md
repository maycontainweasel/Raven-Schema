# Modularisation And Mermaid

## Current state
- The current human authoring source is still `config/graph.mpdg`.
- Mermaid generation already exists via `pnpm run graph:mermaid`.
- The Mermaid generator uses the same parser path as MPDG spec generation.

## Current rule
Do not split the graph ad hoc yet. Treat modular graph authoring as a designed future workflow.

## Planned direction
- Keep one assembled effective graph for the existing parser/generator pipeline.
- Introduce a manifest/import assembly step before changing the parser contract.
- Continue generating Mermaid from the assembled effective graph.

## Why this matters
The goal is not merely smaller files. The goal is:
- safe collaborative editing
- better task-focused authoring
- preserved generation behaviour
- preserved Mermaid visibility

## AI interpretation
If asked to split the graph today, the agent should treat that as design work unless an explicit assembly workflow has been implemented.
