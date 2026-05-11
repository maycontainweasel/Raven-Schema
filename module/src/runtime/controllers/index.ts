import { createAccountController } from './account'
import { createCategoryController } from './category'
import { createClarificationTaskController } from './clarificationTask'
import { createClassificationRuleController } from './classificationRule'
import { createFinancialSpaceController } from './financialSpace'
import { createMerchantController } from './merchant'
import { createMonthlySnapshotController } from './monthlySnapshot'
import { createStatementImportController } from './statementImport'
import { createStatementRowController } from './statementRow'
import { createTransactionController } from './transaction'
import { createUserController } from './user'
import type { AccountController } from './account'
import type { CategoryController } from './category'
import type { ClarificationTaskController } from './clarificationTask'
import type { ClassificationRuleController } from './classificationRule'
import type { FinancialSpaceController } from './financialSpace'
import type { MerchantController } from './merchant'
import type { MonthlySnapshotController } from './monthlySnapshot'
import type { StatementImportController } from './statementImport'
import type { StatementRowController } from './statementRow'
import type { TransactionController } from './transaction'
import type { UserController } from './user'

export type ControllersMap = {
  account: AccountController;
  category: CategoryController;
  clarificationTask: ClarificationTaskController;
  classificationRule: ClassificationRuleController;
  financialSpace: FinancialSpaceController;
  merchant: MerchantController;
  monthlySnapshot: MonthlySnapshotController;
  statementImport: StatementImportController;
  statementRow: StatementRowController;
  transaction: TransactionController;
  user: UserController;
}

export function createControllers(): ControllersMap {
  return {
  account: createAccountController(),
  category: createCategoryController(),
  clarificationTask: createClarificationTaskController(),
  classificationRule: createClassificationRuleController(),
  financialSpace: createFinancialSpaceController(),
  merchant: createMerchantController(),
  monthlySnapshot: createMonthlySnapshotController(),
  statementImport: createStatementImportController(),
  statementRow: createStatementRowController(),
  transaction: createTransactionController(),
  user: createUserController(),
  }
}
