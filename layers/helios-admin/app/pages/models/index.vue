<script setup lang="ts">
type ModelRow = {
  modelKey: string
  table: string
  label: string
  directoryRoute: string
  capabilities: string[]
  hasTypesense: boolean
  typesenseCollection: string | null
  canManage: boolean
  hasFragment: boolean
  hasGenerated: boolean
}

const search = ref('')

const { data, pending, error, refresh } = await useFetch('/api/models')

const rows = computed<ModelRow[]>(() => {
  const list = data.value?.models
  return Array.isArray(list) ? (list as ModelRow[]) : []
})

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return rows.value

  return rows.value.filter((row) => {
    return (
      row.modelKey.includes(query) ||
      row.table.includes(query) ||
      row.label.toLowerCase().includes(query) ||
      String(row.typesenseCollection ?? '').toLowerCase().includes(query) ||
      row.capabilities.join(',').toLowerCase().includes(query)
    )
  })
})

const eligibleCount = computed(() => rows.value.filter((row) => row.canManage).length)
const configuredCount = computed(() => rows.value.filter((row) => row.hasFragment).length)
</script>

<template>
  <section class="a-grid">
    <header class="a-card a-card--hero models-hero">
      <div>
        <p class="a-eyebrow">Models</p>
        <h1 class="a-title">Model Management</h1>
        <p class="a-copy">
          File-first model manager. YAML fragments are the source of truth for directory pages, create dialogs,
          and single-record management layouts.
        </p>
      </div>

      <div class="models-hero__meta">
        <span class="a-chip a-chip--brand">{{ eligibleCount }} eligible</span>
        <span class="a-chip">{{ configuredCount }} configured</span>
      </div>
    </header>

    <section class="a-card models-table-card">
      <div class="models-controls">
        <label class="a-field">
          <span class="a-field__label">Search Models</span>
          <div class="a-input-wrap">
            <AdminIcon name="search" :size="15" />
            <input
              v-model="search"
              class="a-input"
              type="text"
              placeholder="Search by model, table, capability or collection..."
            >
          </div>
        </label>

        <button class="a-btn a-btn--subtle" type="button" :disabled="pending" @click="refresh()">
          <AdminIcon name="refresh" :size="15" />
          {{ pending ? 'Refreshing…' : 'Reload Models' }}
        </button>
      </div>

      <p v-if="error" class="models-error">
        Could not load schema models. Check `apps/schema/config/graph.mpdg`.
      </p>

      <div class="a-table-wrap smt-050">
        <table class="a-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Table</th>
              <th>Capabilities</th>
              <th>Typesense</th>
              <th>Spec</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="row.modelKey">
              <td>
                <strong>{{ row.label }}</strong>
                <p class="table-muted">{{ row.modelKey }}</p>
              </td>
              <td><code>{{ row.table }}</code></td>
              <td>
                <span v-if="row.capabilities.length" class="caps-text">
                  {{ row.capabilities.join(', ') }}
                </span>
                <span v-else class="caps-text caps-text--muted">none</span>
              </td>
              <td>
                <span
                  class="a-status"
                  :class="row.hasTypesense ? 'a-status--published' : 'a-status--draft'"
                >
                  {{ row.hasTypesense ? (row.typesenseCollection || 'ready') : 'missing' }}
                </span>
              </td>
              <td>
                <span
                  class="a-status"
                  :class="row.hasFragment ? 'a-status--review' : 'a-status--draft'"
                >
                  {{ row.hasFragment ? 'present' : 'missing' }}
                </span>
              </td>
              <td class="text-right">
                <div class="row-actions">
                  <NuxtLink
                    class="a-btn a-btn--primary"
                    :to="`/models/${row.modelKey}`"
                  >
                    Manage
                  </NuxtLink>
                  <NuxtLink class="a-btn a-btn--subtle" :to="row.directoryRoute || `/admin/${row.modelKey}`">Open</NuxtLink>
                </div>
              </td>
            </tr>

            <tr v-if="!pending && filteredRows.length === 0">
              <td colspan="6" class="empty-row">No models match your search.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<style scoped>
.models-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.models-hero__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.models-table-card {
  display: grid;
  gap: 0.55rem;
}

.models-controls {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.55rem;
}

.models-controls .a-field {
  width: min(100%, 34rem);
}

.models-error {
  margin: 0;
  color: var(--admin-danger);
  font-size: var(--fs--075, 0.86rem);
}

.table-muted {
  margin: 0.12rem 0 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.caps-text {
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.8rem);
}

.caps-text--muted {
  color: var(--admin-muted);
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

@media (max-width: 960px) {
  .models-hero {
    flex-direction: column;
  }

  .models-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .models-controls .a-field {
    width: 100%;
  }
}
</style>
