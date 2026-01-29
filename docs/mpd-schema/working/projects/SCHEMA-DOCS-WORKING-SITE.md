Title: SchemaDocs Working Site (Project Definition)
Scope: global
Applies to: Nuxt 4, MPD Framework

This document defines the working site we are building inside the SchemaDocs app. It has two parallel tracks:
1) **API Testing Console**
2) **Demo Admin Interface**

Both tracks are designed to make the MPD workflow obvious to an AI and provide live, working examples.

## Core Intent

- Provide a **live testing kit** for every generated model.
- Provide a **copy‑ready demo admin UI** that reflects the MPD paradigm.
- Capture every nuance discovered during testing and convert it into docs/artifacts.

## Architecture Overview (v1)

Route layout (proposed):
- `/demo` → Demo admin interface (UI‑focused)
- `/api` → API testing console (workflow + console + forms)

Layout (shared concept):
- Left column: model selector + process menu (CRUD, Typesense, Taxonomies, etc.)
- Middle column: parameters, options, and variants
- Right column: live console output (responses, errors, logs)

## Track A — API Testing Console

Goal: A functional console that can execute generated TRPC routes for any model with minimal setup.

Key capabilities (v1):
- Select model (User, Exam, etc.)
- Select process (create, update, delete, resource, typesense)
- Populate payload with defaults
- Execute request against target instance(s)
- Show raw request + raw response

Deliverables:
- Console UI with structured output
- Model/process registry (map of ops per model)
- Simple payload builders (default fields + required fields)

Success criteria:
- Can create, update, delete, and fetch a User via TRPC.
- Can run Typesense endpoints for a User if enabled.

## Track B — Demo Admin Interface

Goal: A minimal admin UI that mirrors the MPD CRUD flow and can be used as the “canonical example” for AI.

Key capabilities (v1):
- Generic list view per model
- Create dialog (required fields + defaults)
- Edit page (single record)
- Delete flow (with confirmation)
- Typesense search when enabled

Deliverables:
- `/demo/<model>` pages
- Minimal UI, no dependency on a specific component library
- Copy‑ready example patterns

Success criteria:
- User model list + create + edit + delete all work.
- Typesense search for User works end‑to‑end.

## Reporting Protocol (required from each AI)

Each AI working on a track must return a short report with:

1) **What I implemented**
2) **Files touched**
3) **What worked**
4) **What failed / missing**
5) **Nuances discovered** (convert to doc artifacts)
6) **Next steps**

## Notes

We are intentionally building this with minimal styling to keep it portable across projects.
