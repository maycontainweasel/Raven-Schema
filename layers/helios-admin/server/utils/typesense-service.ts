import Typesense from 'typesense'
import type { TypesenseCollectionSchema } from '@schema/typesense/collections'

type TypesenseServiceConfig = {
  protocol: 'http' | 'https'
  host: string
  port: number
  apiKey: string
  baseUrl: string
}

type TypesenseSearchOptions = {
  query?: string
  queryBy?: string[]
  limit?: number
  start?: number
  filterBy?: string
  sortBy?: string
}

type TypesenseDocumentPage = {
  collection: string
  queryBy: string
  count: number
  documents: Record<string, any>[]
}

let cachedClient: Typesense.Client | null = null
let cachedKey = ''

const normalizeHostAndPort = (rawHost: string, rawPort: string) => {
  let protocol: 'http' | 'https' = rawHost.startsWith('https') ? 'https' : 'http'
  let host = rawHost.replace(/^https?:\/\//, '')
  let port = Number(rawPort || (protocol === 'https' ? 443 : 80))

  try {
    if (rawHost.startsWith('http://') || rawHost.startsWith('https://')) {
      const url = new URL(rawHost)
      protocol = (url.protocol.replace(':', '') || protocol) as 'http' | 'https'
      host = url.hostname
      if (url.port) port = Number(url.port)
    }
    else if (host.includes(':')) {
      const [nextHost, nextPort] = host.split(':')
      host = nextHost
      if (nextPort) port = Number(nextPort)
    }
  }
  catch {
    // keep fallback values
  }

  host = host || 'localhost'
  if (!Number.isFinite(port) || port <= 0) port = protocol === 'https' ? 443 : 80

  return { protocol, host, port }
}

export const resolveTypesenseServiceConfig = (): TypesenseServiceConfig => {
  const runtimeConfig = useRuntimeConfig() as any
  const publicConfig = runtimeConfig?.public?.typesense ?? {}
  const privateConfig = runtimeConfig?.typesense ?? {}
  const merged = { ...publicConfig, ...privateConfig }

  const rawHost = String(merged.host || '').trim()
  const rawPort = String(merged.port || '').trim()
  const apiKey = String(merged.apiKey || '').trim()

  if (!rawHost) {
    throw new Error('Typesense host is not configured.')
  }
  if (!apiKey) {
    throw new Error('Typesense apiKey is not configured.')
  }

  const { protocol, host, port } = normalizeHostAndPort(rawHost, rawPort)

  return {
    protocol,
    host,
    port,
    apiKey,
    baseUrl: `${protocol}://${host}:${port}`,
  }
}

export const getTypesenseClient = () => {
  const config = resolveTypesenseServiceConfig()
  const key = `${config.protocol}://${config.host}:${config.port}|${config.apiKey}`
  if (cachedClient && cachedKey === key) return cachedClient

  cachedClient = new Typesense.Client({
    nodes: [
      {
        host: config.host,
        port: config.port,
        protocol: config.protocol,
      },
    ],
    apiKey: config.apiKey,
    connectionTimeoutSeconds: 1,
    numRetries: 0,
  })
  cachedKey = key
  return cachedClient
}

const isNotFoundError = (error: any) => {
  return Number(error?.httpStatus ?? error?.statusCode) === 404
}

export const normalizeTypesenseId = (value: string | number) => {
  const text = String(value ?? '').trim()
  if (!text) return text
  if (!text.includes(':')) return text
  const parts = text.split(':')
  return parts[parts.length - 1] || text
}

const toQueryBy = (queryBy?: string[]) => {
  const normalized = (Array.isArray(queryBy) ? queryBy : [])
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0)
  if (!normalized.length) return ['id']
  return normalized
}

const runSearch = async (
  collectionName: string,
  payload: Record<string, any>,
  queryByCandidates: string[],
) => {
  const client = getTypesenseClient()
  let lastError: any

  for (const queryBy of queryByCandidates) {
    try {
      const result = await client
        .collections(collectionName)
        .documents()
        .search({
          ...payload,
          query_by: queryBy,
        })

      return {
        queryBy,
        result,
      }
    }
    catch (error: any) {
      lastError = error
    }
  }

  throw lastError
}

