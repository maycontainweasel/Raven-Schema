import type { H3Event } from 'h3'
import { collections } from '@schema/typesense/collections'
import { createContext } from '@schema/server/trpc/context'
import { upsertTypesenseDocuments } from '@schema/server/typesense'
import type { ModelLayoutSpec, ModelManagerModel } from './model-manager'
import { appRouter } from '~~/server/trpc/routers/_app'
import { readTypesenseDocumentsPage } from './typesense-service'

type AnyRecord = Record<string, any>

type ModelCaller = {
  create?: (input: { data?: Record<string, any> }) => Promise<any>
  update?: (input: { data?: Record<string, any> }) => Promise<any>
  typesense?: {
    list?: (input: { data?: { limit?: number, start?: number } }) => Promise<any>
    count?: (input: { data?: Record<string, any> }) => Promise<any>
    resource?: (input: { data: { id: string | number } }) => Promise<any>
  }
}

type ResolvedModelCaller = {
  caller: ModelCaller
  routerKey: string
}

export type RuntimeRecordIdentifiers = {
  rid: string | null
  subId: string | null
  table: string | null
}

const unique = <T>(value: T[]) => Array.from(new Set(value))

const slugify = (value: string, fallback: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || fallback
}

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}

const extractFirstObject = (value: any): AnyRecord | null => {
  if (!value) return null
  if (Array.isArray(value)) {
    for (const entry of value) {
      const next = extractFirstObject(entry)
      if (next) return next
    }
    return null
  }
  if (typeof value === 'object') return value as AnyRecord
  return null
}

const normalizeList = (value: any): AnyRecord[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => extractFirstObject(entry))
      .filter(Boolean) as AnyRecord[]
  }

  const first = extractFirstObject(value)
  return first ? [first] : []
}

const resolveCount = (value: any): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (Array.isArray(value)) return value.length ? resolveCount(value[0]) : 0
  if (value && typeof value === 'object') {
    const candidate = (value as AnyRecord).count ?? (value as AnyRecord).value ?? (value as AnyRecord).result
    return resolveCount(candidate)
  }
  return 0
}

const normalizeSubId = (value: unknown): string | null => {
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  return null
}

const parseRidString = (value: string): { table: string, subId: string } | null => {
  const trimmed = value.trim()
  if (!trimmed.includes(':')) return null
  const [table, ...rest] = trimmed.split(':')
  const subId = rest.join(':').trim()
  if (!table?.trim() || !subId) return null
  return {
    table: table.trim(),
    subId,
  }
}

const resolveCreateActionProcedure = (modelKey: string, action: unknown) => {
  const normalizedModel = String(modelKey || '').trim().toLowerCase()
  const raw = String(action ?? '').trim() || `${normalizedModel}.create`
  const segments = raw
    .split('.')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)

  if (!segments.length || segments.length > 2) {
    throw new Error(`Invalid create action "${raw}". Expected "${normalizedModel}.create" or "${normalizedModel}.<name>".`)
  }

  const procedure = segments.length === 1 ? segments[0]! : segments[1]!
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(procedure)) {
    throw new Error(`Invalid create action "${raw}". Procedure "${procedure}" is not a valid function name.`)
  }

  if (segments.length === 2) {
    const targetModel = segments[0]!.toLowerCase()
    if (targetModel !== normalizedModel) {
      throw new Error(`Invalid create action "${raw}". Cross-model create actions are not allowed.`)
    }
  }

  return procedure
}

export const resolveRuntimeRecordIdentifiers = (
  value: unknown,
  fallbackTable?: string,
): RuntimeRecordIdentifiers => {
  const source = value as AnyRecord

  const candidates = unique([
    source?.rid,
    source?.id,
    source?.recordId,
    source?.record_id,
    source?.record?.id,
  ].filter((entry) => typeof entry !== 'undefined' && entry !== null))

  for (const candidate of candidates) {
    if (!candidate) continue

    if (typeof candidate === 'object') {
      const table = String((candidate as AnyRecord).tb ?? fallbackTable ?? '').trim() || null
      const nested = normalizeSubId((candidate as AnyRecord).id ?? (candidate as AnyRecord).value)
      if (table && nested) {
        return {
          rid: `${table}:${nested}`,
          subId: nested,
          table,
        }
      }
    }

    if (typeof candidate === 'string') {
      const parsed = parseRidString(candidate)
      if (parsed) {
        return {
          rid: `${parsed.table}:${parsed.subId}`,
          subId: parsed.subId,
          table: parsed.table,
        }
      }

      const normalized = normalizeSubId(candidate)
      if (normalized) {
        const table = fallbackTable?.trim() || null
        return {
          rid: table ? `${table}:${normalized}` : null,
          subId: normalized,
          table,
        }
      }
    }

    if (typeof candidate === 'number') {
      const subId = String(candidate)
      const table = fallbackTable?.trim() || null
      return {
        rid: table ? `${table}:${subId}` : null,
        subId,
        table,
      }
    }
  }

  return {
    rid: null,
    subId: null,
    table: fallbackTable?.trim() || null,
  }
}

