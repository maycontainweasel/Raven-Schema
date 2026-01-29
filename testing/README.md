# Schema Capability Testing

This folder is the long‑lived **testing library** for schema‑generated capabilities.
It documents how we test model features (CRUD, relations, taxonomies, subtables, etc.)
across TRPC and controller layers, plus the cleanup/trace strategy.

- **Runtime tests live in**: `apps/tools/passmed-schema/schema-docs/test/capabilities`
- **This folder** is the design + documentation hub for the test engine.

If you move schema‑docs into another app, you can still point its test runner
at these docs and shared utilities.

## Index
- `CAPABILITY_CHARTER.md` — what we test, at light/medium/deep levels
- `TEST_LEVELS.md` — how we scope quick vs deep tests
- `MODEL_TEST_TEMPLATE.md` — template for per‑model test plan
- `CLEANUP_STRATEGY.md` — cleanup principles + rules
- `REPORTING.md` — test run logs + AI‑ready reports

## Existing project doc
The original project plan lives at:
`apps/tools/passmed-schema/docs/SCHEMA-TESTING-PROJECT.md`
