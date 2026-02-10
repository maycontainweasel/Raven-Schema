<script setup lang="ts">
import type { AdminNavConfig, AdminNavItem, AdminNavSection } from '#helios-admin/app/types/admin-nav'

type NavApiResponse = {
  ok: boolean
  source: 'default' | 'fragment'
  config: AdminNavConfig
  files: {
    fragment: string
    generated: string
  }
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const slugify = (value: string, fallback: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || fallback
}

const saveState = ref<SaveState>('idle')
const notice = ref('')

const { data, pending, error, refresh } = await useFetch<NavApiResponse>('/api/admin/nav')
const editor = ref<AdminNavConfig | null>(null)

watch(
  () => data.value?.config,
  (next) => {
    editor.value = next ? clone(next) : null
    saveState.value = 'idle'
    notice.value = ''
  },
  { immediate: true },
)

const source = computed(() => data.value?.source ?? 'default')
const files = computed(() => data.value?.files ?? null)

const ensureItemChildren = (item: AdminNavItem) => {
  if (!Array.isArray(item.children)) item.children = []
  return item.children
}

const addSection = () => {
  if (!editor.value) return
  const nextIndex = editor.value.sections.length + 1
  editor.value.sections.push({
    id: `section-${nextIndex}`,
    label: `Section ${nextIndex}`,
    items: [],
  })
}

const removeSection = (index: number) => {
  if (!editor.value) return
  editor.value.sections.splice(index, 1)
}

const addItem = (section: AdminNavSection) => {
  const nextIndex = section.items.length + 1
  section.items.push({
    id: `item-${nextIndex}`,
    label: `Item ${nextIndex}`,
    to: '/',
    icon: 'layout',
    defaultOpen: false,
    children: [],
  })
}

const removeItem = (section: AdminNavSection, index: number) => {
  section.items.splice(index, 1)
}

const addChild = (item: AdminNavItem) => {
  const children = ensureItemChildren(item)
  const nextIndex = children.length + 1
  children.push({
    id: `${slugify(item.id, 'item')}-child-${nextIndex}`,
    label: `Child ${nextIndex}`,
    to: '/',
    icon: '',
    defaultOpen: false,
  })
}

const removeChild = (item: AdminNavItem, index: number) => {
  const children = ensureItemChildren(item)
  children.splice(index, 1)
}

const queryToText = (item: AdminNavItem) => {
  if (!item.query) return ''
  return Object.entries(item.query)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
}

const setQueryFromText = (item: AdminNavItem, raw: string) => {
  const text = String(raw || '').trim()
  if (!text.length) {
    delete item.query
    return
  }

  const parts = text
    .split('&')
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)

  const next: Record<string, string> = {}
  for (const part of parts) {
    const [key, ...rest] = part.split('=')
    const keySafe = String(key || '').trim()
    const valueSafe = String(rest.join('=') || '').trim()
    if (!keySafe || !valueSafe) continue
    next[keySafe] = valueSafe
  }

  if (!Object.keys(next).length) {
    delete item.query
    return
  }

  item.query = next
}

const normalizeItem = (item: AdminNavItem, fallbackPrefix: string, index: number): AdminNavItem => {
  item.id = slugify(item.id || item.label || `${fallbackPrefix}-${index + 1}`, `${fallbackPrefix}-${index + 1}`)
  item.label = String(item.label || item.id || `Item ${index + 1}`).trim() || `Item ${index + 1}`
  item.to = String(item.to || '').trim() || undefined
  item.icon = String(item.icon || '').trim() || undefined
  item.badge = String(item.badge || '').trim() || undefined
  item.defaultOpen = Boolean(item.defaultOpen)

  if (Array.isArray(item.children) && item.children.length) {
    item.children = item.children.map((child, childIndex) =>
      normalizeItem(child, `${item.id}-child`, childIndex),
    )
  }
  else {
    item.children = undefined
  }

  return item
}

const normalizeConfig = (config: AdminNavConfig): AdminNavConfig => {
  const sections = (config.sections || []).map((section, sectionIndex) => {
    section.id = slugify(section.id || section.label || `section-${sectionIndex + 1}`, `section-${sectionIndex + 1}`)
    section.label = String(section.label || section.id || `Section ${sectionIndex + 1}`).trim()
    section.items = (section.items || []).map((item, itemIndex) =>
      normalizeItem(item, `${section.id}-item`, itemIndex),
    )
    return section
  })

  return { sections }
}

