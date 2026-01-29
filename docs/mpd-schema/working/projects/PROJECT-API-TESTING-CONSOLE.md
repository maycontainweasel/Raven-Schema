Title: Project — API Testing Console
Scope: global
Applies to: Nuxt 4, TRPC, MPD Framework

This project builds the API Testing Console in SchemaDocs.

## Intent

Provide a live UI to execute generated TRPC routes for any model, with consistent payloads and real responses.

## Scope (v1)

- Model selection (start with User)
- CRUD + resource endpoints
- Typesense endpoints (if enabled)
- Instance targeting (single instance first)

## Requirements

- Must use generated routers, not custom APIs.
- Must show raw request and response.
- Must allow quick re‑run with edits.

## Deliverables

- `/api` route with 3‑column layout
- Model/process registry
- Basic payload builder

## Reporting

Use the report format in `docs/projects/SCHEMA-DOCS-WORKING-SITE.md`.
