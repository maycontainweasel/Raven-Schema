import { createGeneratedCarController, type CarController } from './generated/car'
import { mergeController } from './_shared'
import { extendCarController } from '@schema/custom-controllers/car'

export function createCarController(): CarController {
  const base = createGeneratedCarController()
  return mergeController(base, extendCarController)
}

export type { CarController }
