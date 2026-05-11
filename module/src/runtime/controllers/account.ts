import { createGeneratedAccountController, type AccountController } from './generated/account'
import { mergeController } from './_shared'
import { extendAccountController } from '@schema/custom-controllers/account'

export function createAccountController(): AccountController {
  const base = createGeneratedAccountController()
  return mergeController(base, extendAccountController)
}

export type { AccountController }
