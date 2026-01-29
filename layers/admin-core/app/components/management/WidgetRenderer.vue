<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import FieldsCard from './FieldsCard.vue'
import type { FieldsCardSpec } from './FieldsCard.vue'

export type WidgetSpec = FieldsCardSpec & {
  type: string
}

const props = defineProps<{
  model: string
  widget: WidgetSpec
  record?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (event: 'save', payload: { id?: string; values: Record<string, any>; fields: any[] }): void
}>()

const overrideCards = import.meta.glob('@/components/models/**/overrides/cards/*.vue')
const overrideCardContent = import.meta.glob('@/components/models/**/overrides/cards/*.content.vue')

const resolveOverride = (map: Record<string, unknown>, suffix: string) => {
  const match = Object.keys(map).find((key) => key.endsWith(suffix))
  if (!match) return null
  return defineAsyncComponent(map[match] as any)
}

const overrideCard = computed(() => {
  if (!props.model || !props.widget.id) return null
  return resolveOverride(overrideCards, `models/${props.model}/overrides/cards/${props.widget.id}.vue`)
})

const overrideContent = computed(() => {
  if (!props.model || !props.widget.id) return null
  return resolveOverride(
    overrideCardContent,
    `models/${props.model}/overrides/cards/${props.widget.id}.content.vue`
  )
})

const resolvedComponent = computed(() => {
  if (overrideCard.value) return overrideCard.value
  if (props.widget.type === 'fields-card') return FieldsCard
  return null
})
</script>

<template>
  <component
    v-if="resolvedComponent"
    :is="resolvedComponent"
    :model="model"
    :widget="widget"
    :content-component="overrideContent"
    :record="record"
    @save="emit('save', $event)"
  />
  <div v-else class="card">
    <div class="card-body">
      <p class="text-sm text-muted">Unknown widget type: {{ widget.type }}</p>
    </div>
  </div>
</template>
