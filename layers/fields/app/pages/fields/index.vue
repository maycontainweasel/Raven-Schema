<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Combobox } from '@ark-ui/vue/combobox'

definePageMeta({
  ssr: false,
})

type ComboboxSize = 'sm' | 'md' | 'lg'
type ComboboxRadius = 'sm' | 'md' | 'lg'
type ComboboxMode = 'single' | 'multiple'

type ComboboxConfig = {
  componentName: string
  label: string
  helperText: string
  placeholder: string
  mode: ComboboxMode
  size: ComboboxSize
  radius: ComboboxRadius
  clearTrigger: boolean
  itemIndicator: boolean
  emptyText: string
}

type FieldsState = {
  version: number
  catalog: {
    selected: string[]
    activeComponent: string
  }
  components: {
    combobox: ComboboxConfig
  }
}

type ReadResponse = {
  ok: boolean
  state: FieldsState
}

type DeployResponse = {
  ok: boolean
  files: string[]
  notes?: string[]
}

const defaultState: FieldsState = {
  version: 1,
  catalog: {
    selected: ['combobox'],
    activeComponent: 'combobox',
  },
  components: {
    combobox: {
      componentName: 'UiCombobox',
      label: 'Framework',
      helperText: 'Search and choose one option.',
      placeholder: 'Search frameworks...',
      mode: 'single',
      size: 'md',
      radius: 'md',
      clearTrigger: true,
      itemIndicator: true,
      emptyText: 'No options found.',
    },
  },
}

const state = reactive<FieldsState>(structuredClone(defaultState))
const loading = ref(true)
const deploying = ref(false)
const status = ref('')
const search = ref('')
const deployFiles = ref<string[]>([])
const deployNotes = ref<string[]>([])
const previewValue = ref<string[]>([])
const themeMode = ref<'light' | 'dark'>('light')

const componentCatalog = [
  {
    key: 'combobox',
    title: 'Combobox',
    summary: 'Searchable headless select with single/multiple modes.',
    status: 'ready',
  },
  {
    key: 'select',
    title: 'Select',
    summary: 'Compact option picker with strict list behavior.',
    status: 'planned',
  },
  {
    key: 'datepicker',
    title: 'Date Picker',
    summary: 'Configurable date experience from essential to full feature.',
    status: 'planned',
  },
  {
    key: 'tags-input',
    title: 'Tags Input',
    summary: 'Tokenized multi-entry field for chips/labels.',
    status: 'planned',
  },
]

const previewItems = [
  { label: 'Nuxt', value: 'nuxt' },
  { label: 'Vue', value: 'vue' },
  { label: 'Ark UI', value: 'ark-ui' },
  { label: 'UnoCSS', value: 'unocss' },
  { label: 'TypeScript', value: 'typescript' },
]

const filteredCatalog = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return componentCatalog
  return componentCatalog.filter((component) => {
    return (
      component.title.toLowerCase().includes(query) ||
      component.summary.toLowerCase().includes(query) ||
      component.key.includes(query)
    )
  })
})

const selectedCount = computed(() => state.catalog.selected.length)
const previewCombobox = computed(() => state.components.combobox)
const previewShellClass = computed(() => {
  const { size, radius } = previewCombobox.value
  return [`hf-size-${size}`, `hf-radius-${radius}`]
})

const itemToString = (item: { label: string } | null) => item?.label ?? ''
const itemToValue = (item: { value: string } | null) => item?.value ?? ''
const previewPositioning = {
  placement: 'bottom-start',
  sameWidth: true,
  gutter: 8,
} as const

const toggleComponent = (key: string) => {
  const current = new Set(state.catalog.selected)
  if (current.has(key)) {
    current.delete(key)
  }
  else {
    current.add(key)
  }

  const next = Array.from(current)
  state.catalog.selected = next.length > 0 ? next : ['combobox']

  if (!state.catalog.selected.includes(state.catalog.activeComponent)) {
    state.catalog.activeComponent = state.catalog.selected[0] ?? 'combobox'
  }
}

const setActive = (key: string) => {
  state.catalog.activeComponent = key
}

