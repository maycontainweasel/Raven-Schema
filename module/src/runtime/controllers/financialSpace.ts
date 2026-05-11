import { createGeneratedFinancialSpaceController, type FinancialSpaceController } from './generated/financialSpace'
import { mergeController } from './_shared'
import { extendFinancialSpaceController } from '@schema/custom-controllers/financialSpace'

export function createFinancialSpaceController(): FinancialSpaceController {
  const base = createGeneratedFinancialSpaceController()
  return mergeController(base, extendFinancialSpaceController)
}

export type { FinancialSpaceController }
