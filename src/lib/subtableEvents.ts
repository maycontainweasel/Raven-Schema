import type { TableMigrationConfig } from '../types';
import {
  isOperationEnabled,
  normalizeCrudConfig,
  resolveCrudFunctionName,
} from './crudHelpers';

export function attachChildBootstrapEvents(tables: TableMigrationConfig[]): void {
  attachChildBootstrapEventsWithMode(tables, 'function');
}

export function attachChildBootstrapEventsWithMode(
  tables: TableMigrationConfig[],
  mode: 'function' | 'event' = 'function'
): void {
  if (mode !== 'event') {
    return;
  }

  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tablesByModel.set(model, table);
    }
  }

  for (const parentTable of tables) {
    const subTableEntries = parentTable.subTables ?? [];
    if (subTableEntries.length === 0) continue;

    const parentModel = parentTable.table?.model ?? parentTable.name;
    if (!parentModel) continue;
    const parentLabel = parentTable.name ?? parentTable.table?.model ?? 'Table';

    const childCalls: string[] = [];

    for (const entry of subTableEntries) {
      if (entry.autoCreate === false) continue;
      if (!entry.model) continue;

      const childTable =
        tablesByModel.get(entry.model) ||
        tables.find(
          (candidate) =>
            candidate.name?.toLowerCase() === entry.name?.toLowerCase() ||
            candidate.table?.model === entry.model
        );

      if (!childTable) continue;
      const entryType = entry.tableType ?? childTable.tableType;
      if (entryType === 'submany') continue;

      const crud = normalizeCrudConfig(childTable);
      const createOperation = crud?.create;
      if (!isOperationEnabled(createOperation)) continue;

      const functionName = resolveCrudFunctionName('create', createOperation, childTable, tablesByModel);
      childCalls.push(`  let $PARENT_ID = $after.id;`);
      childCalls.push(`  if !type::is_record($PARENT_ID) {`);
      childCalls.push(`    throw "${parentLabel}CreateSubTables | invalid parent record id";`);
      childCalls.push(`  };`);
      childCalls.push(`  fn::${functionName}($PARENT_ID, { skipExists: true });`);
    }

    if (childCalls.length === 0) {
      continue;
    }

    parentTable.events = parentTable.events ?? [];

    const desiredName = 'CreateSubTables';
    if (parentTable.events.some((evt) => (evt.name ?? '').toLowerCase() === desiredName.toLowerCase())) {
      continue;
    }

    const lines = ['{', ...childCalls, '}'];

    parentTable.events.push({
      name: desiredName,
      table: parentTable.table?.model,
      onExisting: 'OVERWRITE',
      on: ['CREATE'],
      query: lines.join('\n'),
      comment: 'Auto-generated to ensure required sub tables exist when the parent is created.',
    });
  }
}
