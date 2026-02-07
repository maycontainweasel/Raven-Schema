import { mkdir, rm } from 'fs/promises';
import path from 'path';

import type {
  CrudDefinition,
  CrudOperationDefinition,
  CrudOperationOptions,
  TableFieldEntry,
  TableFieldMeta,
  TableMigrationConfig,
  TableStructureConfig,
} from '../types';
import {
  getFunctionSuffix,
  getParentModelValue,
  isSubTable,
  isOperationEnabled,
  normalizeCrudConfig,
  resolveCrudFunctionName,
  toPascalCase,
} from './crudHelpers';
import { buildEventStatement, collectEvents, formatEventForFile } from './eventUtils';
import {
  buildEventFileName,
  buildFunctionFileName,
  getLegacyTableAssetDir,
  getTableAssetDir,
} from './tableAssetPaths';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker } from './assetTracker';
import { readSurqlFiles, writeGeneratedAsset } from './assetWriter';
import { collectRelations, type NormalizedRelation } from './relationUtils';

interface GenerateFunctionsOptions {
  tables: TableMigrationConfig[];
  outputRoot: string;
  assetTracking?: AssetTrackingOptions;
  eventFileMode?: 'split' | 'table';
}

interface NormalizedHooks {
  preValidate: string[];
  postValidate: string[];
  preProcess: string[];
  postProcess: string[];
}

export async function generateTableFunctions(options: GenerateFunctionsOptions): Promise<void> {
  const { tables, outputRoot } = options;
  await mkdir(outputRoot, { recursive: true });
  const tracker = await createAssetTracker(options.assetTracking);

  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tablesByModel.set(model, table);
    }
  }

  const relationHooksByModel = groupRelationHooks(tables);
  const taxonomyHooksByModel = groupTaxonomyHooks(tables);

  // Process parent tables before subtables so a parent directory reset doesn't remove newly written child assets.
  const tablesInOrder = [...tables].sort((a, b) => {
    const aDepth = getTableAssetDir(a, tablesByModel, outputRoot).split(path.sep).length;
    const bDepth = getTableAssetDir(b, tablesByModel, outputRoot).split(path.sep).length;
    return aDepth - bDepth;
  });

  const dirCache = new Map<TableMigrationConfig, string>();
  const previousFilesByDir = new Map<string, Map<string, string>>();

  for (const table of tablesInOrder) {
    const crud = normalizeCrudConfig(table);
    if (!crud) continue;

    const preDir = getTableAssetDir(table, tablesByModel, outputRoot);
    previousFilesByDir.set(preDir, await readSurqlFiles(preDir));
    const tableDir = await resetTableDir(table, tablesByModel, outputRoot, dirCache);

    const createOperation = crud.create;
    if (isOperationEnabled(createOperation)) {
      const createName = resolveCrudFunctionName('create', createOperation, table, tablesByModel);
      const createPath = path.join(tableDir, buildFunctionFileName(createName));
      const content = buildCreateFunctionContent(
        table,
        createOperation,
        createName,
        tablesByModel,
        relationHooksByModel.get(table.table?.model ?? ''),
        taxonomyHooksByModel.get(table.table?.model ?? '')
      );
      const prev = previousFilesByDir.get(tableDir)?.get(createPath);
      await writeGeneratedAsset({
        filePath: createPath,
        content,
        tracker,
        compareContent: prev,
        meta: {
          source: 'generated',
          layer: 'functions',
          table: table.table?.model ?? table.name,
        },
      });
      console.log(`🧩 Generated create function: ${path.relative(process.cwd(), createPath)}`);
    }

    const updateOperation = crud.update;
    if (isOperationEnabled(updateOperation)) {
      const updateName = resolveCrudFunctionName('update', updateOperation, table, tablesByModel);
      const updatePath = path.join(tableDir, buildFunctionFileName(updateName));
      const content = buildUpdateFunctionContent(
        table,
        updateOperation,
        updateName,
        relationHooksByModel.get(table.table?.model ?? ''),
        taxonomyHooksByModel.get(table.table?.model ?? '')
      );
      const prev = previousFilesByDir.get(tableDir)?.get(updatePath);
      await writeGeneratedAsset({
        filePath: updatePath,
        content,
        tracker,
        compareContent: prev,
        meta: {
          source: 'generated',
          layer: 'functions',
          table: table.table?.model ?? table.name,
        },
      });
      console.log(`🧩 Generated update function: ${path.relative(process.cwd(), updatePath)}`);
    }

    const deleteOperation = crud.delete;
    if (isOperationEnabled(deleteOperation)) {
      const deleteName = resolveCrudFunctionName('delete', deleteOperation, table, tablesByModel);
      const deletePath = path.join(tableDir, buildFunctionFileName(deleteName));
      const content = buildDeleteFunctionContent(
        table,
        deleteOperation,
        deleteName,
        relationHooksByModel.get(table.table?.model ?? ''),
        taxonomyHooksByModel.get(table.table?.model ?? '')
      );
      const prev = previousFilesByDir.get(tableDir)?.get(deletePath);
      await writeGeneratedAsset({
        filePath: deletePath,
        content,
        tracker,
        compareContent: prev,
        meta: {
          source: 'generated',
          layer: 'functions',
          table: table.table?.model ?? table.name,
        },
      });
      console.log(`🧩 Generated delete function: ${path.relative(process.cwd(), deletePath)}`);
    }
  }

  await writeEventFiles(
    tables,
    tablesByModel,
    outputRoot,
    dirCache,
    previousFilesByDir,
    tracker,
    options.eventFileMode
  );
}

function normalizeHooks(operation: CrudOperationDefinition): NormalizedHooks {
  const empty: NormalizedHooks = { preValidate: [], postValidate: [], preProcess: [], postProcess: [] };
  const optionHooks = operation.options?.hooks;
  const directHooks = operation.hooks;

  const extract = (raw?: CrudOperationOptions['hooks']): NormalizedHooks => ({
    preValidate: Array.isArray(raw?.preValidate) ? raw!.preValidate! : [],
    postValidate: Array.isArray(raw?.postValidate) ? raw!.postValidate! : [],
    preProcess: Array.isArray(raw?.preProcess) ? raw!.preProcess! : [],
    postProcess: Array.isArray(raw?.postProcess) ? raw!.postProcess! : [],
  });

  const fromOptions = optionHooks ? extract(optionHooks) : empty;
  const fromDirect = directHooks ? extract(directHooks) : empty;

  return {
    preValidate: [...fromOptions.preValidate, ...fromDirect.preValidate],
    postValidate: [...fromOptions.postValidate, ...fromDirect.postValidate],
    preProcess: [...fromOptions.preProcess, ...fromDirect.preProcess],
    postProcess: [...fromOptions.postProcess, ...fromDirect.postProcess],
  };
}

function buildAutoHooks(
  table: TableMigrationConfig,
  op: 'create' | 'update' | 'delete',
  recordVar: string
): NormalizedHooks {
  const empty: NormalizedHooks = { preValidate: [], postValidate: [], preProcess: [], postProcess: [] };

  if (op === 'update' && (table as any).refreshViews) {
    return {
      ...empty,
      postProcess: [
        `\t// --- Refresh Record views`,
        `\tupdate ${recordVar} merge {`,
        `\t\t"touch": 1`,
        `\t};`,
        `\tupdate ${recordVar} unset touch;`,
        '',
        `\tlet $PID = fn::PID(${recordVar});`,
        '',
        `\tif(type::is_record($PID) && record::exists($PID)) {`,
        `\t\tupdate $PID merge {`,
        `\t\t\t"touch": 1`,
        `\t\t};`,
        `\t\tupdate $PID unset touch;`,
        `\t};`,
        `\t// --- End Refresh Record views`,
      ],
    };
  }

  return empty;
}

async function ensureTableDir(
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>,
  outputRoot: string,
  cache: Map<TableMigrationConfig, string>
): Promise<string> {
  if (cache.has(table)) {
    return cache.get(table) as string;
  }
  const dir = getTableAssetDir(table, tablesByModel, outputRoot);
  await mkdir(dir, { recursive: true });
  cache.set(table, dir);
  return dir;
}

async function resetTableDir(
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>,
  outputRoot: string,
  cache: Map<TableMigrationConfig, string>
): Promise<string> {
  const dir = getTableAssetDir(table, tablesByModel, outputRoot);
  const legacyDir = getLegacyTableAssetDir(table, tablesByModel, outputRoot);
  if (legacyDir !== dir) {
    await rm(legacyDir, { recursive: true, force: true });
  }
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  cache.set(table, dir);
  return dir;
}

async function writeEventFiles(
  tables: TableMigrationConfig[],
  tablesByModel: Map<string, TableMigrationConfig>,
  outputRoot: string,
  dirCache: Map<TableMigrationConfig, string>,
  previousFilesByDir: Map<string, Map<string, string>>,
  tracker: Awaited<ReturnType<typeof createAssetTracker>>,
  eventFileMode?: 'split' | 'table'
): Promise<void> {
  const events = collectEvents(tables);
  if (events.length === 0) return;

  const mode = eventFileMode === 'table' ? 'table' : 'split';

  if (mode === 'split') {
    for (const event of events) {
      const sourceTable = event.sourceTable;
      const tableDir = await ensureTableDir(sourceTable, tablesByModel, outputRoot, dirCache);
      const filePath = path.join(tableDir, buildEventFileName(event.name));
      const content = formatEventForFile(event);
      const prev = previousFilesByDir.get(tableDir)?.get(filePath);
      await writeGeneratedAsset({
        filePath,
        content,
        tracker,
        compareContent: prev,
        meta: {
          source: 'generated',
          layer: 'events',
          table: sourceTable.table?.model ?? sourceTable.name,
        },
      });
      console.log(`🧾 Generated event: ${path.relative(process.cwd(), filePath)}`);
    }
    return;
  }

  const grouped = new Map<TableMigrationConfig, typeof events>();
  for (const event of events) {
    const list = grouped.get(event.sourceTable) ?? [];
    list.push(event);
    grouped.set(event.sourceTable, list);
  }

  for (const [sourceTable, list] of grouped.entries()) {
    const tableDir = await ensureTableDir(sourceTable, tablesByModel, outputRoot, dirCache);
    const tableLabel = sourceTable.name || sourceTable.table?.model || 'Table';
    const fileName = `E_${toPascalCase(tableLabel)}.surql`;
    const filePath = path.join(tableDir, fileName);
    const content = list
      .slice()
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      .map((event) => buildEventStatement(event))
      .join('\n\n')
      .concat('\n');
    const prev = previousFilesByDir.get(tableDir)?.get(filePath);
    await writeGeneratedAsset({
      filePath,
      content,
      tracker,
      compareContent: prev,
      meta: {
        source: 'generated',
        layer: 'events',
        table: sourceTable.table?.model ?? sourceTable.name,
      },
    });
    console.log(`🧾 Generated event bundle: ${path.relative(process.cwd(), filePath)}`);
  }
}

