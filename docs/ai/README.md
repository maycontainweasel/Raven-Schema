# Schema AI Canon

This folder is the schema-owned guidance bundle for agents and humans working on schema-driven apps. It defines abstract contracts and points to the real runtime and generated sources.

## Read order
1. `architecture.md`
2. `control-plane.md` when the task touches child repos, promotion, sync, or repo governance
3. `repo-registry.yaml` when the task needs concrete child repo paths, remotes, or branch expectations
4. `tenant-governance.md` and `versioning-model.md` when the task is about tenant lifecycle, release adoption, or schema operating rules
5. `skill-architecture.md` and `skills/README.md` when the task is about choosing, creating, or enforcing a schema skill
6. `workstreams/schema-operating-system/README.md` when the task is long-running operating-system work spanning skills, versioning, naming, or tenant governance
7. `workstreams/mpdg-editor-tooling/README.md` when the task is about Zed, syntax support, editor tooling, or future MPDG diagnostics/completions
8. `mpdg/README.md` for graph/DSL authoring tasks
9. `runtime/authority-routing.md`
10. `runtime/typesense.md`
11. `schema-ai-bundle.md` when the task is about emitted AGENTS, skills, or bundle sync
12. `framework-promotion-playbook.md` when the task is about promoting shared schema changes into `origin/main` or porting them into another app-side schema repo
13. `framework-release-log.md` when the task is about the latest promoted shared framework version
14. `framework-promotion-ledger.md` when the task is about tracking which framework commits should later be promoted
15. `workstreams/README.md` when the task is an active multi-round schema initiative that needs scope, decisions, and validation tracked in-repo
16. `../AI-GUIDE-GENERATION-PROJECT.md` when the task is about emitted model guides or future guide generation
17. The relevant controller doc in `../../module/docs/controllers/<model>.md`
18. The relevant runtime template in `../../module/src/resources/**`

## Vocabulary
- `source authority`: the model is authored in the source database first, then echoed to target instances when applicable.
- `instance authority`: the model is authored directly in one or more target instance databases and is not first written to the source database.

Current code may still serialize the non-source class as `tenant`, `remote`, or `instance`. In guidance, normalize those to `instance authority` before choosing a workflow.

## Scope boundary
- Schema canon explains contracts, generation flow, runtime routing, and reusable procedures.
- The first schema skill pack lives in `../../.agents/skills/schema-*`.
- Cross-repo repo governance belongs in this master repo, not in child repos.
- Consumer apps add local examples, UI choices, and app-specific exceptions near their own code.
- MPDG/graph authoring guidance lives under `mpdg/**` and is schema-workspace-specific, not consumer-app bundle guidance.
