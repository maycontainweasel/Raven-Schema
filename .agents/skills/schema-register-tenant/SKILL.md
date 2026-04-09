---
name: schema-register-tenant
description: Use when a new tenant schema repo must be added to the master registry and brought under the shared schema operating model.
---

# Schema Register Tenant

## Goal
Register a tenant schema repo in the master registry before sync, promotion, or governance work begins.

## Use when
- A new schema tenant repo has been identified.
- A fresh AI needs to bring a tenant under management.
- A tenant exists locally but is not yet in `repo-registry.yaml`.

## Do not use when
- The tenant is already registered and only needs audit or normalization.

## Read first
1. `docs/ai/control-plane.md`
2. `docs/ai/repo-registry.yaml`
3. `docs/ai/tenant-governance.md`
4. `docs/ai/workstreams/schema-operating-system/README.md`

## Default behavior
- Add a minimal but complete tenant entry to `docs/ai/repo-registry.yaml`.
- Record actual paths, remotes, branch names, and project names.
- Mark uncertain status as `needs-audit` rather than inventing a healthy state.
- Follow registration with a tenant audit.

## Ask first if
- Multiple schema repos exist in one turbo repo and the canonical tenant repo is unclear.
- The shared remote should not be `origin`.
- The app-owned remote should not be `app`.

## Rules
- Register the tenant in master before trying to normalize it.
- Prefer explicit uncertainty over guessed status metadata.
- Do not silently treat an app-local `apps/<project>/schema` folder as the governed tenant repo when a canonical `apps/schema` repo also exists.

## Definition of done
- Tenant entry exists in `repo-registry.yaml`.
- Paths and remotes are recorded.
- Initial status is recorded.
- An audit was run or explicitly queued next.