export const listTypesenseCollections = async () => {
  const client = getTypesenseClient()
  return await client.collections().retrieve()
}

export const ensureTypesenseCollection = async (schema: TypesenseCollectionSchema) => {
  const client = getTypesenseClient()
  const existing = await client.collections().retrieve()
  const exists = existing.some((collection: any) => collection?.name === schema.name)
  if (!exists) {
    await client.collections().create(schema as any)
  }
  return {
    name: schema.name,
    exists,
  }
}

export const readTypesenseServiceHealth = async () => {
  const client = getTypesenseClient()
  const config = resolveTypesenseServiceConfig()
  const health = await client.health.retrieve()
  const collections = await client.collections().retrieve()
  const names = Array.isArray(collections)
    ? collections
        .map((entry: any) => String(entry?.name || '').trim())
        .filter((entry: string) => entry.length > 0)
    : []

  return {
    ok: Boolean((health as any)?.ok),
    service: {
      baseUrl: config.baseUrl,
    },
    health,
    collectionCount: names.length,
    collections: names,
  }
}

export const countTypesenseDocuments = async (
  collectionName: string,
  options?: { queryBy?: string[]; filterBy?: string },
) => {
  try {
    const fallbackQueryBy = toQueryBy(options?.queryBy)
    const candidates = Array.from(new Set([...fallbackQueryBy, 'id', 'name']))
    const { result } = await runSearch(
      collectionName,
      {
        q: '*',
        per_page: 1,
        page: 1,
        filter_by: options?.filterBy || undefined,
      },
      candidates,
    )
    const found = Number((result as any)?.found)
    return Number.isFinite(found) ? found : 0
  }
  catch (error: any) {
    if (isNotFoundError(error)) return 0
    throw error
  }
}

export const readTypesenseDocumentsPage = async (
  collectionName: string,
  options?: TypesenseSearchOptions,
): Promise<TypesenseDocumentPage> => {
  const limit = Math.max(1, Number(options?.limit ?? 50))
  const start = Math.max(0, Number(options?.start ?? 0))
  const query = String(options?.query ?? '').trim() || '*'
  const page = Math.floor(start / limit) + 1
  const pageOffset = start % limit
  const perPage = limit + pageOffset

  const queryByList = toQueryBy(options?.queryBy)
  const queryByCandidates = Array.from(new Set([...queryByList, 'id', 'name']))

  try {
    const { queryBy, result } = await runSearch(
      collectionName,
      {
        q: query,
        per_page: perPage,
        page,
        filter_by: options?.filterBy || undefined,
        sort_by: options?.sortBy || undefined,
      },
      queryByCandidates,
    )

    const hits = Array.isArray((result as any)?.hits) ? (result as any).hits : []
    const docs = hits
      .map((entry: any) => entry?.document)
      .filter((entry: any) => Boolean(entry))
      .slice(pageOffset, pageOffset + limit)
      .map((entry: any) => {
        if (!entry || typeof entry !== 'object') return entry
        if (typeof entry.id === 'string') return entry
        if (typeof entry.id === 'number') return { ...entry, id: String(entry.id) }
        return entry
      })

    const found = Number((result as any)?.found)
    return {
      collection: collectionName,
      queryBy,
      count: Number.isFinite(found) ? found : docs.length,
      documents: docs,
    }
  }
  catch (error: any) {
    if (isNotFoundError(error)) {
      return {
        collection: collectionName,
        queryBy: queryByList[0] || 'id',
        count: 0,
        documents: [],
      }
    }
    throw error
  }
}

export const readTypesenseDocumentById = async (
  collectionName: string,
  id: string | number,
) => {
  const client = getTypesenseClient()
  const normalized = normalizeTypesenseId(id)
  return await client.collections(collectionName).documents(normalized).retrieve()
}

export const deleteTypesenseDocumentById = async (
  collectionName: string,
  id: string | number,
) => {
  const client = getTypesenseClient()
  const normalized = normalizeTypesenseId(id)
  return await client.collections(collectionName).documents(normalized).delete()
}
