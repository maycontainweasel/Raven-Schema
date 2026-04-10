# MPDG Editor Tooling

This workstream tracks the editor and language-tooling layer for MPDG authoring.

Use it when the task is about:

- Zed editor support for `graph.mpdg` and `*.mpdg`
- syntax highlighting, bracket matching, outline, and indentation
- future completions, snippets, diagnostics, linting, and formatting
- making MPDG authoring easier and safer for humans and AIs

## Goal

Make MPDG authoring feel first-class in the editor instead of fragile plain text.

The immediate target is a working Zed language extension for syntax-first support.

The longer-term target is a richer authoring experience with:

- completions and snippets
- validation and lint surfaces
- formatting
- better error visibility
- a stable base for modular graph authoring

## Current scope

### Track 1: Zed syntax-first support

- dedicated MPDG language definition for Zed
- Tree-sitter grammar
- highlighting queries
- bracket matching
- indentation and outline basics

### Track 2: Validation ergonomics

- better visibility of `graph:validate` failures
- clearer MPDG authoring errors
- lint-like feedback for common AI mistakes

### Track 3: Authoring assistance

- snippets
- completions
- future language-server path if needed

### Track 4: Control-plane UI

- the future front-end that visually manages schema tenants, promotions, releases, and generation flows
- tracked here only as a linked future project, not part of the syntax-first implementation

## Canonical references

- `AGENTS.md`
- `docs/AI-READ-HERE.md`
- `docs/ai/mpdg/README.md`
- `docs/ai/mpdg/validation-workflow.md`
- `docs/graph-dsl-profile.md`
- `scripts/mpdg-to-spec.ts`
- `scripts/validate-graph-mpdg.ts`
- `extension/mpd-graph-dsl/`
- `extension/zed-mpdg/`

## Working rule

If MPDG authoring pain is discovered in the editor first, do not treat it as "just tooling."

Capture the fix here if it affects:

- syntax understanding
- validation clarity
- authoring safety
- future completions or diagnostics
