<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTypesense } from '@schema'
import { useTypesenseSearch } from '@schema'

const props = defineProps<{
  open: boolean
  modelKey: string
  spec?: Record<string, any>
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const typesense = useTypesense()
const typesenseSearch = useTypesenseSearch()

const collectionKey = computed(() =>
  String(props.spec?.overview?.typesense?.collection ?? props.modelKey ?? '')
)

const notice = ref<string>('')
const actionLog = ref<string>('')
const loading = ref(false)

const remoteSchema = ref<any>(null)
const remoteCollections = ref<any[]>([])

const searchQuery = ref('*')
const queryBy = ref('')
const filterBy = ref('')
const sortBy = ref('')
const perPage = ref(10)
const searchResult = ref<any>(null)

const localSchema = computed(() => {
  if (!collectionKey.value) return null
  try {
    return typesenseSearch.getLocalSchema(collectionKey.value)
  } catch (error) {
    return null
  }
})

const availableQueryBy = computed(() => {
  if (!collectionKey.value) return []
  const preferred = props.spec?.overview?.typesense?.queryBy ?? []
  return typesenseSearch.getQueryByFields(collectionKey.value, preferred)
})

const setLog = (label: string, payload: any) => {
  actionLog.value = `${label}\n${JSON.stringify(payload, null, 2)}`
}

const runAction = async (label: string, fn: () => Promise<any>) => {
  if (!collectionKey.value) return
  loading.value = true
  notice.value = ''
  try {
    const result = await fn()
    setLog(label, result)
    notice.value = `${label} complete`
  } catch (error: any) {
    notice.value = error?.message ?? String(error)
    setLog(`${label} error`, { error: notice.value })
  } finally {
    loading.value = false
  }
}

const handleEnsure = () => runAction('ensureCollection', () => typesense.ensureCollection(collectionKey.value))

const handleClear = () => runAction('clearCollection', () => typesense.clearCollection(collectionKey.value))

const handleRemoteSchema = () =>
  runAction('getRemoteSchema', async () => {
    const result = await typesenseSearch.getRemoteSchema(collectionKey.value)
    remoteSchema.value = result
    return result
  })

const handleRemoteCollections = () =>
  runAction('getRemoteCollections', async () => {
    const result = await typesense.getRemoteCollections()
    remoteCollections.value = result
    return result
  })

const handleSearch = () =>
  runAction('search', async () => {
    const params: Record<string, any> = {
      q: searchQuery.value.trim() || '*',
      query_by: queryBy.value || availableQueryBy.value.join(',')
    }
    if (filterBy.value.trim()) params.filter_by = filterBy.value.trim()
    if (sortBy.value.trim()) params.sort_by = sortBy.value.trim()
    if (perPage.value) params.per_page = perPage.value
    const result = await typesense.search(collectionKey.value, params)
    searchResult.value = result
    return result
  })

const close = () => emit('update:open', false)
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[60]">
    <div class="absolute inset-0 bg-black/30" @click="close"></div>
    <aside class="absolute right-0 top-0 h-full w-full max-w-[50vw] min-w-[360px] bg-white shadow-xl">
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-muted">Typesense Lab</p>
            <h2 class="text-lg font-semibold">{{ collectionKey || 'Select a model' }}</h2>
          </div>
          <button class="btn btn-ghost btn-sm" @click="close">Close</button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-6">
          <div class="grid gap-4 md:grid-cols-2">
            <div class="card">
              <div class="card-body space-y-3">
                <h3 class="text-sm font-semibold">Collection Actions</h3>
                <div class="flex flex-wrap gap-2">
                  <button class="btn btn-sm btn-primary" :disabled="loading" @click="handleEnsure">
                    Ensure collection
                  </button>
                  <button class="btn btn-sm btn-outline" :disabled="loading" @click="handleClear">
                    Clear & recreate
                  </button>
                  <button class="btn btn-sm btn-outline" :disabled="loading" @click="handleRemoteSchema">
                    Fetch remote schema
                  </button>
                  <button class="btn btn-sm btn-outline" :disabled="loading" @click="handleRemoteCollections">
                    List remote collections
                  </button>
                </div>
                <p v-if="notice" class="text-xs text-muted">{{ notice }}</p>
              </div>
            </div>

            <div class="card">
              <div class="card-body space-y-3">
                <h3 class="text-sm font-semibold">Local Schema</h3>
                <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(localSchema, null, 2) }}</pre>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-body space-y-4">
              <h3 class="text-sm font-semibold">Test Search</h3>
              <div class="grid gap-3 md:grid-cols-2">
                <label class="text-sm">
                  Query
                  <input v-model="searchQuery" class="input input-bordered w-full" placeholder="*" />
                </label>
                <label class="text-sm">
                  Query by
                  <input v-model="queryBy" class="input input-bordered w-full" :placeholder="availableQueryBy.join(',')" />
                </label>
                <label class="text-sm">
                  Filter by
                  <input v-model="filterBy" class="input input-bordered w-full" placeholder="field:=value" />
                </label>
                <label class="text-sm">
                  Sort by
                  <input v-model="sortBy" class="input input-bordered w-full" placeholder="field:asc" />
                </label>
                <label class="text-sm">
                  Per page
                  <input v-model.number="perPage" type="number" class="input input-bordered w-full" />
                </label>
              </div>
              <button class="btn btn-sm btn-primary" :disabled="loading" @click="handleSearch">
                Run search
              </button>
              <div v-if="searchResult" class="text-xs">
                <pre class="whitespace-pre-wrap">{{ JSON.stringify(searchResult, null, 2) }}</pre>
              </div>
            </div>
          </div>

          <div v-if="remoteSchema" class="card">
            <div class="card-body space-y-3">
              <h3 class="text-sm font-semibold">Remote Schema</h3>
              <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(remoteSchema, null, 2) }}</pre>
            </div>
          </div>

          <div v-if="remoteCollections.length" class="card">
            <div class="card-body space-y-3">
              <h3 class="text-sm font-semibold">Remote Collections</h3>
              <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(remoteCollections, null, 2) }}</pre>
            </div>
          </div>

          <div v-if="actionLog" class="card">
            <div class="card-body space-y-3">
              <h3 class="text-sm font-semibold">Last Action</h3>
              <pre class="text-xs whitespace-pre-wrap">{{ actionLog }}</pre>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>
