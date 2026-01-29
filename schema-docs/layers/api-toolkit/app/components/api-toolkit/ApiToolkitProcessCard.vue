<script setup lang="ts">
import type { ApiToolkitProcessState } from '~/types/api-toolkit'

const props = withDefaults(defineProps<{
  title: string
  description?: string
  status?: ApiToolkitProcessState
  variant?: 'default' | 'compact'
}>(), {
  status: 'idle',
  variant: 'default',
})

const statusDotClass = computed(() => {
  if (props.status === 'success') return 'bg-emerald-500'
  if (props.status === 'error') return 'bg-rose-500'
  if (props.status === 'warning') return 'bg-amber-500'
  return 'bg-slate-300'
})

const isCompact = computed(() => props.variant === 'compact')
</script>

<template>
  <div class="card">
    <div :class="isCompact ? 'card-body flex items-start justify-between gap-4' : 'card-body space-y-3'">
      <div :class="isCompact ? 'space-y-2' : ''">
        <div class="flex items-center gap-2">
          <span class="h-2 w-2 rounded-full" :class="statusDotClass"></span>
          <div class="text-sm font-semibold">{{ title }}</div>
        </div>
        <p v-if="description" :class="isCompact ? 'text-sm text-muted' : 'text-xs text-muted mt-1'">
          {{ description }}
        </p>
        <div v-if="!isCompact && $slots.default" class="mt-3">
          <slot />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="isCompact && $slots.default" class="px-6 pb-4">
      <slot />
    </div>
  </div>
</template>
