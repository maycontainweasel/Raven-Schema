import { Surreal } from 'surrealdb'
import { existsSync } from 'fs'
import { readdir, readFile } from 'fs/promises'
import { resolve } from 'path'
import { parse } from 'yaml'
import { dbInstances, defaultDbInstance } from './runtime'
import { setRuntimeConfig } from './runtime-config'
import { writeReport } from './report'
import { models } from '../../modules/schema-kit/runtime/generated/models'

const STATE: {
  instanceKey?: string
  instanceCode?: string
  caller?: any
  apiProxy?: any
  db?: Surreal
  originalUseNuxtApp?: any
  originalUseRuntimeConfig?: any
} = {}

const noop = () => {}
const TEST_PREFIX = process.env.SCHEMA_TEST_PREFIX || 'schema-test-'
const TEST_MARKER = process.env.SCHEMA_TEST_MARKER || '[schema-test]'

export const LRS = (value: any) => {
  if (Array.isArray(value)) {
    const first = value[0]
    const result = first?.result ?? first?.RESULT ?? first
    if (Array.isArray(result)) return result[0] ?? null
    return result ?? null
  }
  if (value && typeof value === 'object' && 'result' in value) {
    const result = (value as any).result
    if (Array.isArray(result)) return result[0] ?? null
    return result ?? null
  }
  return value ?? null
}

export const getTestInstance = () => {
  const envKey = process.env.SCHEMA_TEST_INSTANCE
  if (envKey && envKey in (dbInstances as Record<string, any>)) return envKey
  if (defaultDbInstance && defaultDbInstance in (dbInstances as Record<string, any>)) {
    return defaultDbInstance as string
  }
  return 'pm'
}

export const getTestInstanceCode = () => {
  return STATE.instanceCode || process.env.SCHEMA_TEST_INSTANCE_CODE || getTestInstance()
}

export const getTestLayer = () => process.env.SCHEMA_TEST_LAYER || 'functions'

export const getDbConfig = (instanceKey: string) => {
  const cfg = (dbInstances as Record<string, any>)[instanceKey]
  if (!cfg) {
    throw new Error(`Unknown database instance "${instanceKey}"`)
  }
  return cfg
}

export const createMockEvent = () => {
  const resHeaders = new Map<string, any>()
  const res = {
    getHeader: (key: string) => resHeaders.get(key.toLowerCase()),
    setHeader: (key: string, value: any) => resHeaders.set(key.toLowerCase(), value),
    removeHeader: (key: string) => resHeaders.delete(key.toLowerCase()),
    appendHeader: (key: string, value: any) => {
      const lower = key.toLowerCase()
      const current = resHeaders.get(lower)
      if (!current) resHeaders.set(lower, value)
      else if (Array.isArray(current)) resHeaders.set(lower, [...current, value])
      else resHeaders.set(lower, [current, value])
    },
  }
  const req = { headers: { cookie: '' } }
  return { node: { req, res }, context: {} } as any
}

export const createCallerProxy = (caller: any) => {
  const getByPath = (path: string[]) =>
    path.reduce((acc: any, key) => (acc ? acc[key] : undefined), caller)

  const makeProxy = (path: string[] = []) =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') return undefined
          if (prop === 'mutate' || prop === 'query') {
            return async (input: any) => {
              const fn = getByPath(path)
              if (typeof fn !== 'function') {
                throw new Error(`TRPC procedure not found: ${path.join('.')}`)
              }
              return await fn(input)
            }
          }
          return makeProxy([...path, String(prop)])
        },
      }
    )

  return makeProxy()
}

