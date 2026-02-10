<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  { size: 18 },
)

const icons: Record<string, string> = {
  dashboard: 'M3 3h7v7H3V3zm11 0h7v4h-7V3zm0 6h7v12h-7V9zM3 12h7v9H3v-9z',
  layout: 'M3 4h18v4H3V4zm0 6h8v10H3V10zm10 0h8v4h-8v-4zm0 6h8v4h-8v-4z',
  users: 'M8 10a3 3 0 1 0 0-6a3 3 0 0 0 0 6zm8 3a3 3 0 1 0 0-6a3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5H3zm10 0c.2-1.6 1.3-3 3-3 1.7 0 2.8 1.4 3 3h-6z',
  sheet: 'M4 4h16v16H4V4zm3 3h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z',
  database: 'M4 6c0-2.2 4-4 8-4s8 1.8 8 4-4 4-8 4-8-1.8-8-4zm0 6c0 2.2 4 4 8 4s8-1.8 8-4M4 12v6c0 2.2 4 4 8 4s8-1.8 8-4v-6',
  layers: 'M12 3l9 5-9 5-9-5 9-5zm9 9-9 5-9-5m18 6-9 5-9-5',
  components: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  palette: 'M12 3c-5 0-9 4-9 9s4 9 9 9c1.4 0 2.5-.9 2.5-2.1c0-.5-.2-1-.5-1.4c-.3-.5-.5-.9-.5-1.5c0-1.1.9-2 2-2h2c2.2 0 4-1.8 4-4c0-3.9-3.6-7-8-7zm-4 9a1.2 1.2 0 1 1 0-2.4A1.2 1.2 0 0 1 8 12zm3-4a1.2 1.2 0 1 1 0-2.4a1.2 1.2 0 0 1 0 2.4zm5 0a1.2 1.2 0 1 1 0-2.4a1.2 1.2 0 0 1 0 2.4zm3 4a1.2 1.2 0 1 1 0-2.4a1.2 1.2 0 0 1 0 2.4z',
  chevron: 'M6 9l6 6l6-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM20 20l-3.5-3.5',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M6 18L18 6',
  grid: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
  help: 'M12 18h.01M9.1 9.2a2.9 2.9 0 1 1 5.3 1.4c-.6.8-1.3 1.2-1.8 1.7-.4.3-.6.8-.6 1.7',
  bell: 'M15 17h5l-1.3-1.2A2 2 0 0 1 18 14.4V11a6 6 0 1 0-12 0v3.4c0 .6-.2 1.1-.7 1.5L4 17h5m3 0v1a2 2 0 1 1-4 0v-1m4 0H8',
  folder: 'M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z',
  calendar: 'M7 2v3m10-3v3M4 8h16M5 5h14a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2z',
  report: 'M4 20h16M7 16V9m5 7V6m5 10v-4',
  settings: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zm8.5 4c0-.3 0-.7-.1-1l2-1.5l-2-3.5l-2.3.8a8 8 0 0 0-1.7-1L16 2h-4l-.4 2.8a8 8 0 0 0-1.7 1l-2.3-.8l-2 3.5l2 1.5c-.1.3-.1.7-.1 1s0 .7.1 1l-2 1.5l2 3.5l2.3-.8a8 8 0 0 0 1.7 1L12 22h4l.4-2.8a8 8 0 0 0 1.7-1l2.3.8l2-3.5l-2-1.5c.1-.3.1-.7.1-1z',
  logout: 'M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 16l4-4l-4-4M18 12H9',
  login: 'M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4l4-4M6 12h9',
  refresh: 'M20 11a8 8 0 1 0 2 5.3M20 11V4m0 7h-7',
}

const path = computed(() => icons[props.name] ?? icons.dashboard)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="path" />
  </svg>
</template>
