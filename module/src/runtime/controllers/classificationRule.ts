import { createGeneratedClassificationRuleController, type ClassificationRuleController } from './generated/classificationRule'
import { mergeController } from './_shared'
import { extendClassificationRuleController } from '@schema/custom-controllers/classificationRule'

export function createClassificationRuleController(): ClassificationRuleController {
  const base = createGeneratedClassificationRuleController()
  return mergeController(base, extendClassificationRuleController)
}

export type { ClassificationRuleController }