function buildCreateFunctionContent(
  table: TableMigrationConfig,
  operation: CrudOperationDefinition,
  functionName: string,
  tablesByModel: Map<string, TableMigrationConfig>,
  relationHooks?: NormalizedRelation[],
  taxonomyHooks?: NormalizedTaxonomy[]
): string {
  if (isSubTable(table)) {
    return buildSubtableCreateFunctionContent(
      table,
      operation,
      functionName,
      tablesByModel,
      relationHooks,
      taxonomyHooks
    );
  }

  const tableModel = table.table?.model ?? sanitizeCamel(table.name);
  const fields = normalizeFields(table.fields);
  const requiredFields = collectRequiredFields(fields, operation.options);
  const requiresInstanceModule = isInstanceEnabled(table);
  if (requiresInstanceModule) {
    const idx = requiredFields.indexOf('instances');
    if (idx !== -1) requiredFields.splice(idx, 1);
  }
  const defaultsObject = buildDefaultsObject(fields, '$payload');
  const assignOverrides = buildAssignOverrides(fields, '$payload');

  const relationValidations = buildRelationValidations(relationHooks, '$payload', functionName, 'create');
  const taxonomyValidations = buildTaxonomyValidations(taxonomyHooks, '$payload', functionName, 'create');
  const validations = buildRequiredFieldValidations(requiredFields, '$payload', functionName);
  const enumValidations = buildEnumValidationLines(fields, '$payload', functionName, {
    requiredOnly: true,
    onlyIfPresent: false,
  });

  const idSource = resolveCreateIdSource(operation.options?.idSource, table.id);
  const creationBlock = buildCreationBlock({
    tableModel,
    ...(table.id?.structure === 'default' || table.id?.source === 'default'
      ? { idSource: 'default' }
      : idSource
        ? { idSource }
        : {}),
  });
  const returnMode = operation.options?.return ?? 'record';
  const hooks = normalizeHooks(operation);
  const autoHooks = buildAutoHooks(table, 'create', creationBlock.recordVar);
  const postProcessHooks = [...hooks.postProcess, ...autoHooks.postProcess];
  const canFallbackSelect = creationBlock.lines.some((line) => line.includes('$rid'));

  const lines: string[] = [];
  lines.push(
    `DEFINE FUNCTION OVERWRITE fn::${functionName}($payload: object) {`,
    '',
    `\tif !$payload {`,
    `\t\tthrow "${functionName} | payload is required";`,
    `\t};`,
    ''
  );

  if (hooks.preValidate.length > 0) {
    lines.push(...hooks.preValidate, '');
  }

  const payloadStrip = buildFieldPayloadStripLines(fields, '$payload');
  if (payloadStrip.length > 0) {
    lines.push(...payloadStrip, '');
  }

  if (validations.length > 0) {
    lines.push(...validations, '');
  }
  if (relationValidations.length > 0) {
    lines.push(...relationValidations, '');
  }
  if (taxonomyValidations.length > 0) {
    lines.push(...taxonomyValidations, '');
  }
  if (enumValidations.length > 0) {
    lines.push(...enumValidations, '');
  }

  if (hooks.postValidate.length > 0) {
    lines.push(...hooks.postValidate, '');
  }

  if (defaultsObject) {
    lines.push('\tlet $defaultData = {', defaultsObject, '\t};', '', `\tlet $payload = fn::objectAssign($defaultData, $payload);`, '');
  }

  if (assignOverrides.length > 0) {
    lines.push(
      `\tlet $payload = fn::objectAssign($payload, {`,
      ...assignOverrides,
      `\t});`,
      ''
    );
  }

  const relationCapture = buildRelationCaptureLines(relationHooks, '$payload');
  if (relationCapture.length > 0) {
    lines.push(...relationCapture, '');
  }
  const taxonomyCapture = buildTaxonomyCaptureLines(taxonomyHooks, '$payload');
  if (taxonomyCapture.length > 0) {
    lines.push(...taxonomyCapture, '');
  }

  const relationPayloadStrip = buildRelationPayloadStripLines(relationHooks, '$payload');
  if (relationPayloadStrip.length > 0) {
    lines.push(...relationPayloadStrip, '');
  }
  const taxonomyPayloadStrip = buildTaxonomyPayloadStripLines(taxonomyHooks, '$payload');
  if (taxonomyPayloadStrip.length > 0) {
    lines.push(...taxonomyPayloadStrip, '');
  }

  const relationNormalize = buildRelationNormalizationLines(relationHooks, '$payload', 'create');
  if (relationNormalize.length > 0) {
    lines.push(...relationNormalize, '');
  }
  const taxonomyNormalize = buildTaxonomyNormalizationLines(taxonomyHooks, '$payload', 'create');
  if (taxonomyNormalize.length > 0) {
    lines.push(...taxonomyNormalize, '');
  }


  if (requiresInstanceModule) {
    lines.push(
      `\tif !type::is_array($payload.instances){`,
      `\t\tthrow "${functionName} | requires valid instances array";`,
      `\t};`,
      ''
    );
  }

  if (hooks.preProcess.length > 0) {
    lines.push(...hooks.preProcess, '');
  }

  lines.push(...creationBlock.lines, '');
  if (canFallbackSelect) {
    lines.push(
      `\tlet ${creationBlock.recordVar} = if ${creationBlock.recordVar} { ${creationBlock.recordVar} } else {`,
      `\t\tlet $fallback = select * from only ${creationBlock.recordIdExpr};`,
      `\t\tif type::is_array($fallback) { array::first($fallback) } else { $fallback };`,
      `\t};`,
      ''
    );
  }

  const relationPost = buildRelationPostProcessLines(
    relationHooks,
    creationBlock.recordIdExpr,
    '$payload',
    'create',
    relationNormalize.length > 0
  );
  const taxonomyPost = buildTaxonomyPostProcessLines(
    taxonomyHooks,
    creationBlock.recordIdExpr,
    '$payload',
    'create',
    taxonomyNormalize.length > 0
  );
  if (postProcessHooks.length > 0) {
    lines.push(...postProcessHooks, '');
  }
  if (relationPost.length > 0) {
    lines.push(...relationPost, '');
  }
  if (taxonomyPost.length > 0) {
    lines.push(...taxonomyPost, '');
  }

  const successReturn =
    returnMode === 'id'
      ? `${creationBlock.recordVar}['id']`
      : `${creationBlock.recordVar}`;

  lines.push(
    `\treturn if ${creationBlock.recordVar} {`,
    `\t\treturn ${successReturn};`,
    `\t} else {`,
    `\t\tthrow "${functionName} | failed to create ${tableModel}";`,
    `\t}`,
    '',
    `};`,
    '',
    ''
  );

  return lines.join('\n');
}

function resolveCreateIdSource(
  override: string | string[] | undefined,
  tableId?: TableMigrationConfig['id']
): string | string[] | undefined {
  if (override !== undefined) {
    if (typeof override === 'string') {
      const overrideExpr = expandIdStructureExpr(override);
      if (overrideExpr) return override;
    }
    if (typeof override === 'string' && tableId?.structure && typeof tableId.structure === 'string') {
      const structureExpr = expandIdStructureExpr(tableId.structure);
      if (structureExpr && override === 'id') {
        return tableId.structure;
      }
    }
    return override;
  }
  return tableId?.structure ?? tableId?.source;
}

function buildUpdateFunctionContent(
  table: TableMigrationConfig,
  operation: CrudOperationDefinition,
  functionName: string,
  relationHooks?: NormalizedRelation[],
  taxonomyHooks?: NormalizedTaxonomy[]
): string {
  const tableNamePascal = sanitizePascal(table.name);

  const recordParam = buildRecordParamName(tableNamePascal, operation.params?.[0]?.name);
  const payloadParam = buildPayloadParamName(operation.params?.[1]?.name);
  const fields = normalizeFields(table.fields);
  const parentModel = isSubTable(table) ? getParentModelValue(table) : null;
  const allowMissing = operation.options?.allowMissing ?? true;
  const isPostTable =
    table.table?.model === 'p' ||
    table.tags?.includes('post') ||
    table.name?.toLowerCase() === 'post';
  const enumValidations = buildEnumValidationLines(fields, payloadParam, functionName, {
    requiredOnly: true,
    onlyIfPresent: true,
  });
  const returnMode = operation.options?.return ?? 'record';
  const hooks = normalizeHooks(operation);
  const autoHooks = buildAutoHooks(table, 'update', '$rid');
  const postProcessHooks = [...hooks.postProcess, ...autoHooks.postProcess];

  const lines: string[] = [];
  lines.push(
    `DEFINE FUNCTION OVERWRITE fn::${functionName}(${recordParam}: any, ${payloadParam}: object) {`,
    '',
    ...(isPostTable
      ? [
          `\tlet $RID = fn::ridParam("p", ${recordParam});`,
          `\tlet $rid = if type::is_record($RID) && record::tb($RID) == "p" { $RID } else { fn::PID($RID) };`,
        ]
      : [
          `\tlet $rid = fn::ridParam("${table.table.model}", ${recordParam});`,
          parentModel
            ? `\tlet $rid = if type::is_record($rid) && record::tb($rid) == "${parentModel}" { type::record("${table.table.model}", record::id($rid)) } else { $rid };`
            : '',
        ]),
    '',
    `\tif !type::is_record($rid) || !record::exists($rid) {`,
    allowMissing
      ? `\t\treturn null;`
      : `\t\tthrow "${functionName} | ${recordParam} is not a valid record";`,
    `\t};`,
    '',
    `\tif !${payloadParam} {`,
    `\t\tthrow "${functionName} | payload is required";`,
    `\t};`,
    '',
  );

  if (hooks.preValidate.length > 0) {
    lines.push(...hooks.preValidate, '');
  }

  const payloadStrip = buildFieldPayloadStripLines(fields, payloadParam);
  if (payloadStrip.length > 0) {
    lines.push(...payloadStrip, '');
  }

  if (enumValidations.length > 0) {
    lines.push(...enumValidations, '');
  }

  if (hooks.postValidate.length > 0) {
    lines.push(...hooks.postValidate, '');
  }

  const relationCapture = buildRelationCaptureLines(relationHooks, payloadParam);
  if (relationCapture.length > 0) {
    lines.push(...relationCapture, '');
  }
  const taxonomyCapture = buildTaxonomyCaptureLines(taxonomyHooks, payloadParam);
  if (taxonomyCapture.length > 0) {
    lines.push(...taxonomyCapture, '');
  }
  const relationStrip = buildRelationPayloadStripLines(relationHooks, payloadParam);
  if (relationStrip.length > 0) {
    lines.push(...relationStrip, '');
  }
  const taxonomyStrip = buildTaxonomyPayloadStripLines(taxonomyHooks, payloadParam);
  if (taxonomyStrip.length > 0) {
    lines.push(...taxonomyStrip, '');
  }

  const relationNormalize = buildRelationNormalizationLines(relationHooks, payloadParam, 'update');
  if (relationNormalize.length > 0) {
    lines.push(...relationNormalize, '');
  }
  const taxonomyNormalize = buildTaxonomyNormalizationLines(taxonomyHooks, payloadParam, 'update');
  if (taxonomyNormalize.length > 0) {
    lines.push(...taxonomyNormalize, '');
  }

  if (hooks.preProcess.length > 0) {
    lines.push(...hooks.preProcess, '');
  }

  lines.push(
    `\tlet $result = update $rid merge ${payloadParam};`,
    `\tlet $result = if type::is_array($result) { array::first($result) } else { $result };`,
    ''
  );

  const relationPost = buildRelationPostProcessLines(
    relationHooks,
    '$rid',
    payloadParam,
    'update',
    relationNormalize.length > 0
  );
  const taxonomyPost = buildTaxonomyPostProcessLines(
    taxonomyHooks,
    '$rid',
    payloadParam,
    'update',
    taxonomyNormalize.length > 0
  );
  if (postProcessHooks.length > 0) {
    lines.push(...postProcessHooks, '');
  }
  if (relationPost.length > 0) {
    lines.push(...relationPost, '');
  }
  if (taxonomyPost.length > 0) {
    lines.push(...taxonomyPost, '');
  }

  const successReturn =
    returnMode === 'id'
      ? `$result['id']`
      : `$result`;

  lines.push(
    `\treturn if $result {`,
    `\t\treturn ${successReturn};`,
    `\t} else {`,
    `\t\tthrow "${functionName} | failed to update ${tableNamePascal}";`,
    `\t}`,
    '',
    `};`,
    '',
  );

  return lines.join('\n');
}

