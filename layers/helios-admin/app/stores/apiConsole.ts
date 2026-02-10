import { defineStore } from 'pinia'

export type ApiConsoleState = 'success' | 'error' | 'info' | 'warning'

export type ApiConsoleEntry = {
  id: string
  timestamp: string
  type: 'message' | 'response'
  message?: string
  state?: ApiConsoleState
  payload?: unknown
  raw?: boolean
}

const MAX_STRING_CHARS = 2000
const MAX_ARRAY_ITEMS = 25
const MAX_OBJECT_KEYS = 25
const MAX_DEPTH = 4

const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const truncateString = (value: string) => {
  if (value.length <= MAX_STRING_CHARS) return value
  return `${value.slice(0, MAX_STRING_CHARS)}… (+${value.length - MAX_STRING_CHARS} chars truncated)`
}

const summarisePayload = (value: any, depth = 0): any => {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return truncateString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()

  if (depth >= MAX_DEPTH) {
    if (Array.isArray(value)) {
      return {
        notice: 'Nested array truncated for console display',
        totalItems: value.length,
      }
    }

    return {
      notice: 'Nested object truncated for console display',
      totalKeys: Object.keys(value || {}).length,
    }
  }

  if (Array.isArray(value)) {
    if (value.length <= MAX_ARRAY_ITEMS) {
      return value.map(item => summarisePayload(item, depth + 1))
    }

    return {
      notice: 'Large array truncated for console display',
      totalItems: value.length,
      sample: value.slice(0, MAX_ARRAY_ITEMS).map(item => summarisePayload(item, depth + 1)),
    }
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length <= MAX_OBJECT_KEYS) {
      return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
        acc[key] = summarisePayload(val, depth + 1)
        return acc
      }, {})
    }

    const sampleEntries = entries
      .slice(0, MAX_OBJECT_KEYS)
      .map(([key, val]) => [key, summarisePayload(val, depth + 1)] as const)

    return {
      notice: 'Large object truncated for console display',
      totalKeys: entries.length,
      sample: Object.fromEntries(sampleEntries),
    }
  }

  return value
}

export const useApiConsoleStore = defineStore('apiConsole', () => {
  const entries = ref<ApiConsoleEntry[]>([])
  const autoClear = ref(false)
  const autoScroll = ref(true)

  const addMessage = (message: string) => {
    entries.value.push({
      id: buildId(),
      timestamp: new Date().toISOString(),
      type: 'message',
      message,
    })
  }

  const addResponse = (
    payload: unknown,
    message?: string,
    state: ApiConsoleState = 'info',
    raw = false,
  ) => {
    entries.value.push({
      id: buildId(),
      timestamp: new Date().toISOString(),
      type: 'response',
      message,
      state,
      payload: raw ? payload : summarisePayload(payload),
      raw,
    })
  }

  const clear = () => {
    entries.value = []
  }

  const maybeClearBeforeRun = () => {
    if (autoClear.value) clear()
  }

  const success = (payload: unknown, message?: string) => addResponse(payload, message, 'success')
  const error = (payload: unknown, message?: string) => addResponse(payload, message, 'error')
  const warning = (payload: unknown, message?: string) => addResponse(payload, message, 'warning')
  const info = (payload: unknown, message?: string) => addResponse(payload, message, 'info')

  return {
    entries,
    autoClear,
    autoScroll,
    addMessage,
    addResponse,
    clear,
    maybeClearBeforeRun,
    success,
    error,
    warning,
    info,
  }
})
