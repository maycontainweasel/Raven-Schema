import { useTypesense } from './useTypesense'
import { models } from '@schema/models'
import * as dbBundle from '@schema/db'
import type * as SchemaTypes from '@schema/types'
import type * as TypesenseTypes from '@schema/typesense/collections'

type InstanceCode = string

type Method = 'query' | 'mutate'
type Strategy = 'fail-fast' | 'continue-on-error'
type TypesenseOperation = 'upsert' | 'delete'
type DataAuthority = 'source' | 'tenant'
type LegacyDataLocation = 'local' | 'remote'
type ReturnKind = 'record' | 'typesense'

type ToPascalCase<S extends string> =
  S extends `${infer Head}_${infer Tail}`
    ? `${Capitalize<Head>}${ToPascalCase<Tail>}`
    : S extends `${infer Head}-${infer Tail}`
      ? `${Capitalize<Head>}${ToPascalCase<Tail>}`
      : Capitalize<S>

type EndpointModel<E extends string> = E extends `${infer Model}.${string}` ? Model : never

type RecordTypeFromModel<M extends string> = ToPascalCase<M> extends keyof SchemaTypes
  ? SchemaTypes[ToPascalCase<M>]
  : unknown

type TypesenseDocKey<M extends string> = `${ToPascalCase<M>}Document`

type TypesenseTypeFromModel<M extends string> = TypesenseDocKey<M> extends keyof TypesenseTypes
  ? TypesenseTypes[TypesenseDocKey<M>]
  : unknown

type DefaultReturnFromEndpoint<E extends string> = E extends `${string}.typesense.${string}`
  ? TypesenseTypeFromModel<EndpointModel<E>>
  : RecordTypeFromModel<EndpointModel<E>>

type ReturnFor<E extends string, K extends ReturnKind | undefined> = K extends 'typesense'
  ? TypesenseTypeFromModel<EndpointModel<E>>
  : K extends 'record'
    ? RecordTypeFromModel<EndpointModel<E>>
    : DefaultReturnFromEndpoint<E>

interface ToastOptions {
  action?: string
  subject?: string
  perInstance?: boolean
}

export interface ProcessRequest<D = any> {
  endpoint: string // e.g. 'exam.create'
  method?: Method
  data: D
  instances: InstanceCode[]
  options?: {
    sourceInstance?: InstanceCode
    /**
     * @deprecated Legacy alias. Prefer sourceInstance.
     */
    rootInstance?: InstanceCode
    authority?: DataAuthority
    /**
     * @deprecated Legacy alias. Prefer authority.
     */
    dataLocation?: DataAuthority | LegacyDataLocation
    bypassMothership?: boolean
    retryAttempts?: number
    retryDelay?: number
    retryFailedAttempts?: number
    retryFailedDelay?: number
    strategy?: Strategy
    consoleLogging?: boolean
    logFailures?: boolean
    autoToast?: boolean
    trackAttempts?: boolean
    concurrency?: number
    requireMothership?: boolean
    throwOnFailure?: boolean
    toast?: ToastOptions
  }
}

export interface ProcessResult<R = any> {
  record: R | null
  results: {
    success: InstanceCode[]
    failed: { instance: InstanceCode; error: any }[]
  }
}

export interface InstanceExecution<R = any> {
  instance: InstanceCode
  status: 'success' | 'failed' | 'skipped'
  attempts: number
  startedAt: string
  endedAt: string
  durationMs: number
  record?: R | null
  error?: any
}

export interface ProcessResultV2<R = any> {
  record: R | null
  instances: Record<InstanceCode, InstanceExecution<R>>
  summary: {
    success: InstanceCode[]
    failed: InstanceCode[]
    skipped: InstanceCode[]
    attempts: number
    durationMs: number
  }
}

export interface ProcessRequestV2<D = any> {
  endpoint: string
  method?: Method
  data: D
  instances?: InstanceCode[]
  options?: ProcessRequest<D>['options']
}

export interface TypesenseFetchConfig<D = any> {
  endpoint: string
  method?: Method
  payload: D
  transform?: (record: any) => any
  instance?: InstanceCode
}

export interface TypesenseUpdateConfig<R = any> {
  collectionId: string
  operation?: TypesenseOperation
  document?: (record: R) => any
  deleteId?: (record: R) => string | Promise<string>
}

export interface TypesenseRecordConfig<R = any> {
  collectionId: string
  record?: R | null
  id?: string
  instance?: InstanceCode
  instances?: InstanceCode[]
  bypassMothership?: boolean
  endpoint?: string
  method?: Method
  resourceKey?: string
  payload?: any
  transform?: (record: R) => any
  operation?: TypesenseOperation
  deleteId?: (record: R) => string | Promise<string>
}

export interface ApiOptions {
  instances?: InstanceCode[]
  instance?: InstanceCode
  sourceInstance?: InstanceCode
  /**
   * @deprecated Legacy alias. Prefer sourceInstance.
   */
  rootInstance?: InstanceCode
  authority?: DataAuthority
  /**
   * @deprecated Legacy alias. Prefer authority.
   */
  dataLocation?: DataAuthority | LegacyDataLocation
  bypassMothership?: boolean
  method?: Method
  returnType?: ReturnKind
  typesense?: boolean
  retryAttempts?: number
  retryDelay?: number
  retryFailedAttempts?: number
  retryFailedDelay?: number
  strategy?: Strategy
  consoleLogging?: boolean
  logFailures?: boolean
  autoToast?: boolean
  trackAttempts?: boolean
  attemptCleanup?: boolean
  throwOnFailure?: boolean
  toast?: ToastOptions | boolean
  returnResult?: boolean
}

