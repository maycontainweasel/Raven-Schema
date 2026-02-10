<script setup lang="ts">
import type {
  ModelLayoutSpec,
  ModelSpecResponse,
  ModelUIFieldSpec,
  ModelUITabSpec,
  ModelUIWidgetSpec,
} from '../../../types/model-spec'
// import AInput from '../../../components/fields/AInput.vue'
// import ACombobox, { type AComboboxOption } from '../../../components/fields/ACombobox.vue'
// import AComboboxAsync from '../../../components/fields/AComboboxAsync.vue'
//   import AColorPicker from '../../../components/fields/AColorPicker.vue'
//   import FieldSectionCard from '../../../components/fields/FieldSectionCard.vue'

type RuntimeRecordResponse = {
  ok: boolean
  record: Record<string, any>
  identifiers: {
    rid: string | null
    subId: string | null
    table: string | null
  }
}

type RuntimeUpdateResponse = {
  ok: boolean
  updated: Record<string, any> | null
  identifiers: {
    rid: string | null
    subId: string | null
    table: string | null
  }
}

type WidgetLayoutColumnState = {
  id: string
  class?: string
  fields: ModelUIFieldSpec[]
}

type WidgetLayoutRowState = {
  id: string
  class?: string
  columns: WidgetLayoutColumnState[]
}

const route = useRoute()

const modelParam = computed(() => {
  const fromParams = String(route.params.model ?? '').trim().toLowerCase()
  if (fromParams) return fromParams

  const fromMeta = String((route.meta as any)?.modelKey ?? '').trim().toLowerCase()
  return fromMeta
})
const ridParam = computed(() => String(route.params.rid ?? '').trim())
const activeTabSlug = ref('')
const notice = ref('')
const noticeTone = ref<'success' | 'error'>('success')
const saving = ref(false)
const publishing = ref(false)
const widgetSaving = ref<Record<string, boolean>>({})

const { data: specData, pending: specPending, error: specError } = await useFetch<ModelSpecResponse>(
  () => `/api/models/layout/${modelParam.value}`,
  { watch: [modelParam] },
)

const {
  data: recordData,
  pending: recordPending,
  error: recordError,
  refresh: refreshRecord,
} = await useFetch<RuntimeRecordResponse>(
  () => `/api/models/runtime/${modelParam.value}/record/${encodeURIComponent(ridParam.value)}`,
  { watch: [modelParam, ridParam] },
)

const spec = computed<ModelLayoutSpec | null>(() => specData.value?.spec ?? null)
const modelInfo = computed(() => specData.value?.model ?? null)
const modelLabel = computed(() => modelInfo.value?.label || modelParam.value)
const directoryRoute = computed(() => spec.value?.directory.route || `/admin/${modelParam.value}`)
const sourceRecord = computed<Record<string, any> | null>(() => {
  const value = recordData.value?.record
  return value && typeof value === 'object' ? value : null
})
const recordIdentifiers = computed(() => recordData.value?.identifiers ?? null)

const fieldState = ref<Record<string, any>>({})

const toLabel = (value: string) =>
  value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())

const resolveFieldKey = (field: ModelUIFieldSpec) => {
  return String(field.modelKey || field.field || field.id || '').trim()
}

const unique = <T>(value: T[]) => Array.from(new Set(value))

const resolveRecordFieldValue = (record: Record<string, any> | null, field: ModelUIFieldSpec) => {
  if (!record) return undefined

  const candidates = unique([
    resolveFieldKey(field),
    String(field.field || '').trim(),
    String(field.id || '').trim(),
  ].filter(Boolean))

  for (const key of candidates) {
    if (Object.hasOwn(record, key)) return record[key]
  }

  const lowerLookup = new Map<string, string>()
  Object.keys(record).forEach((key) => lowerLookup.set(key.toLowerCase(), key))
  for (const key of candidates) {
    const match = lowerLookup.get(String(key).toLowerCase())
    if (match) return record[match]
  }

  const normalized = resolveFieldKey(field).toLowerCase()
  if (normalized === 'rid') {
    return recordIdentifiers.value?.rid || ridParam.value
  }
  if (normalized === 'id' || normalized.endsWith('id')) {
    return recordIdentifiers.value?.subId || ridParam.value
  }

  return undefined
}