const toggleTheme = () => {
  themeMode.value = themeMode.value === 'light' ? 'dark' : 'light'
}

const loadState = async () => {
  loading.value = true
  status.value = ''

  try {
    const result = await $fetch<ReadResponse>('/api/fields/read')
    if (result?.ok && result.state) {
      Object.assign(state.catalog, result.state.catalog)
      Object.assign(state.components.combobox, result.state.components.combobox)
      status.value = 'Loaded saved field engine fragments.'
    }
    else {
      status.value = 'Using default field engine settings.'
    }
  }
  catch {
    Object.assign(state.catalog, structuredClone(defaultState.catalog))
    Object.assign(state.components.combobox, structuredClone(defaultState.components.combobox))
    status.value = 'Unable to read fragments. Using defaults.'
  }
  finally {
    loading.value = false
  }
}

const deploy = async () => {
  deploying.value = true
  status.value = ''
  deployFiles.value = []
  deployNotes.value = []

  try {
    const result = await $fetch<DeployResponse>('/api/fields/deploy', {
      method: 'POST',
      body: {
        catalog: state.catalog,
        components: state.components,
      },
    })

    if (result?.ok) {
      deployFiles.value = result.files ?? []
      deployNotes.value = result.notes ?? []
      status.value = 'Deploy complete. Component files and fragments were written.'
    }
    else {
      status.value = 'Deploy returned an unexpected response.'
    }
  }
  catch {
    status.value = 'Deploy failed.'
  }
  finally {
    deploying.value = false
  }
}

onMounted(loadState)
</script>

