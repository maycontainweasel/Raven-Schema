<script setup lang="ts">
import ACheckbox from './ACheckbox.vue'

type TodoVariant = 'simple' | 'fancy'

const model = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    label: string
    description?: string
    variant?: TodoVariant
    disabled?: boolean
  }>(),
  {
    description: '',
    variant: 'simple',
    disabled: false,
  },
)

const checkedState = computed<boolean>({
  get: () => model.value,
  set: (next) => {
    model.value = next === true
  },
})

const tone = computed(() => (props.variant === 'fancy' ? 'success' : 'neutral'))
const shape = computed(() => (props.variant === 'fancy' ? 'round' : 'square'))
</script>

<template>
  <ACheckbox
    v-model="checkedState"
    :label="props.label"
    :description="props.description"
    :tone="tone"
    :shape="shape"
    :strike-when-checked="true"
    :disabled="props.disabled"
  />
</template>
