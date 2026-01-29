<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import FieldRenderer, { type FieldSpec } from './FieldRenderer.vue'

export type FieldsCardSpec = {
  type: 'fields-card'
  id?: string
  title?: string
  subtitle?: string
  fields?: FieldSpec[]
  content?: any[]
  save?: boolean
  saveLabel?: string
}

const props = defineProps<{
  model: string
  widget: FieldsCardSpec
  contentComponent?: any
  record?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (event: 'save', payload: { id?: string; values: Record<string, any>; fields: FieldSpec[] }): void
}>()

const form = reactive<Record<string, any>>({})

type CardItem =
  | FieldSpec
  | { type: 'message'; text?: string; class?: string }
  | { type: 'divider'; class?: string }
  | { type: 'spacer'; size?: 'sm' | 'md' | 'lg'; class?: string }
  | { type: string; [key: string]: any }
  | string

type CardColumn = CardItem[] | { class?: string; items?: CardItem[] } | CardItem
type CardRow = CardColumn[] | { class?: string; columns?: CardColumn[] } | CardColumn

type NormalizedColumn = { className?: string; items: CardItem[] }
type NormalizedRow = { className?: string; columns: NormalizedColumn[] }

const resolveFieldKey = (field: FieldSpec) => field.key ?? field.field

const getByPath = (target: Record<string, any> | null | undefined, path: string) => {
  if (!target || !path) return undefined
  const parts = path.split('.').filter(Boolean)
  let cursor: any = target
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = cursor[part]
  }
  return cursor
}

const isFieldItem = (item: CardItem): item is FieldSpec =>
  !!item && typeof item === 'object' && 'field' in item

const normalizeColumn = (column: CardColumn): NormalizedColumn => {
  if (Array.isArray(column)) {
    return { items: column as CardItem[] }
  }
  if (column && typeof column === 'object' && 'items' in (column as any)) {
    const { class: className, items } = column as any
    return { className, items: Array.isArray(items) ? items : [] }
  }
  return { items: [column as CardItem] }
}

const normalizeRow = (row: CardRow): NormalizedRow => {
  if (row && typeof row === 'object' && !Array.isArray(row) && 'columns' in row) {
    const { class: className, columns } = row as any
    return { className, columns: Array.isArray(columns) ? columns.map(normalizeColumn) : [] }
  }
  if (Array.isArray(row)) {
    return { columns: (row as CardColumn[]).map(normalizeColumn) }
  }
  return { columns: [normalizeColumn(row as CardColumn)] }
}

const contentRows = computed<NormalizedRow[] | null>(() => {
  const content = props.widget.content
  if (!Array.isArray(content) || content.length === 0) return null
  return content.map((row: CardRow) => normalizeRow(row))
})

const extractFields = (items: CardItem[], bucket: FieldSpec[]) => {
  items.forEach((item) => {
    if (isFieldItem(item)) {
      bucket.push(item)
      return
    }
    if (Array.isArray(item)) {
      extractFields(item as any, bucket)
    }
    if (item && typeof item === 'object' && 'items' in (item as any)) {
      const inner = (item as any).items
      if (Array.isArray(inner)) extractFields(inner, bucket)
    }
  })
}

const resolveFields = () => {
  const resolved: FieldSpec[] = []
  const direct = props.widget.fields ?? []
  direct.forEach((field) => resolved.push(field))

  if (contentRows.value) {
    const bucket: FieldSpec[] = []
    contentRows.value.forEach((row) => {
      row.columns.forEach((column) => {
        extractFields(column.items, bucket)
      })
    })
    bucket.forEach((field) => resolved.push(field))
  }

  const seen = new Set<string>()
  return resolved.filter((field) => {
    const key = resolveFieldKey(field)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const fields = computed(() => resolveFields())

const ensureDefaults = () => {
  fields.value.forEach((field) => {
    const key = resolveFieldKey(field)
    if (form[key] !== undefined) return
    form[key] = ''
  })
}

const applyRecord = () => {
  if (!props.record) return
  fields.value.forEach((field) => {
    const key = resolveFieldKey(field)
    const path = field.path ?? field.field
    form[key] = getByPath(props.record, path) ?? ''
  })
}

ensureDefaults()

watch(
  () => props.record,
  () => {
    applyRecord()
  },
  { immediate: true }
)

const updateValue = (key: string, value: any) => {
  form[key] = value
}

const spacerClass = (size?: string) => {
  if (size === 'sm') return 'h-2'
  if (size === 'lg') return 'h-6'
  return 'h-4'
}

const handleSave = () => {
  emit('save', { id: props.widget.id, values: { ...form }, fields: fields.value })
}
</script>

<template>
  <div class="card">
    <div class="card-body space-y-4">
      <div>
        <h3 v-if="widget.title" class="text-lg font-semibold">{{ widget.title }}</h3>
        <p v-if="widget.subtitle" class="text-sm text-muted">{{ widget.subtitle }}</p>
      </div>

      <component
        v-if="contentComponent"
        :is="contentComponent"
        :model="model"
        :widget="widget"
        :values="form"
        :set-value="updateValue"
      />
      <div v-else-if="contentRows" class="space-y-4">
        <div
          v-for="(row, rowIndex) in contentRows"
          :key="rowIndex"
          class="flex flex-col gap-4 md:flex-row card-row"
          :class="row.className"
        >
          <div
            v-for="(column, colIndex) in row.columns"
            :key="colIndex"
            class="flex-1 flex flex-col gap-4 min-w-0 card-col"
            :class="column.className"
          >
            <template v-for="(item, itemIndex) in column.items" :key="itemIndex">
              <FieldRenderer
                v-if="isFieldItem(item)"
                :model="model"
                :field="item"
                v-model="form[resolveFieldKey(item)]"
                :class="item.class"
              />
              <div v-else-if="typeof item === 'string'" class="text-sm text-muted">
                {{ item }}
              </div>
              <div
                v-else-if="item && typeof item === 'object' && item.type === 'message'"
                class="text-sm text-muted"
                :class="item.class"
              >
                {{ item.text }}
              </div>
              <div
                v-else-if="item && typeof item === 'object' && item.type === 'divider'"
                class="border-t border-border"
                :class="item.class"
              ></div>
              <div
                v-else-if="item && typeof item === 'object' && item.type === 'spacer'"
                :class="[spacerClass(item.size), item.class]"
              ></div>
            </template>
          </div>
        </div>
      </div>
      <div v-else class="grid gap-4">
        <FieldRenderer
          v-for="field in fields"
          :key="field.key ?? field.field"
          :model="model"
          :field="field"
          :record="record"
          v-model="form[resolveFieldKey(field)]"
        />
      </div>

      <div v-if="widget.save !== false" class="flex justify-end">
        <button class="btn btn-primary btn-sm" @click="handleSave">
          {{ widget.saveLabel ?? 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1 1 0%;
  min-width: 0;
}

@media (min-width: 768px) {
  .card-row {
    flex-direction: row;
  }
}
</style>
