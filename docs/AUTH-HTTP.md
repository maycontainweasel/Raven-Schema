# HTTP Auth (Schema-Kit Standard)

This doc describes the **standard HTTP auth layer** used across PMV2 apps.
It is provided by the schema-kit module and is the source-of-truth for login,
registration, session refresh, and logout.

## Endpoints (auto-registered)

The schema-kit module registers these **if the app does not define its own**:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Each endpoint delegates to shared handlers in `@pmv2/shared/auth/handlers.ts`
and uses the shared session utilities in `@pmv2/shared/auth/session.ts`.

## Session cookie + encryption

Auth sessions are stored in a sealed cookie using `iron-webcrypto`.

Cookie config is read from runtimeConfig:

- `runtimeConfig.auth.sessionSecret`
- `runtimeConfig.auth.sessionCookie`
- `runtimeConfig.auth.cookieDomain`

If not provided, fallbacks are used from env (`NUXT_SESSION_SECRET`, etc.)
and `@pmv2/shared/auth/config.ts`.

**Per-app cookie names are supported.**
Set `auth.sessionCookie` per app (e.g. admin uses a different cookie name).

## Sliding session refresh

`readSession()` will **refresh the cookie** (reseal with new `iat`)
if the session age is older than the refresh threshold (~12 min).

This means the session stays alive as long as the client is active.

## Keepalive (client)

Schema-kit registers a small keepalive plugin when auth is enabled:

- Calls `$auth.refresh()` every 10 minutes while the tab is visible.
- Stops when hidden/offline, resumes when visible/online.

This prevents idle session expiry during long workflows.

## Role on registration

`fn::createUser` sets a default role of **student** when `role` is empty:

```
role: ... else { return type::record("role", "student") }
```

So registrations via `/api/auth/register` produce a **student** user by default.

## Test registration (public app)

There is a test page in pmv2-public:

- `/new-auth` (existing test form)
- `/register-test` (alias wrapper page)

Both use `/api/auth/*` endpoints and are safe for dev testing.

## Enable/disable per app

In each app’s `schema-kit.config.json`:

```
features: {
  auth: true | false
}
```

If `auth` is `false`, schema-kit will not register the endpoints or keepalive plugin.
