---
name: schema-report-framework-candidate
description: Use when a tenant repo discovered a likely shared-framework fix and the AI must leave a durable handoff note before master promotion or fanout work begins.
---

# Schema Report Framework Candidate

## Goal
Capture a tenant-discovered framework candidate in a durable, reviewable form.

## Use when
- A tenant fixed a generator or runtime bug locally and the change may belong in master.
- A tenant discovered a shared improvement but master promotion is not complete yet.
- The work needs a handoff from a tenant context back to the master repo.

## Do not use when
- The work is already fully promoted and recorded in the shared release log.
- The change is clearly tenant-owned only.

## Read first
1. `docs/ai/control-plane.md`
2. `docs/ai/tenant-governance.md`
3. `docs/ai/versioning-model.md`
4. `docs/ai/templates/framework-candidate-note.md`
5. `docs/ai/framework-promotion-ledger.md`

## Default behavior
- Capture the bug summary, changed paths, and verification from the tenant where the issue was discovered.
- Classify changed files into framework-safe, framework-review, tenant-owned, and unknown.
- State whether downstream regeneration will be required after shared adoption.
- Leave the note in a durable location instead of relying on chat history.

## Ask first if
- The candidate changes shared auth, session, or bootstrap contracts.
- Promotion would require pulling tenant-owned files into master.
- The right durable note location is ambiguous.

## Rules
- Do not leave a tenant-discovered framework fix as an undocumented “we changed this somewhere”.
- Do not claim ecosystem-level completion until master promotion and tenant adoption are complete.
- Prefer explicit uncertainty over overconfident classification.

## Definition of done
- A framework-candidate note exists in a durable location.
- Changed paths are classified.
- Verification and downstream impact are explicit.
- The next master-side promotion step is clear.