export const ensureSurreal = async () => {
  if ((globalThis as any).surrealDb) return (globalThis as any).surrealDb as Surreal
  const instanceKey = getTestInstance()
  const cfg = getDbConfig(instanceKey)
  const client = new Surreal()
  const url = cfg.url.endsWith('/rpc') ? cfg.url : `${cfg.url}/rpc`
  try {
    await client.connect(url, {
      namespace: cfg.namespace,
      database: cfg.database,
      auth: {
        username: cfg.username,
        password: cfg.password,
      },
    })
  } catch {
    await client.connect(url)
    await client.signin({ username: cfg.username, password: cfg.password })
    await client.use({ namespace: cfg.namespace, database: cfg.database })
  }
  ;(globalThis as any).surrealDb = client
  STATE.db = client
  return client
}

export const initTestRuntime = async () => {
  if (STATE.caller) return STATE

  const instanceKey = getTestInstance()
  const cfg = getDbConfig(instanceKey)
  STATE.instanceKey = instanceKey
  const instanceCode = process.env.SCHEMA_TEST_INSTANCE_CODE || instanceKey
  STATE.instanceCode = instanceCode
  process.env.SCHEMA_TEST_INSTANCE_CODE = instanceCode

  process.env.SCHEMA_TEST_INSTANCE = instanceKey
  process.env.NUXT_SURREALDB_URL = cfg.url
  process.env.NUXT_SURREALDB_NAMESPACE = cfg.namespace
  process.env.NUXT_SURREALDB_DATABASE = cfg.database
  process.env.NUXT_SURREALDB_USER = cfg.username
  process.env.NUXT_SURREALDB_PASS = cfg.password
  process.env.NUXT_SESSION_SECRET ||= 'schema-test-secret'
  process.env.NODE_ENV ||= 'test'

  await ensureSurreal()
  try {
    await ensureInstanceRecord(instanceCode)
  } catch {
    // ignore instance bootstrap failures during early bootstraps
  }

  if (getTestLayer() === 'functions') {
    return STATE
  }

  const { createContext } = await import('../../server/trpc/context')
  const { appRouter } = await import('../../server/trpc/routers/_app')
  const ctx = await createContext(createMockEvent())
  const caller = appRouter.createCaller(ctx)
  const apiProxy = createCallerProxy(caller)

  const originalImport = (globalThis as any).__import__ || (globalThis as any).import

  STATE.caller = caller
  STATE.apiProxy = apiProxy

  ;(globalThis as any).__schemaTestCaller = caller
  ;(globalThis as any).__schemaTestApi = apiProxy

  STATE.originalUseRuntimeConfig = (globalThis as any).useRuntimeConfig
  STATE.originalUseNuxtApp = (globalThis as any).useNuxtApp

  const runtimeConfig = {
    public: { schemaKit: { appName: 'schema-docs' }, typesense: { host: 'http://127.0.0.1:0', apiKey: 'test', port: '', enableCors: '' } },
    schemaKit: { appName: 'schema-docs' },
    surrealdb: {
      url: cfg.url,
      namespace: cfg.namespace,
      database: cfg.database,
      user: cfg.username,
      pass: cfg.password,
    },
    typesense: { host: 'http://127.0.0.1:0', apiKey: 'test', port: '', enableCors: '' },
  }

  setRuntimeConfig(runtimeConfig)
  ;(globalThis as any).useRuntimeConfig = () => runtimeConfig

  ;(globalThis as any).useNuxtApp = () => ({
    $api: apiProxy,
    $client: apiProxy,
    $notify: noop,
    $sonner: {
      success: noop,
      error: noop,
      info: noop,
    },
  })

  return STATE
}

export const closeTestRuntime = async () => {
  if (STATE.db) {
    try {
      await STATE.db.close()
    } catch {
      // ignore
    }
    STATE.db = undefined
  }
  delete (globalThis as any).surrealDb
  delete (globalThis as any).__schemaTestCaller
  delete (globalThis as any).__schemaTestApi

  if (STATE.originalUseRuntimeConfig) {
    ;(globalThis as any).useRuntimeConfig = STATE.originalUseRuntimeConfig
  }
  if (STATE.originalUseNuxtApp) {
    ;(globalThis as any).useNuxtApp = STATE.originalUseNuxtApp
  }

  STATE.caller = undefined
  STATE.apiProxy = undefined
}

