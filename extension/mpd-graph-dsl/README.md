# MPD Graph DSL highlighter (workspace-local)

What it does
------------
- Adds a lightweight language definition for `graph.mpdg` / `.mpdg` (or legacy `.graph`) files used by the MPD schema DSL.
- Highlights the current MPDG syntax: `Label, model | description { fields } [ capabilities ] ( connections ) { extras }`.
- Differentiates bracket sections with dedicated scopes:
  - Fields block `{ ... }`
  - Capabilities block `[ ... ]`
  - Connections block `( ... )`
  - Angle-tag programs `< ... >` (supports nested tags like `<record<country>>`)
- Field refs use `$field` (e.g. `id: $email`, `id: $parent`).
- View program tokens highlighted: `ST|uProfile`, `*ST|uExamDate`, `RID|p(ID)`, and edge tokens like `->Edge->target` / `<-edge<-source`.
- Capabilities also support `taxonomies:` blocks (minimal or full nested taxonomy/term definitions).

How to use in VS Code
---------------------
1) Open this folder in VS Code (`apps/tools/passmed-schema/extension/mpd-graph-dsl`).
2) Run “Developer: Install Extension from Location...” and point it at this folder, _or_:
   - `code --install-extension ./apps/tools/passmed-schema/extension/mpd-graph-dsl`
3) Reopen `config/graph.mpdg` (or `graph.txt`); language mode should show “MPD Graph DSL”.

Notes / tweaks
--------------
- Line comments: `# ...` or `// ...`
- Files auto-associated: `graph.mpdg`, `*.mpdg`, plus legacy `graph.txt` / `.graph`.
- Highlighting includes arrows `->` / `<-`, common keywords (`crud`, `router`, `views`, `mods`), and nested objects.
- Taxonomy shorthand is supported (e.g. `Department/s, department | ...`) and nested taxonomy/term blocks inside `[ ... ]`.
- Grammar is minimal and will evolve; edit `syntaxes/graph.tmLanguage.json` as the DSL evolves.
