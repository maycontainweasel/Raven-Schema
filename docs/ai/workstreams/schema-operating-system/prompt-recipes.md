# Prompt Recipes

Use these phrases to keep future sessions aligned to the schema operating system workstream.

## Core project prompt

```text
Continue the schema operating system workstream.
Treat this round as operating-system work, not just a local tenant fix.
Update the durable docs before ending the round.
```

## Tenant registration

```text
Use schema-register-tenant for <repo-key>.
Register the tenant in the master registry, audit its remotes and branch state, and report what blocks normalization.
```

## Tenant-discovered framework bug

```text
Use schema-guardian-tenant-fix for <repo-key>.
Assume the bug was discovered in the tenant. Classify engine work vs app-owned work, say whether the fix must be promoted to master, and say whether downstream regeneration will be required after adoption.
```

## Tenant framework-candidate handoff

```text
Use schema-report-framework-candidate for <repo-key>.
Create a durable note for the tenant-discovered fix, classify the changed paths, record the tenant verification, and state the downstream release impact.
```

## Auth verification round

```text
Use schema-guardian-auth-flow first.
Then run the password refresh, login verification, and session-cookie verification skills as needed.
Do not change shared auth assumptions unless the docs say to or you ask first.
```

## Shared release adoption

```text
Use schema-adopt-framework-release for <repo-key>.
Normalize the tenant, decide whether regeneration is required, run the relevant verification, and update the release marker/reporting state.
```