const normalizePayloadValue = (field: ModelUIFieldSpec, value: unknown) => {
  const options = field.component?.options || {}
  if (field.component?.name === 'AInput' && String(options.type || '').toLowerCase() === 'number') {
    if (value === '' || value === null || typeof value === 'undefined') return 0
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : value
  }
  return value
}

const payloadFromFields = (fields: ModelUIFieldSpec[]) => {
  const payload: Record<string, any> = {}
  for (const field of fields) {
    const key = resolveFieldKey(field)
    if (!key) continue
    payload[key] = normalizePayloadValue(field, fieldState.value[key])
  }
  return payload
}

const inferDefault = (field: ModelUIFieldSpec) => {
  const key = resolveFieldKey(field).toLowerCase()
  const options = field.component?.options || {}

  if (typeof options.defaultValue !== 'undefined') return options.defaultValue

  if (field.component.name === 'AColorPicker') return '#000000'
  if (field.component.name === 'AInput' && String(options.type || '').toLowerCase() === 'number') return 0
  if (field.component.name === 'ACombobox' || field.component.name === 'AComboboxAsync') {
    if (options.multiple) return []
    if (key.includes('status')) return 'draft'
    return ''
  }

  if (key === 'rid' || key.endsWith('id')) return ridParam.value
  if (key.includes('title') || key.includes('name')) return `${modelLabel.value} ${ridParam.value}`

  return ''
}

const allFieldSpecs = computed(() => {
  const tabs = spec.value?.single.tabs ?? []
  const seen = new Set<string>()
  const merged: ModelUIFieldSpec[] = []

  for (const tab of tabs) {
    for (const row of tab.primary) {
      for (const column of row.columns) {
        for (const widget of column.primary) {
          for (const field of widget.fields) {
            const key = resolveFieldKey(field)
            if (!key || seen.has(key)) continue
            seen.add(key)
            merged.push(field)
          }
        }
      }
    }
  }

  return merged
})

watch(
  [() => spec.value, () => sourceRecord.value],
  ([nextSpec, nextRecord]) => {
    if (!nextSpec) {
      activeTabSlug.value = ''
      fieldState.value = {}
      return
    }

    activeTabSlug.value = nextSpec.single.tabs[0]?.slug ?? ''

    const nextState: Record<string, any> = {}
    for (const field of allFieldSpecs.value) {
      const key = resolveFieldKey(field)
      if (!key) continue
      const valueFromRecord = resolveRecordFieldValue(nextRecord, field)
      nextState[key] = typeof valueFromRecord !== 'undefined'
        ? valueFromRecord
        : inferDefault(field)
    }

    fieldState.value = nextState
    notice.value = ''
    noticeTone.value = 'success'
  },
  { immediate: true, deep: true },
)

const tabs = computed(() => spec.value?.single.tabs ?? [])

watch(
  tabs,
  (nextTabs) => {
    if (!nextTabs.length) {
      activeTabSlug.value = ''
      return
    }

    if (!nextTabs.some(tab => tab.slug === activeTabSlug.value)) {
      activeTabSlug.value = nextTabs[0]?.slug ?? ''
    }
  },
  { deep: true },
)

const activeTab = computed<ModelUITabSpec | null>(() => {
  const list = tabs.value
  if (!list.length) return null
  return list.find(tab => tab.slug === activeTabSlug.value) ?? list[0] ?? null
})

const asComboboxOptions = (raw: unknown): AComboboxOption[] => {
  if (!Array.isArray(raw)) return []

  return raw
    .map((entry) => {
      if (!entry) return null

      if (typeof entry === 'string') {
        const text = entry.trim()
        if (!text) return null
        return { label: toLabel(text), value: text }
      }

      if (typeof entry !== 'object') return null
      const label = String((entry as any).label ?? '').trim()
      const value = String((entry as any).value ?? '').trim()
      if (!label || !value) return null

      return {
        label,
        value,
        group: String((entry as any).group ?? '').trim() || undefined,
        disabled: Boolean((entry as any).disabled),
      }
    })
    .filter(Boolean) as AComboboxOption[]
}

const resolveOptions = (field: ModelUIFieldSpec): AComboboxOption[] => {
  const fromSpec = asComboboxOptions(field.component?.options?.options)
  if (fromSpec.length) return fromSpec

  const key = resolveFieldKey(field).toLowerCase()
  if (key.includes('status')) {
    return [
      { label: 'Draft', value: 'draft' },
      { label: 'Review', value: 'review' },
      { label: 'Published', value: 'published' },
    ]
  }

  return []
}

