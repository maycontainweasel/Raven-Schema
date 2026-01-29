# Module Overlays (Graph → Module Specs)

This guide explains how to **extend a module‑owned table** (like `instance`) from `graph.mpdg` without duplicating the base module spec.

---

## Why overlays?

Module specs (under `config/bootstrap/modules/<module>/specs`) provide the baseline tables needed for bootstrap.  
But you may want to add:
- views
- typesense collections
- additional fields
- router resources

Overlays let you do this **from graph.mpdg**, while keeping the module as source of truth.

---

## Syntax

Inside your model stanza, add:

```
module: instance
```

Example:

```
Instance, instance | Website instance configuration {
  id: $key,
  key!: "",
  instance!: "",
  title!: "",
  status!: "active", <"active" | "inactive" | "maintenance">
  active!: true,
  currency: "GBP",
  // ...
} [
  module: instance,
  views:
    Admin[*],
  typesense:
    instance::fn[id, key, instance, title, status](
      domains: $domains
    ) {
      queryBy: [title, key, instance],
      sortableFields: [title, key],
      filters: [status, currency]
    }
] () {}
```

---

## What happens under the hood?

When a stanza includes `module: <name>`:

1) **Graph → spec output** goes to:
```
config/bootstrap/modules/<name>/specs_overrides
```

2) At generation time, module specs are loaded and **merged** with the override files.

3) The merged result is used for:
   - module migrations (bootstrap)
   - routers
   - typesense collections
   - UI generation

---

## Merge behavior

The override file **replaces arrays** (fields, views, etc).  
If you are extending a module table, include the full `fields` array (base + new).

---

## Recommended workflow

1) Add overlay stanza to `graph.mpdg`
2) Run:
```
pr graph:spec
pr schema:generate
```
3) Bootstrap the module:
```
pr schema:bootstrap --database <db>
```

