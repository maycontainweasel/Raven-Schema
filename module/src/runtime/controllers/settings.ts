import { createGeneratedInstanceSettingsController, type InstanceSettingsController } from './generated/settings'
import { mergeController } from './_shared'
import { extendInstanceSettingsController } from '@schema/custom-controllers/settings'

export function createInstanceSettingsController(): InstanceSettingsController {
  const base = createGeneratedInstanceSettingsController()
  return mergeController(base, extendInstanceSettingsController)
}

export type { InstanceSettingsController }