<template>
  <div class="fields-page" :class="`theme-${themeMode}`">
    <header class="hero">
      <div>
        <p class="eyebrow">Helios Fields</p>
        <h1>Headless Component Engine</h1>
        <p class="intro">
          Build a reusable catalog of Ark UI field components, configure opinionated defaults,
          and deploy generated components into this app with saved fragments.
        </p>
      </div>
      <div class="hero-actions">
        <button class="btn" :disabled="loading || deploying" @click="toggleTheme">
          Theme: {{ themeMode === 'light' ? 'Light' : 'Dark' }}
        </button>
        <button class="btn" :disabled="loading || deploying" @click="loadState">Reload</button>
        <button class="btn btn-primary" :disabled="loading || deploying" @click="deploy">
          {{ deploying ? 'Deploying…' : 'Deploy Selected' }}
        </button>
      </div>
    </header>

    <p v-if="status" class="status">{{ status }}</p>

    <section class="layout">
      <aside class="panel catalog">
        <div class="panel-head">
          <h2>Catalog</h2>
          <span class="chip">{{ selectedCount }} selected</span>
        </div>

        <label class="search">
          <span class="i-lucide-search" />
          <input v-model="search" type="text" placeholder="Search components...">
        </label>

        <div class="cards">
          <article
            v-for="item in filteredCatalog"
            :key="item.key"
            class="card"
            :class="{
              active: state.catalog.activeComponent === item.key,
              selected: state.catalog.selected.includes(item.key),
              planned: item.status !== 'ready',
            }"
          >
            <div class="card-head">
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.summary }}</p>
              </div>
              <span class="badge" :class="item.status">{{ item.status }}</span>
            </div>

            <div class="card-actions">
              <button
                class="btn"
                :disabled="item.status !== 'ready'"
                @click="toggleComponent(item.key)"
              >
                {{ state.catalog.selected.includes(item.key) ? 'Selected' : 'Select' }}
              </button>
              <button
                class="btn"
                :disabled="item.status !== 'ready'"
                @click="setActive(item.key)"
              >
                Configure
              </button>
            </div>
          </article>
        </div>
      </aside>

      <main class="panel manager">
        <div class="panel-head">
          <h2>Combobox Manager</h2>
          <span class="chip">Ark UI + UnoCSS</span>
        </div>

        <div class="grid">
          <label>
            Component name
            <input v-model="state.components.combobox.componentName" type="text">
          </label>

          <label>
            Label
            <input v-model="state.components.combobox.label" type="text">
          </label>

          <label>
            Placeholder
            <input v-model="state.components.combobox.placeholder" type="text">
          </label>

          <label>
            Empty text
            <input v-model="state.components.combobox.emptyText" type="text">
          </label>

          <label>
            Mode
            <select v-model="state.components.combobox.mode">
              <option value="single">Single</option>
              <option value="multiple">Multiple</option>
            </select>
          </label>

          <label>
            Size
            <select v-model="state.components.combobox.size">
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </label>

          <label>
            Radius
            <select v-model="state.components.combobox.radius">
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </label>

          <label>
            Helper text
            <input v-model="state.components.combobox.helperText" type="text">
          </label>

          <label class="toggle">
            <input v-model="state.components.combobox.clearTrigger" type="checkbox">
            Show clear trigger
          </label>

          <label class="toggle">
            <input v-model="state.components.combobox.itemIndicator" type="checkbox">
            Show item indicator
          </label>
        </div>

        <section class="preview" :class="previewShellClass">
          <h3>Live Preview</h3>
          <Combobox.Root
            v-model="previewValue"
            :items="previewItems"
            :multiple="state.components.combobox.mode === 'multiple'"
            :close-on-select="state.components.combobox.mode !== 'multiple'"
            :open-on-click="true"
            :item-to-string="itemToString"
            :item-to-value="itemToValue"
            :positioning="previewPositioning"
            class="hf-root"
          >
            <Combobox.Label class="hf-label">{{ state.components.combobox.label }}</Combobox.Label>

            <Combobox.Control class="hf-control">
              <span class="hf-leading i-lucide-search" />
              <Combobox.Input
                class="hf-input"
                :placeholder="state.components.combobox.placeholder"
              />
              <Combobox.ClearTrigger
                v-if="state.components.combobox.clearTrigger"
                class="hf-clear"
                aria-label="Clear selected values"
              >
                <span class="i-lucide-x" />
              </Combobox.ClearTrigger>
              <Combobox.Trigger class="hf-trigger" aria-label="Toggle combobox">
                <span class="i-lucide-chevron-down" />
              </Combobox.Trigger>
            </Combobox.Control>

            <p class="hf-helper">{{ state.components.combobox.helperText }}</p>

            <Combobox.Positioner class="hf-positioner">
              <Combobox.Content class="hf-content">
                <Combobox.Item
                  v-for="item in previewItems"
                  :key="item.value"
                  :item="item"
                  class="hf-item"
                >
                  <Combobox.ItemText class="hf-item-text">{{ item.label }}</Combobox.ItemText>
                  <Combobox.ItemIndicator
                    v-if="state.components.combobox.itemIndicator"
                    class="hf-item-indicator"
                  >
                    <span class="i-lucide-check" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              </Combobox.Content>
            </Combobox.Positioner>
          </Combobox.Root>

          <p class="selected-values">
            Selected values:
            <code>{{ previewValue.length ? previewValue.join(', ') : 'none' }}</code>
          </p>
        </section>
      </main>
    </section>

    <section class="panel output" v-if="deployFiles.length || deployNotes.length">
      <div class="panel-head">
        <h2>Deploy Output</h2>
      </div>
      <div v-if="deployFiles.length" class="output-block">
        <h3>Written Files</h3>
        <ul>
          <li v-for="file in deployFiles" :key="file"><code>{{ file }}</code></li>
        </ul>
      </div>
      <div v-if="deployNotes.length" class="output-block">
        <h3>Notes</h3>
        <ul>
          <li v-for="note in deployNotes" :key="note">{{ note }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.fields-page {
  --ds-panel: #ffffff;
  --ds-panel-soft: #f4f7ff;
  --ds-border: #c8d2e8;
  --ds-text: #1a2740;
  --ds-muted: #5a6a86;
  --ds-accent: #7f96ff;
  --ds-accent-strong: #305eff;
  max-width: 1380px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  color: var(--ds-text, #0f172a);
}

.fields-page.theme-dark {
  --ds-panel: #111827;
  --ds-panel-soft: #0f172a;
  --ds-border: #334155;
  --ds-text: #e2e8f0;
  --ds-muted: #94a3b8;
  --ds-accent: #4f46e5;
  --ds-accent-strong: #5b7cff;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 65%, transparent);
  border-radius: 1rem;
  background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--ds-panel, #0f172a) 92%, transparent) 0%,
      color-mix(in srgb, var(--ds-accent, #1f3d9d) 35%, var(--ds-panel, #0f172a) 65%) 100%
    );
}

.eyebrow {
  margin: 0;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: color-mix(in srgb, var(--ds-muted, #94a3b8) 85%, white 15%);
}

.hero h1 {
  margin: 0.35rem 0;
  font-size: 1.6rem;
  color: color-mix(in srgb, var(--ds-text, #e2e8f0) 92%, white 8%);
}

.intro {
  margin: 0;
  max-width: 74ch;
  color: color-mix(in srgb, var(--ds-muted, #94a3b8) 85%, white 15%);
}

.hero-actions {
  display: flex;
  gap: 0.6rem;
}

.btn {
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 70%, transparent);
  border-radius: 0.7rem;
  background: color-mix(in srgb, var(--ds-panel-soft, #111827) 90%, transparent);
  color: var(--ds-text, #e2e8f0);
  font-weight: 600;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
}

.btn:hover {
  border-color: color-mix(in srgb, var(--ds-accent-strong, #5b7cff) 45%, transparent);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  border-color: color-mix(in srgb, var(--ds-accent-strong, #5b7cff) 75%, transparent);
  background: color-mix(in srgb, var(--ds-accent-strong, #5b7cff) 30%, var(--ds-panel, #0f172a) 70%);
}

.status {
  margin: 0.85rem 0 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 70%, transparent);
  border-radius: 0.8rem;
  background: color-mix(in srgb, var(--ds-panel-soft, #111827) 92%, transparent);
  color: var(--ds-text, #0f172a);
}

.layout {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}

.panel {
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 70%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--ds-panel, #111827) 92%, transparent);
  padding: 1rem;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}

.panel-head h2 {
  margin: 0;
  font-size: 1rem;
}

.chip {
  font-size: 0.72rem;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 75%, transparent);
  background: color-mix(in srgb, var(--ds-panel-soft, #1e293b) 85%, transparent);
  color: var(--ds-muted, #94a3b8);
}

.search {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 70%, transparent);
  border-radius: 0.75rem;
  padding: 0.45rem 0.6rem;
  background: color-mix(in srgb, var(--ds-panel-soft, #111827) 90%, transparent);
}

.search input {
  flex: 1;
  background: transparent;
  border: 0;
  color: var(--ds-text, #e2e8f0);
  outline: none;
}

.cards {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.card {
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 70%, transparent);
  border-radius: 0.85rem;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--ds-panel-soft, #111827) 90%, transparent);
}

.card.active {
  border-color: color-mix(in srgb, var(--ds-accent-strong, #5b7cff) 55%, transparent);
}

.card.selected {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ds-accent-strong, #5b7cff) 35%, transparent);
}

.card.planned {
  opacity: 0.72;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
}

.card h3 {
  margin: 0;
  font-size: 0.95rem;
}

.card p {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: var(--ds-muted, #94a3b8);
}

.badge {
  align-self: flex-start;
  border-radius: 999px;
  font-size: 0.68rem;
  padding: 0.18rem 0.45rem;
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 70%, transparent);
}

.badge.ready {
  color: #34d399;
}

.badge.planned {
  color: #fbbf24;
}

.card-actions {
  margin-top: 0.6rem;
  display: flex;
  gap: 0.45rem;
}

.manager .grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.manager label {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  font-size: 0.78rem;
  color: var(--ds-muted, #94a3b8);
}

.manager input,
.manager select {
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 70%, transparent);
  border-radius: 0.65rem;
  padding: 0.48rem 0.58rem;
  background: color-mix(in srgb, var(--ds-panel-soft, #111827) 90%, transparent);
  color: var(--ds-text, #e2e8f0);
}

.toggle {
  justify-content: center;
  gap: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 70%, transparent);
  border-radius: 0.65rem;
  padding: 0.5rem 0.58rem;
}

.toggle input {
  width: 1rem;
  height: 1rem;
  margin: 0;
}

.preview {
  margin-top: 1rem;
  border: 1px solid color-mix(in srgb, var(--ds-border, #334155) 70%, transparent);
  border-radius: 0.95rem;
  padding: 0.85rem;
  background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--ds-accent-strong, #5b7cff) 10%, var(--ds-panel, #ffffff) 90%) 0%,
      color-mix(in srgb, var(--ds-panel-soft, #f4f7ff) 92%, white 8%) 100%
    );
}

.preview h3 {
  margin: 0 0 0.65rem;
  font-size: 0.95rem;
}

.selected-values {
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
  color: var(--ds-muted, #94a3b8);
}

.selected-values code {
  color: color-mix(in srgb, var(--ds-text, #e2e8f0) 85%, white 15%);
}

.output {
  margin-top: 1rem;
}

.output-block h3 {
  margin: 0.35rem 0;
  font-size: 0.88rem;
}

.output-block ul {
  margin: 0;
  padding-left: 1.05rem;
}

.output-block li {
  margin: 0.2rem 0;
  font-size: 0.82rem;
}

.hf-root {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.hf-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ds-muted, #5a6a86);
}

.hf-control {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--ds-border, #c8d2e8) 75%, transparent);
  background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--ds-panel-soft, #f4f7ff) 95%, white 5%) 0%,
      color-mix(in srgb, var(--ds-panel, #ffffff) 96%, white 4%) 100%
    );
  color: var(--ds-text, #1a2740);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.hf-control:focus-within {
  border-color: color-mix(in srgb, var(--ds-accent-strong, #305eff) 70%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ds-accent-strong, #305eff) 22%, transparent);
}

.hf-leading,
.hf-trigger,
.hf-clear {
  width: 1.6rem;
  height: 1.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--ds-muted, #5a6a86);
}

.hf-input {
  flex: 1;
  background: transparent;
  border: 0;
  color: var(--ds-text, #1a2740);
  font-size: 0.92rem;
  outline: none;
}

.hf-input::placeholder {
  color: color-mix(in srgb, var(--ds-muted, #5a6a86) 85%, transparent);
}

.hf-helper {
  margin: 0;
  font-size: 0.74rem;
  color: var(--ds-muted, #5a6a86);
}

.hf-positioner {
  z-index: 40;
  position: absolute !important;
  top: calc(100% + 0.35rem) !important;
  left: 0 !important;
  right: 0 !important;
}

.hf-content {
  border: 1px solid color-mix(in srgb, var(--ds-border, #c8d2e8) 75%, transparent);
  background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--ds-panel, #ffffff) 98%, white 2%) 0%,
      color-mix(in srgb, var(--ds-panel-soft, #f4f7ff) 96%, white 4%) 100%
    );
  backdrop-filter: blur(6px);
  max-height: 16rem;
  overflow: auto;
  padding: 0.35rem;
  border-radius: 0.8rem;
}

.hf-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  border-radius: 0.55rem;
  color: var(--ds-text, #1a2740);
}

.hf-item[data-highlighted] {
  background: color-mix(in srgb, var(--ds-accent-strong, #305eff) 14%, transparent);
}

.hf-item[data-state='checked'] {
  background: color-mix(in srgb, var(--ds-accent-strong, #305eff) 20%, transparent);
}

.hf-item-indicator {
  color: color-mix(in srgb, var(--ds-accent-strong, #305eff) 80%, white 20%);
}

.hf-size-sm .hf-control {
  min-height: 2.25rem;
  padding: 0 0.35rem;
}

.hf-size-md .hf-control {
  min-height: 2.6rem;
  padding: 0 0.45rem;
}

.hf-size-lg .hf-control {
  min-height: 3rem;
  padding: 0 0.55rem;
}

.hf-radius-sm .hf-control,
.hf-radius-sm .hf-content {
  border-radius: 0.55rem;
}

.hf-radius-md .hf-control,
.hf-radius-md .hf-content {
  border-radius: 0.8rem;
}

.hf-radius-lg .hf-control,
.hf-radius-lg .hf-content {
  border-radius: 1rem;
}

@media (max-width: 1120px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .manager .grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 840px) {
  .hero {
    flex-direction: column;
  }
}
</style>
