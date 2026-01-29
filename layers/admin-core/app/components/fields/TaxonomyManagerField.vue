<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCRUD } from '@schema'
import TaxonomyTreeManager from './TaxonomyTreeManager.client.vue'

export type TaxonomyTerm = {
  id?: string
  key?: string
  slug?: string
  label?: string
  title?: string
  parent?: string | null
}

export type TaxonomyEndpoints = {
  getTerms: string
  getRecordTerms: string
  attach: string
  detach: string
  addTerm?: string
}

const props = withDefaults(
  defineProps<{
    recordId?: string | null
    instances?: string[]
    sourceInstance?: string
    modelKey?: string
    endpoints?: TaxonomyEndpoints
    title?: string
    description?: string
    buttonLabel?: string
    summaryLabel?: string
    allowCreate?: boolean
    disabled?: boolean
    mode?: 'api' | 'demo'
    terms?: TaxonomyTerm[]
    selectedIds?: string[]
    bypassMothership?: boolean
  }>(),
  {
    recordId: null,
    instances: () => [],
    sourceInstance: undefined,
    modelKey: 'question',
    title: 'Manage Taxonomy',
    description: 'Select terms, create new ones, and organize hierarchy.',
    buttonLabel: 'Manage taxonomy',
    summaryLabel: 'Selected taxonomy',
    allowCreate: true,
    disabled: false,
    mode: 'api',
    terms: () => [],
    selectedIds: () => [],
    bypassMothership: false
  }
)

const emit = defineEmits<{
  'update:selectedIds': [value: string[]]
  'applied': [value: string[]]
  'created': [value: TaxonomyTerm]
}>()

const open = ref(false)
const loadingTerms = ref(false)
const savingTerms = ref(false)

const draftSelectedIds = ref<string[]>([])
const currentSelectedIds = ref<string[]>([])
const draftTree = ref<any[]>([])
const newTermName = ref('')
const newTermParent = ref('__root__')

const sourceInstance = computed(() => props.sourceInstance || props.instances[0] || 'pm')

const resolveEndpoint = (api: any, path?: string) => {
  if (!api || !path) return null
  return path.split('.').reduce((acc, key) => acc?.[key], api)
}

const resolveTermId = (term: TaxonomyTerm) => term.key || term.id || term.slug

const resolveTermLabel = (term: TaxonomyTerm) => term.label || term.title || term.key || term.slug || ''

