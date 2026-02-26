import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'

type CreateDialogOverrideOptions = {
  force?: boolean
}

export type CreateDialogOverrideResult = {
  filePath: string
  status: 'created' | 'overwritten' | 'exists'
}

type CreateRecordOverrideOptions = {
  force?: boolean
}

export type CreateRecordOverrideResult = {
  filePath: string
  status: 'created' | 'overwritten' | 'exists'
}

type TabOverrideOptions = {
  force?: boolean
}

export type TabOverrideResult = {
  filePath: string
  status: 'created' | 'overwritten' | 'exists'
}

type WidgetOverrideOptions = {
  force?: boolean
}

export type WidgetOverrideResult = {
  filePath: string
  status: 'created' | 'overwritten' | 'exists'
}

type DirectoryCellOverrideOptions = {
  force?: boolean
}

export type DirectoryCellOverrideResult = {
  filePath: string
  status: 'created' | 'overwritten' | 'exists'
}

const normalizeModelKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')

const normalizeOverrideToken = (value: string, fallback: string) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || fallback
}

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath)
    return true
  }
  catch {
    return false
  }
}

const ensureDir = async (filePath: string) => {
  await fs.mkdir(dirname(filePath), { recursive: true })
}

const createDialogTemplate = (modelKey: string) => `<!-- @helios-generated-model-override kind=create-dialog model=${modelKey} -->
<script setup lang="ts">
import type { ModelUIFieldSpec } from '#helios-admin/app/types/model-spec'

const props = withDefaults(
  defineProps<{
    model: string
    open: boolean
    title: string
    submitLabel: string
    fields: ModelUIFieldSpec[]
    draft: Record<string, any>
    creating?: boolean
    error?: string
  }>(),
  {
    creating: false,
    error: '',
  },
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:draft', value: Record<string, any>): void
  (event: 'submit'): void
  (event: 'cancel'): void
}>()

const toLabel = (value: string) =>
  value
    .replace(/[._-]+/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim()
    .replace(/\\b\\w/g, char => char.toUpperCase())

const resolveFieldKey = (field: ModelUIFieldSpec) =>
  String(field.modelKey || field.field || field.id || '').trim()

const resolveInputType = (field: ModelUIFieldSpec) => {
  const component = String(field.component?.name || '').trim()
  const options = field.component?.options || {}
  if (component === 'AColorPicker') return 'color'
  if (component === 'AInput' && String(options.type || '').toLowerCase() === 'number') return 'number'
  return 'text'
}

const resolvePlaceholder = (field: ModelUIFieldSpec) => {
  const options = field.component?.options || {}
  return String(options.placeholder || \`Enter \${toLabel(resolveFieldKey(field)).toLowerCase()}\`).trim()
}

const setFieldValue = (field: ModelUIFieldSpec, value: unknown) => {
  const key = resolveFieldKey(field)
  if (!key) return
  emit('update:draft', {
    ...props.draft,
    [key]: value,
  })
}
</script>

<template>
  <div class="drawer-form smt-050">
    <p class="a-copy">
      Override scaffold for <code>{{ model }}</code>. Replace this file with your custom create dialog layout.
    </p>

    <label
      v-for="field in fields"
      :key="field.id"
      class="a-field"
    >
      <span class="a-field__label">{{ field.label || toLabel(resolveFieldKey(field)) }}</span>
      <input
        :type="resolveInputType(field)"
        class="a-input"
        :placeholder="resolvePlaceholder(field)"
        :value="draft[resolveFieldKey(field)] ?? ''"
        @input="setFieldValue(field, ($event.target as HTMLInputElement).value)"
      >
    </label>

    <div class="drawer-actions smt-075">
      <button class="a-btn a-btn--subtle" type="button" @click="emit('cancel')">Cancel</button>
      <button class="a-btn a-btn--primary" type="button" :disabled="creating" @click="emit('submit')">
        {{ creating ? 'Creating…' : submitLabel }}
      </button>
    </div>

    <p v-if="error" class="directory-error smt-050">{{ error }}</p>
  </div>
</template>
`

const createRecordTemplate = (modelKey: string) => `// @helios-generated-model-override kind=create-record model=${modelKey}
import type { ModelCreateRecordOverride } from '#helios-admin/app/types/model-overrides'

const createRecord: ModelCreateRecordOverride = async (context) => {
  context.logger.info('[model-create-override] invoked', {
    model: context.modelKey,
    requiredKeys: context.requiredKeys,
  })

  // Keep this call if you only want to extend behavior around the default pipeline.
  await context.defaultCreateRecord()

  // Example post-create hook:
  // const draft = context.getCreateDraft()
  // context.logger.info('[model-create-override] post-create draft', { draft })
}

export default createRecord
`

const tabTemplate = (modelKey: string, tabSlug: string) => `<!-- @helios-generated-model-override kind=tab model=${modelKey} tab=${tabSlug} -->
<script setup lang="ts">
const props = defineProps<{
  context: {
    model: string
    rid: string
    tab: { id: string, slug: string, label: string }
    fields: Record<string, any>
    refreshRecord?: () => Promise<unknown>
  }
}>()
</script>

<template>
  <section class="a-card">
    <p class="a-eyebrow">Tab Override</p>
    <h2 class="a-title">{{ props.context.tab.label || props.context.tab.slug }}</h2>
    <p class="a-copy">
      Replace this scaffold with your custom tab UI. Use <code>context.fields</code> and
      runtime helpers to integrate with the save engine.
    </p>

    <div class="smt-050">
      <button class="a-btn a-btn--subtle" type="button" @click="props.context.refreshRecord?.()">
        Refresh Record
      </button>
    </div>
  </section>
</template>
`

