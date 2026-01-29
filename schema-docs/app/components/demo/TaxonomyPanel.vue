<script setup lang="ts">
import { useTrpcEndpoint } from '~/composables/demo/useTrpcEndpoint'

type InstanceCode = string

type TaxonomyConfig = {
  modelKey: string
  tableModel?: string
  taxonomyKey: string
  label: string
  description?: string
}

type TermRecord = {
  id?: string
  key?: string
  label?: string
  description?: string
  parent?: any
}

const props = defineProps<{ config: TaxonomyConfig; recordId: string; instances: InstanceCode[]; bypassMothership: boolean }>()

const { callEndpoint } = useTrpcEndpoint()
const { processRecordForInstances, resolveRecordSubId } = useCRUD()

const loadingTerms = ref(false)
const terms = ref<TermRecord[]>([])
const recordTerms = ref<TermRecord[]>([])
const errorMessage = ref('')

const termForm = reactive({
  key: '',
  label: '',
  description: '',
  parent: '',
})

const taxonomyForm = reactive({
  key: '',
  label: '',
  hierarchical: false,
  description: '',
})

const selectedTermId = ref('')

const endpointBase = computed(() => `${props.config.modelKey}.${props.config.taxonomyKey}`)
const recordSubId = computed(() => resolveRecordSubId(props.recordId) ?? props.recordId)
const pascal = (value: string) =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const edgeRecordToTerm = computed(() => `${pascal(props.config.modelKey)}${pascal(props.config.taxonomyKey)}s`)
const edgeTaxonomyToTerms = computed(
  () => `${pascal(props.config.modelKey)}${pascal(props.config.taxonomyKey)}Terms`
)
const termModel = computed(() =>
  props.config.tableModel ? `t_${props.config.tableModel}_${props.config.taxonomyKey}` : ''
)
const fnGetRecordTerms = computed(
  () => `fn::get${pascal(props.config.modelKey)}${pascal(props.config.taxonomyKey)}s`
)

const refreshTerms = async () => {
  loadingTerms.value = true
  errorMessage.value = ''
  try {
    const payload = { data: {}, instance: props.instances[0] }
    const result = await callEndpoint(`${endpointBase.value}.getTerms`, 'query', payload)
    terms.value = Array.isArray(result) ? result : []
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Failed to load terms'
  } finally {
    loadingTerms.value = false
  }
}

const refreshRecordTerms = async () => {
  if (!recordSubId.value) return
  loadingTerms.value = true
  errorMessage.value = ''
  try {
    const payload = { data: { id: recordSubId.value }, instance: props.instances[0] }
    const result = await callEndpoint(`${endpointBase.value}.getRecordTerms`, 'query', payload)
    recordTerms.value = Array.isArray(result) ? result : []
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Failed to load record terms'
  } finally {
    loadingTerms.value = false
  }
}

const handleAddTerm = async () => {
  if (!termForm.key || !termForm.label) {
    errorMessage.value = 'Key and label are required'
    return
  }

  const payload = {
    key: termForm.key,
    label: termForm.label,
    description: termForm.description || undefined,
    parent: termForm.parent || undefined,
  }

  await processRecordForInstances({
    endpoint: `${endpointBase.value}.addTerm`,
    method: 'mutate',
    data: payload,
    instances: props.instances,
    options: { bypassMothership: props.bypassMothership },
  })

  termForm.key = ''
  termForm.label = ''
  termForm.description = ''
  termForm.parent = ''

  await refreshTerms()
}

const handleCreateTaxonomy = async () => {
  if (!taxonomyForm.key || !taxonomyForm.label) {
    errorMessage.value = 'Taxonomy key and label are required'
    return
  }

  const payload = {
    key: taxonomyForm.key,
    label: taxonomyForm.label,
    hierarchical: taxonomyForm.hierarchical,
    description: taxonomyForm.description || undefined,
  }

  await processRecordForInstances({
    endpoint: `${endpointBase.value}.createTaxonomy`,
    method: 'mutate',
    data: payload,
    instances: props.instances,
    options: { bypassMothership: props.bypassMothership },
  })

  taxonomyForm.key = ''
  taxonomyForm.label = ''
  taxonomyForm.hierarchical = false
  taxonomyForm.description = ''
}

const handleRemoveTerm = async (term: TermRecord) => {
  await processRecordForInstances({
    endpoint: `${endpointBase.value}.removeTerm`,
    method: 'mutate',
    data: term,
    instances: props.instances,
    options: { bypassMothership: props.bypassMothership },
  })

  await refreshTerms()
}

