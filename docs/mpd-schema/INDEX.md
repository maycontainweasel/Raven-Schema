Title: MPD Schema Documentation Index
Scope: global
Applies to: MPD Schema Tooling, Schema‑kit, Admin UI, TRPC, Typesense

This index defines the authoritative reading order and doc tree for the MPD Schema documentation set.

## Read‑first order (v1)

1) `docs/mpd-schema/README.md`
2) `docs/mpd-schema/primer/01-overview.md`
3) `docs/mpd-schema/primer/02-data-paradigm.md`
4) `docs/mpd-schema/primer/03-record-ids.md`
5) `docs/mpd-schema/primer/04-graph-dsl.md`
6) `docs/mpd-schema/primer/05-generation-pipeline.md`
7) `docs/mpd-schema/reference/01-schema-kit.md`
8) `docs/mpd-schema/reference/02-composables-usecrud.md`
9) `docs/mpd-schema/reference/03-trpc.md`
10) `docs/mpd-schema/reference/04-typesense.md`
11) `docs/mpd-schema/reference/05-admin-ui.md`
12) `docs/mpd-schema/reference/06-model-manifest.md`
13) `docs/mpd-schema/reference/07-auth.md`
14) `docs/mpd-schema/patterns/README.md`
15) `docs/mpd-schema/recipes/README.md`
16) `docs/mpd-schema/api/ROUTER-PRIMER.md`
17) `docs/mpd-schema/api/ROUTER-CHARTER.md`
18) `docs/mpd-schema/working/README.md`
19) `docs/mpd-schema/working/projects/`

## Doc tree

- `docs/mpd-schema/primer/` → high‑level concepts + mental model
- `docs/mpd-schema/reference/` → precise rules, APIs, and contracts
- `docs/mpd-schema/patterns/` → canonical implementation patterns
- `docs/mpd-schema/recipes/` → task‑oriented walkthroughs
- `docs/mpd-schema/working/` → live “how it works” pages with code pointers
- `docs/mpd-schema/models/` → model‑specific guides (generated/curated)
- `docs/mpd-schema/api/` → API/routers/contracts
- `docs/mpd-schema/working/projects/` → active project plans + operational docs
- `docs/mpd-schema/reference/07-auth.md` → auth enablement + requirements

## Existing source docs (to be consolidated)

These are still valid but will be progressively merged into MPD Schema docs:

- `docs/graph-dsl-profile.md`
- `docs/mpdg-tag-glossary.md`
- `docs/module-overlays.md`
- `docs/schema-kit-overrides.md`
- `schema-docs/docs/*`

## Reader roadmap (quick intent)

- **Primer** → mental model (what MPD is, how data flows)
- **Reference** → exact rules + contracts
- **API** → TRPC router contracts + model API docs
- **Working** → “how it works today” and project execution docs