function buildDeleteFunctionContent(
  table: TableMigrationConfig,
  operation: CrudOperationDefinition,
  functionName: string,
  relationHooks?: NormalizedRelation[],
  taxonomyHooks?: NormalizedTaxonomy[]
): string {
  const tableNamePascal = sanitizePascal(table.name);
  const recordParam = buildRecordParamName(tableNamePascal, operation.params?.[0]?.name);
  const parentModel = isSubTable(table) ? getParentModelValue(table) : null;
  const cleanupFns = operation.options?.cleanup ?? [];
  const returnMode = operation.options?.return ?? 'id';
  const hooks = normalizeHooks(operation);
  const relationPost = buildRelationPostProcessLines(
    relationHooks,
    '$rid',
    '',
    'delete'
  );
  const taxonomyPost = buildTaxonomyPostProcessLines(
    taxonomyHooks,
    '$rid',
    '',
    'delete'
  );
  const postProcessHooks = [...hooks.postProcess, ...relationPost, ...taxonomyPost];
  const allowMissing = operation.options?.allowMissing ?? true;
  const isPostTable =
    table.table?.model === 'p' ||
    table.tags?.includes('post') ||
    table.name?.toLowerCase() === 'post';

  const lines: string[] = [];
  lines.push(
    `DEFINE FUNCTION OVERWRITE fn::${functionName}(${recordParam}: any) {`,
    '',
    ...(isPostTable
      ? [
          `\tlet $RID = fn::ridParam("p", ${recordParam});`,
          `\tlet $rid = if type::is_record($RID) && record::tb($RID) == "p" { $RID } else { fn::PID($RID) };`,
        ]
      : [
          `\tlet $rid = fn::ridParam("${table.table.model}", ${recordParam});`,
          parentModel
            ? `\tlet $rid = if type::is_record($rid) && record::tb($rid) == "${parentModel}" { type::record("${table.table.model}", record::id($rid)) } else { $rid };`
            : '',
        ]),
    '',
    `\tif !type::is_record($rid) || !record::exists($rid) {`,
    allowMissing
      ? `\t\treturn null;`
      : `\t\tthrow "${functionName} | ${recordParam} is not a valid record";`,
    `\t};`,
    ''
  );

  if (hooks.preValidate.length > 0) {
    lines.push(...hooks.preValidate, '');
  }

  for (const fnName of cleanupFns) {
    lines.push(`\t${fnName}($rid);`, '');
  }

  lines.push(`\tlet $result = (delete only $rid return before);`, '');

  if (postProcessHooks.length > 0) {
    lines.push(...postProcessHooks, '');
  }

  const successReturn =
    returnMode === 'record'
      ? `$result`
      : `$result['id']`;

  lines.push(
    `\treturn if $result {`,
    `\t\treturn ${successReturn};`,
    `\t} else {`,
    `\t\tthrow "${functionName} | failed to delete ${tableNamePascal}";`,
    `\t}`,
    '',
    `};`,
    ''
  );

  return lines.join('\n');
}

function groupRelationHooks(
  tables: TableMigrationConfig[]
): Map<string, NormalizedRelation[]> {
  const relations = collectRelations(tables);
  const map = new Map<string, NormalizedRelation[]>();
  for (const relation of relations) {
    if (relation.processor !== 'functions') continue;
    const hookModel = relation.hookModel;
    if (!hookModel) continue;
    const list = map.get(hookModel) ?? [];
    const relKey = `${relation.edge}:${relation.leftModel}:${relation.rightModel}`;
    const existingIndex = list.findIndex(
      (item) =>
        `${item.edge}:${item.leftModel}:${item.rightModel}` === relKey
    );
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const preferNew =
        existing.sourceModel !== hookModel && relation.sourceModel === hookModel;
      if (preferNew) {
        list[existingIndex] = relation;
      }
    } else {
      list.push(relation);
    }
    map.set(hookModel, list);
  }
  return map;
}

interface NormalizedTaxonomy {
  key: string;
  tableModel: string;
  termModel: string;
  termId: string;
  payloadField: string;
  payloadAliases: string[];
  storeOnModel: boolean;
  required: boolean;
  cardinality: 'one' | 'many';
  processor: 'functions' | 'events' | 'none';
  edges: {
    recordToTerm: string;
  };
  functions: {
    attach: string;
    detach: string;
    getModelTerms: string;
    getTableTerms: string;
  };
}

function groupTaxonomyHooks(
  tables: TableMigrationConfig[]
): Map<string, NormalizedTaxonomy[]> {
  const map = new Map<string, NormalizedTaxonomy[]>();
  for (const table of tables) {
    const tableModel = table.table?.model;
    if (!tableModel) continue;
    const taxonomies = table.taxonomies ?? [];
    if (taxonomies.length === 0) continue;
    const tableLabel = sanitizePascal(table.name || tableModel);
    const list: NormalizedTaxonomy[] = [];

    for (const taxonomy of taxonomies) {
      const key = taxonomy.key;
      const keyLabel = sanitizePascal(key);
      const termModel =
        taxonomy.term?.model ?? buildDefaultTermModel(tableModel, key);
      const termId = normalizeTermId(
        taxonomy.term?.id ?? `<field:key>`,
        tableModel,
        key
      );

      const cardinalityRaw = String(taxonomy.cardinality ?? 'many').toLowerCase();
      const cardinality = cardinalityRaw === 'one' || cardinalityRaw === 'single' ? 'one' : 'many';
      const storeOnModel =
        typeof taxonomy.storeOnModel === 'boolean' ? taxonomy.storeOnModel : true;
      const required = typeof taxonomy.required === 'boolean' ? taxonomy.required : false;
      const processorRaw = String(taxonomy.processor ?? 'functions').toLowerCase();
      const processor =
        processorRaw === 'events' || processorRaw === 'none' ? processorRaw : 'functions';

      if (processor !== 'functions') continue;

      const payloadField =
        taxonomy.payloadField ??
        (cardinality === 'one' ? key : `${key}s`);
      const payloadAliases = normalizePayloadAliases(
        taxonomy.payloadAliases,
        taxonomy.payloadAlias,
        payloadField
      );

      const prefix = `${tableLabel}${keyLabel}`;
      const functions = {
        attach: taxonomy.functions?.attachTerm ?? `attach${prefix}Term`,
        detach: taxonomy.functions?.detachTerm ?? `detach${prefix}Term`,
        getModelTerms: taxonomy.functions?.getModelTerms ?? `get${prefix}Terms`,
        getTableTerms: taxonomy.functions?.getTableTerms ?? `get${prefix}s`,
      };

      const edges = {
        recordToTerm:
          taxonomy.edges?.recordToTerm ?? `${tableLabel}${keyLabel}s`,
      };

      list.push({
        key,
        tableModel,
        termModel,
        termId,
        payloadField,
        payloadAliases,
        storeOnModel,
        required,
        cardinality,
        processor,
        edges,
        functions,
      });
    }

    if (list.length > 0) {
      map.set(tableModel, list);
    }
  }

  return map;
}

function buildRelationValidations(
  relations: NormalizedRelation[] | undefined,
  payloadVar: string,
  functionName: string,
  mode: 'create' | 'update'
): string[] {
  if (!relations || relations.length === 0) return [];
  if (mode !== 'create') return [];
  const lines: string[] = [];
  for (const relation of relations) {
    if (!relation.required) continue;
    if (
      relation.sourceModel &&
      relation.hookModel &&
      relation.sourceModel !== relation.hookModel &&
      !relation.requiredOnHook
    ) {
      continue;
    }
    const field = relation.payloadField;
    if (relation.cardinality === 'one') {
      lines.push(
        `\tif !${payloadVar}.${field} {`,
        `\t\tthrow "${functionName} | requires ${field}";`,
        `\t};`
      );
    } else {
      lines.push(
        `\tif !${payloadVar}.${field} {`,
        `\t\tthrow "${functionName} | requires ${field}";`,
        `\t};`,
        `\tif type::is_array(${payloadVar}.${field}) && array::len(${payloadVar}.${field}) == 0 {`,
        `\t\tthrow "${functionName} | requires ${field}";`,
        `\t};`
      );
    }
    lines.push('');
  }
  return lines;
}

function buildRelationCaptureLines(
  relations: NormalizedRelation[] | undefined,
  payloadVar: string
): string[] {
  if (!relations || relations.length === 0) return [];
  const lines: string[] = [];
  for (const relation of relations) {
    const varName = relationVarName(relation.payloadField);
    lines.push(`\tlet ${varName} = ${payloadVar}.${relation.payloadField};`);
  }
  return lines;
}

function buildRelationPayloadStripLines(
  relations: NormalizedRelation[] | undefined,
  payloadVar: string
): string[] {
  if (!relations || relations.length === 0) return [];
  const fields = relations
    .filter((rel) => rel.storeOnModel === false)
    .map((rel) => rel.payloadField);
  if (fields.length === 0) return [];
  const items = fields.map((name) => `"${name}"`).join(', ');
  return [`\tlet ${payloadVar} = fn::objectRemove(${payloadVar}, [${items}]);`];
}

