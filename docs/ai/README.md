# Schema AI Canon

This folder is the schema-owned guidance bundle for agents and humans working on schema-driven apps. It defines abstract contracts and points to the real runtime and generated sources.

## Read order
1. `architecture.md`
2. `runtime/authority-routing.md`
3. `runtime/typesense.md`
4. `schema-ai-bundle.md` when the task is about emitted AGENTS, skills, or bundle sync
5. `framework-promotion-playbook.md` when the task is about promoting shared schema changes into `origin/main` or porting them into another app-side schema repo
6. `../AI-GUIDE-GENERATION-PROJECT.md` when the task is about emitted model guides or future guide generation
7. The relevant controller doc in `../../module/docs/controllers/<model>.md`
8. The relevant runtime template in `../../module/src/resources/**`

## Vocabulary
- `source authority`: the model is authored in the source database first, then echoed to target instances when applicable.
- `instance authority`: the model is authored directly in one or more target instance databases and is not first written to the source database.

Current code may still serialize the non-source class as `tenant`, `remote`, or `instance`. In guidance, normalize those to `instance authority` before choosing a workflow.

## Scope boundary
- Schema canon explains contracts, generation flow, runtime routing, and reusable procedures.
- The first schema skill pack lives in `../../.agents/skills/schema-*`.
- Consumer apps add local examples, UI choices, and app-specific exceptions near their own code.
