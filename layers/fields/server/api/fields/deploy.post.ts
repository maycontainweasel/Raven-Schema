import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { defineEventHandler, readBody } from 'h3'

type ComboboxSize = 'sm' | 'md' | 'lg'
type ComboboxRadius = 'sm' | 'md' | 'lg'
type ComboboxMode = 'single' | 'multiple'

type CatalogFragment = {
  selected: string[]
  activeComponent: string
}

type ComboboxFragment = {
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

const defaultCatalog: CatalogFragment = {
  selected: ['combobox'],
  activeComponent: 'combobox',
}

const defaultCombobox: ComboboxFragment = {
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
}

const defaultItems = [
  { label: 'Nuxt', value: 'nuxt' },
  { label: 'Vue', value: 'vue' },
  { label: 'Ark UI', value: 'ark-ui' },
  { label: 'UnoCSS', value: 'unocss' },
  { label: 'TypeScript', value: 'typescript' },
]

const safeText = (value: unknown, fallback: string) => {
  const next = String(value ?? fallback).trim()
  return next.length > 0 ? next : fallback
}

const toComponentName = (value: unknown, fallback: string) => {
  const raw = safeText(value, fallback)
  const cleaned = raw.replace(/[^A-Za-z0-9_]/g, '')
  if (!cleaned) return fallback
  if (/^[0-9]/.test(cleaned)) return fallback
  if (!/^Ui[A-Z]/.test(cleaned)) return `Ui${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`
  return cleaned
}

const normalizeCatalog = (value: any): CatalogFragment => {
  const selectedRaw = Array.isArray(value?.selected) ? value.selected : defaultCatalog.selected
  const selected = selectedRaw
    .map((entry) => String(entry).trim().toLowerCase())
    .filter((entry) => entry.length > 0)

  const uniqueSelected = Array.from(new Set(selected))
  const finalSelected = uniqueSelected.length > 0 ? uniqueSelected : [...defaultCatalog.selected]

  const activeCandidate = safeText(value?.activeComponent, defaultCatalog.activeComponent).toLowerCase()
  const activeComponent = finalSelected.includes(activeCandidate)
    ? activeCandidate
    : finalSelected[0] ?? defaultCatalog.activeComponent

  return {
    selected: finalSelected,
    activeComponent,
  }
}

const normalizeCombobox = (value: any): ComboboxFragment => {
  const size = ['sm', 'md', 'lg'].includes(String(value?.size))
    ? (String(value.size) as ComboboxSize)
    : defaultCombobox.size

  const radius = ['sm', 'md', 'lg'].includes(String(value?.radius))
    ? (String(value.radius) as ComboboxRadius)
    : defaultCombobox.radius

  const mode = ['single', 'multiple'].includes(String(value?.mode))
    ? (String(value.mode) as ComboboxMode)
    : defaultCombobox.mode

  return {
    componentName: toComponentName(value?.componentName, defaultCombobox.componentName),
    label: safeText(value?.label, defaultCombobox.label),
    helperText: safeText(value?.helperText, defaultCombobox.helperText),
    placeholder: safeText(value?.placeholder, defaultCombobox.placeholder),
    mode,
    size,
    radius,
    clearTrigger: value?.clearTrigger !== false,
    itemIndicator: value?.itemIndicator !== false,
    emptyText: safeText(value?.emptyText, defaultCombobox.emptyText),
  }
}

const ensureDir = async (filePath: string) => {
  await fs.mkdir(dirname(filePath), { recursive: true })
}

const writeJson = async (filePath: string, data: unknown) => {
  await ensureDir(filePath)
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

const buildComboboxComponent = (config: ComboboxFragment) => {
  const modeLiteral = config.mode === 'multiple' ? 'true' : 'false'
  const clearLiteral = config.clearTrigger ? 'true' : 'false'
  const indicatorLiteral = config.itemIndicator ? 'true' : 'false'
  const sizeClass = `hf-size-${config.size}`
  const radiusClass = `hf-radius-${config.radius}`

  return [
    '<script setup lang="ts">',
    "import { computed } from 'vue'",
    "import { Combobox } from '@ark-ui/vue/combobox'",
    '',
    'type ComboboxOption = {',
    '  label: string',
    '  value: string',
    '  disabled?: boolean',
    '}',
    '',
    'const props = withDefaults(defineProps<{',
    '  modelValue?: string[]',
    '  items?: ComboboxOption[]',
    '  placeholder?: string',
    '  disabled?: boolean',
    '  invalid?: boolean',
    '}>(), {',
    '  modelValue: () => [],',
    `  items: () => ${JSON.stringify(defaultItems, null, 2)},`,
    '  placeholder: undefined,',
    '  disabled: false,',
    '  invalid: false,',
    '})',
    '',
    'const emit = defineEmits<{',
    "  (event: 'update:modelValue', value: string[]): void",
    '}>()',
    '',
    `const MULTIPLE = ${modeLiteral}`,
    `const SHOW_CLEAR_TRIGGER = ${clearLiteral}`,
    `const SHOW_ITEM_INDICATOR = ${indicatorLiteral}`,
    `const FIELD_LABEL = ${JSON.stringify(config.label)}`,
    `const FIELD_HELPER_TEXT = ${JSON.stringify(config.helperText)}`,
    `const DEFAULT_PLACEHOLDER = ${JSON.stringify(config.placeholder)}`,
    `const EMPTY_TEXT = ${JSON.stringify(config.emptyText)}`,
    '',
    'const value = computed<string[]>({',
    '  get: () => props.modelValue ?? [],',
    '  set: (next) => emit(\'update:modelValue\', next),',
    '})',
    '',
    'const items = computed(() => props.items)',
    'const resolvedPlaceholder = computed(() => props.placeholder ?? DEFAULT_PLACEHOLDER)',
    'const itemToString = (item: ComboboxOption | null) => item?.label ?? \"\"',
    'const itemToValue = (item: ComboboxOption | null) => item?.value ?? \"\"',
    'const isItemDisabled = (item: ComboboxOption | null) => Boolean(item?.disabled)',
    'const POSITIONING = {',
    "  placement: 'bottom-start',",
    '  sameWidth: true,',
    '  gutter: 8,',
    '} as const',
    '</script>',
    '',
    '<template>',
    `  <div class="hf-wrap ${sizeClass} ${radiusClass}">`,
    '    <Combobox.Root',
    '      v-model="value"',
    '      :items="items"',
    '      :multiple="MULTIPLE"',
    '      :close-on-select="!MULTIPLE"',
    '      :open-on-click="true"',
    '      :item-to-string="itemToString"',
    '      :item-to-value="itemToValue"',
    '      :is-item-disabled="isItemDisabled"',
    '      :positioning="POSITIONING"',
    '      :invalid="invalid"',
    '      :disabled="disabled"',
    '      class="hf-root"',
    '    >',
    '      <Combobox.Label class="hf-label">{{ FIELD_LABEL }}</Combobox.Label>',
    '',
    '      <Combobox.Control class="hf-control">',
    '        <span class="hf-leading i-lucide-search" />',
    '        <Combobox.Input',
    '          class="hf-input"',
    '          :placeholder="resolvedPlaceholder"',
    '        />',
    '        <Combobox.ClearTrigger',
    '          v-if="SHOW_CLEAR_TRIGGER"',
    '          class="hf-clear"',
    '          aria-label="Clear selected values"',
    '        >',
    '          <span class="i-lucide-x" />',
    '        </Combobox.ClearTrigger>',
    '        <Combobox.Trigger class="hf-trigger" aria-label="Toggle combobox">',
    '          <span class="i-lucide-chevron-down" />',
    '        </Combobox.Trigger>',
    '      </Combobox.Control>',
    '',
    '      <p class="hf-helper">{{ FIELD_HELPER_TEXT }}</p>',
    '',
    '      <Combobox.Positioner class="hf-positioner">',
    '        <Combobox.Content class="hf-content">',
    '          <div v-if="items.length === 0" class="hf-empty">{{ EMPTY_TEXT }}</div>',
    '          <Combobox.Item',
    '            v-for="item in items"',
    '            v-else',
    '            :key="item.value"',
    '            :item="item"',
    '            class="hf-item"',
    '          >',
    '            <Combobox.ItemText class="hf-item-text">{{ item.label }}</Combobox.ItemText>',
    '            <Combobox.ItemIndicator',
    '              v-if="SHOW_ITEM_INDICATOR"',
    '              class="hf-item-indicator"',
    '            >',
    '              <span class="i-lucide-check" />',
    '            </Combobox.ItemIndicator>',
    '          </Combobox.Item>',
    '        </Combobox.Content>',
    '      </Combobox.Positioner>',
    '    </Combobox.Root>',
    '  </div>',
    '</template>',
    '',
    '<style scoped>',
    '.hf-wrap {',
    '  --hf-surface: var(--ds-panel, #ffffff);',
    '  --hf-surface-soft: var(--ds-panel-soft, #f4f7ff);',
    '  --hf-border: var(--ds-border, #c8d2e8);',
    '  --hf-text: var(--ds-text, #1a2740);',
    '  --hf-muted: var(--ds-muted, #5a6a86);',
    '  --hf-accent: var(--ds-accent-strong, #305eff);',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 0.45rem;',
    '}',
    '',
    '.hf-root {',
    '  position: relative;',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 0.35rem;',
    '}',
    '',
    '.hf-label {',
    '  font-size: 0.78rem;',
    '  font-weight: 600;',
    '  color: var(--hf-muted);',
    '  letter-spacing: 0.02em;',
    '}',
    '',
    '.hf-control {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 0.35rem;',
    '  border: 1px solid color-mix(in srgb, var(--hf-border) 70%, transparent);',
    '  background: linear-gradient(180deg,',
    '      color-mix(in srgb, var(--hf-surface-soft) 90%, transparent) 0%,',
    '      color-mix(in srgb, var(--hf-surface) 96%, transparent) 100%',
    '    );',
    '  color: var(--hf-text);',
    '  transition: border-color 120ms ease, box-shadow 120ms ease;',
    '}',
    '',
    '.hf-control:focus-within {',
    '  border-color: color-mix(in srgb, var(--hf-accent) 70%, transparent);',
    '  box-shadow: 0 0 0 3px color-mix(in srgb, var(--hf-accent) 22%, transparent);',
    '}',
    '',
    '.hf-leading,',
    '.hf-trigger,',
    '.hf-clear {',
    '  width: 1.65rem;',
    '  height: 1.65rem;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  color: var(--hf-muted);',
    '}',
    '',
    '.hf-input {',
    '  flex: 1;',
    '  background: transparent;',
    '  border: 0;',
    '  color: var(--hf-text);',
    '  font-size: 0.92rem;',
    '  outline: none;',
    '}',
    '',
    '.hf-input::placeholder {',
    '  color: color-mix(in srgb, var(--hf-muted) 85%, transparent);',
    '}',
    '',
    '.hf-helper {',
    '  margin: 0;',
    '  font-size: 0.74rem;',
    '  color: var(--hf-muted);',
    '}',
    '',
    '.hf-positioner {',
    '  z-index: 40;',
    '  position: absolute !important;',
    '  top: calc(100% + 0.35rem) !important;',
    '  left: 0 !important;',
    '  right: 0 !important;',
    '}',
    '',
    '.hf-content {',
    '  border: 1px solid color-mix(in srgb, var(--hf-border) 70%, transparent);',
    '  background: linear-gradient(180deg,',
    '      color-mix(in srgb, var(--hf-surface-soft) 92%, transparent) 0%,',
    '      color-mix(in srgb, var(--hf-surface) 98%, transparent) 100%',
    '    );',
    '  backdrop-filter: blur(6px);',
    '  max-height: 16rem;',
    '  overflow: auto;',
    '  padding: 0.35rem;',
    '}',
    '',
    '.hf-item {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: space-between;',
    '  gap: 0.5rem;',
    '  padding: 0.5rem 0.65rem;',
    '  border-radius: 0.55rem;',
    '  color: var(--hf-text);',
    '  cursor: pointer;',
    '}',
    '',
    '.hf-item[data-highlighted] {',
    '  background: color-mix(in srgb, var(--hf-accent) 18%, transparent);',
    '}',
    '',
    '.hf-item[data-state="checked"] {',
    '  background: color-mix(in srgb, var(--hf-accent) 24%, transparent);',
    '}',
    '',
    '.hf-item[data-disabled] {',
    '  opacity: 0.45;',
    '  cursor: not-allowed;',
    '}',
    '',
    '.hf-item-text {',
    '  font-size: 0.9rem;',
    '}',
    '',
    '.hf-item-indicator {',
    '  color: color-mix(in srgb, var(--hf-accent) 85%, white 15%);',
    '}',
    '',
    '.hf-empty {',
    '  padding: 0.7rem;',
    '  text-align: center;',
    '  font-size: 0.82rem;',
    '  color: var(--hf-muted);',
    '}',
    '',
    '.hf-size-sm .hf-control {',
    '  min-height: 2.25rem;',
    '  padding: 0 0.35rem;',
    '}',
    '',
    '.hf-size-md .hf-control {',
    '  min-height: 2.6rem;',
    '  padding: 0 0.45rem;',
    '}',
    '',
    '.hf-size-lg .hf-control {',
    '  min-height: 3rem;',
    '  padding: 0 0.55rem;',
    '}',
    '',
    '.hf-radius-sm .hf-control,',
    '.hf-radius-sm .hf-content {',
    '  border-radius: 0.55rem;',
    '}',
    '',
    '.hf-radius-md .hf-control,',
    '.hf-radius-md .hf-content {',
    '  border-radius: 0.8rem;',
    '}',
    '',
    '.hf-radius-lg .hf-control,',
    '.hf-radius-lg .hf-content {',
    '  border-radius: 1rem;',
    '}',
    '</style>',
    '',
  ].join('\n')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const catalog = normalizeCatalog(body?.catalog)
  const combobox = normalizeCombobox(body?.components?.combobox)

  const rootDir = process.cwd()
  const catalogFile = resolve(rootDir, 'app/fields/fragments/catalog.json')
  const comboboxFile = resolve(rootDir, 'app/fields/fragments/components/combobox.json')
  const settingsFile = resolve(rootDir, 'app/fields/generated/fields.settings.json')
  const deployedFile = resolve(rootDir, 'app/fields/generated/deployed-components.json')
  const componentsDir = resolve(rootDir, 'app/components/fields')
  const comboboxComponentFile = resolve(componentsDir, `${combobox.componentName}.vue`)
  const indexFile = resolve(componentsDir, 'index.ts')

  const filesWritten: string[] = []
  const notes: string[] = []

  await writeJson(catalogFile, catalog)
  filesWritten.push('app/fields/fragments/catalog.json')

  await writeJson(comboboxFile, combobox)
  filesWritten.push('app/fields/fragments/components/combobox.json')

  await writeJson(settingsFile, {
    version: 1,
    savedAt: new Date().toISOString(),
    catalog,
    components: {
      combobox,
    },
  })
  filesWritten.push('app/fields/generated/fields.settings.json')

  await writeJson(deployedFile, {
    savedAt: new Date().toISOString(),
    selected: catalog.selected,
  })
  filesWritten.push('app/fields/generated/deployed-components.json')

  if (catalog.selected.includes('combobox')) {
    await ensureDir(comboboxComponentFile)
    await fs.writeFile(comboboxComponentFile, buildComboboxComponent(combobox), 'utf-8')
    filesWritten.push(`app/components/fields/${combobox.componentName}.vue`)

    await ensureDir(indexFile)
    const exportName = combobox.componentName
    const barrel = `export { default as ${exportName} } from './${combobox.componentName}.vue'\n`
    await fs.writeFile(indexFile, barrel, 'utf-8')
    filesWritten.push('app/components/fields/index.ts')
  }
  else {
    notes.push('Combobox is not selected in the catalog; no component file was generated.')
  }

  return {
    ok: true,
    files: filesWritten,
    notes,
  }
})