function buildFieldPayloadStripLines(fields: NormalizedField[], payloadVar: string): string[] {
  const ignored = fields
    .filter((field) => field.meta.ignorePayload === true)
    .map((field) => field.name);
  if (ignored.length === 0) return [];
  const items = ignored.map((name) => `"${name}"`).join(', ');
  return [`\tlet ${payloadVar} = fn::objectRemove(${payloadVar}, [${items}]);`];
}

function buildRelationNormalizationLines(
  relations: NormalizedRelation[] | undefined,
  payloadVar: string,
  mode: 'create' | 'update'
): string[] {
  if (!relations || relations.length === 0) return [];
  const lines: string[] = [];
  for (const relation of relations) {
    const varName = relationVarName(relation.payloadField);
    const normVar = `${varName}_norm`;
    lines.push(`\tlet ${normVar} = fn::toRecordArray('${relation.leftModel}', ${varName});`);

    if (relation.storeOnModel === false) {
      continue;
    }

    const field = relation.payloadField;
    if (relation.cardinality === 'one') {
      if (mode === 'create') {
        lines.push(
          `\tlet ${payloadVar} = fn::objectAssign(${payloadVar}, {`,
          `\t\t${field}: if array::len(${normVar}) > 0 { array::first(${normVar}) } else { ${payloadVar}.${field} }`,
          `\t});`
        );
      } else {
        lines.push(
          `\tlet ${payloadVar} = fn::objectAssign(${payloadVar}, {`,
          `\t\t${field}: if type::is_array(${varName}) || ${varName} {`,
          `\t\t\tif array::len(${normVar}) > 0 { array::first(${normVar}) } else { ${varName} }`,
          `\t\t} else {`,
          `\t\t\t${payloadVar}.${field}`,
          `\t\t}`,
          `\t});`
        );
      }
    } else {
      if (mode === 'create') {
        lines.push(
          `\tlet ${payloadVar} = fn::objectAssign(${payloadVar}, {`,
          `\t\t${field}: ${normVar}`,
          `\t});`
        );
      } else {
        lines.push(
          `\tlet ${payloadVar} = fn::objectAssign(${payloadVar}, {`,
          `\t\t${field}: if type::is_array(${varName}) || ${varName} { ${normVar} } else { ${payloadVar}.${field} }`,
          `\t});`
        );
      }
    }

    lines.push('');
  }
  return lines;
}

function buildRelationPostProcessLines(
  relations: NormalizedRelation[] | undefined,
  recordVar: string,
  payloadVar: string,
  mode: 'create' | 'update' | 'delete',
  normVarsDeclared = false
): string[] {
  if (!relations || relations.length === 0) return [];
  const lines: string[] = [];
  const recordIdExpr = recordVar;

  for (const relation of relations) {
    const varName = relationVarName(relation.payloadField);
    const normVar = `${varName}_norm`;
    const edgeField = relation.hookModel === relation.leftModel ? 'in' : 'out';
    const deleteLine = `\tdelete from ${relation.edge} where ${edgeField} = ${recordIdExpr};`;

    if (mode === 'delete') {
      lines.push(deleteLine);
      continue;
    }

    if (!normVarsDeclared) {
      lines.push(`\tlet ${normVar} = fn::toRecordArray('${relation.leftModel}', ${varName});`);
    }

    if (mode === 'update') {
      if (relation.cardinality === 'one') {
        lines.push(
          `\tif type::is_array(${varName}) {`,
          `\t\tif array::len(${normVar}) > 1 {`,
          `\t\t\tthrow "${relation.functions.attach} | expects single relation";`,
          `\t\t};`,
          deleteLine,
          `\t\tif array::len(${normVar}) == 1 {`,
          `\t\t\tfn::${relation.functions.attach}(${recordIdExpr}, array::first(${normVar}));`,
          `\t\t};`,
          `\t} else if ${varName} {`,
          deleteLine,
          `\t\tif array::len(${normVar}) > 0 {`,
          `\t\t\tfn::${relation.functions.attach}(${recordIdExpr}, array::first(${normVar}));`,
          `\t\t};`,
          `\t};`
        );
      } else {
        lines.push(
          `\tif type::is_array(${varName}) {`,
          deleteLine,
          `\t\tfor $rel in ${normVar} {`,
          `\t\t\tfn::${relation.functions.attach}(${recordIdExpr}, $rel);`,
          `\t\t};`,
          `\t} else if ${varName} {`,
          deleteLine,
          `\t\tfor $rel in ${normVar} {`,
          `\t\t\tfn::${relation.functions.attach}(${recordIdExpr}, $rel);`,
          `\t\t};`,
          `\t};`
        );
      }
      lines.push('');
      continue;
    }

    if (mode === 'create') {
      if (relation.cardinality === 'one') {
        lines.push(
          `\tif type::is_array(${normVar}) {`,
          `\t\tif array::len(${normVar}) > 1 {`,
          `\t\t\tthrow "${relation.functions.attach} | expects single relation";`,
          `\t\t};`,
          `\t\tif array::len(${normVar}) == 1 {`,
          `\t\t\tfn::${relation.functions.attach}(${recordIdExpr}, array::first(${normVar}));`,
          `\t\t};`,
          `\t} else if ${varName} {`,
          `\t\tif array::len(${normVar}) > 0 {`,
          `\t\t\tfn::${relation.functions.attach}(${recordIdExpr}, array::first(${normVar}));`,
          `\t\t};`,
          `\t};`
        );
      } else {
        lines.push(
          `\tif type::is_array(${normVar}) {`,
          `\t\tfor $rel in ${normVar} {`,
          `\t\t\tfn::${relation.functions.attach}(${recordIdExpr}, $rel);`,
          `\t\t};`,
          `\t} else if ${varName} {`,
          `\t\tfor $rel in ${normVar} {`,
          `\t\t\tfn::${relation.functions.attach}(${recordIdExpr}, $rel);`,
          `\t\t};`,
          `\t};`
        );
      }
      lines.push('');
    }
  }

  return lines;
}

function taxonomyVarName(field: string): string {
  const sanitized = field.replace(/[^a-zA-Z0-9_]/g, '_');
  return `$tax_${sanitized}`;
}

function normalizePayloadAliases(
  aliases: string[] | undefined,
  alias: string | undefined,
  payloadField: string
): string[] {
  const items: string[] = [];
  if (Array.isArray(aliases)) {
    for (const entry of aliases) {
      if (typeof entry === 'string' && entry.trim()) items.push(entry.trim());
    }
  }
  if (typeof alias === 'string' && alias.trim()) {
    items.push(alias.trim());
  }
  const field = payloadField ?? '';
  return Array.from(new Set(items.filter((entry) => entry !== field)));
}

function buildTaxonomyValidations(
  taxonomies: NormalizedTaxonomy[] | undefined,
  payloadVar: string,
  functionName: string,
  mode: 'create' | 'update'
): string[] {
  if (!taxonomies || taxonomies.length === 0) return [];
  if (mode !== 'create') return [];
  const lines: string[] = [];
  for (const taxonomy of taxonomies) {
    if (!taxonomy.required) continue;
    const field = taxonomy.payloadField;
    const aliasChecks = [field, ...taxonomy.payloadAliases]
      .filter((name, index, list) => name && list.indexOf(name) === index);
    const presenceExpr = aliasChecks
      .map((name) => `${payloadVar}.${name}`)
      .join(' || ');

    if (taxonomy.cardinality === 'one') {
      lines.push(
        `\tif !(${presenceExpr}) {`,
        `\t\tthrow "${functionName} | requires ${field}";`,
        `\t};`
      );
    } else {
      lines.push(
        `\tif !(${presenceExpr}) {`,
        `\t\tthrow "${functionName} | requires ${field}";`,
        `\t};`,
        `\tif type::is_array(${payloadVar}.${field}) && array::len(${payloadVar}.${field}) == 0 {`,
        `\t\tthrow "${functionName} | requires ${field}";`,
        `\t};`
      );
    }
    lines.push('');
  }
  return lines;
}

function buildTaxonomyCaptureLines(
  taxonomies: NormalizedTaxonomy[] | undefined,
  payloadVar: string
): string[] {
  if (!taxonomies || taxonomies.length === 0) return [];
  const lines: string[] = [];
  for (const taxonomy of taxonomies) {
    const varName = taxonomyVarName(taxonomy.payloadField);
    const aliasChecks = [taxonomy.payloadField, ...taxonomy.payloadAliases]
      .filter((field, index, list) => field && list.indexOf(field) === index);
    if (aliasChecks.length === 1) {
      lines.push(`\tlet ${varName} = ${payloadVar}.${taxonomy.payloadField};`);
      continue;
    }
    const [primary, ...rest] = aliasChecks;
    lines.push(
      `\tlet ${varName} = if type::is_array(${payloadVar}.${primary}) || ${payloadVar}.${primary} {`
    );
    lines.push(`\t\t${payloadVar}.${primary}`);
    for (const alias of rest) {
      lines.push(`\t} else if type::is_array(${payloadVar}.${alias}) || ${payloadVar}.${alias} {`);
      lines.push(`\t\t${payloadVar}.${alias}`);
    }
    lines.push(`\t} else {`);
    lines.push(`\t\tnull`);
    lines.push(`\t};`);
  }
  return lines;
}

function buildTaxonomyPayloadStripLines(
  taxonomies: NormalizedTaxonomy[] | undefined,
  payloadVar: string
): string[] {
  if (!taxonomies || taxonomies.length === 0) return [];
  const fields = new Set<string>();
  for (const taxonomy of taxonomies) {
    if (taxonomy.storeOnModel === false) {
      fields.add(taxonomy.payloadField);
    }
    for (const alias of taxonomy.payloadAliases) {
      if (alias && alias !== taxonomy.payloadField) {
        fields.add(alias);
      }
    }
  }
  if (fields.size === 0) return [];
  const items = Array.from(fields).map((name) => `"${name}"`).join(', ');
  return [`\tlet ${payloadVar} = fn::objectRemove(${payloadVar}, [${items}]);`];
}

