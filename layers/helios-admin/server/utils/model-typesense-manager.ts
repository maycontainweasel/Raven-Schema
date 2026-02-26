import type { H3Event } from 'h3'
import { createContext } from '@schema/server/trpc/context'
import { collections } from '@schema/typesense/collections'
import { upsertTypesenseDocuments } from '@schema/server/typesense'
import { appRouter } from '~~/server/trpc/routers/_app'
import {
  countTypesenseDocuments,
  deleteTypesenseDocumentById,
  ensureTypesenseCollection,
  normalizeTypesenseId,
  readTypesenseDocumentById,
  readTypesenseDocumentsPage,
} from './typesense-service'

type TypesenseCaller = {
  collection: () => Promise<any>
  count?: (input: { instance?: string, data?: Record<string, any> }) => Promise<any>
  list?: (input: { instance?: string, data?: { limit?: number, start?: number } }) => Promise<any>
  resource: (input: { instance?: string, data: { id: string | number } }) => Promise<any>
  refresh: (input: { instance?: string, data?: { limit?: number, start?: number } }) => Promise<any>
}

const extractFirstObject = (value: any): Record<string, any> | null => {
  if (!value) return null
  if (Array.isArray(value)) {
    for (const entry of value) {
      const next = extractFirstObject(entry)
      if (next) return next
    }
    return null
  }
  if (typeof value === 'object') return value as Record<string, any>
  return null
}

const optionalNumber = (value: unknown): number | undefined => {
  const text = String(value ?? '').trim()
  if (!text.length) return undefined
  const parsed = Number(text)
  if (!Number.isFinite(parsed)) return undefined
  return parsed
}

const optionalString = (value: unknown): string | undefined => {
  const text = String(value ?? '').trim()
  return text.length ? text : undefined
}

const flattenObjects = (value: any): Record<string, any>[] => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.flatMap(entry => flattenObjects(entry))
  }
  if (typeof value === 'object') return [value as Record<string, any>]
  return []
}

const extractFirstNumber = (value: any): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const next = extractFirstNumber(entry)
      if (typeof next === 'number') return next
    }
    return null
  }
  if (value && typeof value === 'object') {
    for (const key of ['count', 'total', 'value']) {
      const next = extractFirstNumber((value as any)[key])
      if (typeof next === 'number') return next
    }
  }
  return null
}

const filterByInstanceTag = (docs: Record<string, any>[], instanceFilter?: string) => {
  if (!instanceFilter) return docs
  return docs.filter((doc) => {
    const tags = (doc as any)?.instances
    if (!Array.isArray(tags)) return false
    return tags.map(entry => String(entry)).includes(instanceFilter)
  })
}

const resolveCollectionSchema = (
  modelKey: string,
  collectionDef: any,
) => {
  const direct = (collections as any)?.[modelKey]
  if (direct) return direct

  const collectionName = String(collectionDef?.name || '').trim()
  if (!collectionName) return null

  const all = Object.values((collections as any) || {})
  return all.find((entry: any) => String(entry?.name || '').trim() === collectionName) ?? null
}

const resolveCollectionName = (modelKey: string, collectionDef: any, collectionSchema: any) => {
  return String(
    collectionSchema?.name
      || collectionDef?.name
      || modelKey,
  )
    .trim()
    .toLowerCase()
}

const resolveCollectionQueryBy = (collectionDef: any, collectionSchema: any) => {
  const rawFields = Array.isArray(collectionDef?.fields)
    ? collectionDef.fields
    : Array.isArray(collectionSchema?.fields)
      ? collectionSchema.fields
      : []

  const names = rawFields
    .map((entry: any) => String(entry?.name || '').trim())
    .filter((name: string) => name.length > 0 && name !== '.*')
  return names.length ? names : ['id']
}

const getCaller = async (event: H3Event, modelKey: string): Promise<TypesenseCaller> => {
  const context = await createContext(event)
  const caller = appRouter.createCaller(context as any) as any
  const modelCaller = caller?.[modelKey]
  const typesenseCaller = modelCaller?.typesense

  if (!typesenseCaller) {
    throw new Error(`No generated Typesense router found for "${modelKey}".`)
  }

  return typesenseCaller as TypesenseCaller
}

export const readTypesenseStatus = async (
  event: H3Event,
  modelKey: string,
  options?: { previewLimit?: number, previewStart?: number },
) => {
  const caller = await getCaller(event, modelKey)
  const collection = await caller.collection()
  const collectionSchema = resolveCollectionSchema(modelKey, collection)
  const collectionName = resolveCollectionName(modelKey, collection, collectionSchema)
  const queryBy = resolveCollectionQueryBy(collection, collectionSchema)
  const preview = await readTypesenseDocumentsPage(collectionName, {
    limit: options?.previewLimit ?? 10,
    start: options?.previewStart ?? 0,
    queryBy,
  })
  const count = await countTypesenseDocuments(collectionName, { queryBy })

  return {
    collection: collectionSchema || collection,
    count,
    preview: preview.documents,
  }
}

