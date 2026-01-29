<script setup lang="ts">
import type { ApiToolkitNavItem } from '~/types/api-toolkit'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  items: ApiToolkitNavItem[]
  modelValue?: string
}>(), {
  modelValue: '',
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const isActive = (itemId: string) => props.modelValue === itemId

const selectItem = (itemId: string) => {
  if (props.modelValue === itemId) return
  emit('update:modelValue', itemId)
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="border-b border-[var(--color-border)] px-4 py-4">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <p v-if="subtitle" class="text-sm text-muted">{{ subtitle }}</p>
      <div v-if="$slots.top" class="mt-4">
        <slot name="top" />
      </div>
    </div>

    <div class="flex-1 space-y-2 overflow-y-auto px-4 py-4">
      <button
        v-for="item in items"
        :key="item.id"
        class="w-full rounded-md border px-3 py-3 text-left transition"
        :class="isActive(item.id)
          ? 'border-[var(--color-primary)] bg-[var(--color-surface-muted)]'
          : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]'"
        @click="selectItem(item.id)"
      >
        <div class="flex items-center gap-3">
          <Icon v-if="item.icon" :name="item.icon" />
          <div class="flex-1">
            <div class="text-sm font-semibold">{{ item.label }}</div>
            <div v-if="item.description" class="text-xs text-muted">{{ item.description }}</div>
          </div>
        </div>
      </button>
    </div>

    <div v-if="$slots.footer" class="border-t border-[var(--color-border)] px-4 py-4 text-xs text-muted">
      <slot name="footer" />
    </div>
  </div>
</template>
