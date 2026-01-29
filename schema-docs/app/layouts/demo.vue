<script setup lang="ts">
const route = useRoute()

const { data: modelList } = await useFetch<any[]>('/api/schema/models')
const navItems = computed(() => {
  const list = (modelList.value || []).filter((model: any) => model.hasTypesense)
  return [
    { label: 'Overview', to: '/demo' },
    { label: 'Controllers', to: '/controllers' },
    { label: 'Controller Tests', to: '/tests/controllers' },
    { label: 'Taxonomies', to: '/demo/taxonomies' },
    ...list.map((model: any) => ({
      label: model.label,
      to: `/demo/${model.modelKey}`,
    })),
  ]
})

const isActive = (path: string) => route.path === path || route.path.startsWith(`${path}/`)
</script>

<template>
  <div class="demo-layout">
    <aside class="demo-sidebar">
      <div class="stack">
        <div class="demo-brand">
          <div class="tag">SchemaDocs</div>
          <h2>Demo Admin</h2>
          <p class="muted">Canonical MPD admin patterns</p>
        </div>

        <nav class="demo-nav">
          <NuxtLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="demo-nav-link"
            :class="{ active: isActive(item.to) }"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <div class="panel">
          <strong>Notes</strong>
          <p class="muted">This area stays UI-light. The focus is the data flow.</p>
        </div>
      </div>
    </aside>

    <main class="demo-main">
      <slot />
    </main>
  </div>
</template>
