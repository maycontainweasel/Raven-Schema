import { ref, proxyRefs } from 'vue'
import { useTypesense } from './useTypesense'
import { useTypesenseSearch } from './useTypesenseSearch'

type SortDirection = 'asc' | 'desc'

export type TypesenseDirectoryAdapter = {
  ensureCollection?: (key: string) => Promise<any>
  searchCollection: (key: string, params: Record<string, any>) => Promise<any>
  getLocalSchema?: (key: string) => any
  getRemoteSchema?: (key: string) => Promise<any>
  getAvailableFacetFields?: (key: string, fallback?: string[]) => Promise<string[]>
}

export type TypesenseDirectoryOptions = {
  collection: string
  queryBy?: string[]
  sortableFields?: string[]
  filters?: string[]
  perPage?: number
  defaultSort?: { field?: string; direction?: SortDirection }
  enableFacets?: boolean
  ensureOnConnect?: boolean
  adapter?: TypesenseDirectoryAdapter
}

const toArray = <T>(value?: T | T[]): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

const buildDefaultAdapter = (): TypesenseDirectoryAdapter => {
  const typesense = useTypesense()
  const search = useTypesenseSearch()

  return {
    ensureCollection: (key: string) => typesense.ensureCollection(key),
    searchCollection: (key: string, params: Record<string, any>) =>
      search.searchCollection(key, params),
    getLocalSchema: (key: string) => search.getLocalSchema(key),
    getRemoteSchema: (key: string) => search.getRemoteSchema(key),
    getAvailableFacetFields: (key: string, fallback?: string[]) =>
      search.getAvailableFacetFields(key, fallback ?? []),
  }
}

export function useTypesenseDirectory(options: TypesenseDirectoryOptions) {
  const collectionKey = options.collection
  const queryByDefaults = toArray(options.queryBy)
  const sortableDefaults = toArray(options.sortableFields)
  const filterDefaults = toArray(options.filters)

  const searchQuery = ref('*')
  const loading = ref(false)
  const ready = ref(false)
  const error = ref('')
  const results = ref<any[]>([])
  const total = ref(0)
  const page = ref(1)
  const perPage = ref(options.perPage ?? 25)

  const sortField = ref(options.defaultSort?.field ?? sortableDefaults[0] ?? '')
  const sortDirection = ref<SortDirection>(options.defaultSort?.direction ?? 'asc')

  const filterFields = ref<string[]>(filterDefaults.length ? [...filterDefaults] : [])
  const filterSelections = ref<Record<string, any[]>>({})
  const filterOptions = ref<Record<string, Array<{ value: any; count: number }>>>({})

  const adapter = options.adapter ?? buildDefaultAdapter()

  const normalizeFilterSelections = () => {
    const next: Record<string, any[]> = { ...filterSelections.value }
    for (const field of filterFields.value) {
      if (!Array.isArray(next[field])) next[field] = []
    }
    filterSelections.value = next
  }

  const resolveQueryBy = () => {
    if (queryByDefaults.length) return queryByDefaults
    try {
      const schema = adapter.getLocalSchema?.(collectionKey)
      const fields = Array.isArray(schema?.fields) ? schema.fields : []
      return fields.map((field: any) => field.name).filter((name: string) => name !== 'id')
    } catch {
      return ['id']
    }
  }

  const getSortableSchemaFields = () => {
    if (!adapter.getLocalSchema) return new Set(sortableDefaults.map(String))
    try {
      const schema = adapter.getLocalSchema(collectionKey)
      const fields = Array.isArray(schema?.fields) ? schema.fields : []
      if (!fields.length && sortableDefaults.length) {
        return new Set(sortableDefaults.map(String))
      }
      return new Set(
        fields
          .filter((field: any) => field?.sort === true)
          .map((field: any) => String(field.name))
      )
    } catch {
      return new Set(sortableDefaults.map(String))
    }
  }

  const buildFilterBy = () => {
    const parts: string[] = []
    for (const field of filterFields.value) {
      const selected = filterSelections.value[field] ?? []
      if (!selected.length) continue
      const tick = String.fromCharCode(96)
      const escaped = selected.map((value) =>
        tick + String(value ?? '').replaceAll(tick, `\\${tick}`) + tick
      )
      parts.push(`${field}:=[${escaped.join(',')}]`)
    }
    return parts.join(' && ')
  }

  const loadFilterFields = async () => {
    if (filterFields.value.length) {
      normalizeFilterSelections()
      return
    }
    if (!options.enableFacets || !adapter.getAvailableFacetFields) {
      return
    }
    try {
      const facets = await adapter.getAvailableFacetFields(collectionKey, [])
      if (facets.length) {
        filterFields.value = facets
        normalizeFilterSelections()
      }
    } catch (err) {
      console.warn('[typesense-directory] failed to load facets', err)
    }
  }

  const connect = async () => {
    error.value = ''
    loading.value = true
    try {
      if (options.ensureOnConnect !== false && adapter.ensureCollection) {
        await adapter.ensureCollection(collectionKey)
      }
      await loadFilterFields()
      ready.value = true
      await search()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  const search = async () => {
    loading.value = true
    error.value = ''
    try {
      const params: Record<string, any> = {
        q: searchQuery.value.trim() || '*',
        query_by: resolveQueryBy().join(','),
        per_page: perPage.value,
        page: page.value,
      }
      const filterBy = buildFilterBy()
      if (filterBy) params.filter_by = filterBy
      if (filterFields.value.length) params.facet_by = filterFields.value.join(',')

      if (sortField.value) {
        const sortable = getSortableSchemaFields()
        if (!sortable.size || sortable.has(String(sortField.value))) {
          params.sort_by = `${sortField.value}:${sortDirection.value}`
        }
      }

      const response = await adapter.searchCollection(collectionKey, params)
      results.value = Array.isArray(response?.hits)
        ? response.hits.map((hit: any) => hit.document)
        : []
      total.value = response?.found ?? results.value.length

      if (Array.isArray(response?.facet_counts)) {
        const next: Record<string, Array<{ value: any; count: number }>> = { ...filterOptions.value }
        for (const entry of response.facet_counts) {
          const field = entry?.field_name
          if (!field || !Array.isArray(entry?.counts)) continue
          next[field] = entry.counts.map((count: any) => ({
            value: count?.value,
            count: count?.count ?? 0,
          }))
        }
        filterOptions.value = next
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      results.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  const nextPage = () => {
    if (page.value * perPage.value < total.value) {
      page.value += 1
      search()
    }
  }

  const prevPage = () => {
    if (page.value > 1) {
      page.value -= 1
      search()
    }
  }

  return proxyRefs({
    collectionKey,
    ready,
    loading,
    error,
    results,
    total,
    page,
    perPage,
    searchQuery,
    sortField,
    sortDirection,
    filterFields,
    filterSelections,
    filterOptions,
    connect,
    search,
    nextPage,
    prevPage,
    normalizeFilterSelections,
  })
}
