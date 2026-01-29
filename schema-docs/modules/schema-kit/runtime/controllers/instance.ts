import { createGeneratedInstanceController, type InstanceController } from './generated/instance'
import { mergeController } from './_shared'
import { extendInstanceController } from '@schema/custom-controllers/instance'

export function createInstanceController(): InstanceController {
  const base = createGeneratedInstanceController()
  return mergeController(base, extendInstanceController)
}

export type { InstanceController }