const searchOptions = async (field: ModelUIFieldSpec, query: string): Promise<AComboboxOption[]> => {
  const source = resolveOptions(field)
  const q = query.trim().toLowerCase()
  if (!q) return []

  await new Promise(resolve => setTimeout(resolve, 120))

  return source.filter((entry) => {
    return entry.label.toLowerCase().includes(q) || entry.value.toLowerCase().includes(q)
  })
}

const resolveFieldComponent = (name: string) => {
  if (name === 'ACombobox') return ACombobox
  if (name === 'AComboboxAsync') return AComboboxAsync
  if (name === 'AColorPicker') return AColorPicker
  return AInput
}

const resolveFieldProps = (field: ModelUIFieldSpec) => {
  const key = resolveFieldKey(field)
  const options = field.component?.options || {}
  const base = {
    label: field.label || toLabel(key),
    helperText: options.helperText || `modelKey=${key}`,
  }
  const placeholder = String(options.placeholder ?? `Enter ${toLabel(key).toLowerCase()}`).trim()

  if (field.component.name === 'AColorPicker') {
    return {
      ...base,
    }
  }

  if (field.component.name === 'ACombobox') {
    return {
      ...base,
      options: resolveOptions(field),
      placeholder,
      grouped: Boolean(options.grouped),
      multiple: Boolean(options.multiple),
      highlightMatch: Boolean(options.highlightMatch),
      clearable: Boolean(options.clearable ?? true),
      showIndicator: Boolean(options.showIndicator ?? true),
      emptyText: String(options.emptyText ?? 'No options found.'),
    }
  }

  if (field.component.name === 'AComboboxAsync') {
    return {
      ...base,
      placeholder,
      search: (query: string) => searchOptions(field, query),
      grouped: Boolean(options.grouped),
      multiple: Boolean(options.multiple),
      highlightMatch: Boolean(options.highlightMatch),
      clearable: Boolean(options.clearable ?? true),
      showIndicator: Boolean(options.showIndicator ?? true),
      emptyText: String(options.emptyText ?? 'No options found.'),
      minChars: Number(options.minChars ?? 1),
    }
  }

  return {
    ...base,
    type: String(options.type ?? 'text'),
    placeholder,
  }
}

const setFieldValue = (field: ModelUIFieldSpec, value: unknown) => {
  const key = resolveFieldKey(field)
  fieldState.value = {
    ...fieldState.value,
    [key]: value,
  }
}

const persistPayload = async (
  payload: Record<string, any>,
  successMessage: string,
) => {
  const response = await $fetch<RuntimeUpdateResponse>(`/api/models/runtime/${modelParam.value}/record/${encodeURIComponent(ridParam.value)}`, {
    method: 'POST',
    body: {
      id: recordIdentifiers.value?.subId || undefined,
      payload,
    },
  })

  notice.value = successMessage
  noticeTone.value = 'success'

  if (response.updated && typeof response.updated === 'object') {
    const nextState = { ...fieldState.value }
    for (const field of allFieldSpecs.value) {
      const key = resolveFieldKey(field)
      if (!key) continue
      const valueFromRecord = resolveRecordFieldValue(response.updated, field)
      if (typeof valueFromRecord !== 'undefined') {
        nextState[key] = valueFromRecord
      }
    }
    fieldState.value = nextState
  }

  await refreshRecord()
}

const saveDraft = async () => {
  saving.value = true

  try {
    await persistPayload(payloadFromFields(allFieldSpecs.value), `Saved draft for ${ridParam.value}.`)
  }
  catch (error: any) {
    notice.value = error?.data?.statusMessage ?? error?.message ?? `Failed to save draft for ${ridParam.value}.`
    noticeTone.value = 'error'
  }
  finally {
    saving.value = false
  }
}

const statusFieldKey = computed(() => {
  const fromFields = allFieldSpecs.value.find((field) => {
    const key = resolveFieldKey(field).toLowerCase()
    return key.includes('status')
  })
  return fromFields ? resolveFieldKey(fromFields) : null
})

