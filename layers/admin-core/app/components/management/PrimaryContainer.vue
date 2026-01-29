<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import WidgetRenderer, { type WidgetSpec } from './WidgetRenderer.vue'

export type PrimaryColumn = WidgetSpec | WidgetSpec[] | { class?: string; [key: string]: any }
export type PrimaryRow = WidgetSpec | PrimaryColumn[] | { class?: string; primary?: PrimaryColumn[] }

const props = defineProps<{
  model: string
  primary: PrimaryRow[]
  record?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (event: 'save', payload: { id?: string; values: Record<string, any>; fields: any[] }): void
}>()

type NormalizedColumn = { id?: string; className?: string; widgets: WidgetSpec[]; override?: any; raw?: any }
type NormalizedRow = { id?: string; className?: string; columns: NormalizedColumn[]; override?: any; raw?: any }

const defaultRowClass = 'flex flex-col gap-6 md:flex-row primary-row'
const defaultColumnClass = 'flex-1 flex flex-col gap-6 min-w-0 primary-col'

const rowOverrides = import.meta.glob('@/components/models/**/overrides/rows/*.vue')
const columnOverrides = import.meta.glob('@/components/models/**/overrides/columns/*.vue')

const resolveOverride = (map: Record<string, unknown>, suffix: string) => {
  const match = Object.keys(map).find((key) => key.endsWith(suffix))
  if (!match) return null
  return defineAsyncComponent(map[match] as any)
}

const resolveRowOverride = (rowId?: string) => {
  if (!props.model || !rowId) return null
  return resolveOverride(rowOverrides, `models/${props.model}/overrides/rows/${rowId}.vue`)
}

const resolveColumnOverride = (columnId?: string) => {
  if (!props.model || !columnId) return null
  return resolveOverride(columnOverrides, `models/${props.model}/overrides/columns/${columnId}.vue`)
}

const normalizeColumns = (columns: PrimaryColumn[] = []): NormalizedColumn[] => {
  return columns.map((column) => {
    if (Array.isArray(column)) {
      return { widgets: column as WidgetSpec[] }
    }

    if (column && typeof column === 'object' && 'type' in column) {
      const { class: className, id, ...widget } = column as any
      const override = resolveColumnOverride(id)
      return { id, className, widgets: [widget as WidgetSpec], override, raw: column }
    }

    if (column && typeof column === 'object' && 'widgets' in (column as any)) {
      const { class: className, id, widgets } = column as any
      const override = resolveColumnOverride(id)
      return { id, className, widgets: Array.isArray(widgets) ? widgets : [], override, raw: column }
    }

    return { widgets: [column as WidgetSpec], raw: column }
  })
}

const normalizeRow = (row: PrimaryRow): NormalizedRow => {
  if (row && typeof row === 'object' && !Array.isArray(row) && 'primary' in row) {
    const rowDef = row as any
    return {
      id: rowDef.id,
      className: rowDef.class,
      columns: normalizeColumns(Array.isArray(rowDef.primary) ? rowDef.primary : []),
      override: resolveRowOverride(rowDef.id),
      raw: row
    }
  }

  if (Array.isArray(row)) {
    return { columns: normalizeColumns(row), raw: row }
  }

  return { columns: normalizeColumns([row as PrimaryColumn]), raw: row }
}

const rows = computed(() => props.primary.map((row) => normalizeRow(row)))
</script>

<template>
  <div class="space-y-6">
    <div
      v-for="(row, rowIndex) in rows"
      :key="row.id ?? rowIndex"
      :class="[defaultRowClass, row.className]"
    >
      <component
        v-if="row.override"
        :is="row.override"
        :model="model"
        :row="row.raw"
        :record="record"
        @save="emit('save', $event)"
      />
      <template v-else>
        <div
          v-for="(column, colIndex) in row.columns"
          :key="column.id ?? colIndex"
          :class="[defaultColumnClass, column.className]"
        >
          <component
            v-if="column.override"
            :is="column.override"
            :model="model"
            :column="column.raw"
            :record="record"
            @save="emit('save', $event)"
          />
          <template v-else>
            <WidgetRenderer
              v-for="(widget, widgetIndex) in column.widgets"
              :key="widget.id ?? `${rowIndex}-${colIndex}-${widgetIndex}`"
              :model="model"
              :widget="widget"
              :record="record"
              @save="emit('save', $event)"
            />
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.primary-row {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.primary-col {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1 1 0%;
  min-width: 0;
}

@media (min-width: 768px) {
  .primary-row {
    flex-direction: row;
  }
}
</style>