const buildTree = (terms: TaxonomyTerm[]) => {
  const nodes = terms
    .map((term) => ({
      id: resolveTermId(term),
      label: resolveTermLabel(term),
      parent: term.parent || null,
      children: [] as any[]
    }))
    .filter((node) => node.id)

  const map = new Map(nodes.map(node => [node.id, node]))
  const roots: any[] = []

  nodes.forEach((node) => {
    if (node.parent && map.has(node.parent)) {
      map.get(node.parent)?.children?.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

const flattenTerms = (nodes: any[], acc: Array<{ id: string; label: string }> = []) => {
  for (const node of nodes) {
    acc.push({ id: node.id, label: node.label })
    if (node.children?.length) flattenTerms(node.children, acc)
  }
  return acc
}

const flattenTreeWithParent = (
  nodes: any[],
  parent: string | null = null,
  acc: Array<{ id: string; label: string; parent: string | null }> = []
) => {
  for (const node of nodes) {
    acc.push({ id: node.id, label: node.label, parent })
    if (node.children?.length) flattenTreeWithParent(node.children, node.id, acc)
  }
  return acc
}

const flatTermList = computed(() => flattenTerms(draftTree.value))
const flatTermTree = computed(() => flattenTreeWithParent(draftTree.value))
const propTermList = computed(() =>
  (props.terms || [])
    .map((term) => ({ id: resolveTermId(term), label: resolveTermLabel(term) }))
    .filter((term) => term.id)
)
const propTermTree = computed(() =>
  (props.terms || [])
    .map((term) => ({ id: resolveTermId(term), label: resolveTermLabel(term), parent: term.parent ?? null }))
    .filter((term) => term.id)
)

const applySelectedIds = (ids: string[], options: { emit?: boolean } = {}) => {
  draftSelectedIds.value = [...ids]
  currentSelectedIds.value = [...ids]
  if (options.emit === false) return
  emit('update:selectedIds', [...ids])
}

const loadTerms = async () => {
  if (props.mode === 'demo') {
    const tree = buildTree(props.terms)
    draftTree.value = tree
    const nextIds = props.selectedIds || []
    applySelectedIds(nextIds, { emit: false })
    return
  }

  if (!props.endpoints) return
  const { $api } = useNuxtApp()

  loadingTerms.value = true
  try {
    const termsEndpoint = resolveEndpoint($api, props.endpoints.getTerms)
    const termsRaw = await termsEndpoint?.query?.({ data: {}, instance: sourceInstance.value })
    const terms = Array.isArray(termsRaw) ? termsRaw[0] : termsRaw
    const termList = Array.isArray(terms) ? terms : terms ? [terms] : []

    draftTree.value = buildTree(termList)

    if (props.recordId) {
      try {
        const recordEndpoint = resolveEndpoint($api, props.endpoints.getRecordTerms)
        const recordTermsRaw = await recordEndpoint?.query?.({
          data: { id: props.recordId },
          instance: sourceInstance.value
        })
        const recordTerms = Array.isArray(recordTermsRaw) ? recordTermsRaw[0] : recordTermsRaw
        const recordList = Array.isArray(recordTerms) ? recordTerms : recordTerms ? [recordTerms] : []
        const recordIds = recordList.map(resolveTermId).filter(Boolean) as string[]
        applySelectedIds(recordIds)
      } catch (error) {
        console.warn('Taxonomy terms not found for record', error)
        applySelectedIds([])
      }
    } else {
      applySelectedIds([])
    }
  } catch (error) {
    console.error('Failed to load taxonomy terms', error)
  } finally {
    loadingTerms.value = false
  }
}

const applySelection = async () => {
  if (props.mode === 'demo') {
    currentSelectedIds.value = [...draftSelectedIds.value]
    emit('update:selectedIds', [...draftSelectedIds.value])
    emit('applied', [...draftSelectedIds.value])
    open.value = false
    return
  }

  if (!props.recordId || !props.endpoints) return

  const { processRecordForInstances } = useCRUD()
  const nextIds = draftSelectedIds.value
  const added = nextIds.filter(id => !currentSelectedIds.value.includes(id))
  const removed = currentSelectedIds.value.filter(id => !nextIds.includes(id))

  if (added.length === 0 && removed.length === 0) {
    open.value = false
    return
  }

  savingTerms.value = true
  try {
    for (const term of added) {
      await processRecordForInstances({
        instances: props.instances,
        endpoint: props.endpoints.attach,
        method: 'mutate',
        options: {
          bypassMothership: props.bypassMothership
        },
        data: { id: props.recordId, term }
      })
    }

    for (const term of removed) {
      await processRecordForInstances({
        instances: props.instances,
        endpoint: props.endpoints.detach,
        method: 'mutate',
        options: {
          bypassMothership: props.bypassMothership
        },
        data: { id: props.recordId, term }
      })
    }

    currentSelectedIds.value = [...nextIds]
    emit('update:selectedIds', [...nextIds])
    emit('applied', [...nextIds])
    open.value = false
  } catch (error) {
    console.error('Failed to update taxonomy', error)
  } finally {
    savingTerms.value = false
  }
}

const slugify = (value: string) => value.toLowerCase().trim().replace(/\s+/g, '-')

const createTerm = async () => {
  const name = newTermName.value.trim()
  if (!name) return
  const id = slugify(name)

  if (props.mode === 'demo') {
    const term = {
      key: id,
      label: name,
      parent: newTermParent.value === '__root__' ? null : newTermParent.value
    }
    const next = [...props.terms, term]
    draftTree.value = buildTree(next)
    newTermName.value = ''
    newTermParent.value = '__root__'
    emit('created', term)
    return
  }

  if (!props.endpoints?.addTerm) return

  const { processRecordForInstances } = useCRUD()

  try {
    await processRecordForInstances({
      instances: props.instances,
      endpoint: props.endpoints.addTerm,
      method: 'mutate',
      options: {
        bypassMothership: props.bypassMothership
      },
      data: {
        key: id,
        label: name,
        parent: newTermParent.value === '__root__' ? '' : newTermParent.value
      }
    })

    newTermName.value = ''
    newTermParent.value = '__root__'
    await loadTerms()
  } catch (error) {
    console.error('Failed to create term', error)
  }
}

const resolveSelectedIds = computed(() =>
  currentSelectedIds.value.length ? currentSelectedIds.value : props.selectedIds || []
)

const selectedLabels = computed(() => {
  const ids = new Set(resolveSelectedIds.value)
  const terms = flatTermList.value.length ? flatTermList.value : propTermList.value
  return terms.filter(term => ids.has(term.id)).map(term => term.label)
})

const buildPath = (
  id: string,
  index: Map<string, { id: string; label: string; parent: string | null }>
) => {
  const parts: string[] = []
  const seen = new Set<string>()
  let current = index.get(id)
  while (current && !seen.has(current.id)) {
    parts.unshift(current.label)
    seen.add(current.id)
    current = current.parent ? index.get(current.parent) : undefined
  }
  return parts.join(' › ')
}

const selectedPaths = computed(() => {
  const treeSource = flatTermTree.value.length ? flatTermTree.value : propTermTree.value
  const index = new Map(treeSource.map((term) => [term.id, term]))
  return resolveSelectedIds.value
    .map((id) => buildPath(id, index) || id)
    .filter(Boolean)
})

const selectedStats = computed(() => {
  const treeSource = flatTermTree.value.length ? flatTermTree.value : propTermTree.value
  const index = new Map(treeSource.map((term) => [term.id, term]))
  const childMap = new Map<string, number>()
  for (const term of treeSource) {
    if (!term.parent) continue
    childMap.set(term.parent, (childMap.get(term.parent) ?? 0) + 1)
  }

  const ids = resolveSelectedIds.value
  const total = ids.length
  let topLevel = 0
  let leaf = 0
  ids.forEach((id) => {
    const node = index.get(id)
    if (!node || !node.parent) topLevel += 1
    if (!childMap.has(id)) leaf += 1
  })

  return { total, topLevel, leaf }
})

watch(open, (value) => {
  if (value) loadTerms()
})

const arraysEqual = (left: string[] = [], right: string[] = []) => {
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false
  }
  return true
}

watch(
  () => props.selectedIds,
  (value) => {
    if (props.mode !== 'demo') return
    const next = value || []
    if (arraysEqual(next, currentSelectedIds.value)) return
    applySelectedIds(next, { emit: false })
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-2">
    <button class="btn btn-outline btn-sm" type="button" :disabled="disabled" @click="open = true">
      {{ buttonLabel }}
    </button>

    <div class="modal" :class="open ? 'modal-open' : ''">
      <div class="modal-box max-w-6xl w-full">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold">{{ title }}</h3>
            <p class="text-sm text-muted">{{ description }}</p>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" @click="open = false">Close</button>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-3">
          <div class="lg:col-span-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <TaxonomyTreeManager
              v-model="draftTree"
              :selected-ids="draftSelectedIds"
              :disabled="loadingTerms || savingTerms"
              @update:selected-ids="draftSelectedIds = $event"
            />
          </div>

          <div class="space-y-4">
            <div class="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-2">
              <div class="text-xs font-semibold uppercase text-muted">{{ summaryLabel }}</div>
              <div class="flex flex-wrap gap-1">
                <span class="badge badge-outline">Total {{ selectedStats.total }}</span>
                <span class="badge badge-outline">Top {{ selectedStats.topLevel }}</span>
                <span class="badge badge-outline">Leaf {{ selectedStats.leaf }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span v-if="selectedPaths.length === 0" class="badge badge-outline text-muted">No terms selected</span>
                <span v-for="path in selectedPaths" :key="path" class="badge badge-outline">
                  {{ path }}
                </span>
              </div>
            </div>

            <div class="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 space-y-3">
              <div class="text-xs font-semibold uppercase text-muted">Add new term</div>
              <div>
                <label class="label">Parent (optional)</label>
                <select v-model="newTermParent" class="select select-sm w-full" :disabled="!allowCreate">
                  <option value="__root__">Top level</option>
                  <option v-for="term in flatTermList" :key="term.id" :value="term.id">
                    {{ term.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="label">New term</label>
                <input v-model="newTermName" class="input input-sm w-full" placeholder="Term name" :disabled="!allowCreate" />
              </div>

              <button class="btn btn-primary btn-sm" type="button" :disabled="!allowCreate || !newTermName" @click="createTerm">
                Create term
              </button>

              <div v-if="!allowCreate" class="text-xs text-muted">
                Creation is disabled for this taxonomy.
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn btn-outline btn-sm" type="button" @click="open = false">Cancel</button>
          <button class="btn btn-primary btn-sm" type="button" :disabled="savingTerms" @click="applySelection">
            {{ savingTerms ? 'Saving…' : 'Apply selection' }}
          </button>
        </div>
      </div>
      <div class="modal-backdrop" @click="open = false"></div>
    </div>
  </div>
</template>