const publishRecord = async () => {
  const statusKey = statusFieldKey.value
  if (!statusKey) {
    notice.value = 'No status field is configured in this model tab layout.'
    noticeTone.value = 'error'
    return
  }

  publishing.value = true

  try {
    await persistPayload({ [statusKey]: 'publish' }, `Published ${ridParam.value}.`)
  }
  catch (error: any) {
    notice.value = error?.data?.statusMessage ?? error?.message ?? `Failed to publish ${ridParam.value}.`
    noticeTone.value = 'error'
  }
  finally {
    publishing.value = false
  }
}

const widgetLayoutRows = (widget: ModelUIWidgetSpec): WidgetLayoutRowState[] => {
  const byId = new Map(widget.fields.map(field => [field.id, field]))
  const rawRows = widget.layout?.rows || []

  if (!rawRows.length) {
    return [
      {
        id: `${widget.id}-row-1`,
        columns: [
          {
            id: `${widget.id}-col-1`,
            fields: widget.fields,
          },
        ],
      },
    ]
  }

  return rawRows.map((row) => {
    const columns = (row.columns || []).map((column) => ({
      id: column.id,
      class: column.class,
      fields: (column.fieldIds || [])
        .map(fieldId => byId.get(fieldId))
        .filter(Boolean) as ModelUIFieldSpec[],
    }))

    return {
      id: row.id,
      class: row.class,
      columns: columns.length
        ? columns
        : [
            {
              id: `${row.id}-col-1`,
              fields: [],
            },
          ],
    }
  })
}

const saveWidget = async (widget: ModelUIWidgetSpec) => {
  const payload = payloadFromFields(widget.fields)

  widgetSaving.value = {
    ...widgetSaving.value,
    [widget.id]: true,
  }

  try {
    await persistPayload(payload, `Saved ${widget.label || widget.name || widget.id}.`)
  }
  catch (error: any) {
    notice.value = error?.data?.statusMessage ?? error?.message ?? `Failed to save ${widget.label || widget.name || widget.id}.`
    noticeTone.value = 'error'
  }
  finally {
    widgetSaving.value = {
      ...widgetSaving.value,
      [widget.id]: false,
    }
  }
}
</script>

<template>
  <section class="a-grid">
    <header v-if="spec?.single.global.showHeader" class="a-card a-card--hero record-header">
      <div>
        <p class="a-eyebrow">{{ modelLabel }} Management</p>
        <h1 class="a-title">{{ ridParam }}</h1>
        <p class="a-copy">
          Generated single-record workspace from committed model spec.
        </p>
      </div>
      <div class="record-header__actions">
        <span v-if="spec?.single.global.enableInstanceManagement" class="a-chip">Instance Management Enabled</span>
        <NuxtLink class="a-btn a-btn--subtle" :to="directoryRoute">Back to Directory</NuxtLink>
        <button class="a-btn a-btn--subtle" type="button" :disabled="saving" @click="saveDraft">
          {{ saving ? 'Saving…' : 'Save Draft' }}
        </button>
        <button
          v-if="spec?.single.global.enablePostStatus"
          class="a-btn a-btn--primary"
          type="button"
          :disabled="publishing"
          @click="publishRecord"
        >
          {{ publishing ? 'Publishing…' : 'Publish' }}
        </button>
      </div>
    </header>

    <p v-if="notice" class="record-notice" :class="noticeTone === 'error' ? 'is-error' : ''">{{ notice }}</p>
    <p v-if="specError" class="record-error">
      Failed to load model spec. Open <code>/models/{{ modelParam }}</code> and commit layout first.
    </p>
    <p v-else-if="recordError" class="record-error">
      Failed to load record data. Validate TypeSense resource routing in <code>/models/{{ modelParam }}</code>.
    </p>

    <section class="record-grid">
      <aside class="a-card record-nav">
        <p class="a-eyebrow">Tabs</p>
        <div class="record-nav__stack smt-050">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="record-nav__item"
            :class="activeTabSlug === tab.slug ? 'is-active' : ''"
            type="button"
            @click="activeTabSlug = tab.slug"
          >
            {{ tab.label }}
          </button>
        </div>
      </aside>

      <main class="record-main">
        <template v-if="activeTab">
          <section
            v-for="row in activeTab.primary"
            :key="row.id"
            class="layout-row"
            :class="row.class"
          >
            <div
              v-for="column in row.columns"
              :key="column.id"
              class="layout-col"
              :class="column.class"
            >
              <template v-for="widget in column.primary" :key="widget.id">
                <FieldSectionCard
                  v-if="widget.type === 'fields-card'"
                  :title="widget.label"
                  :description="widget.subtitle"
                >
                  <div class="widget-fields">
                    <div
                      v-for="layoutRow in widgetLayoutRows(widget)"
                      :key="`${widget.id}-${layoutRow.id}`"
                      class="widget-fields__row"
                      :class="layoutRow.class"
                    >
                      <div
                        v-for="layoutColumn in layoutRow.columns"
                        :key="`${widget.id}-${layoutRow.id}-${layoutColumn.id}`"
                        class="widget-fields__col"
                        :class="layoutColumn.class"
                      >
                        <component
                          :is="resolveFieldComponent(field.component.name)"
                          v-for="field in layoutColumn.fields"
                          :key="field.id"
                          :model-value="fieldState[resolveFieldKey(field)]"
                          v-bind="resolveFieldProps(field)"
                          @update:model-value="setFieldValue(field, $event)"
                        />
                      </div>
                    </div>
                  </div>

                  <div v-if="widget.saveLabel || widget.action" class="widget-actions smt-050">
                    <button
                      class="a-btn a-btn--subtle"
                      type="button"
                      :disabled="Boolean(widgetSaving[widget.id])"
                      @click="saveWidget(widget)"
                    >
                      {{ widgetSaving[widget.id] ? 'Saving…' : (widget.saveLabel || 'Save') }}
                    </button>
                  </div>
                </FieldSectionCard>

                <article v-else class="a-card widget-generic">
                  <h3 class="widget-generic__title">{{ widget.label || widget.name }}</h3>
                  <p class="a-copy">Custom widget placeholder (type={{ widget.type }})</p>
                </article>
              </template>
            </div>
          </section>
        </template>

        <article v-else class="a-card">
          <p class="a-copy">No tabs configured for this model yet.</p>
        </article>
      </main>
    </section>

    <section v-if="specPending || recordPending" class="a-card">
      <p class="a-copy">Loading model layout and record state…</p>
    </section>
  </section>