function buildTaxonomyNormalizationLines(
  taxonomies: NormalizedTaxonomy[] | undefined,
  payloadVar: string,
  mode: 'create' | 'update'
): string[] {
  if (!taxonomies || taxonomies.length === 0) return [];
  const lines: string[] = [];
  for (const taxonomy of taxonomies) {
    const varName = taxonomyVarName(taxonomy.payloadField);
    const listVar = `${varName}_list`;
    const normVar = `${varName}_norm`;
    const termExpr = buildTaxonomyTermExpression(taxonomy.termModel, taxonomy.termId, '$termPayload');

    lines.push(
      `\tlet ${listVar} = if type::is_array(${varName}) {`,
      `\t\t${varName}`,
      `\t} else if ${varName} {`,
      `\t\t[${varName}]`,
      `\t} else {`,
      `\t\t[]`,
      `\t};`,
      `\tlet ${normVar} = array::map(${listVar}, |$term| {`,
      `\t\tif type::is_record($term) {`,
      `\t\t\t$term`,
      `\t\t};`,
      `\t\tlet $termPayload = { key: $term };`,
      `\t\t${termExpr}`,
      `\t});`
    );

    if (taxonomy.storeOnModel === false) {
      lines.push('');
      continue;
    }

    const field = taxonomy.payloadField;
    if (taxonomy.cardinality === 'one') {
      if (mode === 'create') {
        lines.push(
          `\tlet ${payloadVar} = fn::objectAssign(${payloadVar}, {`,
          `\t\t${field}: if array::len(${normVar}) > 0 { array::first(${normVar}) } else { ${payloadVar}.${field} }`,
          `\t});`
        );
      } else {
        lines.push(
          `\tlet ${payloadVar} = fn::objectAssign(${payloadVar}, {`,
          `\t\t${field}: if type::is_array(${varName}) || ${varName} {`,
          `\t\t\tif array::len(${normVar}) > 0 { array::first(${normVar}) } else { ${varName} }`,
          `\t\t} else {`,
          `\t\t\t${payloadVar}.${field}`,
          `\t\t}`,
          `\t});`
        );
      }
    } else {
      if (mode === 'create') {
        lines.push(
          `\tlet ${payloadVar} = fn::objectAssign(${payloadVar}, {`,
          `\t\t${field}: ${normVar}`,
          `\t});`
        );
      } else {
        lines.push(
          `\tlet ${payloadVar} = fn::objectAssign(${payloadVar}, {`,
          `\t\t${field}: if type::is_array(${varName}) || ${varName} { ${normVar} } else { ${payloadVar}.${field} }`,
          `\t});`
        );
      }
    }

    lines.push('');
  }
  return lines;
}

function buildTaxonomyPostProcessLines(
  taxonomies: NormalizedTaxonomy[] | undefined,
  recordVar: string,
  payloadVar: string,
  mode: 'create' | 'update' | 'delete',
  normVarsDeclared = false
): string[] {
  if (!taxonomies || taxonomies.length === 0) return [];
  const lines: string[] = [];

  for (const taxonomy of taxonomies) {
    const varName = taxonomyVarName(taxonomy.payloadField);
    const normVar = `${varName}_norm`;

    if (mode === 'delete') {
      lines.push(`\tdelete from ${taxonomy.edges.recordToTerm} where in = ${recordVar};`);
      continue;
    }

    if (!normVarsDeclared) {
      const listVar = `${varName}_list`;
      const termExpr = buildTaxonomyTermExpression(taxonomy.termModel, taxonomy.termId, '$termPayload');
      lines.push(
        `\tlet ${listVar} = if type::is_array(${varName}) {`,
        `\t\treturn ${varName};`,
        `\t} else if ${varName} {`,
        `\t\treturn [${varName}];`,
        `\t} else {`,
        `\t\treturn [];`,
        `\t};`,
        `\tlet ${normVar} = array::map(${listVar}, |$term| {`,
        `\t\tif type::is_record($term) {`,
        `\t\t\treturn $term;`,
        `\t\t};`,
        `\t\tlet $termPayload = { key: $term };`,
        `\t\treturn ${termExpr};`,
        `\t});`
      );
    }

    if (mode === 'update') {
      if (taxonomy.cardinality === 'one') {
        lines.push(
          `\tif type::is_array(${varName}) {`,
          `\t\tdelete from ${taxonomy.edges.recordToTerm} where in = ${recordVar};`,
          `\t\tif array::len(${normVar}) > 0 {`,
          `\t\t\tfn::${taxonomy.functions.attach}(${recordVar}, array::first(${normVar}), {});`,
          `\t\t};`,
          `\t} else if ${varName} {`,
          `\t\tdelete from ${taxonomy.edges.recordToTerm} where in = ${recordVar};`,
          `\t\tif array::len(${normVar}) > 0 {`,
            `\t\t\tfn::${taxonomy.functions.attach}(${recordVar}, array::first(${normVar}), {});`,
          `\t\t};`,
          `\t};`
        );
      } else {
        lines.push(
          `\tif type::is_array(${varName}) {`,
          `\t\tdelete from ${taxonomy.edges.recordToTerm} where in = ${recordVar};`,
          `\t\tfor $rel in ${normVar} {`,
          `\t\t\tfn::${taxonomy.functions.attach}(${recordVar}, $rel, {});`,
          `\t\t};`,
          `\t} else if ${varName} {`,
          `\t\tdelete from ${taxonomy.edges.recordToTerm} where in = ${recordVar};`,
          `\t\tfor $rel in ${normVar} {`,
          `\t\t\tfn::${taxonomy.functions.attach}(${recordVar}, $rel, {});`,
          `\t\t};`,
          `\t};`
        );
      }
      lines.push('');
      continue;
    }

    if (mode === 'create') {
      if (taxonomy.cardinality === 'one') {
        lines.push(
          `\tif array::len(${normVar}) > 0 {`,
          `\t\tfn::${taxonomy.functions.attach}(${recordVar}, array::first(${normVar}), { skipExists: true });`,
          `\t};`,
          ''
        );
      } else {
        lines.push(
          `\tif type::is_array(${normVar}) {`,
          `\t\tfor $rel in ${normVar} {`,
          `\t\t\tfn::${taxonomy.functions.attach}(${recordVar}, $rel, { skipExists: true });`,
          `\t\t};`,
          `\t} else if ${varName} {`,
          `\t\tfor $rel in ${normVar} {`,
          `\t\t\tfn::${taxonomy.functions.attach}(${recordVar}, $rel, { skipExists: true });`,
          `\t\t};`,
          `\t};`,
          ''
        );
      }
    }
  }

  return lines;
}

function buildTaxonomyTermExpression(
  model: string,
  structure: string,
  payloadVar: string
): string {
  const rawFieldMatch = structure.match(/<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>/i);
  if (rawFieldMatch && rawFieldMatch[1]) {
    return `type::record('${model}', ${payloadVar}.${rawFieldMatch[1].trim()})`;
  }
  const normalized = normalizeIdToken(structure);
  const stringId = parseStringIdSpec(normalized);
  if (stringId) {
    const args = stringId.args.map((token) => resolveIdToken(token, payloadVar));
    return `type::record('${model}', fn::stringID([${args.join(', ')}]))`;
  }

  const fieldMatch = normalized.match(/^<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>$/i);
  if (fieldMatch && fieldMatch[1]) {
    return `type::record('${model}', ${payloadVar}.${fieldMatch[1].trim()})`;
  }

  return `type::record('${model}', ${resolveIdToken(normalized, payloadVar)})`;
}

function normalizeTermId(termId: string, tableModel: string, taxonomyKey: string): string {
  const trimmed = termId.trim();
  const stringId = parseStringIdSpec(trimmed);
  if (stringId && stringId.fn === 'stringID' && stringId.args.length === 3) {
    const [a, b, c] = stringId.args;
    if (!c) {
      return termId;
    }
    const fieldKeyMatch = /^<\s*field\s*:\s*key\s*>$/i.test(c);
    if (a === tableModel && b === taxonomyKey && fieldKeyMatch) {
      return `<field:key>`;
    }
  }
  return termId;
}

function parseStringIdSpec(value: string): { fn: 'stringID' | 'stringRIDs'; args: string[] } | null {
  const match = value.match(/^(stringID|stringRIDs)\s*<(.+)>$/i);
  if (!match || !match[1] || !match[2]) return null;
  const fn = match[1].toLowerCase() === 'stringrids' ? 'stringRIDs' : 'stringID';
  const args = match[2]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return { fn, args };
}

function normalizeIdToken(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1).trim();
    const fieldMatch = inner.match(/^<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>$/i);
    if (fieldMatch) return inner;
    const stringId = parseStringIdSpec(inner);
    if (stringId) return inner;
  }
  return trimmed;
}

function resolveIdToken(token: string, payloadVar: string): string {
  const trimmed = token.trim();
  const fieldMatch = trimmed.match(/<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>/i);
  if (fieldMatch && fieldMatch[1]) {
    return `${payloadVar}.${fieldMatch[1].trim()}`;
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed;
  }
  return JSON.stringify(trimmed);
}

function relationVarName(field: string): string {
  const sanitized = field.replace(/[^a-zA-Z0-9_]/g, '_');
  return `$rel_${sanitized}`;
}

