<script setup lang="ts">
import { computed, ref } from 'vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'

type ATreeNode = {
  id: string
  label: string
  children?: ATreeNode[]
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    modelValue: ATreeNode[]
    checkedIds?: string[]
    taxonomyLabel?: string
    title?: string
    description?: string
    buttonLabel?: string
    draggable?: boolean
    checkable?: boolean
    treeLine?: boolean
    createButtonLabel?: string
  }>(),
  {
    checkedIds: () => [],
    taxonomyLabel: 'Taxonomy',
    title: 'Taxonomy Manager',
    description: 'Create, reorder and select taxonomy terms.',
    buttonLabel: 'Manage taxonomy',
    draggable: true,
    checkable: true,
    treeLine: true,
    createButtonLabel: 'Create term',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: ATreeNode[]): void
  (event: 'update:checkedIds', value: string[]): void
}>()

const open = ref(false)
const treeRef = ref<{ addNode: (node: ATreeNode, parentId?: string | null) => unknown } | null>(null)
const draftLabel = ref('')
const draftParentId = ref('')
const createError = ref('')

const terms = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value),
})

const selectedIds = computed({
  get: () => props.checkedIds || [],
  set: (value) => emit('update:checkedIds', value),
})

const flattenedNodes = computed(() => {
  const items: Array<{ id: string; label: string; depth: number }> = []

  const walk = (nodes: ATreeNode[], depth: number) => {
    for (const node of nodes) {
      items.push({
        id: String(node.id),
        label: String(node.label || 'Untitled'),
        depth,
      })
      const children = Array.isArray(node.children) ? node.children : []
      if (children.length) walk(children, depth + 1)
    }
  }

  walk(terms.value, 0)
  return items
})

const selectedSummary = computed(() => {
  const selected = new Set(selectedIds.value.map((entry) => String(entry)))
  return flattenedNodes.value.filter((entry) => selected.has(entry.id))
})

const slugify = (value: string) => {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleaned || 'term'
}

const makeTermId = (label: string) => {
  return `${slugify(label)}-${Math.random().toString(36).slice(2, 8)}`
}

const createTerm = () => {
  createError.value = ''
  const label = draftLabel.value.trim()
  if (!label) {
    createError.value = 'Term label is required.'
    return
  }

  const node: ATreeNode = {
    id: makeTermId(label),
    label,
    children: [],
  }

  treeRef.value?.addNode(node, draftParentId.value || null)
  draftLabel.value = ''
}

const closeModal = () => {
  open.value = false
  createError.value = ''
}
</script>

<template>
  <section class="a-taxonomy">
    <div class="a-taxonomy__intro">
      <div>
        <h3 class="a-taxonomy__title">{{ title }}</h3>
        <p class="a-taxonomy__copy">{{ description }}</p>
      </div>
      <button class="a-btn a-btn--primary" type="button" @click="open = true">
        {{ buttonLabel }}
      </button>
    </div>

    <p class="a-taxonomy__meta">
      Selected terms: <strong>{{ selectedIds.length }}</strong>
    </p>

    <Dialog :open="open" class="a-taxonomy-dialog-root" @close="closeModal">
      <div class="a-taxonomy-dialog-backdrop" aria-hidden="true" />

      <div class="a-taxonomy-dialog-wrap">
        <DialogPanel class="a-taxonomy-dialog">
          <header class="a-taxonomy-dialog__header">
            <div>
              <DialogTitle class="a-taxonomy-dialog__title">
                Manage {{ taxonomyLabel }}
              </DialogTitle>
              <p class="a-taxonomy-dialog__subtitle">
                Use the tree to select terms for this record and drag to reorder hierarchy.
              </p>
            </div>
            <button class="a-btn a-btn--subtle" type="button" @click="closeModal">
              Close
            </button>
          </header>

          <div class="a-taxonomy-dialog__body">
            <section class="a-taxonomy-dialog__tree">
              <ATree
                ref="treeRef"
                v-model="terms"
                :checked-ids="selectedIds"
                :draggable="draggable"
                :checkable="checkable"
                :tree-line="treeLine"
                @update:checked-ids="selectedIds = $event"
              />
            </section>

            <aside class="a-taxonomy-dialog__sidebar">
              <div class="a-taxonomy-dialog__card">
                <h4>Create Term</h4>
                <label class="a-field">
                  <span class="a-field__label">Label</span>
                  <input
                    v-model="draftLabel"
                    class="a-input"
                    type="text"
                    placeholder="e.g. SUV"
                    @keydown.enter.prevent="createTerm"
                  >
                </label>
                <label class="a-field">
                  <span class="a-field__label">Parent</span>
                  <select v-model="draftParentId" class="a-select">
                    <option value="">No parent (root)</option>
                    <option
                      v-for="item in flattenedNodes"
                      :key="item.id"
                      :value="item.id"
                    >
                      {{ `${'  '.repeat(item.depth)}${item.label}` }}
                    </option>
                  </select>
                </label>

                <p v-if="createError" class="a-taxonomy-dialog__error">{{ createError }}</p>

                <button class="a-btn a-btn--primary" type="button" @click="createTerm">
                  {{ createButtonLabel }}
                </button>
              </div>

              <div class="a-taxonomy-dialog__card">
                <h4>Current Selection</h4>
                <ul v-if="selectedSummary.length" class="a-taxonomy-dialog__selection-list">
                  <li v-for="item in selectedSummary" :key="item.id">
                    {{ item.label }}
                  </li>
                </ul>
                <p v-else class="a-taxonomy-dialog__muted">
                  No terms selected yet.
                </p>
              </div>
            </aside>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  </section>