const widgetTemplate = (modelKey: string, widgetId: string) => `<!-- @helios-generated-model-override kind=widget model=${modelKey} widget=${widgetId} -->
<script setup lang="ts">
const props = defineProps<{
  context: {
    model: string
    rid: string
    widget: { id: string, name: string, label?: string } | null
    saveWidget?: () => Promise<unknown>
    buildActionGroups?: () => Array<{
      id: string
      kind: string
      action: string
      payload: Record<string, any>
      fields: string[]
    }>
  }
}>()

const groups = computed(() => props.context.buildActionGroups?.() ?? [])
</script>

<template>
  <section class="a-card">
    <p class="a-eyebrow">Widget Override</p>
    <h3 class="a-title">{{ props.context.widget?.label || props.context.widget?.name || '${widgetId}' }}</h3>
    <p class="a-copy">
      Replace this scaffold with your custom widget UI and call <code>context.saveWidget()</code>
      to use grouped save execution.
    </p>

    <pre class="smt-050">{{ JSON.stringify(groups, null, 2) }}</pre>

    <div class="smt-050">
      <button class="a-btn a-btn--subtle" type="button" @click="props.context.saveWidget?.()">
        Save Widget
      </button>
    </div>
  </section>
</template>
`

const directoryCellTemplate = (modelKey: string, fieldKey: string) => `<!-- @helios-generated-model-override kind=directory-cell model=${modelKey} field=${fieldKey} -->
<script setup lang="ts">
const props = defineProps<{
  modelKey: string
  columnKey: string
  columnLabel: string
  column: Record<string, any>
  row: Record<string, any>
  rid: string
  value: unknown
  formattedValue: string
}>()
</script>

<template>
  <span>
    {{ props.formattedValue }}
  </span>
</template>
`

const scaffoldOverrideFile = async (
  filePath: string,
  content: string,
  force = false,
) => {
  const exists = await fileExists(filePath)
  if (exists && !force) {
    return {
      filePath,
      status: 'exists' as const,
    }
  }

  await ensureDir(filePath)
  await fs.writeFile(filePath, content, 'utf-8')

  return {
    filePath,
    status: (exists ? 'overwritten' : 'created') as 'overwritten' | 'created',
  }
}

export const scaffoldCreateDialogOverride = async (
  model: string,
  options: CreateDialogOverrideOptions = {},
  cwd = process.cwd(),
): Promise<CreateDialogOverrideResult> => {
  const modelKey = normalizeModelKey(model)
  if (!modelKey) {
    throw new Error('Model key is required to scaffold an override.')
  }

  const filePath = resolve(cwd, 'app/components/admin/overrides', modelKey, 'CreateDialog.vue')
  return await scaffoldOverrideFile(filePath, createDialogTemplate(modelKey), options.force)
}

export const scaffoldCreateRecordOverride = async (
  model: string,
  options: CreateRecordOverrideOptions = {},
  cwd = process.cwd(),
): Promise<CreateRecordOverrideResult> => {
  const modelKey = normalizeModelKey(model)
  if (!modelKey) {
    throw new Error('Model key is required to scaffold an override.')
  }

  const filePath = resolve(cwd, 'app/components/admin/overrides', modelKey, 'createRecord.ts')
  return await scaffoldOverrideFile(filePath, createRecordTemplate(modelKey), options.force)
}

export const scaffoldTabOverride = async (
  model: string,
  tabSlug: string,
  options: TabOverrideOptions = {},
  cwd = process.cwd(),
): Promise<TabOverrideResult> => {
  const modelKey = normalizeModelKey(model)
  const normalizedTab = normalizeOverrideToken(tabSlug, 'general')
  if (!modelKey) {
    throw new Error('Model key is required to scaffold a tab override.')
  }

  const filePath = resolve(
    cwd,
    'app/components/admin/overrides',
    modelKey,
    'tabs',
    `${normalizedTab}.vue`,
  )
  return await scaffoldOverrideFile(filePath, tabTemplate(modelKey, normalizedTab), options.force)
}

export const scaffoldWidgetOverride = async (
  model: string,
  widgetId: string,
  options: WidgetOverrideOptions = {},
  cwd = process.cwd(),
): Promise<WidgetOverrideResult> => {
  const modelKey = normalizeModelKey(model)
  const normalizedWidget = normalizeOverrideToken(widgetId, 'widget')
  if (!modelKey) {
    throw new Error('Model key is required to scaffold a widget override.')
  }

  const filePath = resolve(
    cwd,
    'app/components/admin/overrides',
    modelKey,
    'widgets',
    `${normalizedWidget}.vue`,
  )
  return await scaffoldOverrideFile(filePath, widgetTemplate(modelKey, normalizedWidget), options.force)
}

export const scaffoldDirectoryCellOverride = async (
  model: string,
  fieldKey: string,
  options: DirectoryCellOverrideOptions = {},
  cwd = process.cwd(),
): Promise<DirectoryCellOverrideResult> => {
  const modelKey = normalizeModelKey(model)
  const normalizedField = normalizeOverrideToken(fieldKey, 'field')
  if (!modelKey) {
    throw new Error('Model key is required to scaffold a directory cell override.')
  }

  const filePath = resolve(
    cwd,
    'app/components/admin/overrides',
    modelKey,
    'directory',
    'cells',
    `${normalizedField}.vue`,
  )
  return await scaffoldOverrideFile(filePath, directoryCellTemplate(modelKey, normalizedField), options.force)
}
