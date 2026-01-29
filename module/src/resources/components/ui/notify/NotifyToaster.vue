<script setup lang="ts">
import type { ToasterProps } from 'vue-sonner'
import { Toaster as Sonner } from 'vue-sonner'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    class="toaster group"
    v-bind="props"
    :style="{
      '--normal-bg': 'var(--color-surface)',
      '--normal-text': 'var(--color-text)',
      '--normal-border': 'var(--color-border)',
    }"
  />
</template>
