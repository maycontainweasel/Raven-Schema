import { createGeneratedQuestionOptionController, type QuestionOptionController } from './generated/questionOption'
import { mergeController } from './_shared'
import { extendQuestionOptionController } from '@schema/custom-controllers/questionOption'

export function createQuestionOptionController(): QuestionOptionController {
  const base = createGeneratedQuestionOptionController()
  return mergeController(base, extendQuestionOptionController)
}

export type { QuestionOptionController }
