import { createGeneratedClarificationTaskController, type ClarificationTaskController } from './generated/clarificationTask'
import { mergeController } from './_shared'
import { extendClarificationTaskController } from '@schema/custom-controllers/clarificationTask'

export function createClarificationTaskController(): ClarificationTaskController {
  const base = createGeneratedClarificationTaskController()
  return mergeController(base, extendClarificationTaskController)
}

export type { ClarificationTaskController }
