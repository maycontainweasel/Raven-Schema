Title: Authentication (Schema‑kit)
Scope: global
Applies to: Nuxt 4 apps using Schema‑kit auth
Depends on: docs/mpd-schema/reference/01-schema-kit.md

This page explains how MPD authentication is enabled and what it requires.

## How auth is enabled

Authentication is controlled by the schema‑kit config file in the target app:

`schema-kit.config.json`

```json
{
  "features": {
    "auth": {
      "enabled": true
    }
  }
}
```

If `features.auth.enabled` is `true`, schema‑kit expects the runtime config and dependencies below.

## Required runtimeConfig

These values must exist (can be empty strings in config, populated by env):

```ts
runtimeConfig: {
  auth: {
    sessionSecret: '',
    cookieDomain: '',
    sessionCookie: '',
  },
  public: {
    sessionSecret: '',
    cookieDomain: '',
    sessionCookie: '',
  }
}
```

The module validates at setup time, so **runtimeConfig keys must exist** in `nuxt.config.ts` even if you fill them via `.env`.

## Required env keys

```bash
NUXT_SESSION_SECRET=...
NUXT_COOKIE_DOMAIN=...
NUXT_SESSION_COOKIE=...

NUXT_PUBLIC_SESSION_SECRET=...
NUXT_PUBLIC_COOKIE_DOMAIN=...
NUXT_PUBLIC_SESSION_COOKIE=...
```

## Required dependencies

Auth depends on the app’s crypto + session stack. Install the required packages:

```bash
pnpm add iron-webcrypto
```

If you are using Redis‑backed sessions, also install Redis:

```bash
pnpm add ioredis
```

## Auth endpoints (module runtime)

When auth is enabled, schema‑kit provides:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me`

These live under `modules/schema-kit/runtime/server/api/auth/*` and can be overridden via:

```
schema/overrides/schema-kit/runtime/server/api/auth/*
```

## Troubleshooting

### “Sentry enabled but runtimeConfig.* missing”

If you see a feature validation error on startup:
1) Ensure the runtimeConfig keys exist in `nuxt.config.ts`.
2) Ensure env variables are loaded in dev (use `.env`, or pass `NUXT_ENV_FILE=...`).

### “Could not load schema/overrides/.../auth/*”

This means `@schema` was pointing at overrides.
Fix by syncing the module (default aliases now point to module runtime):

```bash
pnpm run schema:module:sync
```