function buildSubtableCreateFunctionContent(
  table: TableMigrationConfig,
  operation: CrudOperationDefinition,
  functionName: string,
  tablesByModel: Map<string, TableMigrationConfig>,
  relationHooks?: NormalizedRelation[],
  taxonomyHooks?: NormalizedTaxonomy[]
): string {
  const tableModel = table.table?.model ?? sanitizeCamel(table.name);
  const fields = normalizeFields(table.fields);
  const requiredFields = collectRequiredFields(fields, operation.options);
  const requiresInstanceModule = isInstanceEnabled(table);
  if (requiresInstanceModule) {
    const idx = requiredFields.indexOf('instances');
    if (idx !== -1) requiredFields.splice(idx, 1);
  }
  const defaultsObject = buildDefaultsObject(fields, '$payloadInput', '$PARENT_ID');
  const assignOverrides = buildAssignOverrides(fields, '$payload', '$PARENT_ID');

  const parentInfo = getParentInfo(table, tablesByModel);
  const parentModel = parentInfo?.parentModel;

  const parentRecordType = parentModel ? `record<${parentModel}>` : 'record';
  const returnMode = operation.options?.return ?? 'id';
  const hooks = normalizeHooks(operation);
  const autoHooks = buildAutoHooks(table, 'create', '$recordID');
  const postProcessHooks = [...hooks.postProcess, ...autoHooks.postProcess];

  const lines: string[] = [];
  lines.push(
    `DEFINE FUNCTION OVERWRITE fn::${functionName}($PARENT_ID: ${parentRecordType}, $payload: option<object>) {`,
    '',
    `	let $payloadInput = if type::is_object($payload) {`,
    `		$payload`,
    `	} else {`,
    `		{}`,
    `	};`,
    '',
	`	if !type::is_record($PARENT_ID) {`,
	`		throw "${functionName} | requires valid parent record";`,
	`	};`,
	`	if !$payloadInput.skipExists {`,
	`		if !record::exists($PARENT_ID) {`,
	`			throw "${functionName} | requires valid parent record";`,
	`		};`,
	`	};`,
	`	let $payloadInput = fn::objectRemove($payloadInput, ["skipExists"]);`,
    ''
  );

  if (hooks.preValidate.length > 0) {
    lines.push(...hooks.preValidate, '');
  }

  const payloadStrip = buildFieldPayloadStripLines(fields, '$payloadInput');
  if (payloadStrip.length > 0) {
    lines.push(...payloadStrip, '');
  }

  const requiredValidations = buildRequiredFieldValidations(
    requiredFields,
    '$payloadInput',
    functionName,
    '\t'
  );
  if (requiredValidations.length > 0) {
    lines.push(...requiredValidations, '');
  }

  const enumValidations = buildEnumValidationLines(fields, '$payloadInput', functionName, {
    requiredOnly: true,
    onlyIfPresent: false,
  });
  if (enumValidations.length > 0) {
    lines.push(...enumValidations, '');
  }

  if (hooks.postValidate.length > 0) {
    lines.push(...hooks.postValidate, '');
  }

  if (defaultsObject) {
    lines.push(
      `	let $defaultData = {`,
      defaultsObject,
      `	};`,
      '',
      `	let $payload = fn::objectAssign($defaultData, $payloadInput);`,
      ''
    );
  } else {
    lines.push(`	let $payload = $payloadInput;`, '');
  }

  if (assignOverrides.length > 0) {
    lines.push(
      `	let $payload = fn::objectAssign($payload, {`,
      ...assignOverrides.map((line) => line.replace(/^\t/, '\t')),
      `	});`,
      ''
    );
  }

  const taxonomyCapture = buildTaxonomyCaptureLines(taxonomyHooks, '$payload');
  if (taxonomyCapture.length > 0) {
    lines.push(...taxonomyCapture, '');
  }
  const taxonomyStrip = buildTaxonomyPayloadStripLines(taxonomyHooks, '$payload');
  if (taxonomyStrip.length > 0) {
    lines.push(...taxonomyStrip, '');
  }
  const taxonomyNormalize = buildTaxonomyNormalizationLines(taxonomyHooks, '$payload', 'create');
  if (taxonomyNormalize.length > 0) {
    lines.push(...taxonomyNormalize, '');
  }

  lines.push(`	${buildSubtableRecordIdLine(table, tableModel)}`, '');

  if (requiresInstanceModule) {
    lines.push(
      `	if !type::is_array($payload.instances){`,
      `		throw "${functionName} | requires valid instances array";`,
      `	};`,
      ''
    );
  }

  if (hooks.preProcess.length > 0) {
    lines.push(...hooks.preProcess, '');
  }

  lines.push(
    `	let $record = upsert $RID content $payload;`,
    `	let $record = if type::is_array($record) { array::first($record) } else { $record };`,
    `	let $record = if $record { $record } else {`,
    `		let $fallback = select * from only $RID;`,
    `		if type::is_array($fallback) { array::first($fallback) } else { $fallback };`,
    `	};`,
    `	let $recordID = if $record.id { $record.id } else { $record };`,
    '',
    `	if !$recordID {`,
    `		throw "${functionName} | failed to create ${tableModel}";`,
    `	};`,
    ''
  );

  if (parentInfo?.relations?.length) {
    parentInfo.relations.forEach((relation, index) => {
      lines.push(
        `	let $relation${index} = (select * from ${relation.table} where in = $PARENT_ID and out = $recordID);`,
        `	if !$relation${index} || array::len($relation${index}) = 0 {`,
        `		relate only $PARENT_ID->${relation.table}->$recordID;`,
        `	};`,
        ''
      );
    });
  }

  const taxonomyPost = buildTaxonomyPostProcessLines(
    taxonomyHooks,
    '$recordID',
    '$payload',
    'create',
    taxonomyNormalize.length > 0
  );
  if (taxonomyPost.length > 0) {
    lines.push(...taxonomyPost, '');
  }

  if (postProcessHooks.length > 0) {
    lines.push(...postProcessHooks, '');
  }

  const successReturn =
    returnMode === 'record'
      ? `select * from $recordID`
      : `$recordID`;

  lines.push(
    `	return ${successReturn};`,
    '',
    `};`,
    ''
  );

  return lines.join('\n');
}

interface ParentInfo {
  parentModel: string;
  relations: Array<{ table: string }>;
}

function getParentInfo(
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>
): ParentInfo | null {
  const structure = parseStructure(table);

  let parentModel = structure?.parentModel;

  if (!parentModel) {
    const belongsEdge = table.edges?.belongs?.find((edge) => edge.in);
    if (belongsEdge?.in) {
      parentModel = belongsEdge.in;
    }
  }

  if (!parentModel) {
    return null;
  }

  const relations = (table.edges?.belongs ?? [])
    .filter((edge) => !!edge.table)
    .map((edge) => ({ table: edge.table as string }));

  if (relations.length === 0 && table.relations?.length) {
    table.relations
      .filter(
        (rel) =>
          rel.edge &&
          rel.left === parentModel &&
          rel.right === table.table?.model
      )
      .forEach((rel) => relations.push({ table: rel.edge }));
  }

  if (relations.length === 0) {
    const parentTable = tablesByModel.get(parentModel);
    if (parentTable?.edges?.has) {
      parentTable.edges.has
        .filter((edge) => (edge.out ?? '') === table.table?.model && edge.table)
        .forEach((edge) => relations.push({ table: edge.table as string }));
    }

    if (relations.length === 0 && parentTable?.relations?.length) {
      parentTable.relations
        .filter(
          (rel) =>
            rel.edge &&
            rel.left === parentModel &&
            rel.right === table.table?.model
        )
        .forEach((rel) => relations.push({ table: rel.edge }));
    }
  }

  return {
    parentModel,
    relations,
  };
}

function parseStructure(table: TableMigrationConfig): TableStructureConfig | null {
  const raw = table.structure;
  if (!raw) {
    return null;
  }

  if (typeof raw === 'string') {
    return null;
  }

  return raw as TableStructureConfig;
}

function collectRequiredFields(fields: NormalizedField[], options?: CrudOperationOptions): string[] {
  const required = new Set<string>();
  for (const field of fields) {
    if (field.meta.required) {
      required.add(field.name);
    }
  }
  const validations = options?.validations?.required ?? [];
  validations.forEach((field) => required.add(field));
  if (options?.idSource) {
    if (Array.isArray(options.idSource)) {
      options.idSource.forEach((field) => required.add(field));
    } else {
      const stringIdSource = parseStringIdSource(options.idSource);
      if (stringIdSource) {
        stringIdSource.fields
          .filter((field) => field.toLowerCase() !== 'parent')
          .forEach((field) => required.add(field));
      } else {
        required.add(options.idSource);
      }
    }
  }
  return Array.from(required.values());
}

function buildRequiredFieldValidations(
  requiredFields: string[],
  payloadVar: string,
  functionName: string,
  indent = '\t'
): string[] {
  const lines: string[] = [];
  for (const field of requiredFields) {
    const accessor = `${payloadVar}.${field}`;
    const missingExpr = `${accessor} = NONE || ${accessor} = null || (type::is_string(${accessor}) && string::len(${accessor}) = 0)`;
    lines.push(
      `${indent}if ${missingExpr} {`,
      `${indent}\tthrow "${functionName} | requires ${field}";`,
      `${indent}};`
    );
  }
  return lines;
}

interface CreationBlock {
  lines: string[];
  recordVar: string;
  recordIdExpr: string;
}

function buildCreationBlock({
  tableModel,
  idSource,
}: {
  tableModel: string;
  idSource?: string | string[];
}): CreationBlock {
  if (idSource === 'default') {
    return {
      recordVar: '$record',
      recordIdExpr: `if $record.id { $record.id } else { $record }`,
      lines: [
        `\tlet $record = create ${tableModel} content $payload;`,
        `\tlet $record = if type::is_array($record) { array::first($record) } else { $record };`,
      ],
    };
  }

  if (idSource) {
    if (Array.isArray(idSource)) {
      const parts = idSource.map((field) => `$payload.${field}`).join(', ');
      return {
        recordVar: '$record',
        recordIdExpr: '$rid',
        lines: [
          `\tlet $rid = type::record('${tableModel}', [${parts}]);`,
          `\tlet $payload = fn::objectRemove($payload, ["id"]);`,
          `\tlet $record = upsert $rid content $payload;`,
          `\tlet $record = if type::is_array($record) { array::first($record) } else { $record };`,
        ],
      };
    }

    const stringIdSource = parseStringIdSource(idSource);
    if (stringIdSource && stringIdSource.fields.length > 0) {
      const args = stringIdSource.fields.map((field) => `$payload.${field}`).join(', ');
      const fnArgs = stringIdSource.fn === 'stringID' ? `[${args}]` : `${args}`;
      return {
        recordVar: '$record',
        recordIdExpr: '$rid',
        lines: [
          `\tlet $rid = type::record('${tableModel}', fn::${stringIdSource.fn}(${fnArgs}));`,
          `\tlet $payload = fn::objectRemove($payload, ["id"]);`,
          `\tlet $record = upsert $rid content $payload;`,
          `\tlet $record = if type::is_array($record) { array::first($record) } else { $record };`,
        ],
      };
    }

    const expandedExpr = expandIdStructureExpr(idSource);
    if (expandedExpr) {
      if (isRecordExpression(expandedExpr)) {
        return {
          recordVar: '$record',
          recordIdExpr: '$rid',
          lines: [
            `\tlet $rid = ${expandedExpr};`,
            `\tlet $payload = fn::objectRemove($payload, ["id"]);`,
            `\tlet $record = upsert $rid content $payload;`,
            `\tlet $record = if type::is_array($record) { array::first($record) } else { $record };`,
          ],
        };
      }
      return {
        recordVar: '$record',
        recordIdExpr: '$rid',
        lines: [
          `\tlet $rid = type::record('${tableModel}', ${expandedExpr});`,
          `\tlet $payload = fn::objectRemove($payload, ["id"]);`,
          `\tlet $record = upsert $rid content $payload;`,
          `\tlet $record = if type::is_array($record) { array::first($record) } else { $record };`,
        ],
      };
    }

    return {
      recordVar: '$record',
      recordIdExpr: '$rid',
      lines: [
        `\tlet $rid = type::record('${tableModel}', $payload.${idSource});`,
        `\tlet $payload = fn::objectRemove($payload, ["id"]);`,
        `\tlet $record = upsert $rid content $payload;`,
        `\tlet $record = if type::is_array($record) { array::first($record) } else { $record };`,
      ],
    };
  }

  return {
    recordVar: '$record',
    recordIdExpr: `if $record.id { $record.id } else { $record }`,
    lines: [
      `\tlet $record = upsert ${tableModel} content $payload;`,
      `\tlet $record = if type::is_array($record) { array::first($record) } else { $record };`,
    ],
  };
}

