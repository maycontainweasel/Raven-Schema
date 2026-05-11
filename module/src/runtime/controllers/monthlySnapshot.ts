import { createGeneratedMonthlySnapshotController, type MonthlySnapshotController } from './generated/monthlySnapshot'
import { mergeController } from './_shared'
import { extendMonthlySnapshotController } from '@schema/custom-controllers/monthlySnapshot'

export function createMonthlySnapshotController(): MonthlySnapshotController {
  const base = createGeneratedMonthlySnapshotController()
  return mergeController(base, extendMonthlySnapshotController)
}

export type { MonthlySnapshotController }
