<script setup lang="ts">
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue'
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

const selectionLabel = computed(() => {
  if (props.multiple) {
    const values = Array.isArray(selected.value) ? selected.value : []
    if (!values.length) return props.placeholder
    return values.map(resolveLabel).filter(Boolean).join(', ')
  }
  if (!selected.value) return props.placeholder
  return resolveLabel(selected.value) || props.placeholder
})

const wrapperRef = ref<HTMLDivElement | null>(null)
const optionsDirection = ref<'down' | 'up'>('down')
const optionsMaxHeight = ref(260)

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
    <Listbox v-model="selected" :multiple="multiple" :by="by">
      <div class="relative">
        <ListboxButton class="select select-sm w-full text-left ui-select-input" @click="schedulePlacement">
          <span class="block truncate">{{ selectionLabel }}</span>
        </ListboxButton>
        <span class="ui-select-chevron">
          <Icon name="chevron" :size="16" />
        </span>
      </div>
      <ListboxOptions
        :style="optionsStyle"
        class="ui-select-options"
      >
        <ListboxOption
          v-for="option in normalizedOptions"
          :key="String(option.value)"
          :value="option.value"
          v-slot="{ active, selected: optionSelected }"
        >
          <div
            class="cursor-pointer rounded px-3 py-2 text-sm"
            :class="{
              'bg-[var(--color-surface-muted)]': active,
              'font-semibold': optionSelected
            }"
          >
            {{ option.count !== undefined ? `${option.label} (${option.count})` : option.label }}
          </div>
        </ListboxOption>
      </ListboxOptions>
    </Listbox>
  </div>
</template>