function isRecordExpression(expr: string): boolean {
  return (
    /\bfn::PID\s*\(/.test(expr) ||
    /\btype::record\s*\(/.test(expr) ||
    /\bfn::ridParam\s*\(/.test(expr)
  );
}

function expandIdStructureExpr(value: string): string | null {
  if (!value) return null;
  if (!value.includes('$')) return null;
  return value.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_match, name: string) => {
    if (name === 'payload') return '$payload';
    return `$payload.${name}`;
  });
}

function buildSubtableRecordIdLine(
  table: TableMigrationConfig,
  tableModel: string
): string {
  const tableType = table.tableType;
  if (tableType !== 'submany') {
    return `let $RID = type::record('${tableModel}', record::id($PARENT_ID));`;
  }

  const idSource = table.id?.structure ?? table.id?.source;
  if (!idSource) {
    return `let $RID = type::record('${tableModel}', record::id($PARENT_ID));`;
  }

  if (idSource === 'default') {
    return `let $RID = type::record('${tableModel}', record::id($PARENT_ID));`;
  }

  if (Array.isArray(idSource)) {
    const parts = idSource.map((field) => mapIdSourceField(field, '$payload', '$PARENT_ID')).join(', ');
    return `let $RID = type::record('${tableModel}', [${parts}]);`;
  }

  const stringIdSource = parseStringIdSource(idSource);
  if (stringIdSource && stringIdSource.fields.length > 0) {
    const args = stringIdSource.fields
      .map((field) => mapIdSourceField(field, '$payload', '$PARENT_ID'))
      .join(', ');
    const fnArgs = stringIdSource.fn === 'stringID' ? `[${args}]` : `${args}`;
    return `let $RID = type::record('${tableModel}', fn::${stringIdSource.fn}(${fnArgs}));`;
  }

  return `let $RID = type::record('${tableModel}', ${mapIdSourceField(idSource, '$payload', '$PARENT_ID')});`;
}

function mapIdSourceField(field: string, payloadVar: string, parentVar: string): string {
  const trimmed = field.trim();
  const cleaned = trimmed.startsWith('$') ? trimmed.slice(1) : trimmed;
  if (!cleaned) return `${payloadVar}.${cleaned}`;
  if (cleaned.toLowerCase() === 'parent') {
    return parentVar;
  }
  return `${payloadVar}.${cleaned}`;
}

type StringIdSource = { fn: 'stringID' | 'stringRIDs'; fields: string[] };

function parseStringIdSource(value: string): StringIdSource | null {
  const match = value.match(/^(stringID|stringRIDs)\s*<(.+)>$/i);
  if (!match || !match[1] || !match[2]) return null;
  const fn = match[1].toLowerCase() === 'stringid' ? 'stringID' : 'stringRIDs';
  const fields = match[2]
    .split(',')
    .map((part) => part.trim())
    .map((part) => part.replace(/^<\s*field\s*:/i, '').replace(/^field\s*:/i, '').trim())
    .map((part) => part.replace(/^\$/g, '').trim())
    .map((part) => part.replace(/>$/g, '').trim())
    .map((part) => stripOuterQuotes(part))
    .filter(Boolean);
  return fields.length > 0 ? { fn, fields } : null;
}

function buildDefaultsObject(
  fields: NormalizedField[],
  payloadVar: string,
  parentVar?: string
): string | null {
  if (fields.length === 0) {
    return null;
  }

  const entries = fields.map(
    (field) => `\t\t${field.name}: ${resolveFieldDefault(field, payloadVar, 2, parentVar)},`
  );
  return entries.join('\n');
}

function resolveFieldDefault(
  field: NormalizedField,
  payloadVar: string,
  depth: number,
  parentVar?: string
): string {
  if (field.meta.default !== undefined) {
    const recordModel = extractRecordModel(field.meta.type);
    if (recordModel) {
      if (field.meta.assign === true) {
        return serializeSurrealLiteral('', depth);
      }
      const expr = resolveDefaultExpression(field.meta.default, payloadVar, parentVar);
      if (expr) {
        if (isEmptyDefaultLiteral(expr)) {
          return serializeSurrealLiteral('', depth);
        }
        if (stripTypeThingArg(expr, recordModel) !== null) {
          return expr;
        }
        return `type::record("${recordModel}", ${expr})`;
      }
    }
    if (typeof field.meta.default === 'string') {
      const substituted = replaceFieldReferences(field.meta.default, payloadVar, parentVar);
      const explicitRaw = unwrapExplicitRawDefault(substituted);
      if (explicitRaw) {
        return explicitRaw;
      }
      if (looksLikeSurrealStatement(substituted)) {
        return substituted;
      }
      return serializeSurrealLiteral(substituted, depth);
    }
    return serializeSurrealLiteral(field.meta.default, depth);
  }

  if (field.children.length > 0) {
    return buildObjectLiteral(field.children, payloadVar, depth, parentVar);
  }

  const programmed = resolveProgrammedDefault(field.meta, payloadVar);
  if (programmed) {
    return programmed;
  }

  return resolveDefaultValue(field.meta);
}

function buildObjectLiteral(
  fields: NormalizedField[],
  payloadVar: string,
  depth: number,
  parentVar?: string
): string {
  if (fields.length === 0) return '{}';
  const indent = '\t'.repeat(depth);
  const childIndent = indent + '\t';
  const lines: string[] = ['{'];
  for (const child of fields) {
    lines.push(
      `${childIndent}${child.name}: ${resolveFieldDefault(child, payloadVar, depth + 1, parentVar)},`
    );
  }
  lines.push(`${indent}}`);
  return lines.join('\n');
}

function resolveProgrammedDefault(_meta: TableFieldMeta, _payloadVar: string): string | null {
  return null;
}

function resolveDefaultValue(meta: TableFieldMeta): string {
  if (meta.default !== undefined) {
    return serializeSurrealLiteral(meta.default, 0);
  }

  if (meta.fields && typeof meta.fields === 'object') {
    const children = Object.entries(meta.fields).map(([name, child]) =>
      normalizeField(name, child as TableFieldMeta)
    );
    return buildObjectLiteral(children, '$payload', 0);
  }

  const primarySegment = meta.type?.split('|')[0]?.trim().toLowerCase() ?? 'string';
  if (primarySegment.startsWith('array')) return '[]';
  if (primarySegment === 'bool' || primarySegment === 'boolean') return 'false';
  if (primarySegment === 'int' || primarySegment === 'integer' || primarySegment === 'number' || primarySegment === 'float' || primarySegment === 'decimal') return '0';
  return '""';
}

function serializeSurrealLiteral(value: unknown, depth: number): string {
  if (typeof value === 'string') {
    if (looksLikeSurrealExpression(value)) {
      return value;
    }
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeSurrealLiteral(item, depth + 1)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const indent = '\t'.repeat(depth);
    const childIndent = indent + '\t';
    const lines: string[] = ['{'];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      lines.push(`${childIndent}${k}: ${serializeSurrealLiteral(v, depth + 1)},`);
    }
    lines.push(`${indent}}`);
    return lines.join('\n');
  }
  return 'null';
}

function looksLikeSurrealExpression(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (/^\$[A-Za-z_][\w.]*$/.test(trimmed)) {
    return true;
  }
  const namespaceCallPattern = /^(?:[a-z_][\w]*::)+[a-z_][\w]*(?:\([^]*\))?$/i;
  if (/^\[.*\]$/.test(trimmed) && /select\s+/i.test(trimmed)) {
    return true;
  }
  return namespaceCallPattern.test(trimmed);
}

function looksLikeSurrealStatement(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (looksLikeSurrealExpression(trimmed)) return true;
  if (trimmed.includes('\n')) return true;
  if (trimmed.includes('??')) return true;
  if (/\b(if|select|return|let)\b/.test(trimmed)) return true;
  if (/\$[A-Za-z_]/.test(trimmed)) return true;
  if (trimmed.includes('::')) return true;
  return false;
}

function unwrapExplicitRawDefault(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < 2) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const inner = trimmed.slice(1, -1).trim();
    if (inner.length === 0) return '';
    return inner;
  }
  return null;
}

interface NormalizedField {
  name: string;
  meta: TableFieldMeta;
  children: NormalizedField[];
}

function normalizeFields(rawFields: TableFieldEntry[] | undefined): NormalizedField[] {
  if (!rawFields) return [];
  return rawFields.flatMap((entry) =>
    Object.entries(entry)
      .filter(([name]) => !isCommentField(name))
      .map(([name, meta]) => normalizeField(name, meta as TableFieldMeta))
  );
}

function isInstanceEnabled(table: TableMigrationConfig): boolean {
  if ((table as any).instance !== true) return false;
  const tableModel = table.table?.model ?? sanitizeCamel(table.name);
  if (tableModel === 'instance') return false;
  return true;
}

function resolvePasswordHash(fields: NormalizedField[]): string | null {
  const field = fields.find((entry) => entry.name.toLowerCase() === 'password' || entry.meta.type?.toLowerCase() === 'password');
  if (!field) {
    return null;
  }
  if (!shouldAssignField(field, 'password')) {
    return null;
  }
  const options = field.meta.options as Record<string, unknown> | undefined;
  const raw = (options?.hash ?? options?.type ?? 'argon2') as string;
  const hash = raw.toLowerCase();
  if (hash === 'bcrypt') return 'bcrypt';
  return 'argon2';
}

function buildAssignOverrides(
  fields: NormalizedField[],
  payloadVar: string,
  parentVar?: string
): string[] {
  const assignments: string[] = [];
  const assigned = new Set<string>();
  const passwordHash = resolvePasswordHash(fields);
  if (passwordHash) {
  assignments.push(`\t\tpassword: crypto::${passwordHash}::generate(${payloadVar}.password),`);
  assigned.add('password');
  }

  assignments.push(...buildMd5Assignments(fields, payloadVar, assigned));
  assignments.push(...buildUuidAssignments(fields, assigned));
  assignments.push(...buildExplicitAssignOverrides(fields, payloadVar, assigned, parentVar));
  return assignments;
}

function buildMd5Assignments(fields: NormalizedField[], payloadVar: string, assigned: Set<string>): string[] {
  const assignments: string[] = [];
  for (const field of fields) {
    if (!shouldAssignField(field, 'md5')) {
      continue;
    }
    const md5Source = resolveMd5Source(field.meta);
    if (!md5Source) {
      continue;
    }

    const match = md5Source.match(/^<(.+)>$/);
    if (match && match[1]) {
      assignments.push(`\t\t${field.name}: crypto::md5(${payloadVar}.${match[1].trim()}),`);
    } else if (md5Source.startsWith('$')) {
      const fieldName = md5Source.slice(1).trim();
      if (fieldName) {
        assignments.push(`\t\t${field.name}: crypto::md5(${payloadVar}.${fieldName}),`);
      } else {
        assignments.push(`\t\t${field.name}: crypto::md5(${JSON.stringify(md5Source)}),`);
      }
    } else {
      assignments.push(`\t\t${field.name}: crypto::md5(${JSON.stringify(md5Source)}),`);
    }
    assigned.add(field.name);
  }
  return assignments;
}

