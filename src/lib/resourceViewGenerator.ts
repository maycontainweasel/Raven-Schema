import { mkdir, readdir, unlink } from 'fs/promises';
import path from 'path';

import type {
  ResourceDefinition,
  ResourceFieldEntry,
  TableMigrationConfig,
} from '../types';
import { buildFunctionFileName, buildResourceFileName, getTableAssetDir } from './tableAssetPaths';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker } from './assetTracker';
import { readSurqlFiles, writeGeneratedAsset } from './assetWriter';

interface GenerateResourceViewsOptions {
  tables: TableMigrationConfig[];
  outputRoot: string;
  assetTracking?: AssetTrackingOptions;
}

interface ResourceViewDefinition {
  resourceName: string;
  content: string;
}

interface ResourceFunctionDefinition {
  functionName: string;
  content: string;
}

interface ResourceProjection {
  expression: string;
  alias?: string;
}

export async function generateResourceViews(
  options: GenerateResourceViewsOptions
): Promise<void> {
  const { tables, outputRoot } = options;
  const tracker = await createAssetTracker(options.assetTracking);

  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tablesByModel.set(model, table);
    }
  }

  for (const table of tables) {
    const viewDefinitions = resolveViewDefinitions(table);
    if (viewDefinitions.length === 0) {
      continue;
    }

    const views = buildViewsForTable(table, viewDefinitions);
    const viewFunctions = buildViewFunctionsForTable(table, viewDefinitions);
    if (views.length === 0 && viewFunctions.length === 0) {
      continue;
    }

    const tableDir = getTableAssetDir(table, tablesByModel, outputRoot);
    const previousFiles = await readSurqlFiles(tableDir);
    await mkdir(tableDir, { recursive: true });
    if (views.length > 0) {
      await clearExistingViews(tableDir);
    }

    for (const view of views) {
      const fileName = buildResourceFileName(view.resourceName);
      const filePath = path.join(tableDir, fileName);
      const prev = previousFiles.get(filePath);
      await writeGeneratedAsset({
        filePath,
        content: view.content,
        tracker,
        compareContent: prev,
        meta: {
          source: 'generated',
          layer: 'views',
          table: table.table?.model ?? table.name,
        },
      });
      console.log(`📄 Generated view: ${path.relative(process.cwd(), filePath)}`);
    }

    for (const fn of viewFunctions) {
      const fileName = buildFunctionFileName(fn.functionName);
      const filePath = path.join(tableDir, fileName);
      const prev = previousFiles.get(filePath);
      await writeGeneratedAsset({
        filePath,
        content: fn.content,
        tracker,
        compareContent: prev,
        meta: {
          source: 'generated',
          layer: 'functions',
          table: table.table?.model ?? table.name,
        },
      });
      console.log(`📄 Generated view function: ${path.relative(process.cwd(), filePath)}`);
    }
  }
}

function buildViewsForTable(
  table: TableMigrationConfig,
  viewDefinitions: ResourceDefinition[]
): ResourceViewDefinition[] {
  const tableModel = table.table?.model;
  if (!tableModel) {
    return [];
  }

  const views: ResourceViewDefinition[] = [];
  for (const resource of viewDefinitions) {
    if (!shouldGenerateView(resource)) {
      continue;
    }

    const projections = buildProjections(resource);
    if (projections.length === 0) {
      continue;
    }

    const resourceName = buildViewName(table, resource);
    const mode = (resource.mode ?? 'OVERWRITE').toUpperCase();
    const type = (resource.type ?? 'NORMAL').toUpperCase();
    const fromSource = resource.from ?? tableModel;

    const selectLines = projections.map((projection, index) => {
      const aliasSegment = projection.alias ? ` AS ${projection.alias}` : '';
      const suffix = index < projections.length - 1 ? ',' : '';
      return `    ${projection.expression}${aliasSegment}${suffix}`;
    });

    const baseTableDefinition =
      fromSource === tableModel ? buildBaseTableDefinition(table) : null;

    const viewContent = [
      ...(baseTableDefinition ? [baseTableDefinition, ''] : []),
      `DEFINE TABLE ${mode} ${resourceName} TYPE ${type} AS`,
      'SELECT',
      ...selectLines,
      `FROM ${fromSource};`,
      '',
    ].join('\n');

    views.push({
      resourceName,
      content: viewContent,
    });
  }

  return views;
}

