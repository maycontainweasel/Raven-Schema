<script setup lang="ts">
definePageMeta({
  layout: 'demo',
  title: 'Demo Admin',
})

const { data: models } = await useFetch<any[]>('/api/schema/models')
</script>

<template>
  <div class="page stack">
    <div class="surface page-hero">
      <div class="stack">
        <div class="badge">Demo Admin</div>
        <h1>MPD Schema Demo</h1>
        <p class="muted">
          This area shows the canonical admin UI pattern for each generated model.
          Keep it minimal, keep it functional, and keep it copy-ready.
        </p>
      </div>
    </div>

    <div class="grid grid-2">
      <NuxtLink
        v-for="model in (models || []).filter((item) => item.hasTypesense)"
        :key="model.modelKey"
        :to="`/demo/${model.modelKey}`"
        class="card demo-card"
      >
        <div class="stack">
          <h3>{{ model.label }}</h3>
          <p class="muted">{{ model.description || 'Schema-driven demo interface.' }}</p>
          <span class="btn outline small">Open demo</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
