<script setup lang="ts">
const route = useRoute()
const model = String(route.params.model ?? '').trim().toLowerCase()
await navigateTo(`/models/${model}`, { replace: true })
</script>

<template>
  <div />
</template>
