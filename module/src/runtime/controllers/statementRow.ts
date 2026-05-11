import { createGeneratedStatementRowController, type StatementRowController } from './generated/statementRow'
import { mergeController } from './_shared'
import { extendStatementRowController } from '@schema/custom-controllers/statementRow'

export function createStatementRowController(): StatementRowController {
  const base = createGeneratedStatementRowController()
  return mergeController(base, extendStatementRowController)
}

export type { StatementRowController }
