# Validation Checklist

Use this checklist when changing MPDG editor tooling.

## Bootstrap and docs

- `AGENTS.md` still routes fresh agents to `docs/AI-READ-HERE.md`.
- `docs/AI-READ-HERE.md` points to the editor-tooling workstream when the task is editor/language support.
- The work is not left only in chat context.

## Zed extension

- Zed recognizes `graph.mpdg` or `*.mpdg` as MPDG.
- Highlighting works for stanza headers, fields, comments, brackets, tags, and edges.
- Comments toggle correctly.
- Bracket matching works for `{}`, `[]`, `()`, and `<>`.
- The grammar does not collapse representative MPDG files into plain text.

## Grammar confidence

- Test against a simple stanza.
- Test against a stanza with nested tags and object literals.
- Test against capabilities like `views`, `typesense`, `taxonomies`, or `relations`.
- Test against subtables or edges.

## Future-facing checks

- If a grammar gap is discovered, record whether it belongs to:
  - syntax
  - validation
  - completion
  - formatting
  - modular graph authoring
