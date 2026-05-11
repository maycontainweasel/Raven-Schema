import { createGeneratedStatementImportController, type StatementImportController } from './generated/statementImport'
import { mergeController } from './_shared'
import { extendStatementImportController } from '@schema/custom-controllers/statementImport'

export function createStatementImportController(): StatementImportController {
  const base = createGeneratedStatementImportController()
  return mergeController(base, extendStatementImportController)
}

export type { StatementImportController }