const toInputId = (value: string | number): string | number => {
  if (typeof value === 'number') return value
  const text = String(value).trim()
  if (!text.length) return text
  if (/^-?\d+$/.test(text)) {
    const asNumber = Number(text)
    if (Number.isFinite(asNumber)) return asNumber
  }
  return text
}

const normalizeLookupToken = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const toCamelCase = (value: unknown) => {
  const source = String(value ?? '').trim()
  if (!source.length) return ''
  return source
    .replace(/[_\-\s]+([A-Za-z0-9])/g, (_, token: string) => token.toUpperCase())
    .replace(/^[A-Z]/, token => token.toLowerCase())
}

const resolveModelCallerCandidates = (model: ModelManagerModel) =>
  unique([
    model.routerKey,
    model.modelKey,
    model.table,
    toCamelCase(model.routerKey),
    toCamelCase(model.modelKey),
    toCamelCase(model.table),
  ]
    .map(value => String(value ?? '').trim())
    .filter(value => value.length > 0))

const resolveModelCaller = async (
  event: H3Event,
  model: ModelManagerModel,
): Promise<ResolvedModelCaller> => {
  const context = await createContext(event)
  const caller = appRouter.createCaller(context as any) as AnyRecord

  const candidateKeys = resolveModelCallerCandidates(model)
  for (const key of candidateKeys) {
    const modelCaller = caller?.[key]
    if (modelCaller) {
      return {
        caller: modelCaller as ModelCaller,
        routerKey: key,
      }
    }
  }

  const availableKeys = Object.keys(caller || {})
  const normalizedToKey = new Map<string, string>()
  for (const key of availableKeys) {
    const normalized = normalizeLookupToken(key)
    if (normalized && !normalizedToKey.has(normalized)) {
      normalizedToKey.set(normalized, key)
    }
  }

  for (const candidate of candidateKeys) {
    const normalized = normalizeLookupToken(candidate)
    const resolvedKey = normalizedToKey.get(normalized)
    if (!resolvedKey) continue
    const modelCaller = caller?.[resolvedKey]
    if (!modelCaller) continue
    return {
      caller: modelCaller as ModelCaller,
      routerKey: resolvedKey,
    }
  }

  throw new Error(`No generated model router found for "${model.modelKey}". Tried: ${candidateKeys.join(', ')}`)
}

const resolveTypesenseCollection = (
  model: ModelManagerModel,
  routerKey: string,
) => {
  const allCollections = collections as Record<string, any>

  const candidates = unique([
    model.typesenseCollection,
    model.table,
    model.modelKey,
    routerKey,
    toCamelCase(routerKey),
  ]
    .map(value => String(value ?? '').trim())
    .filter(value => value.length > 0))

  for (const key of candidates) {
    const collection = allCollections[key]
    if (collection) return collection
  }

  const normalizedToCollection = new Map<string, any>()
  for (const [key, collection] of Object.entries(allCollections)) {
    const normalized = normalizeLookupToken(key)
    if (normalized && !normalizedToCollection.has(normalized)) {
      normalizedToCollection.set(normalized, collection)
    }
  }

  for (const key of candidates) {
    const collection = normalizedToCollection.get(normalizeLookupToken(key))
    if (collection) return collection
  }

  return null
}

const syncTypesenseRecord = async (
  model: ModelManagerModel,
  routerKey: string,
  modelCaller: ModelCaller,
  subId: string | null,
) => {
  if (!subId || !modelCaller.typesense?.resource) return null
  const collection = resolveTypesenseCollection(model, routerKey)
  if (!collection) return null

  const resourceRaw = await modelCaller.typesense.resource({
    data: { id: toInputId(subId) },
  })
  const document = extractFirstObject(resourceRaw)
  if (!document) return null

  const result = await upsertTypesenseDocuments(collection, [document], 'upsert')
  return {
    document,
    result,
  }
}

