<script setup lang="ts">
import { fieldComponentIds, fieldComponentRegistry } from '#layers/helios-admin/app/config/field-component-registry'

const search = ref('')
const activeFilter = ref<'all' | 'static' | 'async'>('all')

const cards = computed(() => {
  const query = search.value.trim().toLowerCase()
  return fieldComponentIds
    .map((id) => fieldComponentRegistry[id])
    .filter(Boolean)
    .filter((entry) => {
      if (activeFilter.value === 'static' && !entry.contract.supports.staticOptions) return false
      if (activeFilter.value === 'async' && !entry.contract.supports.asyncSearch) return false
      if (!query) return true
      return (
        entry.contract.id.toLowerCase().includes(query) ||
        entry.contract.title.toLowerCase().includes(query) ||
        entry.contract.description.toLowerCase().includes(query)
      )
    })
})
</script>

<template>
  <section class="a-grid">
    <header class="a-card a-card--hero components-hero">
      <div>
        <p class="a-eyebrow">Components</p>
        <h1 class="a-title">Field Contract Catalog</h1>
        <p class="a-copy">
          Canonical component API contracts for model layout specs. Each entry defines value shape, option requirements,
          and live examples used by the single-record runtime.
        </p>
      </div>
      <div class="components-hero__actions">
        <NuxtLink class="a-btn a-btn--subtle" to="/models">Back to Models</NuxtLink>
      </div>
    </header>

    <section class="a-card catalog-controls">
      <label class="a-field">
        <span class="a-field__label">Search Components</span>
        <div class="a-input-wrap">
          <AdminIcon name="search" :size="15" />
          <input
            v-model="search"
            class="a-input"
            type="text"
            placeholder="Search by component id or description..."
          >
        </div>
      </label>

      <div class="chip-row">
        <button
          class="a-chip chip-btn"
          :class="activeFilter === 'all' ? 'a-chip--brand' : ''"
          type="button"
          @click="activeFilter = 'all'"
        >
          All
        </button>
        <button
          class="a-chip chip-btn"
          :class="activeFilter === 'static' ? 'a-chip--brand' : ''"
          type="button"
          @click="activeFilter = 'static'"
        >
          Static Options
        </button>
        <button
          class="a-chip chip-btn"
          :class="activeFilter === 'async' ? 'a-chip--brand' : ''"
          type="button"
          @click="activeFilter = 'async'"
        >
          Async Search
        </button>
      </div>
    </section>

    <section class="catalog-grid">
      <article
        v-for="entry in cards"
        :key="entry.contract.id"
        class="a-card catalog-card"
      >
        <div class="catalog-card__head">
          <p class="a-eyebrow">{{ entry.contract.category }}</p>
          <span class="a-chip">{{ entry.contract.id }}</span>
        </div>

        <h2 class="catalog-card__title">{{ entry.contract.title }}</h2>
        <p class="a-copy">{{ entry.contract.description }}</p>

        <div class="catalog-card__meta">
          <span class="a-chip">Value: {{ entry.contract.valueShape }}</span>
          <span class="a-chip">{{ entry.examples.length }} examples</span>
        </div>

        <div class="catalog-card__actions">
          <NuxtLink class="a-btn a-btn--primary" :to="`/components/${entry.contract.id}`">
            Open Contract
          </NuxtLink>
        </div>
      </article>

      <article v-if="cards.length === 0" class="a-card">
        <p class="a-copy">No components match your filter.</p>
      </article>
    </section>
  </section>
</template>

<style scoped>
.components-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.catalog-controls {
  display: grid;
  gap: 0.65rem;
}

.chip-row {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.chip-btn {
  cursor: pointer;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.catalog-card {
  display: grid;
  gap: 0.55rem;
}

.catalog-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
}

.catalog-card__title {
  margin: 0;
  font-size: var(--fs-050, 1.16rem);
  letter-spacing: -0.01em;
}

.catalog-card__meta {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.catalog-card__actions {
  padding-top: 0.15rem;
}

@media (max-width: 1080px) {
  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .components-hero {
    flex-direction: column;
  }

  .catalog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
