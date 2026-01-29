<script setup lang="ts">
import { computed, ref } from 'vue'
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/vue'

export type TaxonomyChipOption = {
  id?: string
  slug?: string
  label?: string
  title?: string
}

const props = withDefaults(
  defineProps<{
    modelValue: TaxonomyChipOption[]
    options: TaxonomyChipOption[]
    placeholder?: string
    valueKey?: 'id' | 'slug'
    labelKey?: 'label' | 'title'
    allowCreate?: boolean
    editable?: boolean
  }>(),
  {
    modelValue: () => [],
    options: () => [],
    placeholder: 'Search or add terms…',
    valueKey: 'slug',
    labelKey: 'label',
    allowCreate: true,
    editable: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: TaxonomyChipOption[]]
  'create': [value: TaxonomyChipOption]
}>()

const query = ref('')

const selected = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value),
})

const getValue = (option: TaxonomyChipOption) => option?.[props.valueKey] || option?.id || option?.slug
const getLabel = (option: TaxonomyChipOption) => option?.[props.labelKey] || option?.label || option?.title || ''

const availableOptions = computed(() => {
  const selectedValues = new Set(selected.value.map(getValue))
  return props.options.filter(option => !selectedValues.has(getValue(option)))
})

const filteredOptions = computed(() => {
  const q = query.value.toLowerCase().trim()
  if (!q) return availableOptions.value
  return availableOptions.value.filter(option =>
    getLabel(option).toLowerCase().includes(q) || String(getValue(option) ?? '').toLowerCase().includes(q)
  )
})

const slugify = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '-')

const addFromQuery = () => {
  if (!props.allowCreate || !props.editable) return
  const value = query.value.trim()
  if (!value) return

  const slug = slugify(value)
  const existing = props.options.find(option => getValue(option) === slug)
  const tag = existing || { slug, label: value }

  if (!selected.value.some(option => getValue(option) === getValue(tag))) {
    selected.value = [...selected.value, tag]
  }
  emit('create', tag)
  query.value = ''
}

const removeChip = (value: TaxonomyChipOption) => {
  const toRemove = getValue(value)
  selected.value = selected.value.filter(option => getValue(option) !== toRemove)
}
</script>

<template>
  <div class="stack" style="gap: var(--space-3);">
    <div v-if="editable" class="combo">
      <Combobox v-model="selected" multiple>
        <ComboboxInput
          class="input"
          :placeholder="placeholder"
          :disabled="!editable"
          @change="query = ($event.target as HTMLInputElement).value"
          @keyup.enter.prevent="addFromQuery"
        />
        <ComboboxOptions class="combo-panel">
          <ComboboxOption
            v-for="option in filteredOptions"
            :key="String(getValue(option))"
            :value="option"
            v-slot="{ active }"
          >
            <div class="combo-option" :class="{ active }">
              {{ getLabel(option) }}
            </div>
          </ComboboxOption>
        </ComboboxOptions>
      </Combobox>
    </div>

    <div class="row" style="gap: var(--space-2);">
      <span v-if="selected.length === 0" class="tag tag-muted">No terms assigned</span>
      <span v-for="option in selected" :key="String(getValue(option))" class="tag">
        {{ getLabel(option) }}
        <button
          v-if="editable"
          type="button"
          class="btn ghost small"
          style="margin-left: 0.35rem; padding: 0 0.25rem; box-shadow: none;"
          @click="removeChip(option)"
        >
          ×
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.combo-panel {
  position: absolute;
  z-index: 20;
  width: 100%;
  max-height: 220px;
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  margin-top: 0.35rem;
}

.combo-option {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.combo-option.active {
  background: var(--accent-soft);
  color: var(--accent-2);
}
</style>
