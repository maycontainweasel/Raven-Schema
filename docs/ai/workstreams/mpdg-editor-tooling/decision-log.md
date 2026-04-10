# Decision Log

## 2026-04-08

### Workstream established

- Created `mpdg-editor-tooling` as the canonical workstream for editor-facing MPDG support.
- Chosen because editor syntax, validation, completions, and formatting are a distinct track from tenant governance and repo control-plane work.

### Zed first

- Zed is now the primary editor target.
- The first implementation round is syntax-first support, not full completions or diagnostics.

### Bootstrap pattern kept

- Fresh-agent initialization stays:
  - `AGENTS.md`
  - `docs/AI-READ-HERE.md`
- We are tightening those entrypoints instead of creating another top-level bootstrap doc.

### Future control-plane UI tracked separately

- The future front-end for managing schema tenants and generation flows is in scope as a project track.
- It is tracked as a future project, not part of the first Zed-extension delivery.