</template>

<style scoped>
.a-taxonomy {
  display: grid;
  gap: 0.5rem;
}

.a-taxonomy__intro {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.6rem;
}

.a-taxonomy__title {
  margin: 0;
  font-size: var(--fs-1, 1.08rem);
  color: var(--admin-text);
}

.a-taxonomy__copy {
  margin: 0.22rem 0 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--075, 0.86rem);
}

.a-taxonomy__meta {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-taxonomy-dialog-root {
  position: fixed;
  inset: 0;
  z-index: 1800;
}

.a-taxonomy-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 18, 34, 0.55);
}

.a-taxonomy-dialog-wrap {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 1.2rem;
}

.a-taxonomy-dialog {
  width: min(70vw, 76rem);
  max-width: 100%;
  height: min(86vh, 52rem);
  border-radius: var(--admin-radius-lg);
  border: 1px solid var(--admin-border-strong);
  background: var(--admin-surface);
  box-shadow: 0 26px 70px rgba(6, 14, 30, 0.4);
  display: grid;
  grid-template-rows: auto 1fr;
}

.a-taxonomy-dialog__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.72rem;
  padding: 0.92rem 0.98rem;
  border-bottom: 1px solid var(--admin-border);
}

.a-taxonomy-dialog__title {
  margin: 0;
  font-size: var(--fs-2, 1.2rem);
  color: var(--admin-text);
}

.a-taxonomy-dialog__subtitle {
  margin: 0.3rem 0 0;
  color: var(--admin-text-soft);
  font-size: var(--fs--075, 0.86rem);
}

.a-taxonomy-dialog__body {
  display: grid;
  grid-template-columns: minmax(0, 60%) minmax(20rem, 40%);
  gap: 0.8rem;
  padding: 0.82rem;
  overflow: hidden;
}

.a-taxonomy-dialog__tree {
  min-width: 0;
}

.a-taxonomy-dialog__sidebar {
  min-width: 0;
  display: grid;
  gap: 0.62rem;
  align-content: start;
  overflow: auto;
}

.a-taxonomy-dialog__card {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  background: color-mix(in srgb, var(--admin-surface) 94%, white 6%);
  padding: 0.68rem;
  display: grid;
  gap: 0.5rem;
}

.a-taxonomy-dialog__card h4 {
  margin: 0;
  font-size: var(--fs-0, 0.95rem);
  color: var(--admin-text);
}

.a-taxonomy-dialog__selection-list {
  margin: 0;
  padding: 0 0 0 1rem;
  display: grid;
  gap: 0.25rem;
  color: var(--admin-text-soft);
  font-size: var(--fs--1, 0.78rem);
}

.a-taxonomy-dialog__muted {
  margin: 0;
  color: var(--admin-muted);
  font-size: var(--fs--1, 0.78rem);
}

.a-taxonomy-dialog__error {
  margin: 0;
  color: #b42318;
  font-size: var(--fs--1, 0.78rem);
}

@media (max-width: 1080px) {
  .a-taxonomy-dialog {
    width: min(96vw, 96vw);
    height: min(92vh, 92vh);
  }

  .a-taxonomy-dialog__body {
    grid-template-columns: 1fr;
    overflow: auto;
  }
}
</style>
