# Create Dialog Overrides

This document explains how the admin Create dialog is wired, and how to override it safely without breaking the generator.

## How it works
Generated overview pages render the dialog through a **host** component:

```
<AdminCreateDialog ... />
```

The host lives here:

```
apps/pmv2-admin/app/components/admin/CreateDialog.vue
```

It looks for a model-specific override, and falls back to a default renderer.

## Default renderer
If no override exists, the host uses:

```
apps/pmv2-admin/app/components/admin/CreateDialogDefault.vue
```

This component:
- renders fields supplied by the generator
- binds to `form` via `v-model`
- emits `submit` to trigger `$process`

## Override location
Create an override at:

```
apps/pmv2-admin/app/components/admin/overrides/<model>/CreateDialog.vue
```

Example for `exam`:

```
apps/pmv2-admin/app/components/admin/overrides/exam/CreateDialog.vue
```

If this file exists, the host will load it **instead of** the default.

## Scaffold command
From repo root:

```
pnpm --filter mpdschema ui:override:create exam
```

Optional:

```
pnpm --filter mpdschema ui:override:create exam --project pmv2-admin --force
```

This generates a safe starting point that wraps the default dialog.

## Required props + emits
Your override must accept these props and emit the same events:

**Props**
- `model`
- `open`
- `form`
- `title`
- `subtitle`
- `fields`
- `loading`
- `submitLabel`
- `cancelLabel`

**Emits**
- `update:open`
- `update:form`
- `submit`
- `cancel`

As long as the override respects these, it can render anything inside.

## Design intent
- **Generator provides defaults** (required fields + default values)
- **Overrides provide customization** (custom layout, custom fields, extra logic)
- Generator never touches overrides
