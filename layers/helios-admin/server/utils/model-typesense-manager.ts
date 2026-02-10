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
  count?: (input: { data?: Record<string, any> }) => Promise<any>
  list?: (input: { data?: { limit?: number, start?: number } }) => Promise<any>
  resource: (input: { data: { id: string | number } }) => Promise<any>
  refresh: (input: { data?: { limit?: number, start?: number } }) => Promise<any>
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
  const idRaw = payload.id
  const id = typeof idRaw === 'number' || typeof idRaw === 'string'
    ? normalizeTypesenseId(idRaw)
    : normalizeTypesenseId(String(idRaw ?? '').trim())

  if (action === 'refreshCollection' || action === 'bulkImport') {
    const result = await caller.refresh({
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
    const resource = await caller.resource({ data: { id } })
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