function buildViewFunctionsForTable(
  table: TableMigrationConfig,
  viewDefinitions: ResourceDefinition[]
): ResourceFunctionDefinition[] {
  const tableModel = table.table?.model;
  if (!tableModel) {
    return [];
  }

  const functions: ResourceFunctionDefinition[] = [];
  for (const resource of viewDefinitions) {
    if (!shouldGenerateViewFunction(resource)) {
      continue;
    }

    const projections = buildProjections(resource);
    if (projections.length === 0) {
      continue;
    }

    const functionName = normalizeFunctionName(resource.function ?? '');
    if (!functionName) {
      continue;
    }

    const selectLines = projections.map((projection, index) => {
      const aliasSegment = projection.alias ? ` AS ${projection.alias}` : '';
      const suffix = index < projections.length - 1 ? ',' : '';
      return `    ${projection.expression}${aliasSegment}${suffix}`;
    });

    const tableLabel = table.name || table.table?.model || 'Record';
    const paramName = `$${toPascalCase(tableLabel)}Id`;
    const paramType = `any`;

    const content = [
      `DEFINE FUNCTION OVERWRITE fn::${functionName}(${paramName}: ${paramType}) {`,
      '',
      `\tlet $RID = fn::ridParam("${tableModel}", ${paramName});`,
      '',
      `\tif !type::is_record($RID) || !record::exists($RID) {`,
      `\t\tthrow '${functionName} | expects valid ${paramName} record';`,
      '\t};',
      '',
      '\treturn SELECT',
      ...selectLines.map((line) => `\t${line}`),
      `\tFROM only $RID;`,
      '};',
      '',
    ].join('\n');

    functions.push({ functionName, content });
  }

  return functions;
}

function buildBaseTableDefinition(table: TableMigrationConfig): string | null {
  const model = table.table?.model;
  if (!model) return null;
  const type = (table.table?.type ?? 'NORMAL').toString().toUpperCase();
  const schemaModeRaw = (table.table?.schemaMode ?? 'schemaless').toString().toUpperCase();
  const schemaMode = schemaModeRaw === 'SCHEMAFULL' ? 'SCHEMAFULL' : 'SCHEMALESS';
  const permissionsRaw = (table.table?.permissions ?? 'full').toString().toUpperCase();
  const permissions =
    permissionsRaw === 'FULL' || permissionsRaw === 'NONE' ? permissionsRaw : 'FULL';

  return `DEFINE TABLE IF NOT EXISTS ${model} TYPE ${type} ${schemaMode} PERMISSIONS ${permissions};`;
}

function resolveViewDefinitions(table: TableMigrationConfig): ResourceDefinition[] {
  const defs: ResourceDefinition[] = [];
  if (Array.isArray(table.views) && table.views.length > 0) {
    defs.push(...table.views);
  } else if (Array.isArray(table.resources) && table.resources.length > 0) {
    defs.push(...table.resources);
  }

  if (table.typesense?.view) {
    const existing = new Set(defs.map((def) => def.name.toLowerCase()));
    if (!existing.has(table.typesense.view.name.toLowerCase())) {
      defs.push(table.typesense.view);
    }
  }

  return defs;
}

function shouldGenerateView(resource: ResourceDefinition): boolean {
  if (resource.function) {
    return false;
  }
  if (Array.isArray(resource.as) && resource.as.length > 0) {
    return true;
  }
  if (hasStringEntry(resource.fields)) {
    return true;
  }
  if (hasStringEntry(resource.select)) {
    return true;
  }
  return false;
}

function shouldGenerateViewFunction(resource: ResourceDefinition): boolean {
  return Boolean(resource.function && resource.functionMode === 'generate');
}