const normalizeDirectoryRecord = (
  record: AnyRecord,
  fallbackTable: string,
) => {
  const identifiers = resolveRuntimeRecordIdentifiers(record, fallbackTable)
  return {
    ...record,
    rid: identifiers.rid || record.rid || '',
    __subId: identifiers.subId || '',
    __table: identifiers.table || fallbackTable,
  }
}

const resolveSlugPolicyValue = (
  spec: ModelLayoutSpec,
  record: AnyRecord,
  identifiers: RuntimeRecordIdentifiers,
  fallbackTable: string,
) => {
  const policy = spec.directory.slugPolicy
  const fallback = identifiers.subId || identifiers.rid || `record-${Date.now()}`
  const directSlug = String(record.slug ?? record.key ?? '').trim()
  const titleSeed = String(record.title ?? record.name ?? (directSlug || fallback)).trim()

  if (policy === 'rid') {
    if (identifiers.rid) return identifiers.rid
    if (identifiers.subId) return `${identifiers.table || fallbackTable}:${identifiers.subId}`
    return fallback
  }

  if (policy === 'id') {
    return identifiers.subId || fallback
  }

  if (policy === 'slug' || policy === 'custom') {
    if (directSlug) return slugify(directSlug, fallback)
    return slugify(titleSeed, fallback)
  }

  return fallback
}

const slugLookupCandidates = (slugValue: string): Array<string | number> => {
  const decoded = safeDecode(slugValue).trim()
  if (!decoded.length) return []

  const parsed = parseRidString(decoded)
  const candidates: Array<string | number> = []
  if (parsed?.subId) {
    candidates.push(toInputId(parsed.subId))
  }

  if (!parsed) {
    candidates.push(toInputId(decoded))
  }

  return unique(candidates.map((entry) => String(entry))).map((entry) => toInputId(entry))
}

export const readModelDirectoryRecords = async (
  event: H3Event,
  model: ModelManagerModel,
  spec?: ModelLayoutSpec,
  options?: {
    limit?: number
    start?: number
    query?: string
    filterBy?: string
    sortBy?: string
  },
) => {
  const collectionName = String(
    spec?.directory?.typesense?.collection
      || model.typesenseCollection
      || model.table
      || model.modelKey,
  )
    .trim()
    .toLowerCase()

  const queryBy = unique([
    ...(spec?.directory?.typesense?.queryBy || []),
    ...(model.typesenseFields || []),
  ])
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0)

  const resolvedModelCaller = await resolveModelCaller(event, model)
  const modelCaller = resolvedModelCaller.caller
  const readFallback = async () => {
    const typesense = modelCaller.typesense
    if (!typesense?.list || !typesense?.count) {
      return {
        records: [] as AnyRecord[],
        count: 0,
        source: 'fallback' as const,
        collection: collectionName,
        queryBy: queryBy[0] || 'id',
      }
    }

    const listRaw = await typesense.list({
      data: {
        limit: typeof options?.limit === 'number' ? options.limit : 250,
        start: typeof options?.start === 'number' ? options.start : 0,
      },
    })
    const countRaw = await typesense.count({ data: {} })

    return {
      records: normalizeList(listRaw).map(record => normalizeDirectoryRecord(record, model.table)),
      count: resolveCount(countRaw),
      source: 'fallback' as const,
      collection: collectionName,
      queryBy: queryBy[0] || 'id',
    }
  }

  if (spec?.directory?.typesense?.enabled) {
    try {
      const page = await readTypesenseDocumentsPage(collectionName, {
        query: options?.query,
        queryBy,
        limit: typeof options?.limit === 'number' ? options.limit : 250,
        start: typeof options?.start === 'number' ? options.start : 0,
        filterBy: options?.filterBy,
        sortBy: options?.sortBy,
      })

      return {
        records: page.documents.map((record) => normalizeDirectoryRecord(record, model.table)),
        count: page.count,
        source: 'typesense' as const,
        collection: page.collection,
        queryBy: page.queryBy,
      }
    }
    catch (error: any) {
      console.warn(
        `[helios-admin] Typesense read failed for "${model.modelKey}" (${collectionName}); using fallback list/count.`,
        error?.message || error,
      )
      return await readFallback()
    }
  }

  return await readFallback()
}

