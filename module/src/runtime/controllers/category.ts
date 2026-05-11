import { createGeneratedCategoryController, type CategoryController } from './generated/category'
import { mergeController } from './_shared'
import { extendCategoryController } from '@schema/custom-controllers/category'

export function createCategoryController(): CategoryController {
  const base = createGeneratedCategoryController()
  return mergeController(base, extendCategoryController)
}

export type { CategoryController }
