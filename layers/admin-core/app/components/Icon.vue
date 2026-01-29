<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  { size: 18 }
)

  const icons: Record<string, string> = {
    dashboard: 'M3 3h7v7H3V3zm11 0h7v4h-7V3zm0 6h7v12h-7V9zM3 12h7v9H3v-9z',
    inbox: 'M4 4h16v9l-3 3h-3l-2 2h-4l-2-2H7l-3-3V4zm2 2v6l1.5 1.5h2.8l2 2h2.4l2-2h2.8L18 12V6H6z',
    communication: 'M5 5h14v9H8l-3 3V5zm8 10h6l3 3V8h-3',
    questions: 'M4 5h16v14H4V5zm3 3h8v2H7V8zm0 4h10v2H7v-2z',
    exams: 'M4 7l8-4 8 4-8 4-8-4zm0 4l8 4 8-4v6l-8 4-8-4v-6z',
    products: 'M6 4h12l2 5H4l2-5zm-1 7h14v9H5v-9zm4 2h6v5H9v-5z',
    sessions: 'M5 6h14v12H5V6zm3 2h8v2H8V8zm0 4h5v2H8v-2z',
    users: 'M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5H3zm10 0c.2-1.6 1.3-3 3-3 1.7 0 2.8 1.4 3 3h-6z',
    api: 'M4 7l8-4 8 4-8 4-8-4zm0 6l8 4 8-4',
    typesense: 'M4 6h6v6H4V6zm10 0h6v6h-6V6zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z',
    components: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
    announcement: 'M12 4a5 5 0 0 0-5 5v3l-2 2h14l-2-2V9a5 5 0 0 0-5-5zm-2 14a2 2 0 0 0 4 0',
    chevron: 'M6 9l6 6 6-6',
    menu: 'M4 7h16M4 12h16M4 17h16',
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM20 20l-3.5-3.5',
    'mail-open': 'M4 6h16v12H4zM4 8l8 5l8-5',
    reply: 'M9 10l-4 4l4 4M5 14h7a5 5 0 0 1 5 5v1',
    more: 'M5 12a1 1 0 1 0 0.01 0M12 12a1 1 0 1 0 0.01 0M19 12a1 1 0 1 0 0.01 0',
    close: 'M6 6l12 12M6 18L18 6',
    calendar: 'M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    refresh: 'M4 4v6h6M20 20v-6h-6M20 8a8 8 0 0 0-14.5-3M4 16a8 8 0 0 0 14.5 3',
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
    settings: 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zm8.5 4a7.9 7.9 0 0 0-.1-1l2-1.5-2-3.5-2.3.8a7.7 7.7 0 0 0-1.7-1L16 2h-4l-.4 2.8a7.7 7.7 0 0 0-1.7 1l-2.3-.8-2 3.5 2 1.5a7.9 7.9 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.3-.8a7.7 7.7 0 0 0 1.7 1L12 22h4l.4-2.8a7.7 7.7 0 0 0 1.7-1l2.3.8 2-3.5-2-1.5c.1-.3.1-.7.1-1z',
    sheet: 'M4 4h16v16H4V4zm3 3h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z',
    clipboard: 'M9 4h6v2h3v14H6V6h3V4zm2 2v1h2V6h-2z',
    globe: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zm0 2c1.7 0 3.1 2.4 3.5 5H8.5C8.9 7.4 10.3 5 12 5zm-4 7h8c-.4 2.6-1.8 5-4 5s-3.6-2.4-4-5z',
    upload: 'M12 3l4 4h-3v6h-2V7H8l4-4zm-6 12h12v4H6v-4z',
    shield: 'M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6l7-3z',
    link: 'M10 7h4v2h-4V7zm-3 3a3 3 0 0 1 3-3h2v2h-2a1 1 0 0 0 0 2h2v2h-2a3 3 0 0 1-3-3zm7-3h2a3 3 0 0 1 0 6h-2v-2h2a1 1 0 0 0 0-2h-2V7z',
    database: 'M4 6c0-2.2 4-4 8-4s8 1.8 8 4-4 4-8 4-8-1.8-8-4zm0 6c0 2.2 4 4 8 4s8-1.8 8-4M4 12v6c0 2.2 4 4 8 4s8-1.8 8-4v-6'
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
