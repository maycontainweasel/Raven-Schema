<script setup lang="ts">
const route = useRoute()

definePageMeta({
  layout: 'demo',
  title: 'Users (Legacy)',
})

const target = computed(() => {
  const query = route.fullPath.includes('?') ? route.fullPath.slice(route.fullPath.indexOf('?')) : ''
  return `/demo/user/${route.params.id}${query}`
})

watchEffect(() => {
  navigateTo(target.value)
})
</script>

<template>
  <div class="page card">
    <p class="muted">Redirecting to dynamic model view…</p>
  </div>
</template>
