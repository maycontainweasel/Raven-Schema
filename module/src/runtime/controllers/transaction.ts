import { createGeneratedTransactionController, type TransactionController } from './generated/transaction'
import { mergeController } from './_shared'
import { extendTransactionController } from '@schema/custom-controllers/transaction'

export function createTransactionController(): TransactionController {
  const base = createGeneratedTransactionController()
  return mergeController(base, extendTransactionController)
}

export type { TransactionController }