const handleAttach = async () => {
  if (!recordSubId.value) {
    errorMessage.value = 'Record id is missing'
    return
  }
  const term = terms.value.find((item) => (item.id ?? item.key) === selectedTermId.value)
  if (!term) {
    errorMessage.value = 'Select a term to attach'
    return
  }

  await processRecordForInstances({
    endpoint: `${endpointBase.value}.attach`,
    method: 'mutate',
    data: { id: recordSubId.value, term },
    instances: props.instances,
    options: { bypassMothership: props.bypassMothership },
  })

  await refreshRecordTerms()
}

const handleDetach = async (term: TermRecord) => {
  if (!recordSubId.value) {
    errorMessage.value = 'Record id is missing'
    return
  }
  await processRecordForInstances({
    endpoint: `${endpointBase.value}.detach`,
    method: 'mutate',
    data: { id: recordSubId.value, term },
    instances: props.instances,
    options: { bypassMothership: props.bypassMothership },
  })

  await refreshRecordTerms()
}

onMounted(async () => {
  await refreshTerms()
  await refreshRecordTerms()
})

watch(() => props.recordId, refreshRecordTerms)
watch(() => props.instances, () => {
  refreshTerms()
  refreshRecordTerms()
})
</script>

<template>
  <div class="card stack">
    <div class="spread">
      <div>
        <h3>{{ config.label }}</h3>
        <p class="muted">{{ config.description }}</p>
      </div>
      <button class="btn outline small" type="button" @click="refreshTerms" :disabled="loadingTerms">
        Refresh
      </button>
    </div>

    <div v-if="errorMessage" class="alert danger">{{ errorMessage }}</div>

    <div class="grid grid-2">
      <div class="stack">
        <strong>All terms</strong>
        <div class="panel">
          <div v-if="loadingTerms" class="muted">Loading terms…</div>
          <div v-else-if="terms.length === 0" class="muted">No terms yet.</div>
          <div v-else class="stack">
            <div v-for="term in terms" :key="term.id ?? term.key" class="spread">
              <span>{{ term.label || term.key || term.id }}</span>
              <button class="btn ghost small" type="button" @click="handleRemoveTerm(term)">Remove</button>
            </div>
            <label class="field">
              <span class="label">Attach term</span>
              <select v-model="selectedTermId" class="select">
                <option value="">Select a term</option>
                <option v-for="term in terms" :key="term.id ?? term.key" :value="term.id ?? term.key">
                  {{ term.label || term.key || term.id }}
                </option>
              </select>
            </label>
            <p class="muted small">
              Edges: {{ edgeRecordToTerm }} (record→term), {{ edgeTaxonomyToTerms }} (taxonomy→term).<br />
              Query: select * from {{ termModel || 't_<table>_<tax>' }} where &lt;-({{ edgeRecordToTerm }} where in = {{ props.config.tableModel || 'table' }}:&lt;id&gt;).
              <span v-if="termModel">Helper: {{ fnGetRecordTerms }}(&lt;record&gt;).</span>
            </p>
            <button class="btn small" type="button" @click="handleAttach">Attach to record</button>
          </div>
        </div>

        <div class="panel">
          <strong>Add term</strong>
          <div class="stack">
            <label class="field">
              <span class="label">Key *</span>
              <input v-model="termForm.key" class="input" />
            </label>
            <label class="field">
              <span class="label">Label *</span>
              <input v-model="termForm.label" class="input" />
            </label>
            <label class="field">
              <span class="label">Description</span>
              <input v-model="termForm.description" class="input" />
            </label>
            <label class="field">
              <span class="label">Parent (optional)</span>
              <input v-model="termForm.parent" class="input" placeholder="parent term id" />
            </label>
            <button class="btn small outline" type="button" @click="handleAddTerm">Add term</button>
          </div>
        </div>

        <div class="panel">
          <strong>Create taxonomy</strong>
          <div class="stack">
            <label class="field">
              <span class="label">Key *</span>
              <input v-model="taxonomyForm.key" class="input" />
            </label>
            <label class="field">
              <span class="label">Label *</span>
              <input v-model="taxonomyForm.label" class="input" />
            </label>
            <label class="field row">
              <input type="checkbox" v-model="taxonomyForm.hierarchical" />
              <span>Hierarchical</span>
            </label>
            <label class="field">
              <span class="label">Description</span>
              <input v-model="taxonomyForm.description" class="input" />
            </label>
            <button class="btn small outline" type="button" @click="handleCreateTaxonomy">Create taxonomy</button>
          </div>
        </div>
      </div>

      <div class="stack">
        <strong>Record terms</strong>
        <div class="panel">
          <div v-if="recordTerms.length === 0" class="muted">No terms attached.</div>
          <div v-else class="stack">
            <div v-for="term in recordTerms" :key="term.id ?? term.key" class="spread">
              <span>{{ term.label || term.key || term.id }}</span>
              <button class="btn ghost small" type="button" @click="handleDetach(term)">Detach</button>
            </div>
          </div>
          <p class="muted small">
            Detach removes edges from {{ edgeRecordToTerm }}.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
