# Schema AI Canon

This folder is the schema-owned guidance bundle for agents and humans working on schema-driven apps. It defines abstract contracts and points to the real runtime and generated sources.

## Read order
1. `architecture.md`
2. `mpdg/README.md` for graph/DSL authoring tasks
3. `runtime/authority-routing.md`
4. `runtime/typesense.md`
5. `schema-ai-bundle.md` when the task is about emitted AGENTS, skills, or bundle sync
6. `framework-promotion-playbook.md` when the task is about promoting shared schema changes into `origin/main` or porting them into another app-side schema repo
7. `framework-promotion-ledger.md` when the task is about tracking which framework commits should later be promoted
8. `../AI-GUIDE-GENERATION-PROJECT.md` when the task is about emitted model guides or future guide generation
9. The relevant controller doc in `../../module/docs/controllers/<model>.md`
10. The relevant runtime template in `../../module/src/resources/**`

## Vocabulary
- `source authority`: the model is authored in the source database first, then echoed to target instances when applicable.
- `instance authority`: the model is authored directly in one or more target instance databases and is not first written to the source database.

Current code may still serialize the non-source class as `tenant`, `remote`, or `instance`. In guidance, normalize those to `instance authority` before choosing a workflow.

## Scope boundary
- Schema canon explains contracts, generation flow, runtime routing, and reusable procedures.
- The first schema skill pack lives in `../../.agents/skills/schema-*`.
- Consumer apps add local examples, UI choices, and app-specific exceptions near their own code.
- MPDG/graph authoring guidance lives under `mpdg/**` and is schema-workspace-specific, not consumer-app bundle guidance.