function buildUuidAssignments(fields: NormalizedField[], assigned: Set<string>): string[] {
  const assignments: string[] = [];
  for (const field of fields) {
    if (!shouldAssignField(field, 'uuid')) {
      continue;
    }
    const uuidExpr = resolveUuidExpression(field.meta);
    if (!uuidExpr) {
      continue;
    }
    assignments.push(`\t\t${field.name}: ${uuidExpr},`);
    assigned.add(field.name);
  }
  return assignments;
}

function buildExplicitAssignOverrides(
  fields: NormalizedField[],
  payloadVar: string,
  assigned: Set<string>,
  parentVar?: string
): string[] {
  const assignments: string[] = [];
  for (const field of fields) {
    if (assigned.has(field.name)) {
      continue;
    }
    if (field.meta.assign !== true) {
      continue;
    }
    if (field.meta.default === undefined) {
      continue;
    }
    const recordModel = extractRecordModel(field.meta.type);
    if (recordModel) {
      const accessor = `${payloadVar}.${field.name}`;
      const fallbackExpr = resolveDefaultExpression(field.meta.default, payloadVar, parentVar);
      if (!fallbackExpr) {
        continue;
      }
      const inner = stripTypeThingArg(fallbackExpr, recordModel) ?? fallbackExpr;
      const fallback =
        isEmptyDefaultLiteral(inner) ? 'null' : `type::record("${recordModel}", ${inner})`;
      const expression = `if type::is_record(${accessor}) { ${accessor} } else if ${accessor} { type::record("${recordModel}", ${accessor}) } else { ${fallback} }`;
      assignments.push(`\t\t${field.name}: ${expression},`);
      assigned.add(field.name);
      continue;
    }
    let expression: string;
    if (typeof field.meta.default === 'string') {
      const substituted = replaceFieldReferences(field.meta.default, payloadVar, parentVar);
      expression = serializeSurrealLiteral(substituted, 0);
    } else {
      expression = serializeSurrealLiteral(field.meta.default, 0);
    }
    assignments.push(`\t\t${field.name}: ${expression},`);
    assigned.add(field.name);
  }
  return assignments;
}

function extractRecordModel(typeValue?: string): string | null {
  if (!typeValue) return null;
  const match = typeValue.trim().match(/^record<\s*([^>]+)\s*>$/i);
  if (!match || !match[1]) return null;
  return match[1].trim();
}

function resolveDefaultExpression(
  value: unknown,
  payloadVar: string,
  parentVar?: string
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const substituted = replaceFieldReferences(value, payloadVar, parentVar).trim();
    if (!substituted) return '""';
    if (looksLikeSurrealExpression(substituted)) return substituted;
    if (substituted.startsWith('$')) return substituted;
    if (/\$[A-Za-z_]/.test(substituted)) return substituted;
    return JSON.stringify(substituted);
  }
  return serializeSurrealLiteral(value, 0);
}

function stripTypeThingArg(expression: string, model: string): string | null {
  const trimmed = expression.trim();
  const modelEscaped = model.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(`^type::record\\(\\s*['\"]?${modelEscaped}['\"]?\\s*,\\s*([\\s\\S]+)\\)$`, 'i');
  const match = trimmed.match(re);
  if (!match || !match[1]) return null;
  return match[1].trim();
}

function isEmptyDefaultLiteral(expression: string): boolean {
  const trimmed = expression.trim();
  return trimmed === '""' || trimmed === "''" || trimmed.toLowerCase() === 'null';
}

function resolveMd5Source(meta: TableFieldMeta): string | null {
  const rawType = meta.type?.toLowerCase();
  if (!rawType || !rawType.startsWith('md5')) {
    return null;
  }

  const options = meta.options as Record<string, unknown> | undefined;
  const value = options?.value;
  if (typeof value === 'string') {
    return value;
  }

  const typeRaw = meta.type ?? '';
  const match = typeRaw.match(/md5<\s*(?:field\s*:\s*)?([^>]+)\s*>/i);
  if (match && match[1]) {
    const raw = match[1].trim();
    if (raw.startsWith('$')) {
      return raw;
    }
    return `<${raw}>`;
  }

  return null;
}

function resolveUuidExpression(meta: TableFieldMeta): string | null {
  const rawType = meta.type?.toLowerCase();
  if (!rawType || !(rawType === 'uuid' || rawType.startsWith('uuid<'))) {
    return null;
  }

  const options = meta.options as Record<string, unknown> | undefined;
  const generator = typeof options?.generator === 'string' ? options.generator.trim() : '';
  if (generator) {
    return generator.endsWith(')') ? generator : `${generator}()`;
  }

  const versionRaw = options?.version ?? options?.v ?? options?.type;
  const version = typeof versionRaw === 'string' ? versionRaw.trim().toLowerCase() : '';
  if (version === 'v7' || version === '7') {
    return 'rand::uuid_v7()';
  }
  return 'rand::uuid()';
}

function shouldAssignField(field: NormalizedField, typeHint: 'password' | 'md5' | 'uuid'): boolean {
  if (field.meta.assign === false) {
    return false;
  }
  if (field.meta.assign === true) {
    return true;
  }
  const rawType = field.meta.type?.toLowerCase();
  if (!rawType) return false;
  return rawType === typeHint || rawType.startsWith(`${typeHint}<`);
}

function buildEnumValidationLines(
  fields: NormalizedField[],
  payloadVar: string,
  functionName: string,
  options: { requiredOnly: boolean; onlyIfPresent: boolean }
): string[] {
  const lines: string[] = [];
  for (const field of fields) {
    if (options.requiredOnly && field.meta.required !== true) {
      continue;
    }
    const enumValues = resolveEnumValues(field.meta);
    if (!enumValues || enumValues.length === 0) {
      continue;
    }

    const listLiteral = `[${enumValues.map((value) => JSON.stringify(value)).join(', ')}]`;
    const accessor = `${payloadVar}.${field.name}`;
    if (options.onlyIfPresent) {
      lines.push(
        `\tif ${accessor} != NONE {`,
        `\t\tif !(${accessor} IN ${listLiteral}) {`,
        `\t\t\tthrow "${functionName} | invalid ${field.name}";`,
        `\t\t};`,
        `\t};`
      );
    } else {
      lines.push(
        `\tif !(${accessor} IN ${listLiteral}) {`,
        `\t\tthrow "${functionName} | invalid ${field.name}";`,
        `\t};`
      );
    }
  }
  return lines;
}

function resolveEnumValues(meta: TableFieldMeta): string[] | null {
  const rawType = meta.type;
  if (!rawType) return null;

  const options = meta.options as Record<string, unknown> | undefined;
  const optionValues = options?.values;
  if (Array.isArray(optionValues)) {
    return optionValues.map((value) => String(value));
  }
  if (typeof optionValues === 'string') {
    return splitEnumValues(optionValues).map((value) => stripOuterQuotes(value));
  }

  const trimmed = rawType.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('enum<') && trimmed.endsWith('>')) {
    const inner = trimmed.slice(trimmed.indexOf('<') + 1, -1);
    return splitEnumValues(inner).map((value) => stripOuterQuotes(value));
  }

  if (trimmed.includes('|')) {
    const parts = splitEnumValues(trimmed);
    const allLiteral = parts.every((part) => isQuotedLiteral(part));
    if (allLiteral) {
      return parts.map((part) => stripOuterQuotes(part));
    }
  }

  return null;
}

function splitEnumValues(raw: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let quoteChar: '"' | "'" | null = null;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i] as string;
    const prev = i > 0 ? raw[i - 1] : '';

    if ((ch === '"' || ch === "'") && prev !== '\\') {
      if (inString && quoteChar === ch) {
        inString = false;
        quoteChar = null;
      } else if (!inString) {
        inString = true;
        quoteChar = ch as '"' | "'";
      }
      current += ch;
      continue;
    }

    if (!inString && (ch === '|' || ch === ',')) {
      const trimmed = current.trim();
      if (trimmed.length > 0) values.push(trimmed);
      current = '';
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) values.push(trimmed);

  return values;
}

function isQuotedLiteral(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return false;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'");
}

function stripOuterQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function replaceFieldReferences(value: string, payloadVar: string, parentVar?: string): string {
  const replaced = value.replace(/<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>/g, (_, field) => {
    const name = String(field).trim();
    if (parentVar && name.toLowerCase() === 'parent') {
      return parentVar;
    }
    return `${payloadVar}.${name}`;
  });
  const withParent = parentVar ? replaced.replace(/\$parent\b/gi, parentVar) : replaced;
  const reserved = new Set(['this', 'after', 'before', 'rid', 'record', 'parent', 'payload', 'result']);
  if (parentVar) {
    reserved.add(parentVar.replace(/^\$/, ''));
    reserved.add(parentVar.replace(/^\$/, '').toLowerCase());
  }
  const reservedPattern = Array.from(reserved).join('|');
  const refRegex = new RegExp(`\\$(?!${reservedPattern}\\b)([A-Za-z_][\\w]*)`, 'gi');
  return withParent.replace(refRegex, (_match, field) => {
    return `${payloadVar}.${field}`;
  });
}

function normalizeField(name: string, meta: TableFieldMeta): NormalizedField {
  const children: NormalizedField[] = [];
  if (meta && typeof (meta as any).fields === 'object' && (meta as any).fields !== null) {
    for (const [childName, childMeta] of Object.entries((meta as any).fields)) {
      if (isCommentField(childName)) {
        continue;
      }
      children.push(normalizeField(childName, childMeta as TableFieldMeta));
    }
  }
  return { name, meta, children };
}

function isCommentField(name: string): boolean {
  return name.trim().startsWith('#');
}

function buildRecordParamName(tableNamePascal: string, paramName?: string): string {
  const fallback = `${tableNamePascal}ID`;
  if (!paramName) {
    return `$${fallback}`;
  }
  const sanitized = sanitizePascal(paramName);
  const lower = sanitized.toLowerCase();
  const base = !sanitized || lower === 'id' || lower === 'rid' ? fallback : sanitized;
  return `$${base}`;
}

function buildPayloadParamName(paramName?: string): string {
  if (!paramName) return '$payload';
  const trimmed = paramName.trim();
  if (!trimmed) return '$payload';
  const lower = trimmed.toLowerCase();
  if (lower === 'payload' || lower === 'data' || lower === 'patch') {
    return '$payload';
  }
  return `$${sanitizeCamel(trimmed)}`;
}

function sanitizePascal(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function sanitizeCamel(value: string): string {
  const pascal = sanitizePascal(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function buildDefaultTermModel(tableModel: string, taxonomyKey: string): string {
  const safeTable = sanitizeIdentifier(tableModel);
  const safeKey = sanitizeIdentifier(taxonomyKey);
  const parts = ['t', safeTable, safeKey].filter(Boolean);
  return parts.length > 0 ? parts.join('_') : 'term';
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized.length > 0 ? sanitized.toLowerCase() : '';
}