export const runTypesenseAction = async (
  event: H3Event,
  modelKey: string,
  action: string,
  payload: Record<string, unknown>,
) => {
  const caller = await getCaller(event, modelKey)
  const collection = await caller.collection()
  const collectionSchema = resolveCollectionSchema(modelKey, collection)
  const collectionName = resolveCollectionName(modelKey, collection, collectionSchema)
  const queryBy = resolveCollectionQueryBy(collection, collectionSchema)

  const limit = optionalNumber(payload.limit)
  const start = optionalNumber(payload.start)
  const batchSize = Math.max(1, optionalNumber(payload.batchSize) ?? 200)
  const instance = optionalString(payload.instance)
  const instanceFilter = optionalString(payload.instanceFilter)
  const idRaw = payload.id
  const id = typeof idRaw === 'number' || typeof idRaw === 'string'
    ? normalizeTypesenseId(idRaw)
    : normalizeTypesenseId(String(idRaw ?? '').trim())

  if (action === 'testSingle') {
    if (!caller.list) {
      throw new Error(`Generated Typesense list endpoint is missing for "${modelKey}".`)
    }

    const page = await caller.list({
      instance,
      data: {
        limit: 1,
        start: typeof start === 'number' ? start : 0,
      },
    })
    const docs = flattenObjects(page)
    const filteredDocs = filterByInstanceTag(docs, instanceFilter)
    const record = filteredDocs[0] ?? null

    return {
      action,
      result: {
        ok: Boolean(record),
        instance: instance ?? null,
        instanceFilter: instanceFilter ?? null,
        fetched: docs.length,
        filtered: filteredDocs.length,
        record,
      },
    }
  }

  if (action === 'refreshCollection' || action === 'bulkImport') {
    if (!collectionSchema) throw new Error(`Typesense collection schema missing for "${modelKey}".`)

    if (!caller.list) {
      const result = await caller.refresh({
        instance,
        data: {
          limit,
          start,
        },
      })
      return {
        action,
        result,
      }
    }

    const countResult = caller.count
      ? await caller.count({ instance, data: {} })
      : null
    const total = extractFirstNumber(countResult) ?? 0

    let cursor = typeof start === 'number' && start >= 0 ? start : 0
    let fetched = 0
    let filtered = 0
    let upserted = 0
    let batches = 0
    const batchSummaries: Array<{
      start: number
      fetched: number
      filtered: number
      upserted: number
    }> = []

    while (true) {
      const page = await caller.list({
        instance,
        data: {
          limit: batchSize,
          start: cursor,
        },
      })
      const docs = flattenObjects(page)
      const fetchedCount = docs.length
      if (!fetchedCount) break
      fetched += fetchedCount

      const filteredDocs = filterByInstanceTag(docs, instanceFilter)

      const filteredCount = filteredDocs.length
      filtered += filteredCount

      let importedCount = 0
      if (filteredCount > 0) {
        const importResult = await upsertTypesenseDocuments(collectionSchema, filteredDocs, 'upsert')
        importedCount = extractFirstNumber((importResult as any)?.imported) ?? filteredCount
        upserted += importedCount
      }

      batchSummaries.push({
        start: cursor,
        fetched: fetchedCount,
        filtered: filteredCount,
        upserted: importedCount,
      })
      batches += 1

      if (fetchedCount < batchSize) break
      cursor += batchSize
    }

    const result = {
      ok: true,
      instance: instance ?? null,
      instanceFilter: instanceFilter ?? null,
      total,
      fetched,
      filtered,
      upserted,
      batches,
      batchSummaries,
    }
    return {
      action,
      result,
    }
  }

  if (action === 'ensureCollection') {
    if (!collectionSchema) throw new Error(`Typesense collection schema missing for "${modelKey}".`)
    const ensureResult = await ensureTypesenseCollection(collectionSchema)
    return {
      action,
      collection,
      result: ensureResult,
    }
  }

  if (action === 'listRecords') {
    const result = await readTypesenseDocumentsPage(collectionName, {
      limit: typeof limit === 'number' ? limit : 50,
      start: typeof start === 'number' ? start : 0,
      queryBy,
    })
    return {
      action,
      result: result.documents,
    }
  }

  if (action === 'inspectRecord') {
    if (!id) throw new Error('inspectRecord requires an id.')
    const result = await readTypesenseDocumentById(collectionName, id)
    return {
      action,
      result: extractFirstObject(result) ?? result,
    }
  }

  if (action === 'addRecord') {
    if (!id) throw new Error('addRecord requires an id.')
    if (!collectionSchema) throw new Error(`Typesense collection schema missing for "${modelKey}".`)
    const resource = await caller.resource({
      instance,
      data: { id },
    })
    const document = extractFirstObject(resource)
    if (!document) throw new Error(`No Typesense view resource found for id "${String(id)}".`)
    const upsertResult = await upsertTypesenseDocuments(collectionSchema, [document], 'upsert')
    return {
      action,
      collection,
      result: upsertResult,
      document,
    }
  }

  if (action === 'removeRecord') {
    if (!id) throw new Error('removeRecord requires an id.')
    const deleteResult = await deleteTypesenseDocumentById(collectionName, id)
    return {
      action,
      collection,
      result: deleteResult,
      id: String(id),
    }
  }

  if (action === 'countRecords') {
    const result = await countTypesenseDocuments(collectionName, { queryBy })
    return {
      action,
      result,
    }
  }

  throw new Error(`Unsupported Typesense action "${action}".`)
}
