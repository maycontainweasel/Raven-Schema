import { createGeneratedUserQuestionOptionRecordController, type UserQuestionOptionRecordController } from './generated/userQuestionOptionRecord'
import { mergeController } from './_shared'
import { extendUserQuestionOptionRecordController } from '@schema/custom-controllers/userQuestionOptionRecord'

export function createUserQuestionOptionRecordController(): UserQuestionOptionRecordController {
  const base = createGeneratedUserQuestionOptionRecordController()
  return mergeController(base, extendUserQuestionOptionRecordController)
}

export type { UserQuestionOptionRecordController }
