import path from 'path';

import type { TableMigrationConfig } from '../types';
import { getParentModelValue } from './crudHelpers';

const pathCache = new Map<TableMigrationConfig, string>();
const legacyPathCache = new Map<TableMigrationConfig, string>();

export function getTableAssetDir(
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>,
  outputRoot: string
): string {
  const relative = buildRelativePath(table, tablesByModel);
  return path.join(outputRoot, relative);
}

export function getLegacyTableAssetDir(
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>,
  outputRoot: string
): string {
  const relative = buildLegacyRelativePath(table, tablesByModel);
  return path.join(outputRoot, relative);
}

export function buildFunctionFileName(functionName: string): string {
  return `F_${functionName}.surql`;
}

export function buildEventFileName(eventName: string): string {
  return `E_${eventName}.surql`;
}

export function buildResourceFileName(resourceName: string): string {
  return `V_${resourceName}.surql`;
}

const cycleWarnings = new Set<string>();

function buildRelativePath(
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>,
  stack: Set<TableMigrationConfig> = new Set()
): string {
  if (pathCache.has(table)) {
    return pathCache.get(table) as string;
  }

  if (stack.has(table)) {
    const key = table.table?.model ?? table.name ?? 'table';
    if (!cycleWarnings.has(key)) {
      cycleWarnings.add(key);
      console.warn(`⚠️  Cycle detected in subtable parent chain for "${key}". Using local path segment.`);
    }
    const fallback = sanitizeSegment(key);
    pathCache.set(table, fallback);
    return fallback;
  }

  stack.add(table);

  const segment = sanitizeSegment(
    table.router?.name ?? table.name ?? table.table?.model ?? 'table'
  );

  const parentModel = getParentModelValue(table);
  if (!parentModel) {
    pathCache.set(table, segment);
    stack.delete(table);
    return segment;
  }

  const parentTable = tablesByModel.get(parentModel);
  const parentPath = parentTable
    ? buildRelativePath(parentTable, tablesByModel, stack)
    : sanitizeSegment(parentModel);

  const result = path.posix.join(parentPath, segment);
  pathCache.set(table, result);
  stack.delete(table);
  return result;
}

const legacyCycleWarnings = new Set<string>();

function buildLegacyRelativePath(
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>,
  stack: Set<TableMigrationConfig> = new Set()
): string {
  if (legacyPathCache.has(table)) {
    return legacyPathCache.get(table) as string;
  }

  if (stack.has(table)) {
    const key = table.table?.model ?? table.name ?? 'table';
    if (!legacyCycleWarnings.has(key)) {
      legacyCycleWarnings.add(key);
      console.warn(`⚠️  Cycle detected in legacy subtable path for "${key}". Using local segment.`);
    }
    const fallback = sanitizeSegment(key);
    legacyPathCache.set(table, fallback);
    return fallback;
  }

  stack.add(table);

  const segment = sanitizeSegment(
    table.table?.model ?? table.name ?? table.router?.name ?? 'table'
  );

  const parentModel = getParentModelValue(table);
  if (!parentModel) {
    legacyPathCache.set(table, segment);
    stack.delete(table);
    return segment;
  }

  const parentTable = tablesByModel.get(parentModel);
  const parentPath = parentTable
    ? buildLegacyRelativePath(parentTable, tablesByModel, stack)
    : sanitizeSegment(parentModel);

  const result = path.posix.join(parentPath, segment);
  legacyPathCache.set(table, result);
  stack.delete(table);
  return result;
}

function sanitizeSegment(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'table'
  );
}
