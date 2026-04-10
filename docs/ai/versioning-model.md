# Schema Versioning Model

This file defines the current baseline versioning model for the schema ecosystem.

Current naming boundary:
- **Schema v1** = the active shared framework and tenant adoption model documented here
- **Lyric v2** = the future redesign stream, tracked separately in the Lyric workstreams until a deliberate migration plan exists

## Purpose

We need version visibility at two levels:

- the shared schema framework
- each tenant's adoption of that framework

We also need to distinguish changes that only alter source/runtime logic from changes that require regenerated tenant output.

## Shared framework releases

The shared framework uses a monotonic release counter:

- `schema-master-0001`
- `schema-master-0002`
- `schema-master-0003`

Rules:

- every shared framework promotion pushed from master gets a new release id
- every release must be recorded in `docs/ai/framework-release-log.md`
- the release log must say whether downstream regeneration is required
- these release ids currently apply to Schema v1 only

## Tenant adoption tracking

Each tenant app branch should carry:

- `.schema-release.yaml`

Current baseline fields:

- `version`
- `repo_key`
- `repo_name`
- `shared_framework.release_id`
- `shared_framework.release_commit`
- `shared_framework.applied_shared_head_commit`
- `shared_framework.applied_at`
- `shared_framework.applied_by`

This is the current source of truth for:

- which shared release a tenant has absorbed
- which shared commit was actually integrated

## Release categories

Every shared change should classify downstream impact as one of:

- `engine-only`
- `requires-regeneration`
- `requires-manual-review`

### Engine-only

No emitted tenant output must be rewritten immediately.

Example:

- docs-only changes
- control-plane/reporting changes
- repo-maintenance skill changes

### Requires-regeneration

Tenant apps must regenerate emitted output after adoption.

Example:

- generator fixes
- emitted controller or router changes
- emitted SURQL/function changes
- generated docs/manifests/type changes

### Requires-manual-review

The shared change is reusable but still risky enough that adoption must be checked carefully tenant by tenant.

Example:

- auth contract changes
- session behavior changes
- bootstrap/runtime contract changes

## Tenant app release idea

The likely next step is to add an optional tenant-local counter in the release marker for app-owned evolution.

Candidate shape:

```yaml
tenant_app:
  release_id: golfroom-app-0012
  applied_at: 2026-04-08T10:00:00.000Z
```

This is not yet the canonical enforced model.

For now:

- the shared release marker is mandatory
- tenant-local app release counters remain a planned extension

## Lyric v2 note

Lyric v2 should be planned with its own version stream rather than overloading the current Schema v1 tenant-release model too early.

Until a deliberate migration round exists:
- keep tenant release markers on the Schema v1 model
- keep Lyric v2 progress tracked through workstreams, not tenant release files

## Working rule

If a shared change affects emitted output, do not describe a tenant as fully updated until:

- normalization happened
- regeneration happened where required
- the relevant verification happened
