import { createGeneratedUserController, type UserController } from './generated/user'
import { mergeController } from './_shared'
import { extendUserController } from '@schema/custom-controllers/user'

export function createUserController(): UserController {
  const base = createGeneratedUserController()
  return mergeController(base, extendUserController)
}

export type { UserController }
