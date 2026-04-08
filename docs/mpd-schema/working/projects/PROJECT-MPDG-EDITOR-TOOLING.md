Title: Project — MPDG Editor Tooling
Scope: global
Applies to: MPDG authoring, Zed, schema framework

This project tracks the editor tooling for MPDG authoring.

## Intent

- Make `graph.mpdg` and `*.mpdg` feel like a first-class language in the editor.
- Reduce authoring mistakes by improving syntax visibility and later validation feedback.
- Create a foundation for completions, diagnostics, linting, and formatting.

## Scope (v1)

- Zed syntax highlighting
- file recognition for MPDG files
- bracket matching
- basic indentation
- basic outline support

## Next phases

- snippets and completions
- diagnostics driven by `graph:validate`
- lint-like rules for recurring AI mistakes
- formatting strategy

## Requirements

- Must reflect the actual MPDG canon, not an invented subset.
- Must treat `docs/graph-dsl-profile.md`, `docs/ai/mpdg/**`, and the parser/validator scripts as the source of truth.
- Must stay in sync with grammar evolution.

## Reporting

Use the report format in `docs/projects/SCHEMA-DOCS-WORKING-SITE.md`.
