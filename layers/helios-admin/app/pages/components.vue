<script setup lang="ts">
const selectedTone = ref<'brand' | 'success' | 'warning' | 'danger'>('brand')
const searchValue = ref('')
const role = ref('editor')
const note = ref('')
const enabled = ref(true)

const toneOptions = [
  { id: 'brand', label: 'Brand' },
  { id: 'success', label: 'Success' },
  { id: 'warning', label: 'Warning' },
  { id: 'danger', label: 'Danger' },
] as const

const fieldCards = [
  {
    id: 'inputs',
    title: 'Inputs',
    description: 'Base text, search, select, textarea, and helper patterns.',
  },
  {
    id: 'actions',
    title: 'Actions',
    description: 'Primary, secondary, ghost, and icon-level button patterns.',
  },
  {
    id: 'feedback',
    title: 'Feedback',
    description: 'Status chips and state pills for directory and detail pages.',
  },
]

const statusTone = computed(() => {
  if (selectedTone.value === 'success') return 'published'
  if (selectedTone.value === 'warning') return 'draft'
  if (selectedTone.value === 'danger') return 'draft'
  return 'review'
})
</script>

<template>
  <section class="a-grid">
    <header class="a-card a-card--hero components-hero">
      <div>
        <p class="a-eyebrow">Components</p>
        <h1 class="a-title">UI Workshop</h1>
        <p class="a-copy">
          Living component catalogue for the admin shell. We will evolve these primitives into generated field templates.
        </p>
      </div>
      <div class="components-hero__actions">
        <NuxtLink class="a-btn a-btn--subtle" to="/fields">Open Fields Lab</NuxtLink>
        <NuxtLink class="a-btn a-btn--primary" to="/models">Back to Models</NuxtLink>
      </div>
    </header>

    <div class="components-grid">
      <article class="a-card">
        <h2 class="components-title">Buttons</h2>
        <p class="a-copy">Snappy actions with subtle ripple and consistent radii.</p>

        <div class="button-row">
          <button class="a-btn a-btn--primary" type="button">Primary Action</button>
          <button class="a-btn a-btn--subtle" type="button">Secondary Action</button>
          <button class="a-btn a-btn--ghost" type="button">Ghost Action</button>
          <button class="a-btn a-btn--ghost" type="button" aria-label="Icon only">
            <AdminIcon name="settings" :size="16" />
          </button>
        </div>

        <div class="button-row smt-050">
          <span class="a-chip">Default chip</span>
          <span class="a-chip a-chip--brand">Brand chip</span>
          <span class="a-chip a-chip--success">Success chip</span>
          <span class="a-chip a-chip--warning">Warning chip</span>
          <span class="a-chip a-chip--danger">Danger chip</span>
        </div>
      </article>

      <article class="a-card">
        <h2 class="components-title">Fields</h2>
        <p class="a-copy">Opinionated field shell inspired by the Tark-style clean input language.</p>

        <div class="field-stack">
          <label class="a-field">
            <span class="a-field__label">Search</span>
            <div class="a-input-wrap">
              <AdminIcon name="search" :size="15" />
              <input v-model="searchValue" class="a-input" type="text" placeholder="Search components...">
            </div>
          </label>

          <div class="field-grid">
            <label class="a-field">
              <span class="a-field__label">Role</span>
              <select v-model="role" class="a-select">
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="moderator">Moderator</option>
              </select>
            </label>
            <label class="a-field">
              <span class="a-field__label">Variant tone</span>
              <select v-model="selectedTone" class="a-select">
                <option v-for="option in toneOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <label class="a-field">
            <span class="a-field__label">Component notes</span>
            <textarea v-model="note" class="a-textarea" placeholder="Add implementation notes" />
          </label>

          <label class="inline-toggle">
            <input v-model="enabled" type="checkbox">
            <span>Enable live preview state</span>
          </label>
        </div>
      </article>
    </div>

    <section class="a-card">
      <div class="components-row-header">
        <h2 class="components-title">Blueprint Cards</h2>
        <span class="a-chip a-chip--brand">Ready for expansion</span>
      </div>

      <div class="blueprint-grid">
        <article v-for="item in fieldCards" :key="item.id" class="blueprint-card">
          <p class="a-eyebrow">{{ item.id }}</p>
          <p class="blueprint-card__title">{{ item.title }}</p>
          <p class="a-copy">{{ item.description }}</p>
          <div class="blueprint-card__footer">
            <span class="a-status" :class="`a-status--${statusTone}`">
              {{ selectedTone }}
            </span>
            <button class="a-btn a-btn--ghost" type="button">
              Configure
            </button>
          </div>
        </article>
      </div>
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

.components-hero__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.components-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.components-title {
  margin: 0;
  font-size: var(--fs-050, 1.15rem);
  color: var(--admin-text);
  letter-spacing: -0.01em;
  font-weight:500;
}

.button-row {
  margin-top: 0.72rem;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.field-stack {
  margin-top: 0.72rem;
  display: grid;
  gap: 0.58rem;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.52rem;
}

.inline-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  font-size: var(--fs--075, 0.86rem);
  color: var(--admin-text-soft);
  font-weight: 600;
}

.inline-toggle input {
  width: 0.96rem;
  height: 0.96rem;
}

.components-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.blueprint-grid {
  margin-top: 0.72rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
}

.blueprint-card {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: color-mix(in srgb, var(--admin-surface) 95%, white 5%);
  padding: 0.72rem;
  display: grid;
  gap: 0.32rem;
}

.blueprint-card__title {
  margin: 0;
  font-size: var(--fs-025, 1.02rem);
  font-weight: 600;
  color: var(--admin-text);
}

.blueprint-card__footer {
  margin-top: 0.28rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}

@media (max-width: 980px) {
  .components-grid,
  .blueprint-grid {
    grid-template-columns: 1fr;
  }

  .components-hero {
    flex-direction: column;
  }
}

@media (max-width: 760px) {
  .field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
