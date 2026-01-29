Title: Generation Pipeline
Scope: global
Applies to: MPD Schema Tooling

The pipeline is:

1) **MPDG → Specs**  
   `graph.mpdg` is parsed into YAML specs.

2) **Specs → Assets**  
   Specs generate:
   - SurrealDB functions, views, indexes, edges
   - TRPC routers
   - Typesense collections
   - Admin UI pages
   - Controllers + docs

3) **Schema‑kit module sync**  
   Generated runtime assets are copied into the module and then into target apps.

4) **Bootstrap / Import**  
   Assets are imported into databases (local + remote).

This pipeline is the backbone of the system.
