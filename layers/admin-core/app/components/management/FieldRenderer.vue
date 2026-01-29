<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import UiListbox from '../ui/fields/UiListbox.vue'
import UiCombobox from '../ui/fields/UiCombobox.vue'
import UiDatePicker from '../ui/fields/UiDatePicker.vue'
import UiMiniWysiwyg from '../ui/fields/UiMiniWysiwyg.vue'
import TaxonomyManagerField from '../fields/TaxonomyManagerField.vue'

export type FieldSpec = {
  field: string
  key?: string
  path?: string
  class?: string
  model?: string
  target?: string
  type?:
    | 'text'
    | 'number'
    | 'textarea'
    | 'select'
    | 'listbox'
    | 'combobox'
    | 'date'
    | 'color'
    | 'taxonomy-manager'
    | 'wysiwyg'
  label?: string
  placeholder?: string
  hint?: string
  required?: boolean
  rows?: number
  options?: Array<any>
  multiple?: boolean
  valueKey?: string
  labelKey?: string
  countKey?: string
  by?: string | ((a: any, b: any) => boolean)
  filterFn?: (option: any, query: string) => boolean
  min?: number
  max?: number
  step?: number
  allowClear?: boolean
  displayFormat?: string
  props?: Record<string, any>
}

const props = defineProps<{
  model: string
  field: FieldSpec
  modelValue: any
  record?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | number): void
}>()

const overrideFields = import.meta.glob('@/components/models/**/overrides/fields/*.vue')

const resolveOverride = (suffix: string) => {
  const match = Object.keys(overrideFields).find((key) => key.endsWith(suffix))
  if (!match) return null
  return defineAsyncComponent(overrideFields[match] as any)
}

const overrideComponent = computed(() => {
  const fieldKey = props.field?.field
  if (!props.model || !fieldKey) return null
  return resolveOverride(`models/${props.model}/overrides/fields/${fieldKey}.vue`)
})

const inputType = computed(() => (props.field.type === 'number' ? 'number' : 'text'))

const inputProps = computed(() => props.field.props ?? {})

const fieldValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const updateValue = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  if (props.field.type === 'number') {
    const parsed = Number(target.value)
    emit('update:modelValue', Number.isNaN(parsed) ? target.value : parsed)
    return
  }
  emit('update:modelValue', target.value)
}

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

const recordInstances = computed(() => {
  const record = props.record ?? {}
  return (record as any).post?.instances ?? (record as any).instances ?? []
})

const recordId = computed(() => {
  const record = props.record ?? {}
  if ((record as any).qid !== undefined) return (record as any).qid
  return (record as any).id ?? null
})
</script>

<template>
  <component
    v-if="overrideComponent"
    :is="overrideComponent"
    :field="field"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <div v-else class="space-y-2">
    <label class="text-sm font-medium">
      {{ field.label ?? field.field }}
      <span v-if="field.required" class="text-error">*</span>
    </label>
    <UiDatePicker
      v-if="field.type === 'date'"
      :model-value="modelValue"
      :placeholder="field.placeholder"
      :display-format="field.displayFormat"
      :allow-clear="field.allowClear"
      @update:model-value="emit('update:modelValue', $event)"
      v-bind="inputProps"
    />
    <textarea
      v-if="field.type === 'textarea'"
      class="textarea textarea-bordered w-full"
      :placeholder="field.placeholder"
      :rows="field.rows ?? 4"
      :value="modelValue"
      @input="updateValue"
      v-bind="inputProps"
    />
    <select
      v-else-if="field.type === 'select'"
      class="select select-bordered w-full"
      :value="modelValue"
      @change="updateValue"
      v-bind="inputProps"
    >
      <option v-if="field.placeholder" disabled value="">
        {{ field.placeholder }}
      </option>
      <option
        v-for="option in field.options ?? []"
        :key="String((option && option.value) ?? option)"
        :value="(option && option.value) ?? option"
      >
        {{ (option && option.label) ?? String((option && option.value) ?? option) }}
      </option>
    </select>
    <UiListbox
      v-else-if="field.type === 'listbox'"
      v-model="fieldValue"
      :options="field.options ?? []"
      :multiple="field.multiple"
      :placeholder="field.placeholder"
      :value-key="field.valueKey"
      :label-key="field.labelKey"
      :count-key="field.countKey"
      :by="field.by"
      v-bind="inputProps"
    />
    <UiCombobox
      v-else-if="field.type === 'combobox'"
      v-model="fieldValue"
      :options="field.options ?? []"
      :multiple="field.multiple"
      :placeholder="field.placeholder"
      :value-key="field.valueKey"
      :label-key="field.labelKey"
      :count-key="field.countKey"
      :by="field.by"
      :filter-fn="field.filterFn"
      v-bind="inputProps"
    />
    <UiMiniWysiwyg
      v-else-if="field.type === 'wysiwyg'"
      :model-value="modelValue"
      :placeholder="field.placeholder"
      v-bind="inputProps"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <TaxonomyManagerField
      v-else-if="field.type === 'taxonomy-manager'"
      :record-id="recordId"
      :instances="recordInstances"
      :model-key="model"
      v-bind="inputProps"
    />
    <div v-else-if="field.type === 'color'" class="flex items-center gap-2">
      <input type="color" :value="modelValue" @input="updateValue" v-bind="inputProps" />
      <input
        class="input input-bordered w-full"
        type="text"
        :placeholder="field.placeholder"
        :value="modelValue"
        @input="updateValue"
        v-bind="inputProps"
      />
    </div>
    <input
      v-else
      class="input input-bordered w-full"
      :type="inputType"
      :placeholder="field.placeholder"
      :value="modelValue"
      @input="updateValue"
      :min="field.min"
      :max="field.max"
      :step="field.step"
      v-bind="inputProps"
    />
    <p v-if="field.hint" class="text-xs text-muted">{{ field.hint }}</p>
  </div>
</template>
