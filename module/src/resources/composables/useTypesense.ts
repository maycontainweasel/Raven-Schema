import type { TypesenseCollectionSchema } from '@schema/typesense/collections'
import { collections as generatedCollections, collectionList } from '@schema/typesense/collections'

type TypesenseDoc = Record<string, any>

type ImportAction = 'create' | 'upsert' | 'update' | 'delete'

type ResolvedCollection = {
  key: string
  schema: TypesenseCollectionSchema
  name: string
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
  const normalised = normalizeKey(key)
  const resolved = collectionLookup.get(normalised)
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

export function useTypesense() {
  const { $typesense } = useNuxtApp()
  if (!$typesense) {
    throw new Error('Typesense client not available. Ensure schema-kit module is installed.')
  }

  const getCollectionKeys = () => Object.keys(generatedCollections)

  const getCollectionsMap = () => generatedCollections

  const getCollections = () => collectionList

  const getCollection = (key: string) => resolveCollection(key)

  const getCollectionSchema = (key: string) => resolveCollection(key).schema

  const getCollectionName = (key: string) => resolveCollection(key).name

  const getRemoteCollections = async () => {
    return await $typesense.collections().retrieve()
  }

  const ensureCollection = async (key: string) => {
    const { schema, name } = resolveCollection(key)
    const existing = await $typesense.collections().retrieve()
    const exists = existing.some((collection: any) => collection?.name === name)
    if (!exists) {
      return await $typesense.collections().create(schema)
    }
    return { name, exists: true }
  }

  const clearCollection = async (key: string) => {
    const { schema, name } = resolveCollection(key)
    const existing = await $typesense.collections().retrieve()
    const exists = existing.some((collection: any) => collection?.name === name)
    if (exists) {
      await $typesense.collections(name).delete()
    }
    return await $typesense.collections().create(schema)
  }

  const upsertDocument = async (key: string, document: TypesenseDoc, fallbackId?: string) => {
    const { name } = resolveCollection(key)
    await ensureCollection(key)
    const normalized = normalizeDocId(document, fallbackId)
    return await $typesense.collections(name).documents().upsert(normalized)
  }

  const upsertDocuments = async (
    key: string,
    documents: TypesenseDoc[],
    action: ImportAction = 'upsert'
  ) => {
    const { name } = resolveCollection(key)
    await ensureCollection(key)
    const normalized = documents.map((doc) => normalizeDocId(doc))
    return await $typesense.collections(name).documents().import(normalized, { action })
  }

  const deleteDocument = async (key: string, id: string) => {
    const { name } = resolveCollection(key)
    await ensureCollection(key)
    return await $typesense.collections(name).documents(id).delete()
  }

  const search = async (key: string, params: Record<string, any>) => {
    const { name } = resolveCollection(key)
    await ensureCollection(key)
    return await $typesense.collections(name).documents().search(params)
  }

  return {
    getCollectionKeys,
    getCollectionsMap,
    getCollections,
    getCollection,
    getCollectionSchema,
    getCollectionName,
    getRemoteCollections,
    ensureCollection,
    clearCollection,
    upsertDocument,
    upsertDocuments,
    deleteDocument,
    search,
  }
}
