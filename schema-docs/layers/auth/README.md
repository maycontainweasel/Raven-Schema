# Auth Layer

This layer provides authentication endpoints, store, and middleware for PassMed apps.

## What it includes

- `/api/auth/login`, `/api/auth/logout`, `/api/auth/register`, `/api/auth/me`
- Pinia auth store (`useAuthStore`)
- `auth` guard middleware and `guest` middleware
- `useAuthGuard` composable

## Runtime config

All auth settings live under `runtimeConfig.auth` (server) and `runtimeConfig.public.auth` (client-safe).

### Guard settings

```ts
runtimeConfig: {
  auth: {
    guard: {
      enabled: true,
      refresh: true,
      protect: ['*'],
      ignorePaths: ['/login', '/register'],
      redirectOnFail: 'https://public.passmed.dev/login',
      redirectOnSuccess: 'https://dashboard.passmed.dev',
      redirectOnLogout: 'https://public.passmed.dev',
      testPageEnabled: true,
      redirectAliases: {
        public: 'https://public.passmed.dev/login',
        dashboard: 'https://dashboard.passmed.dev',
      },
    },
  },
}
```

### Guard behavior

- **protect**: list of path patterns to protect.
  - `*` protects everything.
  - `/dashboard*` protects `/dashboard` and any child routes.
- **ignorePaths**: list of patterns that are always excluded.
- **redirectOnFail**: where to go when unauthenticated.
- **redirectOnSuccess**: where to go when already authenticated (guest guard).
- **redirectOnLogout**: default redirect after logout (if no explicit redirect is passed).
- **testPageEnabled**: enables `/auth-test` and auto-ignores it in the guard.
- **redirectAliases**: optional mapping to avoid repeating full URLs.

## Middleware usage

```ts
definePageMeta({ middleware: 'auth' })
```

```ts
definePageMeta({ middleware: 'guest' })
```

## Composable usage

```ts
await useAuthGuard()
```

## Store usage

```ts
const auth = useAuthStore()
await auth.refresh()
await auth.logout()
```

## Notes

- Redirect targets can be absolute URLs or relative paths.
- If `logout()` is called with `null`, no redirect occurs.
- If `logout()` is called with `undefined`, it uses `guard.redirectOnLogout`.