export const getCaller = () => {
  if (!(globalThis as any).__schemaTestCaller) {
    throw new Error('TRPC caller not initialised. Did setup run?')
  }
  return (globalThis as any).__schemaTestCaller as any
}

export const getApiProxy = () => {
  if (!(globalThis as any).__schemaTestApi) {
    throw new Error('TRPC client proxy not initialised. Did setup run?')
  }
  return (globalThis as any).__schemaTestApi as any
}

export const logStep = (title: string, data?: any) => {
  const stamp = new Date().toISOString()
  if (data === undefined) {
    console.log(`[${stamp}] ${title}`)
  } else {
    console.log(`[${stamp}] ${title}`, data)
  }
  writeReport({ time: stamp, message: title, data })
}

export const getTestPrefix = () => TEST_PREFIX
export const getTestMarker = () => TEST_MARKER

export const getRecordSubId = (recordId: any) => {
  if (!recordId) return recordId
  if (typeof recordId === 'object' && 'id' in recordId) return (recordId as any).id
  if (typeof recordId === 'string') {
    const parts = recordId.split(':')
    return parts.length > 1 ? parts.slice(1).join(':') : recordId
  }
  return recordId
}

export const getRecordTable = (recordId: any) => {
  if (!recordId) return undefined
  if (typeof recordId === 'object' && 'tb' in recordId) return (recordId as any).tb
  if (typeof recordId === 'string') {
    const parts = recordId.split(':')
    return parts.length > 1 ? parts[0] : undefined
  }
  return undefined
}

