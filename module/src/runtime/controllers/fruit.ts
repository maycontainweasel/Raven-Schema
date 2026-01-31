import { createGeneratedFruitController, type FruitController } from './generated/fruit'
import { mergeController } from './_shared'
import { extendFruitController } from '@schema/custom-controllers/fruit'

export function createFruitController(): FruitController {
  const base = createGeneratedFruitController()
  return mergeController(base, extendFruitController)
}

export type { FruitController }
