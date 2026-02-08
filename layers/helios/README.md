# Helios Layer (Baseline v0)

This layer provides a minimal `/helios` page focused on typography baseline settings.

## Current scope

- Breakpoint-aware type profiles (mobile/tablet/laptop/desktop by default)
- Base font size
- Type ratio (modular scale)
- Grid ratio (line/vertical rhythm)
- Spacing ratio (independent spacing scale)
- Scale range + increment
- One baseline brand token (`heliosbrand`)
- Root shorthand tokens: `--bf`, `--tr`, `--gr`, `--sr`
- Tailwind v4 palette management (row + step inclusion) via Colors panel
- Semantic theme tokens (`bg-*`, `text-*`, `border-*`) via Themes panel

## Commit behavior

`POST /api/helios/type/commit` writes app-owned artifacts:

- `app/helios/fragments/type.json`
- `app/helios/fragments/colors.json`
- `app/helios/fragments/theme.json`
- `app/helios/fragments/setup.json`
- `app/helios/generated/type.settings.json`
- `app/helios/generated/colors.settings.json`
- `app/helios/generated/theme.settings.json`
- `app/helios/generated/uno.generated.ts`
- `app/helios/scss/_tokens.scss`
- `app/helios/scss/_type.scss`
- `app/helios/scss/_colors.scss`
- `app/helios/scss/_semantic.scss`
- `app/helios/scss/index.scss`

It also attempts to bridge these into the app config by updating:

- `nuxt.config.additions.ts` (ensures `~/helios/scss/index.scss` is included)
- `uno.config.ts` (ensures merge includes `app/helios/generated/uno.generated.ts`)

This is designed so the generated baseline remains in the app even if the Helios layer is later removed.
