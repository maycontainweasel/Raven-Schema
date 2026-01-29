# Schema‑Kit Overrides

This document explains how to **extend** (or override) module‑supplied stores and how to **augment the model manifest** per project, without editing the module files.

---

## 0) Module Resources + Overrides (module source)

Schema‑kit now supports two explicit module‑source folders:

```
apps/schema/module/src/resources
apps/schema/module/src/overrides
```

They are applied **every time the module is synced** into a target app:

1) `src/runtime` (generated + base)
2) `src/resources` → copied **without overwriting**
3) `src/overrides` → copied **with overwrite**

### How to use

**Resource assets** (always included, never overwrite generated files):

```
module/src/resources/components
module/src/resources/composables
module/src/resources/stores
module/src/resources/server
```

**Overrides** (replace generated/runtime files):

```
module/src/overrides/composables/useCRUD.ts
module/src/overrides/controllers/user.ts
```

Notes:
- `--clear-module` only wipes generated runtime assets; your resources/overrides stay intact.
- Use **resources** for new helpers; use **overrides** when you must replace generated logic.

---

## 1) Store Extensions (Auth + ApiModels)

The module ships base Pinia stores. If you want custom getters/actions in a target app, you **do not** create a new `app/stores/*.ts` file (that causes duplicate auto‑imports).

Instead, add an override file under `schema/stores/`:

```
schema/stores/auth.ts
schema/stores/apiModels.ts
```

### Auth store override

```ts
// schema/stores/auth.ts
export function extendAuthStore(store: any) {
  store.fullName = computed(() => {
    const first = store.user?.firstName ?? ''
    const last = store.user?.surname ?? ''
    return `${first} ${last}`.trim()
  })

  const baseLogin = store.login
  store.login = async (...args: any[]) => {
    const result = await baseLogin?.(...args)
    // custom post‑login work here
    return result
  }
}
```

### ApiModels store override

```ts
// schema/stores/apiModels.ts
export function extendApiModelsStore(store: any) {
  // Example: add a helper for menu visibility
  store.isVisibleInMenu = (key: string) => {
    const meta = store.getModelMeta(key)
    return meta?.data !== 'remote'
  }
}
```

### Notes
- Overrides are loaded **once** per store instance.
- If you define a function with the same name, it **overrides** the base store method.
- The module still provides the base store—your file only patches it.

---

## 2) Model Manifest Overrides

The generator produces a base model manifest used by UI and stores:

```
@schema/models
```

To augment it per app, create:

```
schema/models.override.ts
```

### Example

```ts
// schema/models.override.ts
export const modelOverrides = {
  question: {
    data: 'remote',
    menu: true,
    directory: true,
  },
  product: {
    icon: 'products',
    menu: true,
  },
}
```

At runtime, the module merges:

```
models = { ...generated, ...overrides }
```

So you can:
- add new keys (e.g. `menu`, `directory`, `refreshOnBoot`)
- override existing keys (e.g. `data`, `table`, `slugPolicy`)

---

## 3) Avoiding Duplicate Auto‑Imports

If you still have files under:

```
app/stores/auth.ts
app/stores/apiModels.ts
```

Nuxt will prefer those and ignore the module stores (and log warnings).

**Fix:** delete or rename the app‑level store files and use `schema/stores/*` overrides instead.

---

## 4) Where to Put Overrides

Recommended locations:

```
schema/stores/auth.ts
schema/stores/apiModels.ts
schema/models.override.ts
```

These are app‑local and safe from regeneration.
