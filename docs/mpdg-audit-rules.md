# MPDG Audit Rules (Draft)

This is the reference for **MPDG audit rules** emitted by `scripts/mpdg-to-spec.ts`.
Each rule includes what it checks, why it matters, and a minimal example.

> Status: **Documentation only**. Rule configuration is not yet wired.

---

## Rule: `duplicate-table-model` (error)
**Checks:** Multiple tables share the same model key.

**Why:** Colliding models overwrite specs/routers/types.

**Bad**
```mpdg
User, u { ... }
User, u { ... } // duplicate model
```

**Fix:** Rename one of the models.

---

## Rule: `duplicate-table-label` (warn)
**Checks:** Multiple tables share the same label.

**Why:** Labels drive docs + UI display and get confusing fast.

**Bad**
```mpdg
User, u { ... }
User, uProfile { ... } // same label
```

**Fix:** Use unique labels (e.g., `User Profile`).

---

## Rule: `duplicate-field` (error)
**Checks:** A table defines the same field twice (case‑insensitive).

**Bad**
```mpdg
User, u {
  email: ""
  Email: "" // duplicate
}
```

**Fix:** Remove or rename the duplicate.

---

## Rule: `required-and-ignore-payload` (warn)
**Checks:** A field is both required (`!`) and ignored (`?`).

**Bad**
```mpdg
uniqueId?!: "", <md5<$email>>
```

**Fix:** Choose either `!` (required) or `?` (ignore payload).

---

## Rule: `missing-id-source` (error)
**Checks:** `id:` references a field that doesn't exist.

**Bad**
```mpdg
User, u {
  id: $email
  // email field missing
}
```

**Fix:** Add the referenced field or update the ID source.

---

## Rule: `id-parent-without-parent` (warn)
**Checks:** `id: $parent` used on a table without a parent.

**Bad**
```mpdg
User, u {
  id: $parent
}
```

**Fix:** Only use `$parent` inside subtables.

---

## Rule: `invalid-crud-letters` (warn)
**Checks:** `crud(...)` includes letters outside `C|U|D`.

**Bad**
```mpdg
crud(CUX)
```

**Fix:** Use only `C`, `U`, `D`.

---

## Rule: `duplicate-subtable-model` (error)
**Checks:** A parent table declares the same subtable model twice.

**Bad**
```mpdg
User, u ( User Profile, userProfile (...) )
User, u ( User Profile, userProfile (...) ) // duplicate
```

**Fix:** Use unique subtable model names under a parent.

---

## Rule: `trailing-view-comma` (warn)
**Checks:** Trailing comma inside a view selector block.

**Bad**
```mpdg
exam::fn[id, key, title, ](...)
```

**Fix:** Remove the dangling comma.

---

## FAQ / Notes

### `stringID<...>` / `S(...)` IDs
Audit understands `stringID<parent, exam>` and will:
- allow `parent` when the table is a subtable
- require all other fields (e.g. `exam`) to exist on the table

**Example**
```mpdg
id: S($parent, $exam)
```

---

## Planned: Rule Configuration
When config is wired, rules can be set to `error | warn | info | off`.
Expected location:
`config/mpdg.audit.yaml`

Example:
```yaml
rules:
  duplicate-table-model: error
  duplicate-table-label: warn
  duplicate-field: error
  missing-id-source: error
  trailing-view-comma: error
```
