<script setup lang="ts">
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption
} from '@headlessui/vue'
import Icon from '../../Icon.vue'

type AnyOption = any

const props = withDefaults(
  defineProps<{
    modelValue: AnyOption | AnyOption[] | null
    options: AnyOption[]
    multiple?: boolean
    placeholder?: string
    valueKey?: string
    labelKey?: string
    countKey?: string
    by?: string | ((a: any, b: any) => boolean)
    filterFn?: (option: AnyOption, query: string) => boolean
  }>(),
  {
    multiple: false,
    placeholder: 'Select...',
    valueKey: 'value',
    labelKey: 'label',
    countKey: 'count'
  }
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: AnyOption | AnyOption[] | null): void
}>()

const query = ref('')
const wrapperRef = ref<HTMLDivElement | null>(null)
const optionsDirection = ref<'down' | 'up'>('down')
const optionsMaxHeight = ref(260)

const selected = computed({
  get: () => props.modelValue ?? (props.multiple ? [] : null),
  set: (value) => emit('update:modelValue', value)
})

const normalizeOption = (option: AnyOption) => {
  const isObject = option !== null && typeof option === 'object'
  const value = isObject && props.valueKey in option ? option[props.valueKey] : option
  const label = isObject && props.labelKey in option ? option[props.labelKey] : String(value ?? '')
  const count = isObject && props.countKey in option ? option[props.countKey] : undefined
  return { raw: option, value, label, count }
}

const normalizedOptions = computed(() => (props.options ?? []).map(normalizeOption))

const resolveLabel = (value: any) => {
  const match = normalizedOptions.value.find((option) => option.value === value)
  if (!match) return ''
  return match.count !== undefined ? `${match.label} (${match.count})` : match.label
}

const displayValue = (value: any) => {
  return resolveLabel(value)
}

const selectedEntries = computed(() => {
  if (!props.multiple) return []
  const values = Array.isArray(selected.value) ? selected.value : []
  return values
    .map((value) => ({
      value,
      label: resolveLabel(value)
    }))
    .filter((entry) => entry.label)
})

const filteredOptions = computed(() => {
  if (!query.value) return normalizedOptions.value
  const q = query.value.toLowerCase()
  if (props.filterFn) {
    return normalizedOptions.value.filter((option) => props.filterFn?.(option.raw, query.value))
  }
  return normalizedOptions.value.filter((option) => option.label.toLowerCase().includes(q))
})

const removeSelected = (value: any) => {
  if (!props.multiple) return
  const values = Array.isArray(selected.value) ? [...selected.value] : []
  selected.value = values.filter((entry) => entry !== value)
}

const updatePlacement = () => {
  if (!wrapperRef.value || typeof window === 'undefined') return
  const rect = wrapperRef.value.getBoundingClientRect()
  const padding = 12
  const spaceBelow = window.innerHeight - rect.bottom - padding
  const spaceAbove = rect.top - padding
  const preferUp = spaceBelow < 240 && spaceAbove > spaceBelow
  optionsDirection.value = preferUp ? 'up' : 'down'
  const available = Math.max(140, preferUp ? spaceAbove : spaceBelow)
  optionsMaxHeight.value = Math.min(320, available)
}

const schedulePlacement = () => nextTick(updatePlacement)

const optionsStyle = computed(() => ({
  maxHeight: `${optionsMaxHeight.value}px`,
  ...(optionsDirection.value === 'up'
    ? { bottom: '100%', marginBottom: '0.5rem' }
    : { top: '100%', marginTop: '0.25rem' })
}))

onMounted(() => {
  if (typeof window === 'undefined') return
  updatePlacement()
  window.addEventListener('resize', updatePlacement)
  window.addEventListener('scroll', updatePlacement, true)
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('resize', updatePlacement)
  window.removeEventListener('scroll', updatePlacement, true)
})
</script>

<template>
  <div ref="wrapperRef" class="ui-select-shell">
    <Combobox v-model="selected" :multiple="multiple" :by="by">
      <div v-if="multiple && selectedEntries.length" class="mb-2 flex flex-wrap gap-1">
        <span v-for="entry in selectedEntries" :key="entry.label" class="badge badge-outline inline-flex items-center gap-1">
          <span>{{ entry.label }}</span>
          <button
            type="button"
            class="rounded-full p-0.5 text-muted hover:text-body"
            @click.stop="removeSelected(entry.value)"
          >
            <Icon name="close" :size="10" />
          </button>
        </span>
      </div>
      <div class="relative">
        <ComboboxInput
          class="input input-sm w-full ui-select-input"
          :displayValue="multiple ? undefined : displayValue"
          :placeholder="placeholder"
          @change="query = ($event.target as HTMLInputElement).value"
          @focus="schedulePlacement"
        />
        <ComboboxButton class="ui-select-chevron ui-select-chevron--button" @click="schedulePlacement">
          <Icon name="chevron" :size="16" />
        </ComboboxButton>
      </div>
      <ComboboxOptions
        :style="optionsStyle"
        class="ui-select-options"
      >
        <ComboboxOption
          v-for="option in filteredOptions"
          :key="String(option.value)"
          :value="option.value"
          v-slot="{ active, selected: optionSelected }"
        >
          <div
            class="cursor-pointer rounded px-3 py-2 text-sm"
            :class="{
              'bg-[var(--color-surface-muted)]': active || optionSelected,
              'font-semibold text-body': optionSelected
            }"
          >
            {{ option.count !== undefined ? `${option.label} (${option.count})` : option.label }}
          </div>
        </ComboboxOption>
        <div v-if="filteredOptions.length === 0" class="px-3 py-2 text-sm text-muted">
          No options found.
        </div>
      </ComboboxOptions>
    </Combobox>
  </div>
</template>
