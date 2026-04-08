# Implementation Plan

## Track 1: Zed syntax-first support

Deliverables:

- `extension/zed-mpdg/extension.toml`
- MPDG language config for Zed
- Tree-sitter grammar source
- highlighting, brackets, indentation, and outline queries
- install notes for local dev use

Success:

- Zed opens MPDG files with syntax highlighting and basic editor behavior

## Track 2: Completion and snippet assistance

Candidate additions:

- reusable MPDG snippets for Zed
- completion triggers for field names, capability keys, and tags
- stronger outline and navigation behavior

## Track 3: Diagnostics and linting

Candidate additions:

- surfacing `graph:validate` output in-editor
- opinionated lint rules for recurring AI mistakes
- error ranges tied back to MPDG source

## Track 4: Formatting and modularity

Candidate additions:

- formatting strategy for MPDG
- modular graph file support
- stitched or compiled MPDG authoring inputs

## Track 5: Linked future project

- schema control-plane UI for managing tenants, releases, promotions, and generation flows
