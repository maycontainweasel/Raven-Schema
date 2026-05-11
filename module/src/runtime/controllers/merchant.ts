import { createGeneratedMerchantController, type MerchantController } from './generated/merchant'
import { mergeController } from './_shared'
import { extendMerchantController } from '@schema/custom-controllers/merchant'

export function createMerchantController(): MerchantController {
  const base = createGeneratedMerchantController()
  return mergeController(base, extendMerchantController)
}

export type { MerchantController }
