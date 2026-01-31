import { createGeneratedQuestionRecordController, type QuestionRecordController } from './generated/questionRecord'
import { mergeController } from './_shared'
import { extendQuestionRecordController } from '@schema/custom-controllers/questionRecord'

export function createQuestionRecordController(): QuestionRecordController {
  const base = createGeneratedQuestionRecordController()
  return mergeController(base, extendQuestionRecordController)
}

export type { QuestionRecordController }
