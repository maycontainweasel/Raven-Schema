import Typesense from 'typesense'
import type { TypesenseCollectionSchema } from '@schema/typesense/collections'
import { useRuntimeConfig } from '#imports'

type TypesenseDoc = Record<string, any>
type ImportAction = 'create' | 'upsert' | 'update' | 'delete'

let cachedClient: Typesense.Client | null = null
let cachedKey = ''

const buildClient = () => {
  const config = useRuntimeConfig() as any
  const publicConfig = config?.public?.typesense ?? {}
  const privateConfig = config?.typesense ?? {}
  const typesense = { ...publicConfig, ...privateConfig }

  const rawHost = String(typesense.host || '')
  let host = rawHost.replace(/^https?:\/\//, '')
  let protocol = rawHost.startsWith('https') ? 'https' : 'http'
  let port = Number(typesense.port || 8108)

  try {
    if (rawHost.startsWith('http')) {
      const url = new URL(rawHost)
      host = url.hostname
      protocol = url.protocol.replace(':', '') || protocol
      if (url.port) port = Number(url.port)
    } else if (host.includes(':')) {
      const [nextHost, nextPort] = host.split(':')
      host = nextHost
      if (nextPort) port = Number(nextPort)
    }
  } catch {
    // keep defaults
  }

  host = host || 'localhost'
  const apiKey = String(typesense.apiKey || '')
  if (!apiKey) {
    throw new Error('Typesense apiKey is required')
  }
  const timeoutRaw = Number(typesense.connectionTimeoutSeconds ?? typesense.timeoutSeconds ?? 8)
  const connectionTimeoutSeconds =
    Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 8
  const retriesRaw = Number(typesense.numRetries ?? 0)
  const numRetries = Number.isFinite(retriesRaw) && retriesRaw >= 0 ? Math.floor(retriesRaw) : 0
  const retryIntervalRaw = Number(typesense.retryIntervalSeconds ?? 0.25)
  const retryIntervalSeconds =
    Number.isFinite(retryIntervalRaw) && retryIntervalRaw >= 0 ? retryIntervalRaw : 0.25

  const cacheKey = `${protocol}://${host}:${port}|${apiKey}`
  if (cachedClient && cachedKey === cacheKey) {
    return cachedClient
  }

  cachedClient = new Typesense.Client({
    nodes: [
      {
        host,
        port,
        protocol,
      },
    ],
    apiKey,
    connectionTimeoutSeconds,
    numRetries,
    retryIntervalSeconds,
  })
  cachedKey = cacheKey
  return cachedClient
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

const ensureCollection = async (schema: TypesenseCollectionSchema) => {
  if (!schema?.name) {
    throw new Error('Typesense collection schema missing name')
  }
  const client = buildClient()
  const existing = await client.collections().retrieve()
  const exists = existing.some((collection: any) => collection?.name === schema.name)
  if (!exists) {
    await client.collections().create(schema as any)
  }
  return { name: schema.name, exists }
}

const parseImportResults = (value: any) => {
  if (!value) return []
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split('\n').filter(Boolean)
      : [value]
  return raw
    .map((item) => {
      if (item && typeof item === 'object') return item as Record<string, any>
      if (typeof item === 'string') {
        const trimmed = item.trim()
        if (!trimmed) return null
        try {
          return JSON.parse(trimmed) as Record<string, any>
        } catch {
          return { error: trimmed }
        }
      }
      if (item === null || item === undefined) return null
      return { error: String(item) }
    })
    .filter(Boolean) as Record<string, any>[]
}

const summarizeImportResults = (results: Record<string, any>[], fallbackTotal: number) => {
  if (!results.length) {
    return { imported: 0, failed: fallbackTotal }
  }
  const imported = results.filter((item) => item?.success === true).length
  const failed = results.filter((item) => item?.success === false || item?.error).length
  return {
    imported,
    failed: failed || Math.max(0, results.length - imported),
  }
}

export async function upsertTypesenseDocuments(
  schema: TypesenseCollectionSchema | null | undefined,
  documents: TypesenseDoc[],
  action: ImportAction = 'upsert'
) {
  if (!schema) {
    throw new Error('Typesense collection schema is required')
  }
  const client = buildClient()
  const { name } = await ensureCollection(schema)
  if (!documents?.length) {
    return { name, imported: 0, action }
  }
  const normalized = documents.map((doc) => normalizeDocId(doc))
  try {
    const result = await client.collections(name).documents().import(normalized as any, { action })
    const results = parseImportResults(result)
    const summary = summarizeImportResults(results, normalized.length)
    return {
      name,
      action,
      ok: summary.failed === 0,
      ...summary,
      importResults: results,
      results,
    }
  } catch (error: any) {
    const results = parseImportResults(error?.importResults)
    if (results.length || error?.name === 'ImportError') {
      const summary = summarizeImportResults(results, normalized.length)
      return {
        name,
        action,
        ok: false,
        ...summary,
        importResults: results,
        results,
        error: {
          message: error?.message || 'Typesense import failed',
          code: error?.code,
        },
      }
    }
    throw error
  }
}
