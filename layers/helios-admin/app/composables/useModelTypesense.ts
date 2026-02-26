import type { ComputedRef, Ref } from 'vue'
import { computed, unref } from 'vue'

type MaybeModelRef = string | Ref<string> | ComputedRef<string> | (() => string)

export type ModelTypesenseAction =
  | 'countRecords'
  | 'listRecords'
  | 'testSingle'
  | 'refreshCollection'
  | 'ensureCollection'
  | 'bulkImport'
  | 'inspectRecord'
  | 'addRecord'
  | 'removeRecord'

export type ModelTypesensePayload = {
  limit?: number
  start?: number
  id?: string
  [key: string]: unknown
}

export type ModelTypesenseStatusResponse = {
  ok: boolean
  model: Record<string, unknown>
  status: Record<string, any>
}

export type ModelTypesenseActionResponse = {
  ok: boolean
  model: Record<string, unknown>
  action: string
  result: Record<string, any>
  status: Record<string, any>
}

export type ModelTypesenseServiceHealthResponse = {
  ok: boolean
  service: {
    baseUrl: string
  }
  health: {
    ok?: boolean
  }
  collectionCount: number
  collections: string[]
}

const resolveModel = (value: MaybeModelRef): string => {
  const raw = typeof value === 'function' ? value() : unref(value)
  return String(raw ?? '').trim().toLowerCase()
}

const createApiErrorMessage = (error: any, fallback: string) => {
  return error?.data?.statusMessage
    ?? error?.statusMessage
    ?? error?.message
    ?? fallback
}

export function useModelTypesense(model: MaybeModelRef) {
  const modelKey = computed(() => resolveModel(model))
  const endpoint = computed(() => `/api/models/typesense/${encodeURIComponent(modelKey.value)}`)

  const readStatus = async (query?: { limit?: number, start?: number }) => {
    if (!modelKey.value) {
      throw new Error('Model key is required to read TypeSense status.')
    }

    try {
      return await $fetch<ModelTypesenseStatusResponse>(endpoint.value, {
        query: {
          limit: query?.limit ?? 10,
          start: query?.start ?? 0,
        },
      })
    }
    catch (error: any) {
      throw new Error(createApiErrorMessage(error, 'Failed to read TypeSense status.'))
    }
  }

  const runAction = async (action: ModelTypesenseAction, payload?: ModelTypesensePayload) => {
    if (!modelKey.value) {
      throw new Error('Model key is required to run TypeSense actions.')
    }

    try {
      return await $fetch<ModelTypesenseActionResponse>(endpoint.value, {
        method: 'POST',
        body: {
          action,
          payload: payload ?? {},
        },
      })
    }
    catch (error: any) {
      throw new Error(createApiErrorMessage(error, `Action "${action}" failed.`))
    }
  }

  const readServiceHealth = async () => {
    try {
      return await $fetch<ModelTypesenseServiceHealthResponse>('/api/typesense/health')
    }
    catch (error: any) {
      throw new Error(createApiErrorMessage(error, 'Failed to reach TypeSense service.'))
    }
  }

  return {
    modelKey,
    endpoint,
    readStatus,
    runAction,
    readServiceHealth,
  }
}
