# Decision Log

## 2026-04-08

### Workstream established

- Created the `schema-operating-system` workstream as the umbrella project for long-running schema ecosystem improvement.
- Chosen because the effort is broader than repo sync and includes skills, governance, versioning, verification, naming, and graph modularization.

### Master-repo responsibility

- `apps/schema` remains the control plane for all shared schema operating rules.
- Tenant repos may discover or validate framework work, but the durable operating model must be captured in this master repo.

### Skill design direction

- Skills should not remain prose-only once they become high-value and repetitive.
- Preferred stack:
  - skill
  - script or command surface when appropriate
  - validation checklist
  - durable docs

### Initial skill tiers

- Atomic: one precise action.
- Composed: a small workflow built from atomic skills.
- Operational: a real maintenance or lifecycle flow.
- Verification: a "prove it worked" flow.
- Guardian: a default-enforcing skill that asks before deviation.

### Naming exploration

- Naming exploration is in scope for this workstream, but the workstream itself stays on stable `schema-*` naming until a deliberate rename round is approved.

### Versioning direction

- Shared framework releases continue using `schema-master-000N` until replaced by a deliberate versioning decision.
- Tenant adoption state must remain explicit and machine-readable.
- Generator-affecting changes must be tracked as requiring downstream regeneration, not only normalization.

### Tenant term

- `tenant schema repo` is now the preferred human-facing term for child schema repos in operating-system documentation.

### Documentation baseline

- Added explicit baseline docs for:
  - skill architecture
  - tenant governance
  - versioning model

### First scaffolded operating skills

- Added the first tenant-registration, guardian, auth/session verification, MCP, and release-adoption skill scaffolds.

### Tenant framework-candidate handoff

- Added a dedicated tenant-to-master handoff concept for tenant-discovered framework fixes.
- This makes a Lucky-style generator fix something that can be recorded durably before or during promotion instead of living only in chat or one working tree.
- Added:
  - `schema-report-framework-candidate`
  - a framework-candidate note template

### Schema v1 / Lyric v2 split

- Current shipping work is now explicitly treated as Schema v1.
- The next-generation redesign is tracked separately as Lyric v2.
- Lyric v2 gets a parallel workspace and workstream instead of being mixed into active tenant-facing work by default.

### Lyric Docs direction

- The future documentation/proving-ground app should be a sibling app rather than a direct rebrand of the current `schema-docs` app.
- The current `schema-docs` app remains a useful reference and validation input.

### Backlog baseline

- Added a durable backlog for the schema operating system workstream so the active tracks do not stay implicit.
- Current focus includes:
  - tenant visibility
  - promotion/adoption rules
  - guardian skills
  - versioning
  - MPDG quality
  - git/process discipline
  - naming exploration

### Tenant scan registration rule

- A turbo repo containing `apps/schema` is not automatically a managed tenant.
- Register it only if it appears to be a live schema repo rather than:
  - the master repo itself
  - a duplicate clone
  - a stale or obviously wrong baseline
  - a non-git copy of schema
- Keep active-but-not-ready candidates out of `repo-registry.yaml` until their tenant shape is clear enough to record honestly.

### 2026-04-08 tenant scan result

- Registered active tenant repos discovered during the `~/Dev` scan:
  - `isolvents`
  - `trading`
- Left these out for now, with explicit reasons:
  - `coligo`: nested schema repo exists but still looks like a Lucky-derived baseline and has no app remote/app branch
  - `dmo`: active schema repo, but current branch model is noncanonical and does not yet expose a local or tracked `app` branch
  - `mpd-life`: `apps/schema` exists but is not its own nested git repo
  - `pmv2-turbo-master`: duplicate PassMed clone, not the canonical active PassMed tenant
