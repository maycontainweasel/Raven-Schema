# API Toolkit Layer (PMV2 Admin)

This layer packages the admin "API/debug" workbench into reusable building blocks. It is a three‑column canvas:
- Left: categories / sections / scopes
- Center: tools, forms, and process runners
- Right: console output

The goal is to drop this layer into any admin app and quickly assemble a process‑driven toolkit (importers, API tests, maintenance utilities, Typesense tools, etc.) without rebuilding the layout each time.

## Included building blocks

### Layout
- `ApiToolkitLayout`
  - 3‑column layout shell
  - Props: `leftWidth`, `rightWidth`, `leftClass`, `centerClass`, `rightClass`, `containerClass`
  - Slots: `left`, `center`, `right`

### Sidebar
- `ApiToolkitSidebar`
  - Renders a list of selectable items (categories/models/collections)
  - Props: `title`, `subtitle`, `items`, `v-model`
  - Slots: `top` (optional controls like a select), `footer` (instructions/flow)
  - Item shape: `{ id, label, description?, icon? }`

### Scope select
- `ApiToolkitScopeSelect`
  - Small select control meant for the top-left slot (model/collection/scope switching)
  - Props: `label`, `description`, `options`, `v-model`, `placeholder`
  - Option shape: `{ label, value, description? }`

### Center header
- `ApiToolkitSectionHeader`
  - Shows the active section label + optional badge
  - Props: `title`, `subtitle`, `icon`, `badge`
  - Badge shape: `{ label, variant }`, variants: `success | outline | warning | error | info | ghost`

### Process cards
- `ApiToolkitProcessCard`
  - Standard process cards with status dot and action slot
  - Props: `title`, `description`, `status`, `variant`
  - `status`: `idle | success | warning | error`
  - `variant`: `default` (stacked) or `compact` (single‑row)
  - Slots: `actions` (buttons), default slot for inputs/extra UI

### Console
- `ApiToolkitConsole`
  - Right panel console with auto‑clear and auto‑scroll toggles
  - Props: `entries`, `autoClear`, `autoScroll`
  - Emits: `update:autoClear`, `update:autoScroll`, `clear`

### Console store + composable
- `useApiToolkitConsoleStore` (Pinia)
  - `entries`, `addMessage`, `addResponse`, `success`, `error`, `warning`, `info`, `clear`
  - Payloads are summarized to keep the console readable.
- `useApiToolkitConsole` (composable)
  - Friendly logging helpers (`add`, `success`, `error`, etc.)
- `useApiConsole` (existing app composable) now forwards to `useApiToolkitConsole` for backwards compatibility.

## Usage pattern

Minimal skeleton:

```vue
<script setup lang="ts">
const selectedCategory = ref('setup')
const autoClear = ref(false)
const autoScroll = ref(true)
const consoleStore = useApiToolkitConsoleStore()

const categories = [
  { id: 'setup', label: 'Setup', icon: 'settings', description: 'Configure the source' },
  { id: 'import', label: 'Import', icon: 'upload', description: 'Push data into pm' },
]

const active = computed(() => categories.find(item => item.id === selectedCategory.value))
</script>

<template>
  <ApiToolkitLayout right-class="border-l border-[var(--color-border)] bg-[var(--color-surface)]">
    <template #left>
      <ApiToolkitSidebar
        v-model="selectedCategory"
        title="API Categories"
        subtitle="Select a category to begin."
        :items="categories"
      >
        <template #top>
          <!-- optional scope selector -->
          <ApiToolkitScopeSelect
            v-model="selectedScope"
            label="Scope"
            placeholder="Choose scope"
            :options="[
              { label: 'Questions', value: 'questions' },
              { label: 'Users', value: 'users' },
            ]"
          />
        </template>
        <template #footer>
          <p class="font-semibold mb-2">Flow</p>
          <p>1. Configure</p>
          <p>2. Validate</p>
          <p>3. Import</p>
        </template>
      </ApiToolkitSidebar>
    </template>

    <template #center>
      <ApiToolkitSectionHeader
        v-if="active"
        :title="active.label"
        :subtitle="active.description"
        :icon="active.icon"
      />
      <ApiToolkitSectionHeader v-else>
        Select a category to begin.
      </ApiToolkitSectionHeader>

      <div class="flex-1 overflow-y-auto bg-[var(--color-surface-muted)]">
        <!-- your category‑specific content here -->
      </div>
    </template>

    <template #right>
      <ApiToolkitConsole
        :entries="consoleStore.entries"
        :auto-clear="autoClear"
        :auto-scroll="autoScroll"
        @update:auto-clear="autoClear = $event"
        @update:auto-scroll="autoScroll = $event"
        @clear="consoleStore.clear()"
      />
    </template>
  </ApiToolkitLayout>
</template>
```

## Process runner pattern

```vue
<ApiToolkitProcessCard
  :title="process.name"
  :description="process.description"
  :status="processStates[process.id] ? 'success' : 'idle'"
  variant="compact"
>
  <template #actions>
    <button class="btn btn-primary btn-sm" @click="runProcess(process)">
      Run
    </button>
  </template>
</ApiToolkitProcessCard>
```

## Notes

- The toolkit does not dictate your data fetching or process logic. It only provides layout + UI blocks.
- For multi‑level selection (e.g. model/collection at top‑left), use the `ApiToolkitSidebar` `top` slot.
- Keep long‑running operations wired to the console store so output is always visible in the right panel.