function hasStringEntry(entries?: ResourceFieldEntry[]): boolean {
  if (!Array.isArray(entries)) {
    return false;
  }
  return entries.some((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function buildProjections(resource: ResourceDefinition): ResourceProjection[] {
  const projections: ResourceProjection[] = [];
  const fetchFields = new Set(
    Array.isArray(resource.fetch)
      ? resource.fetch.map((field) => String(field).trim()).filter(Boolean)
      : []
  );

  appendStringEntries(resource.fields, projections, fetchFields, true);
  appendStringEntries(resource.select, projections, fetchFields, false);
  appendAliasEntries(resource.as, projections);

  return dedupeProjections(projections);
}

function appendStringEntries(
  entries: ResourceFieldEntry[] | undefined,
  output: ResourceProjection[],
  fetchFields: Set<string>,
  applyFetch: boolean
): void {
  if (!Array.isArray(entries)) {
    return;
  }
  for (const entry of entries) {
    if (typeof entry === 'string') {
      const expression = entry.trim();
      if (!expression) {
        continue;
      }
      if (expression.startsWith('#')) {
        continue;
      }
      if (applyFetch && fetchFields.has(expression)) {
        output.push({
          expression: `(select * from only $this.${expression})`,
          alias: expression,
        });
      } else {
        output.push({ expression });
      }
    }
  }
}

function appendAliasEntries(
  entries: ResourceFieldEntry[] | undefined,
  output: ResourceProjection[]
): void {
  if (!Array.isArray(entries)) {
    return;
  }

  for (const entry of entries) {
    if (typeof entry === 'string') {
      if (entry.trim().startsWith('#')) {
        continue;
      }
      const idx = entry.indexOf(':');
      if (idx === -1) {
        continue;
      }
      const alias = entry.slice(0, idx).trim();
      const rawValue = entry.slice(idx + 1).trim();
      if (!alias) {
        continue;
      }
      const expression = normalizeExpression(rawValue);
      if (!expression) {
        continue;
      }
      output.push({
        expression,
        alias,
      });
      continue;
    }

    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    for (const [alias, rawValue] of Object.entries(entry)) {
      const expression = normalizeExpression(rawValue);
      if (!expression) {
        continue;
      }
      output.push({
        expression,
        alias: alias === expression ? undefined : alias,
      });
    }
  }
}

function normalizeExpression(value: string | string[] | number | boolean): string | null {
  if (Array.isArray(value)) {
    const parts = value.map((part) => String(part).trim()).filter(Boolean);
    if (parts.length === 0) {
      return null;
    }
    return parts.join('\n        ');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value === null || value === undefined) {
    return null;
  }

  let expression = String(value).trim();
  const exactVarMatch = expression.match(/^\$([A-Za-z_][A-Za-z0-9_]*)$/);
  if (exactVarMatch) {
    const name = exactVarMatch[1];
    if (name !== 'this' && name !== 'parent') {
      expression = name;
    }
  } else {
    expression = expression.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
      if (name === 'this' || name === 'parent') {
        return `$${name}`;
      }
      return `$this.${name}`;
    });
  }
  return expression.length > 0 ? expression : null;
}

function dedupeProjections(projections: ResourceProjection[]): ResourceProjection[] {
  const byKey = new Map<string, ResourceProjection>();

  for (const projection of projections) {
    const alias = projection.alias ?? '';
    const key = alias || projection.expression;

    if (alias) {
      for (const [existingKey, existing] of byKey.entries()) {
        if (existing.alias === alias || (!existing.alias && existing.expression === alias)) {
          byKey.delete(existingKey);
        }
      }
    }

    if (byKey.has(key)) {
      byKey.delete(key);
    }
    byKey.set(key, projection);
  }

  return Array.from(byKey.values());
}

function buildViewName(table: TableMigrationConfig, resource: ResourceDefinition): string {
  const tableLabel = table.name || table.table?.model || 'Resource';
  const resourceLabel = resource.name || 'View';
  return `${toPascalCase(tableLabel)}${toPascalCase(resourceLabel)}`;
}

function normalizeFunctionName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('fn::')) {
    return trimmed.slice('fn::'.length);
  }
  return trimmed;
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

async function clearExistingViews(dir: string): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.startsWith('V_'))
        .map((entry) => unlink(path.join(dir, entry.name)))
    );
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}
