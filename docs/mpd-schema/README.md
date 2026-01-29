Title: MPD Schema Documentation
Scope: global
Applies to: MPD Schema Tooling, Schema‑kit, Admin UI, TRPC, Typesense

This folder is the **single source of truth** for how the MPD Schema ecosystem works.

If an AI reads this documentation end‑to‑end, it should be able to:
- Understand the MPDG graph DSL and what it generates.
- Build admin UI pages without inventing patterns.
- Use `useCRUD` correctly for local vs remote data.
- Work with record IDs and sub‑IDs safely.
- Use Typesense views/collections the MPD way.
- Extend Schema‑kit cleanly (modules, overrides, stores, controllers).

Start here: `docs/mpd-schema/INDEX.md`

## Doc map (quick links)

- Router/API contracts: `docs/mpd-schema/api/ROUTER-PRIMER.md`, `docs/mpd-schema/api/ROUTER-CHARTER.md`
- Auth enablement: `docs/mpd-schema/reference/07-auth.md`
- Working notes + project guidance: `docs/mpd-schema/working/README.md`
- Project‑specific write‑ups: `docs/mpd-schema/working/projects/`
