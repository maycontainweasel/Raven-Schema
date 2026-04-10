# MPDG Zed Extension

This folder contains the Zed editor extension for MPDG.

Current scope:

- syntax highlighting
- bracket matching
- basic indentation
- basic outline support

This is the syntax-first foundation for later work on:

- completions
- diagnostics
- linting
- formatting

## Install in Zed

Recommended on this machine:

```bash
pnpm -C apps/schema run schema:zed:install
```

That copies the extension into:

- `~/Library/Application Support/Zed/extensions/installed/mpdg`

and patches the local grammar repository path automatically.

Then:

1. Restart Zed or run `zed: reload window`
2. Reopen `graph.mpdg` or another `*.mpdg` file

Alternative dev install:

1. Open Zed.
2. Run `zed: install dev extension`.
3. Choose this folder:
   - `apps/schema/extension/zed-mpdg`

The installer script above is preferred because it also patches the local grammar path.

## Notes

- This first pass is optimized for local dev use inside the schema repo.
- The grammar is bundled here so the extension can evolve with the DSL.
- The built grammar artifact is shipped in `grammars/mpdg.wasm`.
- The source `extension.toml` is still repo-local and intended for this workspace. The install script patches the installed copy so it points at the installed extension directory.

## Regenerate the grammar

If the MPDG grammar changes:

```bash
tree-sitter generate
tree-sitter build --wasm
mv tree-sitter-mpdg.wasm grammars/mpdg.wasm
```

The local build used Docker-backed Tree-sitter wasm generation.
