<script setup lang="ts">
import type { ApiToolkitBadge } from '~/types/api-toolkit'

const props = defineProps<{
  title?: string
  subtitle?: string
  icon?: string
  badge?: ApiToolkitBadge | null
}>()

const badgeClass = computed(() => {
  const variant = props.badge?.variant ?? 'outline'
  if (variant === 'success') return 'badge badge-success'
  if (variant === 'error') return 'badge badge-error'
  if (variant === 'warning') return 'badge badge-warning'
  if (variant === 'info') return 'badge badge-info'
  if (variant === 'ghost') return 'badge badge-ghost'
  return 'badge badge-outline'
})
</script>

<template>
  <div class="border-b border-[var(--color-border)] px-6 py-4">
    <div v-if="title" class="space-y-1">
      <div class="flex items-center gap-2">
        <Icon v-if="icon" :name="icon" />
        <h2 class="text-lg font-semibold">{{ title }}</h2>
        <span v-if="badge" :class="badgeClass" class="uppercase text-[10px]">
          {{ badge.label }}
        </span>
      </div>
      <p v-if="subtitle" class="text-sm text-muted">{{ subtitle }}</p>
    </div>
    <div v-else class="text-sm text-muted">
      <slot />
    </div>
  </div>
</template>
