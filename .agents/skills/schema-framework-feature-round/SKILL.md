---
name: schema-framework-feature-round
description: Use when the user wants a reusable schema-engine feature added in the master repo, documented as shared framework behavior, and prepared for later fanout into child schema repos.
---

# Schema Framework Feature Round

## Goal
Implement one reusable framework feature in `apps/schema` so it belongs to shared `origin/main`, not only to one child repo.

## Use when
- The user wants a small engine capability added to the schema framework.
- The change should improve generators, site tooling, runtime templates, or shared docs.
- The change may later need to be synced into child repos like PassMed, Lucky, Helios, or Orbits.

## Read first
1. `AGENTS.md`
2. `docs/ai/control-plane.md`
3. `docs/ai/repo-registry.yaml`
4. `docs/ai/framework-promotion-playbook.md`
5. `docs/ai/framework-release-log.md`

## Process
1. Name the work as a shared framework feature round.
2. State the user-visible capability in one sentence.
3. Identify the framework-owned files that should change in `apps/schema`.
4. Keep generated app output out of master unless it is a reusable template/runtime artifact.
5. Implement the feature in master.
6. Update the nearest docs or skills so a fresh agent understands the new behavior.
7. If the change is ready to publish, record it in `framework-release-log.md` in the same promotion round.
8. If the user wants rollout, use the repo sync tools afterwards to fan the release out to child repos.

## Rules
- Prefer changing generator logic, site tooling, or shared runtime templates over patching one tenant app directly.
- If the change requires app-side regeneration, say so explicitly.
- Treat child repo fanout as a separate step after the master feature is correct.
- If the process feels awkward, tighten the docs or skills before ending the round.

## Definition of done
- The feature exists in `apps/schema`.
- The relevant docs or skills mention how to use it.
- It is clear whether child repos need only a sync or also app-side regeneration.
