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
    editable: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: TaxonomyChipOption[]]
  'create': [value: TaxonomyChipOption]
}>()

const query = ref('')

const selected = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
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
  <div class="space-y-3">
    <div v-if="editable" class="relative">
      <Combobox v-model="selected" multiple>
        <ComboboxInput
          class="input input-sm w-full"
          :placeholder="placeholder"
          :disabled="!editable"
          @change="query = ($event.target as HTMLInputElement).value"
          @keyup.enter.prevent="addFromQuery"
        />
        <ComboboxOptions
          class="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg"
        >
          <ComboboxOption
            v-for="option in filteredOptions"
            :key="String(getValue(option))"
            :value="option"
            v-slot="{ active }"
          >
            <div
              class="cursor-pointer rounded px-3 py-2 text-sm"
              :class="{ 'bg-[var(--color-surface-muted)]': active }"
            >
              {{ getLabel(option) }}
            </div>
          </ComboboxOption>
          <div v-if="filteredOptions.length === 0" class="px-3 py-2 text-sm text-muted">
            No options found.
          </div>
        </ComboboxOptions>
      </Combobox>
    </div>

    <div class="flex flex-wrap gap-2">
      <span v-if="selected.length === 0" class="badge badge-outline text-muted">No terms assigned</span>
      <span v-for="option in selected" :key="String(getValue(option))" class="badge badge-outline">
        {{ getLabel(option) }}
        <button
          v-if="editable"
          type="button"
          class="ml-2 text-muted hover:text-[var(--color-text)]"
          @click="removeChip(option)"
        >
          ×
        </button>
      </span>
    </div>
  </div>
</template>
