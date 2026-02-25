# Layer Sync Workflow (Helios Admin)

Use this runbook to keep `apps/schema/layers` and app layer copies in sync.

## Direction

- `layers:pull` = app -> `apps/schema/layers`
- `layers:push` = `apps/schema/layers` -> app

## A) Capture latest `heliosadmin` changes into schema

Run from repo root:

```bash
pnpm -C apps/schema run layers:pull:heliosadmin
```

Equivalent explicit command:

```bash
pnpm -C apps/schema run layers:pull -- --project heliosadmin --layers helios,helios-ui,helios-admin,schema-core,fields
```

Then commit and push the schema repo:

```bash
git -C apps/schema status
git -C apps/schema add .
git -C apps/schema commit -m "Sync heliosadmin layers"
git -C apps/schema push
```

## B) Apply schema layer updates to target apps

Push layer sources from schema to one target app:

```bash
pnpm -C apps/schema run layers:push -- --project <target-app-name> --layers-sync force
```

Push to multiple targets:

```bash
pnpm -C apps/schema run layers:push -- --project app1,app2 --layers-sync force
```

## C) If generator/module/runtime code changed (not only layer files)

Also run generation so target app runtime/generated assets are refreshed:

```bash
pnpm -C apps/schema run schema:generate -- --project <target-app-name> --layers-sync force
```

## Notes

- `layers:push` / `layers:pull` sync files only; they do not install packages.
- Use `layers-sync force` when you want schema source layers to overwrite app copies.
