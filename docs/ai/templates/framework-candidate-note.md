# Framework Candidate Note

Use this template when a tenant discovers a possible shared-framework fix that should be reviewed or promoted from master.

```md
# Framework Candidate: <short-title>

- tenant_repo_key:
- tenant_name:
- discovered_at:
- discovered_by:
- shared_release_seen:
- tenant_release_marker:

## Summary

<one-paragraph summary of the bug or improvement>

## Why this is shared-framework work

- reusable across tenants:
- not only tenant-generated output:
- affected runtime/generator area:

## Changed paths

### Framework-safe source

- `src/...`
- `module/...`
- `docs/...`

### Framework-review paths

- `config/bootstrap/...`
- `layers/...`

### Tenant-owned or generated paths

- `config/graph.mpdg`
- `config/app.config.yaml`
- `sites/...`
- generated output paths:

## Reproduction

1.
2.
3.

## Verification in tenant

- generation run:
- app/runtime verification:
- auth/session verification:
- MCP verification:

## Downstream impact

- release category:
  - `engine-only`
  - `requires-regeneration`
  - `requires-manual-review`
- tenants likely affected:
- regeneration required after adoption:

## Promotion notes

- master files to inspect first:
- risky assumptions:
- ask-first items:
```

Working rule:

- If the fix was discovered in a tenant and could affect other tenants, do not leave the handoff only in chat.
- Record this note in the active workstream, promotion ledger, or linked task before promotion.
