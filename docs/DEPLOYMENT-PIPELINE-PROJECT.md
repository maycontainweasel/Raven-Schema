# Deployment Pipeline Project

## Charter
Build a safe, deterministic, reversible deployment pipeline for Nuxt apps that can run on any Linux server with confidence. The pipeline must never destroy unsafe paths (home directories, root, system folders), must support resumable steps, and must allow controlled rollback at any step.

## Goals
- Bulletproof safety around destructive actions.
- Step-by-step pipeline with explicit checks, apply, and rollback.
- Local + remote state tracking to support resume, audit, and recovery.
- Clear operator prompts for any decision that could be unsafe.
- First-class support for staging + production targets (later sprint).

## Non-Goals (for this project)
- Git-based deployments or CI/CD orchestration.
- Full server provisioning (handled by Ansible).
- Advanced health checks beyond HTTP/HTTPS verification.

## Safety Rules (Must-Haves)
1) Never delete:
   - `/`
   - `/home`
   - `/root`
   - any `$HOME` (resolved remotely)
2) Refuse to run destructive steps if `appDir` is unsafe.
3) Always backup Nginx config before overwriting.
4) Require explicit user intent for destructive rollback.
5) Remote actions must be validated by `check` before `apply`.

## Terminology
- **appDir**: Remote directory for a deployed app.
- **remotePath**: Path under `$HOME` (e.g. `dmo/public`) that expands to appDir.
- **remoteBase**: Base directory for remotePath (default `$HOME`).
- **remoteName**: Human-readable remote name (PM2 + folder naming).
- **target**: A deploy environment (e.g., staging, production).
- **state**: JSON that tracks completed steps and their metadata.

## Data Model (State)
Remote state stored at: `<appDir>/.deploy-state.json`

Suggested schema:
```
{
  "version": 1,
  "site": "admin",
  "target": "staging",
  "updatedAt": "ISO-8601",
  "steps": {
    "preflight": { "status": "done", "at": "ISO-8601" },
    "appDir": { "status": "done", "at": "ISO-8601" },
    "nginxHttp": { "status": "done", "at": "ISO-8601" },
    "httpVerify": { "status": "done", "at": "ISO-8601" },
    "ssl": { "status": "done", "at": "ISO-8601" },
    "httpsVerify": { "status": "done", "at": "ISO-8601" },
    "build": { "status": "done", "at": "ISO-8601" },
    "sync": { "status": "done", "at": "ISO-8601" },
    "pm2": { "status": "done", "at": "ISO-8601" }
  }
}
```

Local state stored at: `apps/schema/.deploy/<site>.<target>.json`

## Pipeline Steps (Proposed)

### Step 0: Preflight
- Check SSH connectivity.
- Validate remote tools if required (nginx/certbot/pm2/rsync).
- Validate safe paths.
- Validate config completeness (host/domain/appDir/remoteName).

Rollback: N/A

### Step 1: Create App Folder
- Ensure `<appDir>/output`.
- Ensure `<appDir>/ecosystem.config.cjs`.
- Ensure `<appDir>/env.config.cjs` if available.

Rollback: Delete `<appDir>` (only if safe).

### Step 2: Write Nginx HTTP Config
- Create `/etc/nginx/sites-enabled/<domain>`.
- Back up existing file first if present.

Rollback: Restore backup or delete file.

### Step 3: Reload Nginx
- `nginx -t` then reload.

Rollback: Restore previous config and reload.

### Step 4: Verify HTTP
- `curl http://127.0.0.1:<port>` OR `curl http://<domain>`.

Rollback: N/A

### Step 5: Issue SSL
- Run certbot (production only).
- Ensure config is updated.

Rollback: Remove `/etc/letsencrypt/live/<domain>`, `/archive`, `/renewal` entry, restore nginx config.

### Step 6: Verify HTTPS
- `curl -Ik https://<domain>` and validate successful response.

Rollback: N/A

### Step 7: Build
- Run build command locally.

Rollback: N/A

### Step 8: Sync Output
- `rsync .output -> <appDir>/output`.

Rollback: Optionally delete `<appDir>/output`.

### Step 9: PM2 Start/Reload
- `pm2 startOrReload ecosystem.config.cjs`.

Rollback: `pm2 delete <name>`.

### Step 10: Finalize
- Mark state as complete.

Rollback: N/A

## Rollback Strategy
Each step must provide a `rollback()` procedure.
Rollback can be:
- Full rollback (all steps reverse, in order).
- Step rollback (last successful step only).

## CLI & UX Strategy
- `site:deploy` runs pipeline.
- `--from` starts at a step.
- `--resume` continues based on state.
- `--rollback` reverses to a chosen step.
- `--reset-remote` only allowed if `appDir` is safe.
- Require confirmation phrase for destructive actions.

## Sprints

### Sprint 1 — Safety & State
Deliverables:
- Safe path checks + refusal of destructive actions.
- Local + remote state tracking.
- Preflight step in pipeline.

Acceptance:
- `--reset-remote` refuses unsafe paths.
- State files are created + updated.
- Resume works for non-destructive steps.

### Sprint 2 — AppDir + Nginx HTTP
Deliverables:
- Step 1–3 implemented with rollback.
- Nginx config backups created.

Acceptance:
- HTTP works with placeholder app.
- Rollback restores previous nginx config.

### Sprint 3 — HTTP Verification
Deliverables:
- Curl-based verification step.
- Pipeline halts if HTTP fails.

Acceptance:
- HTTP verify succeeds before SSL step starts.

### Sprint 4 — SSL + HTTPS Verification
Deliverables:
- SSL step enforced via config.
- HTTPS verification step.
- SSL rollback.

Acceptance:
- SSL cert is provisioned and verified automatically.

### Sprint 5 — Build + Sync + PM2
Deliverables:
- Build, sync, PM2 steps with rollback.
- Env sync integration.

Acceptance:
- Deployed app responds with expected content.

### Sprint 6 — Multi-Target Deploys
Deliverables:
- `deploy.targets` in YAML.
- `--target` flag selects environment.
- Separate state per target.

Acceptance:
- Staging and production deploys use different configs safely.

## Open Questions
- Should `remoteName` become required after backfilling existing sites?
- How many retries should be allowed for HTTP/HTTPS checks?
- Do we auto-skip SSL if cert already exists and is valid?

## Decisions (Current)
- `remoteName` defaults to the site `slug` for backward compatibility.
- `remoteRoot` is supported and used to compose `<remoteRoot>/<remoteName>` when `appDir` is not explicit.
- `remotePath` (relative to `remoteBase`) overrides the `remoteRoot + remoteName` fallback.
- `remoteBase` defaults to `$HOME` unless explicitly set.

## Immediate Next Step
Start Sprint 1: implement the safety checks, state model, and preflight step.
