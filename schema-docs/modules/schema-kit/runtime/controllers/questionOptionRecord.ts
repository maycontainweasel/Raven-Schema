import { createGeneratedQuestionOptionRecordController, type QuestionOptionRecordController } from './generated/questionOptionRecord'
import { mergeController } from './_shared'
import { extendQuestionOptionRecordController } from '@schema/custom-controllers/questionOptionRecord'

export function createQuestionOptionRecordController(): QuestionOptionRecordController {
  const base = createGeneratedQuestionOptionRecordController()
  return mergeController(base, extendQuestionOptionRecordController)
}

export type { QuestionOptionRecordController }
