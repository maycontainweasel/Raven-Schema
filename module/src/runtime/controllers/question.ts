import { createGeneratedQuestionController, type QuestionController } from './generated/question'
import { mergeController } from './_shared'
import { extendQuestionController } from '@schema/custom-controllers/question'

export function createQuestionController(): QuestionController {
  const base = createGeneratedQuestionController()
  return mergeController(base, extendQuestionController)
}

export type { QuestionController }
