<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  { size: 18 }
)

const icons: Record<string, string> = {
  chevron: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M6 18L18 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  settings: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zm8.5 4a7.9 7.9 0 0 0-.1-1l2-1.5-2-3.5-2.3.8a7.7 7.7 0 0 0-1.7-1L16 2h-4l-.4 2.8a7.7 7.7 0 0 0-1.7 1l-2.3-.8-2 3.5 2 1.5a7.9 7.9 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.3-.8a7.7 7.7 0 0 0 1.7 1L12 22h4l.4-2.8a7.7 7.7 0 0 0 1.7-1l2.3.8 2-3.5-2-1.5c.1-.3.1-.7.1-1z',
  clipboard: 'M9 4h6v2h3v14H6V6h3V4zm2 2v1h2V6h-2z',
}

const path = computed(() => icons[props.name] ?? icons.menu)
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
