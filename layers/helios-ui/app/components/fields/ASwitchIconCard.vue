<script setup lang="ts">
import ASwitchCard from './ASwitchCard.vue'

const model = defineModel<boolean>({ default: false })

const props = withDefaults(
  defineProps<{
    label: string
    sublabel?: string
    description?: string
    iconClass?: string
    disabled?: boolean
  }>(),
  {
    sublabel: '',
    description: '',
    iconClass: 'i-lucide-credit-card',
    disabled: false,
  },
)
</script>

<template>
  <div class="a-switch-icon-card">
    <div class="a-switch-icon-card__icon-wrap">
      <i :class="[props.iconClass, 'h-5 w-5 text-white']" aria-hidden="true" />
    </div>

    <ASwitchCard
      v-model="model"
      class="a-switch-icon-card__switch"
      :label="props.label"
      :sublabel="props.sublabel"
      :description="props.description"
      :disabled="props.disabled"
    />
  </div>
</template>

<style scoped>
.a-switch-icon-card {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.6rem;
  align-items: start;
}

.a-switch-icon-card__icon-wrap {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 0.6rem;
  background: linear-gradient(135deg, #fb923c, #ef4444);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.a-switch-icon-card__switch :deep(.a-switch-card) {
  min-height: 100%;
}
</style>
