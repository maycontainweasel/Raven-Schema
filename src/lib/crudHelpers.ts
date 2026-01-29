import type {
  CrudDefinition,
  CrudOperationDefinition,
  CrudOperationOptions,
  TableMigrationConfig,
  TableStructureConfig,
} from '../types';

export type CrudOperationKind = 'create' | 'update' | 'delete';

export function normalizeCrudConfig(table: TableMigrationConfig): CrudDefinition | null {
  if (table.crud) {
    const result = table.crud;
    if (isSubTable(table) && !('delete' in result)) {
      result.delete = {
        enabled: true,
        name: 'delete__NAME__',
        params: [{ name: 'rid', type: 'record' }],
      };
    }
    return result;
  }

  const legacy = (table as any).trpc;
  const endpoints = legacy?.endpoints as Array<Record<string, unknown>> | undefined;
  if (!endpoints) {
    return null;
  }

  const create = convertLegacyEndpoint(findLegacyOperationEndpoint(endpoints, 'create'));
  const update = convertLegacyEndpoint(findLegacyOperationEndpoint(endpoints, 'update'));
  const del = convertLegacyEndpoint(findLegacyOperationEndpoint(endpoints, 'delete'));

  if (!create && !update && !del) {
    return null;
  }

  const result: CrudDefinition = {};
  if (create) result.create = create;
  if (update) result.update = update;
  if (del) result.delete = del;
  if (isSubTable(table) && !('delete' in result)) {
    result.delete = {
      enabled: true,
      name: 'delete__NAME__',
      params: [{ name: 'rid', type: 'record' }],
    };
  }
  return result;
}

export function isOperationEnabled(
  operation?: CrudOperationDefinition
): operation is CrudOperationDefinition {
  if (!operation) return false;
  if (operation.enabled === false) return false;
  return true;
}

export function isSubTable(table: TableMigrationConfig): boolean {
  if (table.tableType === 'subsingle' || table.tableType === 'submany') return true;
  if (table.primary === false) return true;
  if (table.structure) return true;
  return false;
}

export function getParentModelValue(table: TableMigrationConfig): string | null {
  if (
    typeof table.structure === 'object' &&
    (table.structure as TableStructureConfig).type === 'parent' &&
    (table.structure as TableStructureConfig).parentModel
  ) {
    return (table.structure as TableStructureConfig).parentModel;
  }

  return null;
}

export function getFunctionSuffix(
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>
): string {
  const childLabelRaw = table.name || table.router?.name || table.table?.model || 'Child';
  const childLabel = toPascalCase(childLabelRaw);
  return childLabel;
}

export function resolveCrudFunctionName(
  operationKind: CrudOperationKind,
  operation: CrudOperationDefinition | undefined,
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>
): string {
  const suffix = getFunctionSuffix(table, tablesByModel);

  if (!operation?.name) {
    return `${operationKind}${suffix}`;
  }

  if (operation.name.includes('__NAME__')) {
    return operation.name.replace(/__NAME__/g, suffix);
  }

  return operation.name;
}

export function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

interface LegacyCrudEndpoint {
  params?: CrudOperationDefinition['params'];
  options?: CrudOperationOptions;
}

function convertLegacyEndpoint(definition: LegacyCrudEndpoint | null): CrudOperationDefinition | undefined {
  if (!definition) return undefined;
  const result: CrudOperationDefinition = {
    enabled: true,
  };
  if (definition.params) {
    result.params = definition.params;
  }
  if (definition.options) {
    result.options = definition.options;
  }
  return result;
}

function findLegacyOperationEndpoint(
  endpoints: Array<Record<string, unknown>>,
  operation: string
): LegacyCrudEndpoint | null {
  for (const endpoint of endpoints) {
    if (operation in endpoint) {
      const value = (endpoint as Record<string, unknown>)[operation];
      if (!value) return null;
      if (typeof value === 'boolean') {
        return value ? {} : null;
      }
      if (typeof value === 'object') {
        return value as LegacyCrudEndpoint;
      }
    }
  }
  return null;
}