export const isRecordLike = (value: any) => {
  if (!value) return false
  if (typeof value === 'string') return value.includes(':')
  return typeof value === 'object' && 'tb' in value && 'id' in value
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const dbQuery = async (query: string, vars?: Record<string, any>) => {
  const db = await ensureSurreal()
  return db.query(query, vars)
}

export const callDbFunction = async (name: string, args: Record<string, any> = {}) => {
  const fnName = name.startsWith('fn::') ? name : `fn::${name}`
  const keys = Object.keys(args)
  const params = keys.map((key) => `$${key}`).join(', ')
  const query = `RETURN ${fnName}(${params});`
  try {
    const res = await dbQuery(query, args)
    return await LRS(res)
  } catch (error: any) {
    logStep('DB function error', {
      fn: fnName,
      args,
      error: String(error?.message || error),
    })
    throw error
  }
}

export const unwrapResult = (value: any) => {
  if (Array.isArray(value)) {
    const first = value[0]
    return first?.result ?? first?.RESULT ?? first
  }
  return value
}

export const getDbFunctions = async () => {
  const res = await dbQuery('INFO FOR DB;')
  const info = unwrapResult(res) || {}
  const functions =
    info?.functions ||
    info?.FUNCTIONS ||
    info?.function ||
    info?.Function ||
    info?.fn ||
    {}
  return functions as Record<string, any>
}

export const ensureDbFunction = async (name: string) => {
  try {
    const functions = await getDbFunctions()
    const normalized = name.startsWith('fn::') ? name : `fn::${name}`
    if (!functions[normalized] && !functions[name]) {
      throw new Error(`Missing database function ${normalized}`)
    }
  } catch (error: any) {
    const msg = String(error?.message || error)
    if (msg.toLowerCase().includes('iam') || msg.toLowerCase().includes('permission')) {
      logStep('WARN: Skipping function existence check (insufficient permissions)', { name })
      return
    }
    throw error
  }
}

export const ensureTaxonomies = async () => {
  try {
    const res = await dbQuery('RETURN fn::initTaxonomies();')
    logStep('initTaxonomies | ok', { result: unwrapResult(res) })
  } catch (error: any) {
    const msg = String(error?.message || error)
    if (msg.toLowerCase().includes('unknown') || msg.toLowerCase().includes('function')) {
      logStep('WARN: initTaxonomies not available', { error: msg })
      return
    }
    if (msg.toLowerCase().includes('iam') || msg.toLowerCase().includes('permission')) {
      logStep('WARN: Skipping initTaxonomies (insufficient permissions)')
      return
    }
    throw error
  }
}

export const ensureUserRoleTerm = async (key: string, label?: string) => {
  try {
    await dbQuery('DEFINE TABLE IF NOT EXISTS app SCHEMALESS;')
    await dbQuery('UPSERT ONLY app:taxonomies;')
    await dbQuery('RETURN fn::createUserRoleTaxonomy({});')
    await dbQuery('RETURN fn::addUserRoleTerm({ key: $key, label: $label });', {
      key,
      label: label ?? key,
    })
    return true
  } catch (error: any) {
    const msg = String(error?.message || error)
    if (msg.toLowerCase().includes('taxonomy not registered')) {
      logStep('WARN: User role taxonomy not registered', { error: msg })
      return false
    }
    if (msg.toLowerCase().includes('unknown') || msg.toLowerCase().includes('function')) {
      logStep('WARN: User role taxonomy functions not available', { error: msg })
      return false
    }
    if (msg.toLowerCase().includes('iam') || msg.toLowerCase().includes('permission')) {
      logStep('WARN: Skipping user role taxonomy (insufficient permissions)')
      return false
    }
    throw error
  }
}

export const selectRecord = async (table: string, id: any) => {
  const query = `RETURN SELECT * FROM ONLY type::record($table, $id);`
  const res = await dbQuery(query, { table, id })
  return await LRS(res)
}

export const ensureInstanceRecord = async (code?: string) => {
  const instanceCode = code || getTestInstanceCode()
  const existing = await selectRecord('instance', instanceCode)
  if (existing) return existing
  const payload = {
    key: instanceCode,
    instance: instanceCode,
    title: String(instanceCode).toUpperCase(),
    status: 'active',
    active: true,
  }
  const res = await dbQuery(
    'RETURN UPSERT type::record("instance", $code) CONTENT $payload;',
    { code: instanceCode, payload }
  )
  return await LRS(res)
}

export const deleteRecordDirect = async (table: string, id: any) => {
  const query = `RETURN DELETE type::record($table, $id);`
  const res = await dbQuery(query, { table, id })
  return await LRS(res)
}

export const getRecordRid = async (recordId: any, table?: string) => {
  if (!recordId) return recordId
  if (typeof recordId === 'object' && 'tb' in recordId && 'id' in recordId) return recordId
  if (typeof recordId === 'string') {
    if (recordId.includes(':')) {
      const [tb, ...rest] = recordId.split(':')
      const id = rest.join(':')
      const res = await dbQuery('RETURN type::record($table, $id);', { table: tb, id })
      return await LRS(res)
    }
    if (table) {
      const res = await dbQuery('RETURN type::record($table, $id);', { table, id: recordId })
      return await LRS(res)
    }
  }
  if (table) {
    const subId = getRecordSubId(recordId)
    const res = await dbQuery('RETURN type::record($table, $id);', { table, id: subId })
    return await LRS(res)
  }
  return recordId
}

export const getPostRidForRecord = async (recordId: any, table: string) => {
  const rid = await getRecordRid(recordId, table)
  const res = await dbQuery('RETURN fn::PID($rid);', { rid })
  return await LRS(res)
}

export const expectEdgeExists = async (edgeTable: string, inRid: any, outRid: any) => {
  const inRecord = await getRecordRid(inRid)
  const outRecord = await getRecordRid(outRid)
  const res = await dbQuery(`RETURN SELECT * FROM ${edgeTable} WHERE in = $in AND out = $out;`, {
    in: inRecord,
    out: outRecord,
  })
  const edge = await LRS(res)
  if (!edge) throw new Error(`Edge not found in ${edgeTable} (in=${inRid}, out=${outRid})`)
  return edge
}

export const expectEdgeMissing = async (edgeTable: string, inRid: any, outRid: any) => {
  const inRecord = await getRecordRid(inRid)
  const outRecord = await getRecordRid(outRid)
  const res = await dbQuery(`RETURN SELECT * FROM ${edgeTable} WHERE in = $in AND out = $out;`, {
    in: inRecord,
    out: outRecord,
  })
  const edge = await LRS(res)
  if (edge) throw new Error(`Edge still exists in ${edgeTable} (in=${inRid}, out=${outRid})`)
}

export const expectPostLinked = async (recordId: any, table: string) => {
  const rid = await getRecordRid(recordId, table)
  const pid = await getPostRidForRecord(recordId, table)
  await expectEdgeExists('Post', pid, rid)
  const postRecord = await expectRecordExists('p', getRecordSubId(pid))
  return { rid, pid, postRecord }
}

export const expectPostMissing = async (recordId: any, table: string) => {
  const rid = await getRecordRid(recordId, table)
  const pid = await getPostRidForRecord(recordId, table)
  await expectEdgeMissing('Post', pid, rid)
  await expectRecordMissing('p', getRecordSubId(pid))
}

export const expectInstanceLinked = async (recordId: any, table: string, instanceCode: string) => {
  const rid = await getRecordRid(recordId, table)
  const res = await dbQuery('RETURN type::record("instance", $code);', { code: instanceCode })
  const instanceRid = await LRS(res)
  await expectEdgeExists('Instances', rid, instanceRid)
  return { rid, instanceRid }
}

export const expectInstanceMissing = async (recordId: any, table: string, instanceCode: string) => {
  const rid = await getRecordRid(recordId, table)
  const res = await dbQuery('RETURN type::record("instance", $code);', { code: instanceCode })
  const instanceRid = await LRS(res)
  await expectEdgeMissing('Instances', rid, instanceRid)
}

export const expectRecordExists = async (table: string, id: any) => {
  const record = await selectRecord(table, id)
  if (!record) throw new Error(`Record not found in ${table}:${id}`)
  return record
}

export const expectRecordMissing = async (table: string, id: any) => {
  const record = await selectRecord(table, id)
  if (record) throw new Error(`Record still exists in ${table}:${id}`)
}

export const selectViewRecord = async (modelKey: string, viewName: string, id: any) => {
  const spec = await loadModelSpec(modelKey)
  const view = (spec.views as ViewSpec[]).find((entry) => (entry?.name ?? '').toLowerCase() === viewName.toLowerCase())
  if (!view) throw new Error(`View ${viewName} not found for ${modelKey}`)

  if (view.function) {
    return await callDbFunction(view.function, { id })
  }

  const modelName = spec.name || modelKey
  const table = spec.table || getModelTable(modelKey)
  if (!table) throw new Error(`Missing table for ${modelKey}`)
  const viewTable = `${modelName}${viewName}`
  const subId = getRecordSubId(id)
  const query = `RETURN SELECT * FROM ${viewTable} WHERE id = type::record($table, $id);`
  const res = await dbQuery(query, { table, id: subId })
  return await LRS(res)
}

export const cleanupTestArtifacts = async () => {
  const prefix = getTestPrefix()
  const marker = getTestMarker()
  logStep('Cleanup | removing prior test artifacts', { prefix, marker })
  if (await tableExists('u')) {
    await dbQuery('DELETE u WHERE string::starts_with(email, $prefix);', { prefix })
  }
  if (await tableExists('exam')) {
    await dbQuery('DELETE exam WHERE string::starts_with(key, $prefix);', { prefix })
  }
  if (await tableExists('q')) {
    await dbQuery('DELETE q WHERE string::starts_with(question, $marker);', { marker })
  }
  logStep('Cleanup | done')
}

const tableExists = async (table: string) => {
  try {
    await dbQuery(`INFO FOR TABLE ${table};`)
    return true
  } catch {
    return false
  }
}

type FieldSpec = {
  key: string
  type?: string
  required?: boolean
  isArray?: boolean
  isRecord?: boolean
  typeRaw?: string
}

type ViewSpec = {
  name?: string
  fields?: string[]
  function?: string
  functionMode?: string
}

type RelationSpec = {
  payloadField?: string
  required?: boolean
  left?: string
  right?: string
}

const specCache = new Map<string, any>()

const resolveSpecsRoot = () => {
  const cwd = process.cwd()
  const candidates = [
    resolve(cwd, '../config/specs'),
    resolve(cwd, '../passmed-schema/config/specs'),
    resolve(cwd, '../../passmed-schema/config/specs'),
    resolve(cwd, '../../tools/passmed-schema/config/specs'),
  ]
  return candidates.find((candidate) => existsSync(candidate))
}

const parseFieldDefs = (fields: any[] = []): FieldSpec[] => {
  return fields.map((entry) => {
    const [key, def] = Object.entries(entry ?? {})[0] as [string, any]
    const rawType = String(def?.type ?? '')
    const rawLower = rawType.toLowerCase()
    return {
      key,
      type: def?.type,
      required: Boolean(def?.required),
      isArray: rawLower.includes('array'),
      isRecord: rawLower.includes('record<'),
      typeRaw: rawType,
    }
  })
}

const loadModelSpec = async (modelKey: string) => {
  if (specCache.has(modelKey)) return specCache.get(modelKey)

  const modelEntry = (models as any)[modelKey]
  if (!modelEntry) throw new Error(`Unknown model key: ${modelKey}`)

  const specsRoot = resolveSpecsRoot()
  if (!specsRoot) {
    throw new Error('Specs folder not found for tests')
  }
  const folders = await readdir(specsRoot, { withFileTypes: true })
  const folder = folders.find(
    (entry) => entry.isDirectory() && entry.name.endsWith(`(${modelEntry.table})`)
  )
  if (!folder) throw new Error(`Spec folder not found for ${modelKey}`)

  const folderPath = resolve(specsRoot, folder.name)
  const files = await readdir(folderPath)
  const yamlFiles = files.filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
  const specs = await Promise.all(
    yamlFiles.map(async (file) => {
      const raw = await readFile(resolve(folderPath, file), 'utf-8')
      const parsed = parse(raw) as any
      return { file, ...parsed }
    })
  )

  const primarySpec = specs.find((spec) => spec.primary === true)
  if (!primarySpec) throw new Error(`Primary spec missing for ${modelKey}`)

  const fields = parseFieldDefs(primarySpec.fields ?? [])
  const relations = Array.isArray(primarySpec.relations) ? primarySpec.relations : []
  const views = Array.isArray(primarySpec.views) ? (primarySpec.views as ViewSpec[]) : []

  const result = {
    fields,
    relations,
    views,
    name: primarySpec.name,
    table: primarySpec.table?.model,
  }
  specCache.set(modelKey, result)
  return result
}

const getRecordTarget = (field: FieldSpec) => {
  const raw = String(field.typeRaw || '')
  const match = raw.match(/record<([^>]+)>/)
  return match ? match[1] : null
}

const getModelTable = (modelKey: string) => {
  const entry = (models as any)[modelKey]
  if (entry?.table) return entry.table as string
  const byTable = Object.entries(models as Record<string, any>).find(([, value]) => value?.table === modelKey)
  return byTable?.[1]?.table as string | undefined
}

const defaultValueForField = (field: FieldSpec, token: string) => {
  const key = field.key.toLowerCase()
  if (field.isArray) {
    return key === 'instances' ? [getTestInstanceCode()] : [`${key}-${token}`]
  }
  if (key.includes('email')) return `qa-${token}@example.com`
  if (key.includes('password')) return `Pass-${token}`
  if (key.includes('name') || key.includes('title')) return `QA ${token}`
  if (key.includes('status')) return 'draft'
  if (key.includes('date') || key.includes('time')) return new Date().toISOString()
  if (field.typeRaw?.toLowerCase().includes('number') || field.typeRaw?.toLowerCase().includes('int')) {
    return Math.floor(Math.random() * 1000) + 1
  }
  return `qa-${token}`
}

const pickExistingRecord = async (table: string) => {
  const res = await dbQuery(`RETURN SELECT id FROM ${table} LIMIT 1;`)
  const data = unwrapResult(res)
  if (Array.isArray(data) && data.length) return data[0]?.id ?? data[0]
  return null
}

export const ensureModelRecord = async (modelKey: string, depth = 0): Promise<any> => {
  const table = getModelTable(modelKey)
  if (!table) throw new Error(`Unknown table for model ${modelKey}`)

  const existing = await pickExistingRecord(table)
  if (existing) return existing

  if (depth > 2) throw new Error(`Unable to resolve record for ${modelKey} (max depth)`)

  const payload = await buildRequiredCreatePayload(modelKey, {
    token: Math.random().toString(36).slice(2, 8),
    includeRelations: true,
    depth: depth + 1,
  })
  const caller = getCaller()
  const resolvedModelKey =
    (models as any)[modelKey] ? modelKey : (Object.entries(models as Record<string, any>).find(([, value]) => value?.table === modelKey)?.[0] ?? modelKey)
  const router = (caller as any)[resolvedModelKey]
  if (!router?.create) {
    throw new Error(`No create endpoint for model ${modelKey}`)
  }
  const created = await router.create({ data: payload, instance: getTestInstanceCode() })
  return created?.id ?? created
}

export const buildRequiredCreatePayload = async (
  modelKey: string,
  options: {
    token?: string
    overrides?: Record<string, any>
    includeRelations?: boolean
    depth?: number
  } = {}
) => {
  const token = options.token ?? Math.random().toString(36).slice(2, 8)
  const overrides = options.overrides ?? {}
  const includeRelations = options.includeRelations !== false
  const depth = options.depth ?? 0

  const { fields, relations } = await loadModelSpec(modelKey)
  const payload: Record<string, any> = { ...overrides }

  for (const field of fields) {
    if (!field.required) continue
    if (payload[field.key] !== undefined) continue
    if (field.isRecord) {
      const target = getRecordTarget(field)
      if (target && (models as any)[target]) {
        payload[field.key] = await ensureModelRecord(target, depth)
      } else {
        payload[field.key] = defaultValueForField(field, token)
      }
    } else {
      payload[field.key] = defaultValueForField(field, token)
    }
  }

  if (includeRelations) {
    for (const relation of relations as RelationSpec[]) {
      if (!relation?.required || !relation.payloadField) continue
      if (payload[relation.payloadField] !== undefined) continue
      const modelTable = getModelTable(modelKey)
      let targetModel =
        relation.left === modelKey || relation.left === modelTable
          ? relation.right
          : relation.right === modelKey || relation.right === modelTable
            ? relation.left
            : relation.left
      if (targetModel && !(models as any)[targetModel]) {
        const byTable = Object.entries(models as Record<string, any>).find(([, value]) => value?.table === targetModel)
        if (byTable?.[0]) targetModel = byTable[0]
      }
      if (!targetModel) {
        const singular = relation.payloadField.endsWith('s')
          ? relation.payloadField.slice(0, -1)
          : relation.payloadField
        if ((models as any)[singular]) targetModel = singular
      }
      if (!targetModel) continue
      const record = await ensureModelRecord(targetModel, depth)
      payload[relation.payloadField] = [record]
      logStep('Resolved required relation', {
        modelKey,
        payloadField: relation.payloadField,
        targetModel,
        record,
      })
    }
  }

  return payload
}
