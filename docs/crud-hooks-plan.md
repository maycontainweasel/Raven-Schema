# CRUD Hooks & Return Refactor

Goal: introduce structured hooks and return-mode control for generated CRUD functions (create/update/delete) without forcing function overrides, and integrate `refreshViews` via hooks instead of events.

## Why
- Allow inserting custom SurrealQL at defined points in generated CRUD functions.
- Control whether CRUD returns a full record or just the id, per operation.
- Replace refreshViews events with inline hooks to avoid event recursion/overhead.

## API (spec)
Per CRUD operation (`create`, `update`, `delete`):

```yaml
crud:
  create:
    enabled: true
    options:
      return: record | id            # default: create/update -> record; delete -> id
      hooks:
        preValidate:   ["// runs after payload null check"]
        postValidate:  ["// runs after required checks"]
        preProcess:    ["// runs after defaults/merges, before upsert/update/delete"]
        postProcess:   ["// runs after write, before final return"]
```

- Hooks are arrays of SurrealQL lines inserted verbatim at the named point.
- If hooks are omitted, behavior remains unchanged.
- `return` controls the final return value for that operation.

### Auto hooks
- If `refreshViews: true` on the table, auto-add a postProcess hook on **update** that calls `fn::refreshRecordViews(<return-id>)`. (No refreshViews events needed.)

## Injection points
- **create**
  - preValidate: after payload null check
  - postValidate: after required-field checks
  - preProcess: after defaults/merge/password hash, before upsert
  - postProcess: after upsert result, before final return
  - return: record (default) or id

- **update**
  - preValidate: after record/payload checks
  - postValidate: after required checks (if any)
  - preProcess: before `update only ...`
  - postProcess: after update result, before return
  - return: record (default) or id

- **delete**
  - preValidate: after record check
  - postProcess: after delete result, before return
  - return: id (default) or record

## Implementation steps
1) **Types**: add `return?: 'record' | 'id'` and `hooks?` with four arrays to `CrudOperationOptions`.
2) **Helpers** in `functionGenerator.ts`:
   - `normalizeHooks(raw)` -> `NormalizedHooks {preValidate, postValidate, preProcess, postProcess}`
   - `buildAutoHooks(table, op)` -> currently injects refreshViews postProcess on update.
3) **Generators**:
   - Rework create/update/delete (and subtable create) to:
     - collect return mode and hooks (merge auto hooks into postProcess)
     - add hook blocks at the specified points
     - store results (`$record`/`$result`/`$rid`) and return per mode
   - Keep existing validation/default logic intact.
4) **RefreshViews**: stop emitting refreshViews events (already disabled); rely on update postProcess hook.
5) **Docs**: add this plan + a README note on CRUD hooks/return.
6) **Test**: build, regenerate `exam`, verify generated SURQL reflects hooks/return, ensure bootstrap/import still works.

## Notes
- Hooks are raw SurrealQL; we don’t auto-quote strings.
- Return mode only affects the final return; hooks can access the temp vars:
  - create: `$payload`, `$record`, `$rid`
  - update: `$recordParam`, `$payloadParam`, `$result`
  - delete: `$recordParam`, `$result`
- Auto-hook for refreshViews uses the returned id (record or explicit rid as available).