const buildSyncResult = async (
  model: ModelManagerModel,
  spec: ModelLayoutSpec,
  resolvedModelCaller: ResolvedModelCaller,
  recordLike: AnyRecord,
) => {
  const modelCaller = resolvedModelCaller.caller
  const identifiers = resolveRuntimeRecordIdentifiers(recordLike, model.table)
  const slug = resolveSlugPolicyValue(spec, recordLike, identifiers, model.table)
  const routeBase = spec.directory.route.replace(/\/+$/, '')
  const redirectTo = `${routeBase}/${encodeURIComponent(slug)}`

  const typesense = spec.directory.typesense.enabled
    ? await syncTypesenseRecord(model, resolvedModelCaller.routerKey, modelCaller, identifiers.subId)
    : null

  return {
    identifiers,
    slug,
    redirectTo,
    typesense,
  }
}

export const createModelDirectoryRecord = async (
  event: H3Event,
  model: ModelManagerModel,
  spec: ModelLayoutSpec,
  payload: Record<string, any>,
) => {
  const resolvedModelCaller = await resolveModelCaller(event, model)
  const modelCaller = resolvedModelCaller.caller
  const procedure = resolveCreateActionProcedure(model.modelKey, spec.directory.createDialog?.action)
  const createProcedure = (modelCaller as AnyRecord)?.[procedure]

  if (typeof createProcedure !== 'function') {
    throw new Error(`Model "${model.modelKey}" does not expose a "${procedure}" create endpoint.`)
  }

  const createdRaw = await createProcedure({ data: payload || {} })
  const created = extractFirstObject(createdRaw)
  if (!created) {
    throw new Error(`Create for "${model.modelKey}" did not return a record.`)
  }

  const sync = await buildSyncResult(model, spec, resolvedModelCaller, created)

  return {
    created,
    ...sync,
  }
}

export const syncModelDirectoryRecord = async (
  event: H3Event,
  model: ModelManagerModel,
  spec: ModelLayoutSpec,
  payload: {
    record?: Record<string, any> | null
    id?: string | number | null
  },
) => {
  const resolvedModelCaller = await resolveModelCaller(event, model)
  const modelCaller = resolvedModelCaller.caller
  const explicitId = payload?.id
  const record = extractFirstObject(payload?.record)

  const fallback = (() => {
    if (record) return record
    if (typeof explicitId === 'undefined' || explicitId === null) return null
    return { id: explicitId }
  })()

  if (!fallback) {
    throw new Error('syncModelDirectoryRecord requires a record or id.')
  }

  const sync = await buildSyncResult(model, spec, resolvedModelCaller, fallback)
  return {
    record: fallback,
    ...sync,
  }
}

export const readModelRecordBySlug = async (
  event: H3Event,
  model: ModelManagerModel,
  slugValue: string,
) => {
  const resolvedModelCaller = await resolveModelCaller(event, model)
  const modelCaller = resolvedModelCaller.caller
  const resource = modelCaller.typesense?.resource
  if (!resource) {
    return null
  }

  const candidates = slugLookupCandidates(slugValue)
  if (!candidates.length) return null

  for (const id of candidates) {
    try {
      const raw = await resource({ data: { id } })
      const record = extractFirstObject(raw)
      if (!record) continue
      const identifiers = resolveRuntimeRecordIdentifiers(record, model.table)
      return {
        record,
        identifiers,
      }
    }
    catch {
      continue
    }
  }

  return null
}

export const updateModelRecordBySlug = async (
  event: H3Event,
  model: ModelManagerModel,
  slugValue: string,
  payload: Record<string, any>,
  explicitId?: unknown,
) => {
  const resolvedModelCaller = await resolveModelCaller(event, model)
  const modelCaller = resolvedModelCaller.caller
  if (!modelCaller.update) {
    throw new Error(`Model "${model.modelKey}" does not expose an update endpoint.`)
  }

  const parsedExplicit = explicitId && typeof explicitId === 'string'
    ? parseRidString(explicitId)
    : null
  const normalizedExplicit = normalizeSubId(parsedExplicit?.subId || (explicitId as any))

  let updateId = normalizedExplicit
  if (!updateId) {
    const candidates = slugLookupCandidates(slugValue)
    const first = candidates[0]
    updateId = typeof first === 'number' ? String(first) : (first ? String(first) : null)
  }

  if (!updateId) {
    throw new Error('Could not resolve record id for update.')
  }

  const updatedRaw = await modelCaller.update({
    data: {
      id: toInputId(updateId),
      payload,
    },
  })

  const updated = extractFirstObject(updatedRaw)
  const identifiers = resolveRuntimeRecordIdentifiers(updated || { id: updateId }, model.table)
  const typesense = await syncTypesenseRecord(
    model,
    resolvedModelCaller.routerKey,
    modelCaller,
    identifiers.subId || updateId,
  )

  return {
    updated,
    identifiers,
    typesense,
  }
}
