import { createGeneratedPostController, type PostController } from './generated/post'
import { mergeController } from './_shared'
import { extendPostController } from '@schema/custom-controllers/post'

export function createPostController(): PostController {
  const base = createGeneratedPostController()
  return mergeController(base, extendPostController)
}

export type { PostController }
