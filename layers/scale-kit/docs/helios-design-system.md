# Helios Design System (Scale Kit)

This layer defines atomic design tokens and UnoCSS shortcuts that power UI components.

## CSS variables (design tokens)

These are applied to `:root` and used by UnoCSS theme + shortcuts:

- **Colors**
  - `--ds-bg`, `--ds-panel`, `--ds-panel-soft`
  - `--ds-text`, `--ds-muted`, `--ds-border`
  - `--ds-accent`, `--ds-accent-strong`, `--ds-accent-soft`
  - `--ds-success`, `--ds-warning`, `--ds-danger`
- **Radii**
  - `--ds-radius-sm`, `--ds-radius-md`, `--ds-radius-lg`, `--ds-radius-xl`
- **Shadows**
  - `--ds-shadow-sm`, `--ds-shadow-md`, `--ds-shadow-lg`
- **Borders**
  - `--ds-border-width`
- **Buttons**
  - `--ds-btn-height`, `--ds-btn-pad-x`, `--ds-btn-radius`
- **Cards**
  - `--ds-card-radius`, `--ds-card-border`

## UnoCSS shortcuts

These use the CSS variables above:

- `ui-card` → panel surface with border + default shadow
- `ui-pill` → tag/label pill
- `ui-btn` → base button sizing (height, padding, radius)
- `ui-btn-primary` → primary filled button
- `ui-btn-ghost` → outline/ghost button
- `ui-btn-soft` → soft accent button

## Utility rules

Custom utilities bound to design tokens:

- `shadow-ds-sm|md|lg` → `box-shadow: var(--ds-shadow-*)`
- `radius-ds-sm|md|lg|xl` → `border-radius: var(--ds-radius-*)`
- `border-ds` → uses `--ds-border-width` + `--ds-border`

## Scaling + typography

Scale kit also defines CSS variables for type and spacing:

- `--fs-*` font-size steps
- `--lh-*` line-height steps
- `--v-*` grid units
- `--sp-*` spacing units

These are derived from the active scale settings on `/scale`.