const reload = async () => {
  await refresh()
}

const commit = async () => {
  if (!editor.value) return

  try {
    saveState.value = 'saving'
    notice.value = ''
    const payload = normalizeConfig(clone(editor.value))
    const response = await $fetch<{
      ok: boolean
      config: AdminNavConfig
      committedAt: string
      files: { fragment: string, generated: string }
    }>('/api/admin/nav', {
      method: 'POST',
      body: {
        config: payload,
      },
    })

    editor.value = clone(response.config)
    saveState.value = 'saved'
    notice.value = `Saved admin nav at ${new Date(response.committedAt).toLocaleTimeString()}.`
  }
  catch (commitError: any) {
    saveState.value = 'error'
    notice.value = commitError?.data?.statusMessage ?? commitError?.message ?? 'Failed to save nav config.'
  }
}
</script>

<template>
  <section class="a-grid">
    <header class="a-card a-card--hero menu-header">
      <div>
        <p class="a-eyebrow">Admin</p>
        <h1 class="a-title">Menu Manager</h1>
        <p class="a-copy">
          Manage the sidebar from a file-backed admin fragment. Configure labels, routes, query params,
          icons and hierarchy.
        </p>
      </div>

      <div class="menu-header__actions">
        <span class="a-chip">source: {{ source }}</span>
        <button class="a-btn a-btn--subtle" type="button" :disabled="pending || saveState === 'saving'" @click="reload">
          {{ pending ? 'Reloading…' : 'Reload' }}
        </button>
        <button class="a-btn a-btn--primary" type="button" :disabled="!editor || saveState === 'saving'" @click="commit">
          {{ saveState === 'saving' ? 'Saving…' : 'Commit Menu' }}
        </button>
      </div>
    </header>

    <p v-if="notice" class="builder-notice" :class="saveState === 'error' ? 'is-error' : ''">
      {{ notice }}
    </p>
    <p v-if="error" class="builder-notice is-error">Could not load admin menu config.</p>

    <article v-if="editor" class="a-card">
      <div class="panel-row">
        <h2 class="panel-title">Sections</h2>
        <button class="a-btn a-btn--subtle" type="button" @click="addSection">
          <AdminIcon name="plus" :size="14" />
          Section
        </button>
      </div>

      <div class="sections-stack smt-050">
        <section v-for="(section, sectionIndex) in editor.sections" :key="section.id || sectionIndex" class="section-editor">
          <div class="panel-row">
            <h3>Section {{ sectionIndex + 1 }}</h3>
            <button class="a-btn a-btn--ghost" type="button" @click="removeSection(sectionIndex)">
              Remove Section
            </button>
          </div>

          <div class="settings-fields">
            <label class="a-field">
              <span class="a-field__label">Section ID</span>
              <input v-model="section.id" class="a-input" type="text" placeholder="core">
            </label>
            <label class="a-field">
              <span class="a-field__label">Label</span>
              <input v-model="section.label" class="a-input" type="text" placeholder="Core">
            </label>
          </div>

          <div class="panel-row smt-050">
            <h4>Items</h4>
            <button class="a-btn a-btn--subtle" type="button" @click="addItem(section)">
              <AdminIcon name="plus" :size="14" />
              Item
            </button>
          </div>

          <div class="items-stack">
            <article v-for="(item, itemIndex) in section.items" :key="item.id || itemIndex" class="item-editor">
              <div class="panel-row">
                <h5>Item {{ itemIndex + 1 }}</h5>
                <div class="row-actions">
                  <button class="a-btn a-btn--subtle" type="button" @click="addChild(item)">
                    <AdminIcon name="plus" :size="14" />
                    Child
                  </button>
                  <button class="a-btn a-btn--ghost" type="button" @click="removeItem(section, itemIndex)">
                    Remove
                  </button>
                </div>
              </div>

              <div class="settings-fields">
                <label class="a-field">
                  <span class="a-field__label">Item ID</span>
                  <input v-model="item.id" class="a-input" type="text" placeholder="admin-models">
                </label>
                <label class="a-field">
                  <span class="a-field__label">Label</span>
                  <input v-model="item.label" class="a-input" type="text" placeholder="Models">
                </label>
                <label class="a-field">
                  <span class="a-field__label">Route</span>
                  <input v-model="item.to" class="a-input" type="text" placeholder="/models">
                </label>
                <label class="a-field">
                  <span class="a-field__label">Icon</span>
                  <input v-model="item.icon" class="a-input" type="text" placeholder="layout">
                </label>
                <label class="a-field">
                  <span class="a-field__label">Badge</span>
                  <input v-model="item.badge" class="a-input" type="text" placeholder="beta">
                </label>
                <label class="a-field">
                  <span class="a-field__label">Query Params</span>
                  <input
                    :value="queryToText(item)"
                    class="a-input"
                    type="text"
                    placeholder="tab=general&mode=advanced"
                    @input="setQueryFromText(item, ($event.target as HTMLInputElement).value)"
                  >
                </label>
                <label class="a-field inline-field">
                  <span class="a-field__label">Default Open</span>
                  <input v-model="item.defaultOpen" type="checkbox">
                </label>
              </div>

              <div v-if="item.children?.length" class="children-stack smt-050">
                <h6>Children</h6>
                <article v-for="(child, childIndex) in item.children" :key="child.id || childIndex" class="child-editor">
                  <div class="panel-row">
                    <p>Child {{ childIndex + 1 }}</p>
                    <button class="a-btn a-btn--ghost" type="button" @click="removeChild(item, childIndex)">
                      Remove
                    </button>
                  </div>

                  <div class="settings-fields">
                    <label class="a-field">
                      <span class="a-field__label">ID</span>
                      <input v-model="child.id" class="a-input" type="text" placeholder="admin-menu-manager">
                    </label>
                    <label class="a-field">
                      <span class="a-field__label">Label</span>
                      <input v-model="child.label" class="a-input" type="text" placeholder="Menu Manager">
                    </label>
                    <label class="a-field">
                      <span class="a-field__label">Route</span>
                      <input v-model="child.to" class="a-input" type="text" placeholder="/admin/menu-manager">
                    </label>
                    <label class="a-field">
                      <span class="a-field__label">Icon</span>
                      <input v-model="child.icon" class="a-input" type="text" placeholder="layout">
                    </label>
                    <label class="a-field">
                      <span class="a-field__label">Query Params</span>
                      <input
                        :value="queryToText(child)"
                        class="a-input"
                        type="text"
                        placeholder="tab=typesense"
                        @input="setQueryFromText(child, ($event.target as HTMLInputElement).value)"
                      >
                    </label>
                  </div>
                </article>
              </div>
            </article>
          </div>
        </section>
      </div>

      <div v-if="files" class="file-grid smt-075">
        <div class="file-item">
          <p class="a-eyebrow">Fragment</p>
          <code>{{ files.fragment }}</code>
        </div>
        <div class="file-item">
          <p class="a-eyebrow">Generated</p>
          <code>{{ files.generated }}</code>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.menu-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.menu-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.panel-title {
  margin: 0;
  font-size: var(--fs-025, 1.04rem);
  color: var(--admin-text);
  letter-spacing: -0.01em;
  font-weight: 600;
}

.panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.builder-notice {
  margin: 0;
  color: var(--admin-success);
  font-size: var(--fs--075, 0.86rem);
}

.builder-notice.is-error {
  color: var(--admin-danger);
}

.sections-stack,
.items-stack,
.children-stack {
  display: grid;
  gap: 0.62rem;
}

.section-editor,
.item-editor,
.child-editor {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: var(--admin-surface-muted);
  padding: 0.62rem;
  display: grid;
  gap: 0.52rem;
}

.settings-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.52rem;
}

.inline-field {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.62rem;
}

.inline-field input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.child-editor h6,
.item-editor h5,
.section-editor h3 {
  margin: 0;
  color: var(--admin-text);
}

.children-stack h6 {
  margin: 0;
  color: var(--admin-muted);
  text-transform: uppercase;
  letter-spacing: 0.11em;
  font-size: var(--fs--1, 0.74rem);
}

.file-grid {
  display: grid;
  gap: 0.42rem;
}

.file-item {
  display: grid;
  gap: 0.22rem;
}

.file-item code {
  display: block;
  font-size: var(--fs--1, 0.78rem);
  color: var(--admin-text-soft);
  background: var(--admin-surface-muted);
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-sm);
  padding: 0.42rem 0.52rem;
  overflow-wrap: anywhere;
}

@media (max-width: 1080px) {
  .settings-fields {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .menu-header {
    flex-direction: column;
  }
}
</style>