</template>

<style scoped>
.record-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.record-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.record-notice {
  margin: 0;
  color: var(--admin-success);
  font-size: var(--fs--075, 0.86rem);
}

.record-notice.is-error {
  color: var(--admin-danger);
}

.record-error {
  margin: 0;
  color: var(--admin-danger);
  font-size: var(--fs--075, 0.86rem);
}

.record-grid {
  display: grid;
  grid-template-columns: minmax(220px, 248px) minmax(0, 1fr);
  gap: 0.78rem;
}

.record-nav {
  padding: 0.85rem;
  height: fit-content;
  position: sticky;
  top: 0.8rem;
}

.record-nav__stack {
  display: grid;
  gap: 0.22rem;
}

.record-nav__item {
  text-align: left;
  border: 1px solid transparent;
  border-radius: var(--admin-radius-pill);
  background: transparent;
  color: var(--admin-text-soft);
  padding: 0.48rem 0.58rem;
  cursor: pointer;
  font-size: var(--fs--075, 0.86rem);
  font-weight: 600;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
}

.record-nav__item:hover {
  color: var(--admin-text);
  background: var(--colors-slate-50);
  border-color: var(--colors-slate-200);
  transform: translateY(-1px);
}

.record-nav__item.is-active {
  color: var(--admin-text);
  background: var(--colors-slate-100);
}

.record-main {
  display: grid;
  gap: 0.52rem;
}

.layout-row {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.layout-col {
  display: grid;
  gap: 0.55rem;
  min-width: 0;
}

.widget-fields {
  display: grid;
  gap: 0.52rem;
}

.widget-fields__row {
  display: grid;
  gap: 0.52rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.widget-fields__col {
  display: grid;
  gap: 0.52rem;
  min-width: 0;
}

.widget-actions {
  display: flex;
  justify-content: flex-end;
}

.widget-generic__title {
  margin: 0;
  font-size: var(--fs-025, 1.04rem);
  color: var(--admin-text);
  letter-spacing: -0.01em;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .record-header {
    flex-direction: column;
  }

  .record-grid {
    grid-template-columns: 1fr;
  }

  .record-nav {
    position: static;
  }
}

@media (max-width: 760px) {
  .widget-fields__row {
    grid-template-columns: 1fr;
  }
}
</style>
