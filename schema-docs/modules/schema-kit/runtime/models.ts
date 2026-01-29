import { models as baseModels } from './generated/models'
import type { ModelEntry, ModelKey } from './generated/models'
import overridesModule from '@schema/models/overrides'

export type ModelOverride = Partial<ModelEntry> & Record<string, any>
export type ModelOverrides = Record<string, ModelOverride>

const resolveOverrides = (): ModelOverrides => {
  const overrides = (overridesModule as any)?.modelOverrides ?? overridesModule ?? {}
  if (!overrides || typeof overrides !== 'object') return {}
  return overrides as ModelOverrides
}

const mergeModels = (base: Record<string, ModelEntry>, overrides: ModelOverrides) => {
  const merged: Record<string, ModelEntry> = { ...base }
  for (const [key, override] of Object.entries(overrides)) {
    const baseEntry = merged[key] ?? { table: key, data: 'unknown' }
    merged[key] = { ...baseEntry, ...override }
  }
  return merged as typeof base
}

export const models = mergeModels(baseModels as Record<string, ModelEntry>, resolveOverrides()) as typeof baseModels

export type { ModelEntry, ModelKey }
