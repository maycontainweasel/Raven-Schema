import type { TypesenseCollectionSchema } from '@schema/typesense/collections'
import { collections as generatedCollections, collectionList } from '@schema/typesense/collections'

type TypesenseDoc = Record<string, any>

type ImportAction = 'create' | 'upsert' | 'update' | 'delete'

type ResolvedCollection = {
  key: string
  schema: TypesenseCollectionSchema
  name: string
}

type TypesenseHealthResponse = {
  ok?: boolean
  service?: {
    baseUrl?: string
  }
  collectionCount?: number
  collections?: string[]
}

type TypesenseStatusResponse = {
  ok?: boolean
  model?: Record<string, any>
  status?: {
    collection?: Record<string, any>
    count?: number
    preview?: Record<string, any>[]
  }
}

type TypesenseActionResponse = {
  ok?: boolean
  action?: string
  result?: Record<string, any>
  status?: Record<string, any>
}

type StatusOptions = {
  limit?: number
  start?: number
}

const normalizeKey = (value: string) => value.trim().toLowerCase()

const buildCollectionLookup = () => {
  const lookup = new Map<string, ResolvedCollection>()
  Object.entries(generatedCollections).forEach(([key, schema]) => {
    const resolved: ResolvedCollection = {
      key,
      schema,
      name: schema.name,
    }
    const keyNormalized = normalizeKey(key)
    lookup.set(keyNormalized, resolved)
    const keySansSuffix = keyNormalized.replace(/typesense$/, '')
    if (keySansSuffix && keySansSuffix !== keyNormalized) {
      lookup.set(keySansSuffix, resolved)
    }
    if (schema?.name) {
      const nameNormalized = normalizeKey(schema.name)
      lookup.set(nameNormalized, resolved)
      const nameSansSuffix = nameNormalized.replace(/typesense$/, '')
      if (nameSansSuffix && nameSansSuffix !== nameNormalized) {
        lookup.set(nameSansSuffix, resolved)
      }
    }
  })
  return lookup
}

const collectionLookup = buildCollectionLookup()

const resolveCollection = (key: string): ResolvedCollection => {
  const normalized = normalizeKey(key)
  const resolved = collectionLookup.get(normalized)
  if (!resolved) {
    throw new Error(`Typesense collection not found for key: ${key}`)
  }
  return resolved
}

const normalizeDocId = (doc: TypesenseDoc, fallbackId?: string) => {
  if (!doc || typeof doc !== 'object') return doc
  const rawId = doc.id
  if (typeof rawId === 'string') return doc
  if (rawId && typeof rawId === 'object') {
    const nestedId = (rawId as any).id ?? (rawId as any).value
    if (typeof nestedId === 'string') {
      return { ...doc, id: nestedId }
    }
  }
  if (fallbackId) {
    return { ...doc, id: fallbackId }
  }
  return doc
}

const unwrapActionResult = <T = Record<string, any>>(response: TypesenseActionResponse) => {
  return (response?.result ?? response) as T
}

export function useTypesense() {
  const request = <T>(url: string, options?: Record<string, any>) => {
    const requestFetch = process.server ? useRequestFetch() : $fetch
    return requestFetch<T>(url, options)
  }

  const getCollectionKeys = () => Object.keys(generatedCollections)

  const getCollectionsMap = () => generatedCollections

  const getCollections = () => collectionList

  const getCollection = (key: string) => resolveCollection(key)

  const getCollectionSchema = (key: string) => resolveCollection(key).schema

  const getCollectionName = (key: string) => resolveCollection(key).name

  const getServiceHealth = async () => {
    return await request<TypesenseHealthResponse>('/api/typesense/health')
  }

  const getRemoteCollections = async () => {
    const health = await getServiceHealth()
    return Array.isArray(health?.collections) ? health.collections : []
  }

  const getRemoteStatus = async (key: string, options: StatusOptions = {}) => {
    const collection = resolveCollection(key)
    return await request<TypesenseStatusResponse>(
      `/api/models/typesense/${encodeURIComponent(collection.key)}`,
      {
        query: {
          limit: options.limit ?? 10,
          start: options.start ?? 0,
        },
      },
    )
  }

  const getRemoteSchema = async (key: string) => {
    const response = await getRemoteStatus(key)
    return response?.status?.collection ?? null
  }

  const postAction = async (
    key: string,
    action: string,
    payload: Record<string, any> = {},
  ) => {
    const collection = resolveCollection(key)
    return await request<TypesenseActionResponse>(
      `/api/models/typesense/${encodeURIComponent(collection.key)}`,
      {
        method: 'POST',
        body: {
          action,
          payload,
        },
      },
    )
  }

  const ensureCollection = async (key: string, payload: Record<string, any> = {}) => {
    return unwrapActionResult(await postAction(key, 'ensureCollection', payload))
  }

  const recreateCollection = async (key: string, payload: Record<string, any> = {}) => {
    return unwrapActionResult(await postAction(key, 'recreateCollection', payload))
  }

  const clearCollection = async (key: string, payload: Record<string, any> = {}) => {
    return await recreateCollection(key, payload)
  }

  const refreshCollection = async (key: string, payload: Record<string, any> = {}) => {
    await ensureCollection(key)
    return unwrapActionResult(await postAction(key, 'refreshCollection', payload))
  }

  const countRecords = async (key: string) => {
    return unwrapActionResult(await postAction(key, 'countRecords'))
  }

  const inspectRecord = async (key: string, id: string) => {
    return unwrapActionResult(await postAction(key, 'inspectRecord', { id }))
  }

  const upsertRecordById = async (key: string, id: string, payload: Record<string, any> = {}) => {
    await ensureCollection(key)
    return unwrapActionResult(await postAction(key, 'addRecord', { ...payload, id }))
  }

  const upsertDocument = async (key: string, document: TypesenseDoc, fallbackId?: string) => {
    await ensureCollection(key)
    const normalized = normalizeDocId(document, fallbackId)
    return unwrapActionResult(await postAction(key, 'upsertDocument', {
      document: normalized,
      fallbackId,
    }))
  }

  const upsertDocuments = async (
    key: string,
    documents: TypesenseDoc[],
    action: ImportAction = 'upsert',
  ) => {
    await ensureCollection(key)
    const normalized = documents.map((doc) => normalizeDocId(doc))
    return unwrapActionResult(await postAction(key, 'importDocuments', {
      documents: normalized,
      importAction: action,
    }))
  }

  const deleteDocument = async (key: string, id: string) => {
    await ensureCollection(key)
    return unwrapActionResult(await postAction(key, 'removeRecord', { id }))
  }

  const search = async (key: string, params: Record<string, any>) => {
    const collection = resolveCollection(key)
    await ensureCollection(collection.key)
    return await request(
      `/api/models/typesense/${encodeURIComponent(collection.key)}/search`,
      {
        query: params,
      },
    )
  }

  return {
    getCollectionKeys,
    getCollectionsMap,
    getCollections,
    getCollection,
    getCollectionSchema,
    getCollectionName,
    getServiceHealth,
    getRemoteCollections,
    getRemoteStatus,
    getRemoteSchema,
    ensureCollection,
    recreateCollection,
    clearCollection,
    refreshCollection,
    countRecords,
    inspectRecord,
    upsertRecordById,
    upsertDocument,
    upsertDocuments,
    deleteDocument,
    search,
  }
}
