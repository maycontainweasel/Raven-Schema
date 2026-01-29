<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCRUD } from '~~/modules/schema-kit/runtime'
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
    allowCreate: true,
    disabled: false,
    mode: 'api',
    terms: () => [],
    selectedIds: () => [],
    bypassMothership: false,
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
      children: [] as any[],
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

const flatTermList = computed(() => flattenTerms(draftTree.value))
const propTermList = computed(() =>
  (props.terms || [])
    .map((term) => ({ id: resolveTermId(term), label: resolveTermLabel(term) }))
    .filter((term) => term.id)
)

const applySelectedIds = (ids: string[]) => {
  draftSelectedIds.value = [...ids]
  currentSelectedIds.value = [...ids]
  emit('update:selectedIds', [...ids])
}

const loadTerms = async () => {
  if (props.mode === 'demo') {
    const tree = buildTree(props.terms)
    draftTree.value = tree
    const nextIds = props.selectedIds || []
    applySelectedIds(nextIds)
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
          instance: sourceInstance.value,
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
          bypassMothership: props.bypassMothership,
        },
        data: { id: props.recordId, term },
      })
    }

    for (const term of removed) {
      await processRecordForInstances({
        instances: props.instances,
        endpoint: props.endpoints.detach,
        method: 'mutate',
        options: {
          bypassMothership: props.bypassMothership,
        },
        data: { id: props.recordId, term },
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
      parent: newTermParent.value === '__root__' ? null : newTermParent.value,
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
        bypassMothership: props.bypassMothership,
      },
      data: {
        key: id,
        label: name,
        parent: newTermParent.value === '__root__' ? '' : newTermParent.value,
      },
    })

    newTermName.value = ''
    newTermParent.value = '__root__'
    await loadTerms()
  } catch (error) {
    console.error('Failed to create term', error)
  }
}

const selectedLabels = computed(() => {
  const ids = new Set(currentSelectedIds.value.length ? currentSelectedIds.value : props.selectedIds || [])
  const terms = flatTermList.value.length ? flatTermList.value : propTermList.value
  return terms.filter(term => ids.has(term.id)).map(term => term.label)
})

watch(open, (value) => {
  if (value) loadTerms()
})

watch(
  () => props.selectedIds,
  (value) => {
    if (props.mode !== 'demo') return
    if (!value) return
    applySelectedIds(value)
  },
  { immediate: true }
)
</script>

<template>
  <div class="stack">
    <div class="row" style="gap: var(--space-2);">
      <span v-if="selectedLabels.length === 0" class="tag tag-muted">No terms selected</span>
      <span v-for="label in selectedLabels" :key="label" class="tag">{{ label }}</span>
    </div>

    <button class="btn outline" type="button" :disabled="disabled" @click="open = true">
      {{ buttonLabel }}
    </button>

    <div v-if="open" class="demo-modal">
      <div class="card demo-modal-card stack" style="width: min(920px, 96vw);">
        <div class="spread">
          <div>
            <h3>{{ title }}</h3>
            <p class="muted">{{ description }}</p>
          </div>
          <button class="btn ghost" type="button" @click="open = false">Close</button>
        </div>

        <div class="grid" style="grid-template-columns: 2fr 1fr; gap: var(--space-4);">
          <div class="panel" style="min-height: 320px;">
            <TaxonomyTreeManager
              v-model="draftTree"
              :selected-ids="draftSelectedIds"
              :disabled="loadingTerms || savingTerms"
              @update:selected-ids="draftSelectedIds = $event"
            />
          </div>

          <div class="stack">
            <div class="field">
              <span class="label">Parent (optional)</span>
              <select v-model="newTermParent" class="select" :disabled="!allowCreate">
                <option value="__root__">Top level</option>
                <option v-for="term in flatTermList" :key="term.id" :value="term.id">
                  {{ term.label }}
                </option>
              </select>
            </div>

            <div class="field">
              <span class="label">New term</span>
              <input v-model="newTermName" class="input" placeholder="Term name" :disabled="!allowCreate" />
            </div>

            <button class="btn" type="button" :disabled="!allowCreate || !newTermName" @click="createTerm">
              Create term
            </button>

            <div v-if="!allowCreate" class="muted" style="font-size: 0.8rem;">
              Creation is disabled for this taxonomy.
            </div>
          </div>
        </div>

        <div class="row" style="justify-content: flex-end;">
          <button class="btn outline" type="button" @click="open = false">Cancel</button>
          <button class="btn primary" type="button" :disabled="savingTerms" @click="applySelection">
            {{ savingTerms ? 'Saving…' : 'Apply selection' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
