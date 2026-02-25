import { defineStore } from 'pinia'
import { models as schemaModels } from '@schema/models'
import {
  apiInstanceOptions,
  apiModelOverrides,
  apiProcessCatalog,
  type ApiModelOverride,
  type ApiProcessDefinition,
  type ApiInstanceOption,
} from '@schema/config/api-models.config'

export type ApiModelMeta = {
  key: string
  label: string
  description: string
  icon: string
  table: string
  authority: 'source' | 'tenant' | 'unknown'
  processes: string[]
}

const normalizeAuthority = (value: unknown): 'source' | 'tenant' | 'unknown' => {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'source' || normalized === 'local') return 'source'
  if (normalized === 'tenant' || normalized === 'remote') return 'tenant'
  return 'unknown'
}

const toTitleCase = (value: string) => {
  const spaced = value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase())
}

const baseUseApiModelsStore = defineStore('apiModels', () => {
  const processCatalog = ref<ApiProcessDefinition[]>(apiProcessCatalog)
  const modelOverrides = ref<Record<string, ApiModelOverride>>({ ...apiModelOverrides })
  const instances = ref<ApiInstanceOption[]>([...apiInstanceOptions])

  const modelKeys = computed(() => Object.keys(schemaModels || {}))

  const getModelMeta = (key: string): ApiModelMeta => {
    const schemaEntry = (schemaModels as any)?.[key]
    const override = modelOverrides.value[key]

    const label = override?.label ?? toTitleCase(key)
    const description =
      override?.description ?? `${label} model routines and API utilities.`
    const icon = override?.icon ?? 'dashboard'
    const processes = override?.processes ?? processCatalog.value
      .filter((process) => process.enabledByDefault)
      .map((process) => process.id)

    return {
      key,
      label,
      description,
      icon,
      table: schemaEntry?.table ?? key,
      authority: normalizeAuthority(override?.authority ?? override?.data ?? schemaEntry?.authority ?? schemaEntry?.data),
      processes,
    }
  }

  const getAvailableProcesses = (key: string) => {
    const meta = getModelMeta(key)
    const allowed = new Set(meta.processes)
    return processCatalog.value.filter((process) => allowed.has(process.id))
  }

  const setOverrides = (overrides: Record<string, ApiModelOverride>) => {
    modelOverrides.value = { ...modelOverrides.value, ...overrides }
  }

  const setProcessCatalog = (catalog: ApiProcessDefinition[]) => {
    processCatalog.value = [...catalog]
  }

  const setInstances = (options: ApiInstanceOption[]) => {
    instances.value = [...options]
  }

  return {
    modelKeys,
    processCatalog,
    instances,
    getModelMeta,
    getAvailableProcesses,
    setOverrides,
    setProcessCatalog,
    setInstances,
  }
})

const API_MODELS_STORE_EXTENDED = Symbol.for('schema-kit.apimodels.extended')

const applyApiModelsStoreOverrides = async (store: any) => {
  try {
    const mod = await import('@schema/custom-stores/apiModels')
    const extender = mod?.extendApiModelsStore ?? mod?.default
    if (typeof extender === 'function') {
      await extender(store)
    }
  } catch {
    // No overrides found; ignore.
  }
}

export const useApiModelsStore = ((...args: any[]) => {
  const store = (baseUseApiModelsStore as any)(...args)
  if (!(store as any)[API_MODELS_STORE_EXTENDED]) {
    Object.defineProperty(store, API_MODELS_STORE_EXTENDED, {
      value: true,
      enumerable: false,
      configurable: false,
    })
    void applyApiModelsStoreOverrides(store)
  }
  return store
}) as typeof baseUseApiModelsStore
