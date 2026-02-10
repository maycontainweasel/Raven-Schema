<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ACombobox, { type AComboboxOption } from './ACombobox.vue'

const model = defineModel<string | string[] | null>({ default: null })

const props = withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    helperText?: string
    errorText?: string
    multiple?: boolean
    grouped?: boolean
    highlightMatch?: boolean
    clearable?: boolean
    showIndicator?: boolean
    emptyText?: string
    disabled?: boolean
    minChars?: number
    search: (query: string) => Promise<AComboboxOption[]>
  }>(),
  {
    placeholder: '',
    helperText: '',
    errorText: '',
    multiple: false,
    grouped: false,
    highlightMatch: false,
    clearable: true,
    showIndicator: true,
    emptyText: 'No options found.',
    disabled: false,
    minChars: 2,
  },
)

const options = ref<AComboboxOption[]>([])
const loading = ref(false)
const query = ref('')
const lastRequestId = ref(0)

const onSearchInput = async (nextQuery: string) => {
  query.value = nextQuery
  const minChars = Math.max(0, Number(props.minChars || 0))
  if (nextQuery.length < minChars) {
    options.value = []
    loading.value = false
    return
  }

  const requestId = lastRequestId.value + 1
  lastRequestId.value = requestId
  loading.value = true

  try {
    const result = await props.search(nextQuery)
    if (lastRequestId.value !== requestId) return
    options.value = Array.isArray(result) ? result : []
  }
  catch {
    if (lastRequestId.value !== requestId) return
    options.value = []
  }
  finally {
    if (lastRequestId.value === requestId) loading.value = false
  }
}

watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) {
      options.value = []
      loading.value = false
    }
  },
)

const resolvedHelperText = computed(() => {
  if (loading.value) return 'Searching…'
  if (query.value.length < props.minChars) {
    return props.helperText || `Type at least ${props.minChars} characters to search.`
  }
  return props.helperText
})

const resolvedEmptyText = computed(() => {
  if (loading.value) return 'Searching…'
  if (query.value.length < props.minChars) {
    return `Type at least ${props.minChars} characters to search.`
  }
  return props.emptyText
})
</script>

<template>
  <ACombobox
    v-model="model"
    :label="label"
    :placeholder="placeholder"
    :helper-text="resolvedHelperText"
    :error-text="errorText"
    :options="options"
    :multiple="multiple"
    :grouped="grouped"
    :highlight-match="highlightMatch"
    :clearable="clearable"
    :show-indicator="showIndicator"
    :empty-text="resolvedEmptyText"
    :disabled="disabled"
    @input-value-change="onSearchInput"
  />
</template>