export interface ApiConfig<D = any> extends ApiOptions {
  endpoint: string
  data?: D
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const dbInstances = ((dbBundle as any).dbInstances ?? {}) as Record<string, any>
const instancesEnabled = ((dbBundle as any).instancesEnabled ?? true) as boolean
const defaultDbInstance = ((dbBundle as any).defaultDbInstance ?? null) as string | null
const sourceDbInstance = ((dbBundle as any).sourceDbInstance ?? null) as string | null
const tenantDbInstances = ((dbBundle as any).tenantDbInstances ?? null) as string[] | null

export function useCRUD() {
  const runtimeConfig = useRuntimeConfig() as any
  const appName =
    runtimeConfig?.public?.schemaKit?.appName ||
    runtimeConfig?.schemaKit?.appName ||
    'app'

  const resolveSourceInstance = (): InstanceCode => {
    const entries = Object.entries(dbInstances as Record<string, any>)
    if (sourceDbInstance && (dbInstances as any)[sourceDbInstance]) {
      return sourceDbInstance as InstanceCode
    }
    if (defaultDbInstance && (dbInstances as any)[defaultDbInstance]) {
      return defaultDbInstance as InstanceCode
    }
    const activeFallback = entries.find(([, cfg]) => cfg?.active === true)
    if (activeFallback) return activeFallback[0]
    return entries[0]?.[0] ?? 'default'
  }

  const defaultSourceInstance: InstanceCode = resolveSourceInstance()
  const defaultExecutionInstance: InstanceCode =
    defaultDbInstance && (dbInstances as any)[defaultDbInstance]
      ? (defaultDbInstance as InstanceCode)
      : defaultSourceInstance

  const createRequestId = () => {
    const cryptoRef: any = (globalThis as any)?.crypto
    if (cryptoRef?.randomUUID) return cryptoRef.randomUUID()
    return `attempt_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  const callTRPCEndpoint = async (endpoint: string, method: Method, payload: any) => {
    const { $api } = useNuxtApp()
    const parts = endpoint.split('.')
    let current: any = $api

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      current = current?.[part]
      if (!current) throw new Error(`Invalid endpoint path: ${endpoint}`)
    }

    const methodName = parts[parts.length - 1]
    if (!current?.[methodName]) throw new Error(`Invalid endpoint: ${endpoint}`)

    if (method === 'mutate') return await current[methodName].mutate(payload)
    return await current[methodName].query(payload)
  }

  const callTRPCEndpointWithFallback = async (
    endpoint: string,
    method: Method,
    payload: any,
    primaryInstance?: InstanceCode,
    fallbackInstances?: InstanceCode[]
  ) => {
    const instances = Array.from(
      new Set([
        ...(primaryInstance ? [primaryInstance] : []),
        ...normalizeInstances(fallbackInstances),
      ])
    )
    let lastError: any
    for (const instance of instances) {
      try {
        return await callTRPCEndpoint(endpoint, method, { ...payload, instance })
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  const stripRootInstanceFromPayload = <D = any>(payload: D, rootInstance: InstanceCode): D => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload
    let changed = false
    const base = payload as any
    const next: any = { ...base }
    if (Array.isArray(next.instances)) {
      next.instances = next.instances.filter((inst: InstanceCode) => inst !== rootInstance)
      changed = true
    }
    if (next.payload && typeof next.payload === 'object' && !Array.isArray(next.payload)) {
      const inner = next.payload as any
      if (Array.isArray(inner.instances)) {
        next.payload = {
          ...inner,
          instances: inner.instances.filter((inst: InstanceCode) => inst !== rootInstance),
        }
        changed = true
      }
    }
    return changed ? (next as D) : payload
  }

  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    baseDelay: number
  ): Promise<T> => {
    let lastError: any
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts - 1) {
          const delay = baseDelay * Math.pow(2, attempt)
          await wait(delay)
        }
      }
    }
    throw lastError
  }

  const extractErrorDetails = (error: any) => {
    const shape = error?.shape ?? error?.data?.shape ?? null
    const message =
      shape?.message ||
      error?.message ||
      (typeof error === 'string' ? error : 'Unknown error')
    const code = shape?.code ?? error?.data?.code ?? error?.code
    const httpStatus = shape?.data?.httpStatus ?? error?.data?.httpStatus
    const path = shape?.data?.path ?? error?.data?.path
    return { message, code, httpStatus, path }
  }

  const normalizeInstanceCode = (value: string) => value.trim().toLowerCase()

  const splitInstanceTokens = (value: string): InstanceCode[] =>
    value
      .split(',')
      .map((token) => normalizeInstanceCode(token))
      .filter(Boolean)

  const normalizeInstances = (value?: InstanceCode | InstanceCode[] | ApiOptions): InstanceCode[] => {
    if (!value) return []
    if (typeof value === 'string') return splitInstanceTokens(value)
    if (Array.isArray(value)) {
      const tokens = value.flatMap((item) =>
        typeof item === 'string' ? splitInstanceTokens(item) : []
      )
      return Array.from(new Set(tokens))
    }
    if (typeof value === 'object') {
      if (Array.isArray(value.instances)) return normalizeInstances(value.instances)
      if (typeof value.instance === 'string') return splitInstanceTokens(value.instance)
    }
    return []
  }

  const normalizeAuthority = (value: unknown): DataAuthority | undefined => {
    const normalized = String(value ?? '').trim().toLowerCase()
    if (!normalized) return undefined
    if (['source', 'local', 'mothership', 'central', 'global', 'home'].includes(normalized)) return 'source'
    if (['tenant', 'remote', 'instance'].includes(normalized)) return 'tenant'
    return undefined
  }

  const resolveDefaultTenantInstances = (sourceInstance: InstanceCode): InstanceCode[] => {
    if (!instancesEnabled) return []
    const explicit = normalizeInstances(tenantDbInstances ?? [])
      .filter((instance) => instance !== sourceInstance)
    if (explicit.length > 0) return explicit

    return Object.entries(dbInstances as Record<string, any>)
      .filter(([instance, cfg]) => instance !== sourceInstance && cfg?.active !== false)
      .map(([instance]) => instance)
  }

  const inferMethodFromEndpoint = (endpoint: string): Method => {
    const action = endpoint.split('.').pop() ?? ''
    const normalized = action.toLowerCase()
    const mutateActions = new Set([
      'create',
      'update',
      'delete',
      'upsert',
      'insert',
      'set',
      'add',
      'remove',
      'attach',
      'detach',
      'publish',
      'unpublish',
      'refresh',
      'sync',
      'reorder',
      'move',
      'merge',
      'seed',
      'archive',
      'restore',
      'addterm',
      'removeterm',
      'attachterm',
      'detachterm',
      'createtaxonomy',
      'updatetaxonomy',
      'deletetaxonomy',
      'updatepoststatus',
    ])
    if (mutateActions.has(normalized)) return 'mutate'
    if (
      normalized.endsWith('term') &&
      ['add', 'remove', 'attach', 'detach'].some((verb) => normalized.startsWith(verb))
    ) {
      return 'mutate'
    }
    if (
      normalized.includes('taxonomy') &&
      ['create', 'update', 'delete'].some((verb) => normalized.startsWith(verb))
    ) {
      return 'mutate'
    }
    return 'query'
  }

  const inferAuthorityFromEndpoint = (endpoint: string): DataAuthority | undefined => {
    const modelKey = endpoint.split('.')[0]
    const entry = (models as Record<string, any>)[modelKey]
    return normalizeAuthority(entry?.authority ?? entry?.data)
  }

  const toTitleCase = (value: string) =>
    value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value

  const buildDefaultToast = (endpoint: string, perInstance: boolean): ToastOptions => {
    const modelKey = endpoint.split('.')[0]
    const actionRaw = endpoint.split('.').pop() ?? 'Operation'
    const actionMap: Record<string, string> = {
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      upsert: 'Upsert',
      attach: 'Attach',
      detach: 'Detach',
      publish: 'Publish',
      unpublish: 'Unpublish',
      refresh: 'Refresh',
      sync: 'Sync',
    }
    return {
      action: actionMap[actionRaw] || toTitleCase(actionRaw),
      subject: toTitleCase(modelKey),
      perInstance,
    }
  }

  const createApiAttempt = async (payload: {
    endpoint: string
    method: Method
    data: any
    instances: InstanceCode[]
    bypassMothership: boolean
    startedAt: string
    sourceInstance?: InstanceCode
    /**
     * @deprecated Legacy alias. Prefer sourceInstance.
     */
    rootInstance?: InstanceCode
    authority?: DataAuthority
    /**
     * @deprecated Legacy alias. Prefer authority.
     */
    dataLocation?: DataAuthority | LegacyDataLocation
    options?: Record<string, any>
  }) => {
    try {
      const instance = payload.sourceInstance ?? payload.rootInstance ?? defaultSourceInstance
      const record = await callTRPCEndpointWithFallback(
        'apiAttempt.create',
        'mutate',
        {
          data: {
            ...payload,
            status: 'pending',
          },
        },
        instance,
        payload.instances
      )
      return record
    } catch (error) {
      console.warn('[CRUD] apiAttempt.create failed', error)
      return { id: undefined as string | undefined }
    }
  }

  const updateApiAttempt = async (
    attemptId: string,
    patch: any,
    sourceInstance?: InstanceCode,
    fallbackInstances?: InstanceCode[]
  ) => {
    try {
      const instance = sourceInstance ?? defaultSourceInstance
      await callTRPCEndpointWithFallback(
        'apiAttempt.update',
        'mutate',
        {
          data: { id: attemptId, payload: patch },
        },
        instance,
        fallbackInstances
      )
    } catch (error) {
      console.warn('[CRUD] apiAttempt.update failed', error)
    }
  }

  const finalizeApiAttempt = async (
    attemptId: string,
    results: ProcessResult,
    sourceInstance?: InstanceCode,
    payload?: Record<string, any>,
    fallbackInstances?: InstanceCode[]
  ) => {
    try {
      const instance = sourceInstance ?? defaultSourceInstance
      await callTRPCEndpointWithFallback(
        'apiAttempt.finalize',
        'mutate',
        { data: { id: attemptId, results, payload } },
        instance,
        fallbackInstances
      )
    } catch (error) {
      console.warn('[CRUD] apiAttempt.finalize failed', error)
    }
  }

  const createCrudAttempt = (...args: Parameters<typeof createApiAttempt>) => createApiAttempt(...args)
  const updateCrudAttempt = (...args: Parameters<typeof updateApiAttempt>) => updateApiAttempt(...args)
  const finalizeCrudAttempt = (...args: Parameters<typeof finalizeApiAttempt>) => finalizeApiAttempt(...args)

  const logFailuresToConsole = (endpoint: string, failures: { instance: InstanceCode; error: any }[]) => {
    if (!failures.length) return
    const header = `[CRUD] ${endpoint} failed on ${failures.length} instance(s)`
    console.groupCollapsed(header)
    console.table(
      failures.map((failure) => {
        const details = extractErrorDetails(failure.error)
        return {
          instance: failure.instance,
          message: details.message,
          code: details.code,
          httpStatus: details.httpStatus,
          path: details.path
        }
      })
    )
    for (const failure of failures) {
      const details = extractErrorDetails(failure.error)
      console.error(`[CRUD] ${endpoint} -> ${failure.instance}`, details.message, {
        instance: failure.instance,
        ...details,
        error: failure.error
      })
    }
    console.groupEnd()
  }

  const emitToastSummary = (
    endpoint: string,
    results: { success: InstanceCode[]; failed: { instance: InstanceCode; error: any }[] },
    toastOptions?: ToastOptions
  ) => {
    if (!toastOptions) return
    const { $sonner, $notify } = useNuxtApp() as any
    const notifier = $sonner ?? $notify
    if (!notifier) return

    const action = toastOptions.action?.trim() || 'Operation'
    const subject = toastOptions.subject?.trim()
    const label = subject ? `${action} ${subject}` : action

    if (toastOptions.perInstance) {
      results.success.forEach((instance) => {
        notifier.success?.(`${label} on ${instance.toUpperCase()} succeeded`)
      })
      results.failed.forEach((failure) => {
        notifier.error?.(`${label} on ${failure.instance.toUpperCase()} failed`)
      })
      return
    }

    if (results.failed.length === 0) {
      notifier.success?.(`${label} succeeded on ${results.success.length} instance(s)`)
    } else if (results.success.length === 0) {
      notifier.error?.(`${label} failed on ${results.failed.length} instance(s)`)
    } else {
      notifier.warning?.(
        `${label} succeeded on ${results.success.length} instance(s) and failed on ${results.failed.length}`
      )
    }
  }

  async function processRecordForInstancesV1<D = any, R = any>(
    request: ProcessRequest<D>
  ): Promise<ProcessResult<R>> {
    const {
      endpoint,
      method = 'mutate',
      data,
      instances = [],
      options: requestOptions = {}
    } = request

    if (!endpoint) throw new Error('endpoint is required')
    if (data === undefined || data === null) throw new Error('data is required')

    const options = {
      sourceInstance: requestOptions.sourceInstance ?? requestOptions.rootInstance ?? defaultExecutionInstance,
      retryAttempts: 3,
      retryDelay: 1000,
      strategy: 'continue-on-error' as Strategy,
      consoleLogging: false,
      logFailures: true,
      toast: undefined,
      ...requestOptions,
      bypassMothership: instancesEnabled ? Boolean(requestOptions.bypassMothership) : false,
    }

    const sourceInstance = options.sourceInstance ?? defaultExecutionInstance
    const targetInstances = instancesEnabled
      ? instances.filter(inst => inst !== sourceInstance)
      : []
    const results = { success: [] as InstanceCode[], failed: [] as { instance: InstanceCode; error: any }[] }
    let primaryRecord: R | null = null

    const buildPayload = (instanceCode: InstanceCode) => ({
      data,
      instance: instanceCode
    })

    const log = (...args: any[]) => {
      if (options.consoleLogging) console.log(...args)
    }

    if (!options.bypassMothership) {
      try {
        primaryRecord = await withRetry(
          () => callTRPCEndpoint(endpoint, method, buildPayload(sourceInstance)),
          options.retryAttempts,
          options.retryDelay
        )
        results.success.push(sourceInstance)
        log('✅ Mothership success')
      } catch (error: any) {
        results.failed.push({ instance: sourceInstance, error })
        log('❌ Mothership failed', error)
        if (options.strategy === 'fail-fast') throw error
      }
    }

    const promises = targetInstances.map(async (instance) => {
      try {
        const res = await withRetry(
          () => callTRPCEndpoint(endpoint, method, buildPayload(instance)),
          options.retryAttempts,
          options.retryDelay
        )
        results.success.push(instance)
        if (!primaryRecord) primaryRecord = res as R
        log(`✅ ${instance} success`)
      } catch (error: any) {
        results.failed.push({ instance, error })
        log(`❌ ${instance} failed`, error)
        if (options.strategy === 'fail-fast') throw error
      }
    })

    await Promise.allSettled(promises)

    if (options.logFailures) {
      logFailuresToConsole(endpoint, results.failed)
    }
    emitToastSummary(endpoint, results, options.toast)

    return { record: primaryRecord, results }
  }

  const buildInstanceResult = <R = any>(params: InstanceExecution<R>) => params

  const mergeInstanceResult = <R = any>(
    previous: InstanceExecution<R>,
    next: InstanceExecution<R>
  ): InstanceExecution<R> => {
    return {
      ...next,
      attempts: previous.attempts + next.attempts,
      startedAt: previous.startedAt,
      durationMs: previous.durationMs + next.durationMs,
      record: next.status === 'success' ? next.record : previous.record,
      error: next.status === 'failed' ? next.error : undefined,
    }
  }

  const summarizeInstanceResults = <R = any>(
    results: Record<InstanceCode, InstanceExecution<R>>,
    startedAtMs: number
  ) => {
    const success: InstanceCode[] = []
    const failed: InstanceCode[] = []
    const skipped: InstanceCode[] = []
    let attempts = 0

    Object.values(results).forEach((entry) => {
      attempts += entry.attempts
      if (entry.status === 'success') success.push(entry.instance)
      if (entry.status === 'failed') failed.push(entry.instance)
      if (entry.status === 'skipped') skipped.push(entry.instance)
    })

    return {
      success,
      failed,
      skipped,
      attempts,
      durationMs: Date.now() - startedAtMs,
    }
  }

  const runTasksWithConcurrency = async <T>(tasks: Array<() => Promise<T>>, limit: number) => {
    if (!tasks.length) return []
    if (!Number.isFinite(limit) || limit <= 0 || limit >= tasks.length) {
      return Promise.all(tasks.map((task) => task()))
    }

    const results: T[] = new Array(tasks.length)
    let index = 0

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
      while (index < tasks.length) {
        const current = index++
        results[current] = await tasks[current]()
      }
    })

    await Promise.all(workers)
    return results
  }

  async function processRecordForInstancesV2<D = any, R = any>(
    request: ProcessRequestV2<D>
  ): Promise<ProcessResultV2<R>> {
    const {
      endpoint,
      method = inferMethodFromEndpoint(request.endpoint),
      data,
      instances = [],
      options: requestOptions = {}
    } = request

    if (!endpoint) throw new Error('endpoint is required')
    if (data === undefined || data === null) throw new Error('data is required')

    const isMutate = method === 'mutate'
    const options = {
      sourceInstance: requestOptions.sourceInstance ?? requestOptions.rootInstance ?? defaultExecutionInstance,
      bypassMothership: instancesEnabled ? (requestOptions.bypassMothership ?? false) : false,
      authority: normalizeAuthority(requestOptions.authority ?? requestOptions.dataLocation),
      retryAttempts: requestOptions.retryAttempts ?? 3,
      retryDelay: requestOptions.retryDelay ?? 1000,
      retryFailedAttempts: requestOptions.retryFailedAttempts ?? 1,
      retryFailedDelay: requestOptions.retryFailedDelay ?? 1500,
      strategy: requestOptions.strategy ?? ((isMutate ? 'fail-fast' : 'continue-on-error') as Strategy),
      consoleLogging: requestOptions.consoleLogging ?? false,
      logFailures: requestOptions.logFailures ?? true,
      autoToast: requestOptions.autoToast,
      requireMothership: requestOptions.requireMothership ?? true,
      concurrency: requestOptions.concurrency ?? 4,
      toast: requestOptions.toast,
      trackAttempts: requestOptions.trackAttempts ?? isMutate,
      throwOnFailure: requestOptions.throwOnFailure ?? isMutate,
    }

    const sourceInstance = options.sourceInstance ?? defaultExecutionInstance
    const requireMothership = options.bypassMothership ? false : true
    const targetInstances = instancesEnabled
      ? normalizeInstances(instances).filter((inst) => inst !== sourceInstance)
      : []
    const startedAtMs = Date.now()
    const instanceResults: Record<InstanceCode, InstanceExecution<R>> = {}
    let primaryRecord: R | null = null

    const buildPayload = (instanceCode: InstanceCode) => ({
      data,
      instance: instanceCode
    })

    const log = (...args: any[]) => {
      if (options.consoleLogging) console.log(...args)
    }

    const runInstance = async (instance: InstanceCode): Promise<InstanceExecution<R>> => {
      const startedAt = new Date().toISOString()
      let attempts = 0
      let lastError: any
      let record: R | null = null
      const startedAtMs = Date.now()

      for (let attempt = 0; attempt < options.retryAttempts; attempt++) {
        attempts += 1
        try {
          record = await callTRPCEndpoint(endpoint, method, buildPayload(instance))
          const endedAt = new Date().toISOString()
          return buildInstanceResult({
            instance,
            status: 'success',
            attempts,
            startedAt,
            endedAt,
            durationMs: Date.now() - startedAtMs,
            record,
          })
        } catch (error) {
          lastError = error
          if (attempt < options.retryAttempts - 1) {
            const delay = options.retryDelay * Math.pow(2, attempt)
            await wait(delay)
          }
        }
      }

      const endedAt = new Date().toISOString()
      return buildInstanceResult({
        instance,
        status: 'failed',
        attempts,
        startedAt,
        endedAt,
        durationMs: Date.now() - startedAtMs,
        error: lastError,
      })
    }

    const authority: DataAuthority =
      !instancesEnabled
        ? 'source'
        : options.bypassMothership === true
        ? 'tenant'
        : (options.authority ?? inferAuthorityFromEndpoint(endpoint) ?? 'source')
    const attemptInstances = options.bypassMothership
      ? targetInstances
      : Array.from(new Set([sourceInstance, ...targetInstances]))

    const requestId = createRequestId()
    const attempt = options.trackAttempts
      ? await createCrudAttempt({
          endpoint,
          method,
          data,
          payload: data,
          requestId,
          app: appName,
          instances: attemptInstances,
          instanceResults: {},
          bypassMothership: options.bypassMothership ?? false,
          requireMothership,
          startedAt: new Date(startedAtMs).toISOString(),
          sourceInstance,
          rootInstance: sourceInstance,
          authority,
          dataLocation: authority,
          options: {
            retryAttempts: options.retryAttempts,
            retryDelay: options.retryDelay,
            retryFailedAttempts: options.retryFailedAttempts,
            retryFailedDelay: options.retryFailedDelay,
            strategy: options.strategy,
            concurrency: options.concurrency,
          },
        })
      : null

    if (!options.bypassMothership) {
      const mothershipResult = await runInstance(sourceInstance)
      instanceResults[sourceInstance] = mothershipResult
      if (mothershipResult.status === 'success') {
        primaryRecord = mothershipResult.record ?? null
      } else if (requireMothership) {
        targetInstances.forEach((instance) => {
          instanceResults[instance] = buildInstanceResult({
            instance,
            status: 'skipped',
            attempts: 0,
            startedAt: mothershipResult.startedAt,
            endedAt: mothershipResult.endedAt,
            durationMs: 0,
          })
        })
      }

      if (attempt?.id) {
        const partialResults =
          mothershipResult.status === 'success'
            ? { success: [sourceInstance], failed: [] }
            : {
                success: [],
                failed: [{ instance: sourceInstance, error: extractErrorDetails(mothershipResult.error) }],
              }
        await updateCrudAttempt(
          attempt.id,
          {
            results: partialResults,
            instanceResults: { [sourceInstance]: mothershipResult },
            updatedAt: new Date().toISOString(),
          },
          sourceInstance,
          targetInstances
        )
      }
    }

    if (options.bypassMothership || !requireMothership || instanceResults[sourceInstance]?.status === 'success') {
      if (options.strategy === 'fail-fast') {
        for (let index = 0; index < targetInstances.length; index++) {
          const instance = targetInstances[index]
          const result = await runInstance(instance)
          instanceResults[instance] = result
          if (!primaryRecord && result.status === 'success') {
            primaryRecord = result.record ?? null
          }
          if (result.status === 'failed') {
            const remaining = targetInstances.slice(index + 1)
            remaining.forEach((skippedInstance) => {
              if (instanceResults[skippedInstance]) return
              instanceResults[skippedInstance] = buildInstanceResult({
                instance: skippedInstance,
                status: 'skipped',
                attempts: 0,
                startedAt: result.startedAt,
                endedAt: result.endedAt,
                durationMs: 0,
              })
            })
            break
          }
        }
      } else {
        const tasks = targetInstances.map((instance) => async () => {
          const result = await runInstance(instance)
          return result
        })
        const results = await runTasksWithConcurrency(tasks, options.concurrency)
        results.forEach((result) => {
          instanceResults[result.instance] = result
          if (!primaryRecord && result.status === 'success') {
            primaryRecord = result.record ?? null
          }
        })
      }

      if (attempt?.id) {
        const partialSummary = summarizeInstanceResults(instanceResults, startedAtMs)
        const partialFailures = Object.values(instanceResults)
          .filter((entry) => entry.status === 'failed')
          .map((entry) => ({ instance: entry.instance, error: extractErrorDetails(entry.error) }))
        await updateCrudAttempt(
          attempt.id,
          {
            instanceResults: { ...instanceResults },
            results: { success: partialSummary.success, failed: partialFailures },
            summary: partialSummary,
            updatedAt: new Date().toISOString(),
          },
          sourceInstance,
          targetInstances
        )
      }
    }

    for (let retryPass = 0; retryPass < options.retryFailedAttempts; retryPass++) {
      const failedInstances = Object.values(instanceResults)
        .filter((entry) => entry.status === 'failed')
        .map((entry) => entry.instance)

      if (!failedInstances.length) break

      await wait(options.retryFailedDelay)

      const retryTasks = failedInstances.map((instance) => async () => runInstance(instance))
      const retryResults = await runTasksWithConcurrency(retryTasks, options.concurrency)
      retryResults.forEach((result) => {
        const previous = instanceResults[result.instance]
        instanceResults[result.instance] = previous
          ? mergeInstanceResult(previous, result)
          : result
        if (!primaryRecord && result.status === 'success') {
          primaryRecord = result.record ?? null
        }
      })

      if (attempt?.id) {
        const retrySummary = summarizeInstanceResults(instanceResults, startedAtMs)
        const retryFailures = Object.values(instanceResults)
          .filter((entry) => entry.status === 'failed')
          .map((entry) => ({ instance: entry.instance, error: extractErrorDetails(entry.error) }))
        await updateCrudAttempt(
          attempt.id,
          {
            instanceResults: { ...instanceResults },
            results: { success: retrySummary.success, failed: retryFailures },
            summary: retrySummary,
            updatedAt: new Date().toISOString(),
          },
          sourceInstance,
          targetInstances
        )
      }

      if (!options.bypassMothership && requireMothership) {
        const mothershipStatus = instanceResults[sourceInstance]?.status
        if (mothershipStatus === 'failed') break
      }
    }

    const summary = summarizeInstanceResults(instanceResults, startedAtMs)
    const failures = Object.values(instanceResults)
      .filter((entry) => entry.status === 'failed')
      .map((entry) => ({ instance: entry.instance, error: extractErrorDetails(entry.error) }))

    if (options.logFailures) {
      logFailuresToConsole(endpoint, failures)
    }

    const shouldAutoToast =
      options.toast === undefined &&
      (options.autoToast ?? inferMethodFromEndpoint(endpoint) === 'mutate')
    const toast =
      options.toast ??
      (shouldAutoToast ? buildDefaultToast(endpoint, summary.success.length > 1) : undefined)

    if (toast) {
      emitToastSummary(endpoint, { success: summary.success, failed: failures }, toast)
    }

    if (attempt?.id) {
      const cleanupOnSuccess = options.attemptCleanup ?? true
      await finalizeCrudAttempt(
        attempt.id,
        {
          record: primaryRecord,
          results: { success: summary.success, failed: failures },
        },
        sourceInstance,
        {
          summary,
          instanceResults,
          endedAt: new Date().toISOString(),
          cleanupOnSuccess,
        },
        targetInstances
      )
    }

    if (options.throwOnFailure && (summary.failed.length > 0 || summary.skipped.length > 0)) {
      const error = new Error(
        `[CRUD] ${endpoint} failed on ${summary.failed.length} instance(s) (skipped: ${summary.skipped.length})`
      )
      ;(error as any).endpoint = endpoint
      ;(error as any).summary = summary
      ;(error as any).instances = instanceResults
      ;(error as any).record = primaryRecord
      ;(error as any).failures = failures
      throw error
    }

    log('✅ Done', summary)

    return {
      record: primaryRecord,
      instances: instanceResults,
      summary,
    }
  }

  const buildProcessOptions = (options: ApiOptions, toast?: ToastOptions) => ({
    sourceInstance: options.sourceInstance ?? options.rootInstance,
    rootInstance: options.sourceInstance ?? options.rootInstance,
    authority: normalizeAuthority(options.authority ?? options.dataLocation),
    dataLocation: options.authority ?? options.dataLocation,
    bypassMothership: options.bypassMothership,
    retryAttempts: options.retryAttempts,
    retryDelay: options.retryDelay,
    retryFailedAttempts: options.retryFailedAttempts,
    retryFailedDelay: options.retryFailedDelay,
    strategy: options.strategy,
    consoleLogging: options.consoleLogging,
    logFailures: options.logFailures,
    autoToast: options.autoToast,
    trackAttempts: options.trackAttempts,
    concurrency: options.concurrency,
    requireMothership: options.requireMothership,
    throwOnFailure: options.throwOnFailure,
    toast,
  })

  const mergeResults = <R = any>(base: ProcessResult<R>, next: ProcessResult<R>): ProcessResult<R> => {
    const success = Array.from(new Set([...base.results.success, ...next.results.success]))
    const nextFailedInstances = new Set(next.results.failed.map((item) => item.instance))
    const failed = [
      ...base.results.failed.filter((item) => !nextFailedInstances.has(item.instance)),
      ...next.results.failed,
    ]
    return {
      record: base.record ?? next.record ?? null,
      results: { success, failed },
    }
  }

  const retryFailures = async <D = any, R = any>(
    baseRequest: ProcessRequest<D>,
    baseResult: ProcessResult<R>,
    options: ApiOptions
  ): Promise<ProcessResult<R>> => {
    const sourceInstance = baseRequest.options?.sourceInstance ?? baseRequest.options?.rootInstance ?? defaultSourceInstance
    const retryAttempts = options.retryFailedAttempts ?? 0
    const retryDelay = options.retryFailedDelay ?? 1500
    let current = baseResult

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      if (current.results.failed.length === 0) break

      await wait(retryDelay)

      const failedInstances = current.results.failed.map((item) => item.instance)
      const failedMothership = failedInstances.includes(sourceInstance)
      const failedRemotes = failedInstances.filter((item) => item !== sourceInstance)

      if (failedMothership && !baseRequest.options?.bypassMothership) {
        const retryResult = await processRecordForInstancesV1<D, R>({
          ...baseRequest,
          instances: [],
          options: {
            ...baseRequest.options,
            bypassMothership: false,
          },
        })
        current = mergeResults(current, retryResult)
      }

      if (failedRemotes.length) {
        const retryResult = await processRecordForInstancesV1<D, R>({
          ...baseRequest,
          instances: failedRemotes,
          options: {
            ...baseRequest.options,
            bypassMothership: true,
          },
        })
        current = mergeResults(current, retryResult)
      }
    }

    return current
  }

  const resolveApiRequest = <D = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ) => {
    const baseConfig: ApiConfig<D> =
      typeof endpointOrConfig === 'string'
        ? { endpoint: endpointOrConfig }
        : { ...endpointOrConfig }

    const endpoint = baseConfig.endpoint
    const rawPayload = (data ?? baseConfig.data) as D
    const action = endpoint.split('.').pop() ?? ''
    const payload =
      (action === 'delete' && (typeof rawPayload === 'string' || typeof rawPayload === 'number'))
        ? ({ id: String(rawPayload) } as D)
        : rawPayload

    const extraOptions: ApiOptions =
      instancesOrOptions && typeof instancesOrOptions === 'object' && !Array.isArray(instancesOrOptions)
        ? { ...instancesOrOptions }
        : {}

    const mergedOptions: ApiOptions = {
      retryFailedAttempts: 1,
      retryFailedDelay: 1500,
      ...baseConfig,
      ...extraOptions,
      ...overrides,
    }

    const instanceOverrides =
      typeof instancesOrOptions === 'string' || Array.isArray(instancesOrOptions)
        ? normalizeInstances(instancesOrOptions)
        : []

    const instances = normalizeInstances(mergedOptions)
    let targetInstances = instances.length ? instances : instanceOverrides

    const inferredAuthority = inferAuthorityFromEndpoint(endpoint)
    const explicitAuthority = normalizeAuthority(mergedOptions.authority ?? mergedOptions.dataLocation)
    const derivedBypass =
      !instancesEnabled
        ? false
        : mergedOptions.bypassMothership !== undefined
        ? mergedOptions.bypassMothership
        : explicitAuthority
          ? explicitAuthority === 'tenant'
          : inferredAuthority === 'tenant'

    const method = mergedOptions.method ?? inferMethodFromEndpoint(endpoint)
    const bypassMothership = derivedBypass ?? false

    mergedOptions.sourceInstance = mergedOptions.sourceInstance ?? mergedOptions.rootInstance

    if (instancesEnabled && !mergedOptions.sourceInstance && targetInstances.length === 1 && bypassMothership) {
      mergedOptions.sourceInstance = targetInstances[0]
    }

    const sourceInstance = mergedOptions.sourceInstance ?? defaultExecutionInstance
    const resolvedAuthority: DataAuthority =
      instancesEnabled
        ? (explicitAuthority ?? inferredAuthority ?? (bypassMothership ? 'tenant' : 'source'))
        : 'source'
    if (instancesEnabled && resolvedAuthority === 'tenant' && targetInstances.length === 0) {
      targetInstances = resolveDefaultTenantInstances(sourceInstance)
    }

    const sanitizedPayload = stripRootInstanceFromPayload(payload, sourceInstance)

    if (instancesEnabled && bypassMothership && targetInstances.length === 0) {
      throw new Error(`Instances are required for tenant authority operations on ${endpoint}`)
    }

    const autoToast =
      mergedOptions.toast === false
        ? false
        : mergedOptions.toast === true
          ? true
          : mergedOptions.autoToast ?? method === 'mutate'

    const actionLower = action.toLowerCase()
    const perInstanceToast =
      actionLower === 'create' ? targetInstances.length >= 1 : targetInstances.length > 1
    const toast =
      mergedOptions.toast && mergedOptions.toast !== true
        ? (mergedOptions.toast as ToastOptions)
        : autoToast
          ? buildDefaultToast(endpoint, perInstanceToast)
          : undefined

    const processOptions = buildProcessOptions(
      {
        ...mergedOptions,
        authority: resolvedAuthority,
        bypassMothership,
        method,
      },
      toast
    )

    const request: ProcessRequest<D> = {
      endpoint,
      method,
      data: sanitizedPayload,
      instances: targetInstances,
      options: processOptions,
    }

    return { request, options: mergedOptions, method, bypassMothership, instances: targetInstances }
  }

  const runWithTracking = async <D = any, R = any>(request: ProcessRequest<D>, options: ApiOptions) => {
    const startedAt = new Date().toISOString()
    const sourceInstance = request.options?.sourceInstance ?? request.options?.rootInstance ?? defaultExecutionInstance
    const authority: DataAuthority =
      !instancesEnabled
        ? 'source'
        : request.options?.bypassMothership === true
        ? 'tenant'
        : (normalizeAuthority(request.options?.authority ?? request.options?.dataLocation) ?? inferAuthorityFromEndpoint(request.endpoint) ?? 'source')
    const attemptInstances = !instancesEnabled
      ? [sourceInstance]
      : request.options?.bypassMothership
      ? request.instances
      : Array.from(new Set([sourceInstance, ...request.instances]))
    const requestId = createRequestId()
    const attempt = options.trackAttempts
      ? await createCrudAttempt({
          endpoint: request.endpoint,
          method: request.method ?? 'mutate',
          data: request.data,
          payload: request.data,
          requestId,
          app: appName,
          instances: attemptInstances,
          instanceResults: {},
          bypassMothership: request.options?.bypassMothership ?? false,
          requireMothership: request.options?.requireMothership ?? true,
          startedAt,
          sourceInstance,
          rootInstance: sourceInstance,
          authority,
          dataLocation: authority,
          options: {
            retryAttempts: request.options?.retryAttempts,
            retryDelay: request.options?.retryDelay,
            retryFailedAttempts: request.options?.retryFailedAttempts,
            retryFailedDelay: request.options?.retryFailedDelay,
            strategy: request.options?.strategy,
            concurrency: request.options?.concurrency,
          },
        })
      : null

    let result = await processRecordForInstancesV1<D, R>(request)
    if (attempt?.id) {
      await updateCrudAttempt(
        attempt.id,
        { results: result.results, updatedAt: new Date().toISOString() },
        sourceInstance,
        request.instances
      )
    }

    result = await retryFailures(request, result, options)

    if (attempt?.id) {
      const cleanupOnSuccess = options.attemptCleanup ?? true
      await finalizeCrudAttempt(
        attempt.id,
        result,
        sourceInstance,
        {
          results: result.results,
          endedAt: new Date().toISOString(),
          cleanupOnSuccess,
        },
        request.instances
      )
    }

    return result
  }

  type ProcessFn = {
    <E extends string, D>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<ProcessResultV2<DefaultReturnFromEndpoint<E>>>
    <E extends string, D, K extends ReturnKind>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | (ApiOptions & { returnType: K }),
      overrides?: Partial<ApiOptions> & { returnType?: K }
    ): Promise<ProcessResultV2<ReturnFor<E, K>>>
    <E extends string, D>(
      config: ApiConfig<D> & { endpoint: E },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<ProcessResultV2<DefaultReturnFromEndpoint<E>>>
    <E extends string, D, K extends ReturnKind>(
      config: ApiConfig<D> & { endpoint: E; returnType?: K },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | (ApiOptions & { returnType: K }),
      overrides?: Partial<ApiOptions> & { returnType?: K }
    ): Promise<ProcessResultV2<ReturnFor<E, K>>>
    <D, R>(
      endpointOrConfig: string | ApiConfig<D>,
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<ProcessResultV2<R>>
  }

  type ProcessCallFn = {
    <E extends string, D>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<DefaultReturnFromEndpoint<E> | null>
    <E extends string, D, K extends ReturnKind>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | (ApiOptions & { returnType: K }),
      overrides?: Partial<ApiOptions> & { returnType?: K }
    ): Promise<ReturnFor<E, K> | null>
    <E extends string, D>(
      config: ApiConfig<D> & { endpoint: E },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<DefaultReturnFromEndpoint<E> | null>
    <E extends string, D, K extends ReturnKind>(
      config: ApiConfig<D> & { endpoint: E; returnType?: K },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | (ApiOptions & { returnType: K }),
      overrides?: Partial<ApiOptions> & { returnType?: K }
    ): Promise<ReturnFor<E, K> | null>
    <D, R>(
      endpointOrConfig: string | ApiConfig<D>,
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<R | null>
  }

  type ProcessAsFn = <R>() => <D>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ) => Promise<R | null>

  type ProcessResultAsFn = <R>() => <D>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ) => Promise<ProcessResultV2<R>>

  type ProcessTypesenseFn = {
    <E extends string, D>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<TypesenseTypeFromModel<EndpointModel<E>> | null>
    <E extends string, D>(
      config: ApiConfig<D> & { endpoint: E },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<TypesenseTypeFromModel<EndpointModel<E>> | null>
  }

  type ProcessTypesenseResultFn = {
    <E extends string, D>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<ProcessResultV2<TypesenseTypeFromModel<EndpointModel<E>>>>
    <E extends string, D>(
      config: ApiConfig<D> & { endpoint: E },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<ProcessResultV2<TypesenseTypeFromModel<EndpointModel<E>>>>
  }

  type ProcessV2Fn = {
    <E extends string, D>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<ProcessResultV2<DefaultReturnFromEndpoint<E>>>
    <E extends string, D, K extends ReturnKind>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | (ApiOptions & { returnType: K }),
      overrides?: Partial<ApiOptions> & { returnType?: K }
    ): Promise<ProcessResultV2<ReturnFor<E, K>>>
    <E extends string, D>(
      config: ApiConfig<D> & { endpoint: E },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<ProcessResultV2<DefaultReturnFromEndpoint<E>>>
    <E extends string, D, K extends ReturnKind>(
      config: ApiConfig<D> & { endpoint: E; returnType?: K },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | (ApiOptions & { returnType: K }),
      overrides?: Partial<ApiOptions> & { returnType?: K }
    ): Promise<ProcessResultV2<ReturnFor<E, K>>>
    <D, R>(
      endpointOrConfig: string | ApiConfig<D>,
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<ProcessResultV2<R>>
  }

  type ProcessCallV2Fn = {
    <E extends string, D>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<DefaultReturnFromEndpoint<E> | null>
    <E extends string, D, K extends ReturnKind>(
      endpoint: E,
      data: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | (ApiOptions & { returnType: K }),
      overrides?: Partial<ApiOptions> & { returnType?: K }
    ): Promise<ReturnFor<E, K> | null>
    <E extends string, D>(
      config: ApiConfig<D> & { endpoint: E },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<DefaultReturnFromEndpoint<E> | null>
    <E extends string, D, K extends ReturnKind>(
      config: ApiConfig<D> & { endpoint: E; returnType?: K },
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | (ApiOptions & { returnType: K }),
      overrides?: Partial<ApiOptions> & { returnType?: K }
    ): Promise<ReturnFor<E, K> | null>
    <D, R>(
      endpointOrConfig: string | ApiConfig<D>,
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ): Promise<R | null>
  }

  const process: ProcessFn = async <D = any, R = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ): Promise<ProcessResultV2<R>> => {
    const { request } = resolveApiRequest(endpointOrConfig, data, instancesOrOptions, overrides)
    return processRecordForInstancesV2<D, R>(request)
  }

  const $process: ProcessCallFn = async <D = any, R = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ): Promise<R | null> => {
    const result = await process<D, R>(endpointOrConfig, data, instancesOrOptions, overrides)
    return result.record
  }

  const $processResult: ProcessFn = async <D = any, R = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ): Promise<ProcessResultV2<R>> => {
    return process<D, R>(endpointOrConfig, data, instancesOrOptions, overrides)
  }

  const $processSource: ProcessCallFn = async <D = any, R = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions
  ): Promise<R | null> => {
    return $process<D, R>(endpointOrConfig, data, instancesOrOptions, { authority: 'source' })
  }

  const $processTenant: ProcessCallFn = async <D = any, R = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions
  ): Promise<R | null> => {
    return $process<D, R>(endpointOrConfig, data, instancesOrOptions, { authority: 'tenant' })
  }

  // Backward-compatible aliases.
  const $processLocal = $processSource
  const $processRemote = $processTenant

  const $processAs: ProcessAsFn = <R>() => {
    return async <D>(
      endpointOrConfig: string | ApiConfig<D>,
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ) => {
      const result = await process<D, R>(endpointOrConfig, data, instancesOrOptions, overrides)
      return result.record
    }
  }

  const $processResultAs: ProcessResultAsFn = <R>() => {
    return async <D>(
      endpointOrConfig: string | ApiConfig<D>,
      data?: D,
      instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
      overrides?: Partial<ApiOptions>
    ) => {
      return process<D, R>(endpointOrConfig, data, instancesOrOptions, overrides)
    }
  }

  const $processTypesense: ProcessTypesenseFn = async <D = any, R = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ): Promise<R | null> => {
    const result = await process<D, R>(endpointOrConfig, data, instancesOrOptions, {
      ...overrides,
      returnType: 'typesense',
    })
    return result.record
  }

  const $processTypesenseResult: ProcessTypesenseResultFn = async <D = any, R = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ): Promise<ProcessResultV2<R>> => {
    return process<D, R>(endpointOrConfig, data, instancesOrOptions, {
      ...overrides,
      returnType: 'typesense',
    })
  }

  const processV2: ProcessV2Fn = async <D = any, R = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ): Promise<ProcessResultV2<R>> => {
    const { request } = resolveApiRequest(endpointOrConfig, data, instancesOrOptions, overrides)
    return processRecordForInstancesV2<D, R>(request)
  }

  const $processV2: ProcessCallV2Fn = async <D = any, R = any>(
    endpointOrConfig: string | ApiConfig<D>,
    data?: D,
    instancesOrOptions?: InstanceCode | InstanceCode[] | ApiOptions,
    overrides?: Partial<ApiOptions>
  ): Promise<R | null> => {
    const result = await processV2<D, R>(endpointOrConfig, data, instancesOrOptions, overrides)
    return result.record
  }

  async function fetchTypesenseRecord<D = any, R = any>(config: TypesenseFetchConfig<D>): Promise<R | null> {
    const { endpoint, method = 'query', payload, transform, instance } = config
    const enrichedPayload =
      instance && payload && typeof payload === 'object' && !('instance' in (payload as any))
        ? { ...(payload as any), instance }
        : payload
    const record = await callTRPCEndpoint(endpoint, method, enrichedPayload)
    if (!record) return null
    return transform ? transform(record) : record
  }

  async function fetchTypesenseRecordWithFallback<D = any, R = any>(
    config: TypesenseFetchConfig<D>,
    fallbackInstances?: InstanceCode[]
  ): Promise<R | null> {
    const candidates = Array.from(
      new Set([config.instance, ...(fallbackInstances ?? [])].filter(Boolean) as InstanceCode[])
    )

    let lastError: any
    for (const instance of candidates.length ? candidates : [config.instance]) {
      try {
        return await fetchTypesenseRecord<D, R>({ ...config, instance })
      } catch (error) {
        lastError = error
      }
    }

    if (lastError) throw lastError
    return null
  }

  async function upsertTypesenseDocument(collectionId: string, document: any) {
    const typesense = useTypesense()
    await typesense.upsertDocument(collectionId, document)
  }

  async function deleteTypesenseDocument(collectionId: string, id: string) {
    const typesense = useTypesense()
    await typesense.deleteDocument(collectionId, id)
  }

  async function updateTypesenseResource<D = any, R = any>(
    fetchCfg: TypesenseFetchConfig<D>,
    tsCfg: TypesenseUpdateConfig<R>,
    fallbackInstances?: InstanceCode[]
  ) {
    const { collectionId, operation = 'upsert', document, deleteId } = tsCfg
    const record = await fetchTypesenseRecordWithFallback<D, R>(fetchCfg, fallbackInstances)
    if (!record) {
      throw new Error('Typesense update: fetched record is null/undefined')
    }

    if (operation === 'delete') {
      const id = deleteId ? await deleteId(record) : (record as any)?.id
      if (!id) throw new Error('Typesense delete requires an id')
      await deleteTypesenseDocument(collectionId, id)
      return { operation: 'delete', id }
    }

    const doc = document ? await document(record) : record
    await upsertTypesenseDocument(collectionId, doc)
    return { operation: 'upsert', doc }
  }

  const defaultTypesenseTransform = (rec: any) => (Array.isArray(rec) ? rec[0] : rec)

  const resolveRecordId = (value: any): string | null => {
    if (!value) return null
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (typeof value === 'object') {
      if ((value as any).tb || (value as any).tab) {
        const directId = (value as any).id
        if (typeof directId === 'string') return directId
        if (typeof directId === 'number') return String(directId)
      }
      const idObj = (value as any).id
      if (typeof idObj === 'string') return idObj
      if (typeof idObj === 'number') return String(idObj)
      if (idObj && typeof idObj === 'object') {
        const nestedId = (idObj as any).id ?? (idObj as any).value
        if (typeof nestedId === 'string') return nestedId
        if (typeof nestedId === 'number') return String(nestedId)
      }
      const fallback = (value as any).recordId ?? (value as any).rid
      if (typeof fallback === 'string') return fallback
      if (typeof fallback === 'number') return String(fallback)
    }
    return null
  }

  const normalizeTypesenseId = (value: string | number): string => {
    const trimmed = String(value ?? '').trim()
    if (!trimmed) return trimmed
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':')
      return parts[parts.length - 1] || trimmed
    }
    return trimmed
  }

  const normalizeSubIdValue = (value: any): any => {
    if (value === null || value === undefined) return value
    if (Array.isArray(value)) {
      return value.map((entry) => normalizeSubIdValue(entry))
    }
    if (typeof value === 'object') {
      if ('tb' in value && 'id' in value) {
        return {
          tb: (value as any).tb,
          id: normalizeSubIdValue((value as any).id),
        }
      }
      if ('id' in value) {
        return normalizeSubIdValue((value as any).id)
      }
      return value
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return normalizeTypesenseId(value)
    }
    return value
  }

  const resolveRecordSubId = <T = string>(value: unknown): T | null => {
    if (value === null || value === undefined) return null
    if (Array.isArray(value)) return normalizeSubIdValue(value) as T
    if (typeof value === 'object') {
      const obj = value as Record<string, any>
      if ('tb' in obj && 'id' in obj) {
        const keys = Object.keys(obj)
        if (keys.length > 2) {
          return normalizeSubIdValue(obj.id) as T
        }
        return normalizeSubIdValue(obj) as T
      }
      if ('id' in obj) {
        return normalizeSubIdValue(obj.id) as T
      }
      return normalizeSubIdValue(obj) as T
    }
    return normalizeSubIdValue(value) as T
  }

  const normalizeRecordIdField = (value: any): string | undefined => {
    const resolved = resolveRecordId(value)
    return resolved ?? (typeof value === 'string' ? value : undefined)
  }

  const normalizeCollectionId = (collectionId: string): string => {
    const trimmed = collectionId.trim().toLowerCase()
    return trimmed.endsWith('s') ? trimmed.slice(0, -1) : trimmed
  }

  const guessEndpointFromCollection = (collectionId: string): string => {
    const singular = normalizeCollectionId(collectionId)
    return `${singular}.typesense.resource`
  }

  async function updateTypesenseForRecord<R = any>(config: TypesenseRecordConfig<R>) {
    const {
      collectionId,
      record,
      id,
      instance,
      instances,
      bypassMothership,
      endpoint,
      method = 'query',
      resourceKey = 'typesense',
      payload,
      transform = defaultTypesenseTransform,
      operation = 'upsert',
      deleteId,
    } = config

    const resolvedId = id ?? resolveRecordId(record)
    if (!resolvedId) {
      throw new Error('Typesense update: unable to resolve record id')
    }

    const instanceFromRecord =
      typeof (record as any)?.instance === 'string'
        ? ((record as any).instance as InstanceCode)
        : Array.isArray((record as any)?.instances) && (record as any).instances.length === 1
          ? ((record as any).instances[0] as InstanceCode)
          : undefined

    const inferredInstance = instance ??
      (bypassMothership === false
        ? defaultSourceInstance
        : (instances && instances.length
            ? instances[0]
            : (instanceFromRecord || defaultSourceInstance)))

    const normalizedCollectionId = normalizeCollectionId(collectionId)
    const fetchEndpoint = endpoint ?? guessEndpointFromCollection(normalizedCollectionId)
    const payloadId = fetchEndpoint.includes('.typesense.')
      ? normalizeTypesenseId(resolvedId)
      : String(resolvedId)
    const fetchPayload =
      payload ??
      (fetchEndpoint.includes('.typesense.')
        ? { data: { id: payloadId } }
        : { data: { id: payloadId, resource: resourceKey } })
    const document = (record: any) => {
      const doc = transform ? transform(record) : record
      if (doc && typeof doc === 'object') {
        const docId = resolveRecordId(doc) ?? String(resolvedId)
        if (docId) {
          const normalizedDoc = { ...(doc as Record<string, any>), id: docId }
          if ('rid' in normalizedDoc) {
            const ridValue = normalizeRecordIdField((normalizedDoc as any).rid)
            if (ridValue) {
              ;(normalizedDoc as any).rid = ridValue
            }
          }
          if ('tsid' in normalizedDoc) {
            const tsidValue = normalizeRecordIdField((normalizedDoc as any).tsid)
            if (tsidValue) {
              ;(normalizedDoc as any).tsid = tsidValue
            }
          }
          return normalizedDoc
        }
      }
      return doc
    }

    return updateTypesenseResource(
      {
        endpoint: fetchEndpoint,
        method,
        payload: fetchPayload,
        transform: transform ?? defaultTypesenseTransform,
        instance: inferredInstance,
      },
      {
        collectionId: normalizedCollectionId,
        operation,
        deleteId,
        document,
      },
      instances ??
        (Array.isArray((record as any)?.instances)
          ? ((record as any).instances as InstanceCode[])
          : undefined)
    )
  }

  return {
    processRecordForInstances: processRecordForInstancesV2,
    processRecordForInstancesV1,
    processRecordForInstancesV2,
    process,
    processV2,
    $process,
    $processV2,
    $processResult,
    $processSource,
    $processTenant,
    $processLocal,
    $processRemote,
    $processAs,
    $processResultAs,
    $processTypesense,
    $processTypesenseResult,
    fetchTypesenseRecord,
    updateTypesenseResource,
    updateTypesenseForRecord,
    upsertTypesenseDocument,
    deleteTypesenseDocument,
    resolveRecordId,
    resolveRecordSubId,
  }
}

export function useApiProcess() {
  return useCRUD()
}
