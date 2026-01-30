import { access, mkdir, rm, writeFile, readFile } from 'fs/promises';
import path from 'path';

import type {
  CrudDefinition,
  ResourceDefinition,
  RouterEndpoint,
  RouterOperationConfig,
  RouterResourceMapping,
  TableFieldEntry,
  TableFieldMeta,
  TableMigrationConfig,
  TableRouterDefinition,
} from '../types';
import {
  CrudOperationKind,
  getParentModelValue,
  isSubTable,
  isOperationEnabled,
  normalizeCrudConfig,
  resolveCrudFunctionName,
} from './crudHelpers';
import { collectRelations, type NormalizedRelation } from './relationUtils';

interface GenerateTrpcRoutersOptions {
  tables: TableMigrationConfig[];
  outputRoot: string;
  contextImport?: string;
  schemaImportPath?: string;
  requestSchemaImportPath?: string;
  typesenseCollectionsImportPath?: string;
  includeRedisRouter?: boolean;
  includeApiAttemptRouter?: boolean;
}

interface GeneratedRouterInfo {
  importPath: string;
  routerIdentifier: string;
  routerKey: string;
  basePath: string;
}

interface EmbedChildRouter {
  routerIdentifier: string;
  importPath: string;
  prefix: string;
}

export async function generateTrpcRouters(
  options: GenerateTrpcRoutersOptions
): Promise<void> {
  const {
    tables,
    outputRoot,
    contextImport = '../context',
    schemaImportPath = '~~/app/types/schema/generated',
    requestSchemaImportPath = '@schema/request-schema',
    typesenseCollectionsImportPath,
    includeRedisRouter = false,
    includeApiAttemptRouter = true,
  } = options;
  const generatedDir = path.join(outputRoot, 'generated');

  await rm(generatedDir, { recursive: true, force: true });
  await mkdir(generatedDir, { recursive: true });

  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tablesByModel.set(model, table);
    }
  }
  const relationInputsByModel = buildRelationInputSchemas(tables);
  const relations = collectRelations(tables);
  const relationsByModel = new Map<string, NormalizedRelation[]>();
  for (const relation of relations) {
    const leftList = relationsByModel.get(relation.leftModel) ?? [];
    leftList.push(relation);
    relationsByModel.set(relation.leftModel, leftList);
    const rightList = relationsByModel.get(relation.rightModel) ?? [];
    rightList.push(relation);
    relationsByModel.set(relation.rightModel, rightList);
  }

  const subtablesByParent = new Map<string, TableMigrationConfig[]>();
  for (const table of tables) {
    if (!isSubTable(table)) continue;
    const parentModel = getParentModelValue(table);
    if (!parentModel) continue;
    const list = subtablesByParent.get(parentModel) ?? [];
    list.push(table);
    subtablesByParent.set(parentModel, list);
  }

  const routerConfigs = new Map<TableMigrationConfig, TableRouterDefinition>();
  const routerNameMap = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const routerConfig = getRouterConfig(table);
    if (!routerConfig) continue;
    routerConfigs.set(table, routerConfig);
    routerNameMap.set(routerConfig.name, table);
  }
  const routerKeyByTable = new Map<TableMigrationConfig, string>();
  for (const [table, routerConfig] of routerConfigs.entries()) {
    routerKeyByTable.set(table, getRouterKey(table, routerConfig));
  }

  const routerBasePaths = buildRouterBasePathMap(routerConfigs, routerNameMap, tablesByModel);
  const embeddedChildTables = new Set<TableMigrationConfig>();
  const embedChildren = buildEmbedChildrenMap(
    routerConfigs,
    routerNameMap,
    tablesByModel,
    embeddedChildTables,
    routerBasePaths
  );

  const routerInfos: GeneratedRouterInfo[] = [];
  const hasAdminKey = Array.from(routerConfigs.entries()).some(([table, router]) => (
    getRouterKey(table, router) === 'admin'
  ));
  const hasApiAttemptKey = Array.from(routerConfigs.entries()).some(([table, router]) => (
    getRouterKey(table, router) === 'apiAttempt'
  ));
  if (!hasAdminKey) {
    const adminInfo = await buildAdminRouterFile({
      outputDir: generatedDir,
      contextImport,
      requestSchemaImportPath,
    });
    if (adminInfo) {
      routerInfos.push(adminInfo);
    }
  } else {
    console.warn('⚠️  Skipping admin router generation (router key "admin" already in use).');
  }

  if (includeRedisRouter) {
    const redisInfo = await buildRedisRouterFile({
      outputDir: generatedDir,
      contextImport,
    });
    if (redisInfo) {
      routerInfos.push(redisInfo);
    }
  }

  if (includeApiAttemptRouter && !hasApiAttemptKey) {
    const apiAttemptInfo = await buildApiAttemptRouterFile({
      outputDir: generatedDir,
      contextImport,
      requestSchemaImportPath,
    });
    if (apiAttemptInfo) {
      routerInfos.push(apiAttemptInfo);
    }
  } else if (includeApiAttemptRouter && hasApiAttemptKey) {
    console.warn('⚠️  Skipping apiAttempt router generation (router key "apiAttempt" already in use).');
  }

  for (const [table, router] of routerConfigs.entries()) {
    const crud = normalizeCrudConfig(table);
    const customEndpointKeys = await resolveCustomEndpointKeys(
      outputRoot,
      routerBasePaths.get(table) ?? sanitizeFileName(getRouterKey(table, router))
    );
    const info = await buildRouterFile(
      table,
      router,
      crud,
      generatedDir,
      contextImport,
      schemaImportPath,
      requestSchemaImportPath,
      typesenseCollectionsImportPath,
      embedChildren.get(table) ?? [],
      routerBasePaths.get(table) ?? sanitizeFileName(getRouterKey(table, router)),
      tablesByModel,
      customEndpointKeys,
      relationInputsByModel,
      relationsByModel,
      subtablesByParent,
      routerKeyByTable
    );

    if (info && !embeddedChildTables.has(table)) {
      routerInfos.push(info);
    }
  }

  await writeGeneratedIndex(generatedDir, routerInfos);
  await ensureRouterWrappers(outputRoot, routerInfos, contextImport);
}

async function buildAdminRouterFile(options: {
  outputDir: string;
  contextImport: string;
  requestSchemaImportPath: string;
}): Promise<GeneratedRouterInfo | null> {
  const { outputDir, contextImport, requestSchemaImportPath } = options;
  const routerKey = 'admin';
  const routerIdentifier = 'adminRouter';
  const basePath = 'admin';
  const filePath = path.join(outputDir, `${basePath}.ts`);

  const routerPathDepth = basePath.split('/').length - 1;
  const relativePrefixParts = new Array(routerPathDepth + 1).fill('..');
  const relativePrefix = relativePrefixParts.join('/');
  const adjustedContextImport = contextImport.startsWith('.')
    ? path.posix.join(relativePrefix, contextImport)
    : contextImport;

  const lines = [
    `import { z } from 'zod';`,
    `import { t } from '${adjustedContextImport}';`,
    `import { RequestSchema } from '${requestSchemaImportPath}';`,
    '',
    `const UpdatePostStatusInput = z.object({`,
    `  recordId: z.object({ tb: z.string(), id: z.any() }),`,
    `  status: z.enum(['draft', 'publish']),`,
    `});`,
    '',
    `export const ${routerIdentifier} = t.router({`,
    `  updatePostStatus: t.procedure`,
    `    .input(RequestSchema(UpdatePostStatusInput))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const { recordId, status } = input.data || { recordId: undefined, status: undefined };`,
    `      if (!recordId || !(recordId as any).id || !(recordId as any).tb) {`,
    `        throw new Error('admin updatePostStatus requires recordId');`,
    `      }`,
    `      if (!status) {`,
    `        throw new Error('admin updatePostStatus requires status');`,
    `      }`,
    `      const query = /* surql */ \``,
    `        let $rid = type::record($tb, $id);`,
    `        RETURN fn::updateAdminPostStatus($rid, $status);`,
    `      \`;`,
    `      const result = await LRS(await dbInstance.query(query, { tb: (recordId as any).tb, id: (recordId as any).id, status }));`,
    `      return result;`,
    `    }),`,
    `});`,
    '',
  ];

  await writeFile(filePath, lines.join('\n'), 'utf-8');

  return {
    importPath: '../admin',
    routerIdentifier,
    routerKey,
    basePath,
  };
}

async function buildRedisRouterFile(options: {
  outputDir: string;
  contextImport: string;
}): Promise<GeneratedRouterInfo | null> {
  const { outputDir, contextImport } = options;
  const routerKey = 'redis';
  const routerIdentifier = 'redisRouter';
  const basePath = 'redis';
  const filePath = path.join(outputDir, `${basePath}.ts`);

  const routerPathDepth = basePath.split('/').length - 1;
  const relativePrefixParts = new Array(routerPathDepth + 1).fill('..');
  const relativePrefix = relativePrefixParts.join('/');
  const adjustedContextImport = contextImport.startsWith('.')
    ? path.posix.join(relativePrefix, contextImport)
    : contextImport;

  const lines = [
    `import { z } from 'zod';`,
    `import { TRPCError } from '@trpc/server';`,
    `import { t, adminProcedure } from '${adjustedContextImport}';`,
    '',
    `const RedisCommandInput = z.object({`,
    `  command: z.string().min(1),`,
    `  args: z.array(z.any()).optional(),`,
    `});`,
    '',
    `const RedisPipelineInput = z.object({`,
    `  commands: z.array(RedisCommandInput),`,
    `});`,
    '',
    `const ensureRedis = (ctx: any) => {`,
    `  const redis = ctx.redis;`,
    `  if (!redis) {`,
    `    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Redis not configured' });`,
    `  }`,
    `  return redis;`,
    `};`,
    '',
    `export const ${routerIdentifier} = t.router({`,
    `  ping: adminProcedure.query(async ({ ctx }) => {`,
    `    const redis = ensureRedis(ctx);`,
    `    const start = Date.now();`,
    `    const pong = await redis.ping();`,
    `    return { ok: true, pong, ms: Date.now() - start };`,
    `  }),`,
    `  query: adminProcedure.input(RedisCommandInput).mutation(async ({ ctx, input }) => {`,
    `    const redis = ensureRedis(ctx);`,
    `    const args = input.args ?? [];`,
    `    return await (redis as any).call(input.command, ...args);`,
    `  }),`,
    `  pipeline: adminProcedure.input(RedisPipelineInput).mutation(async ({ ctx, input }) => {`,
    `    const redis = ensureRedis(ctx);`,
    `    const pipeline = redis.pipeline();`,
    `    for (const cmd of input.commands) {`,
    `      const args = cmd.args ?? [];`,
    `      (pipeline as any).call(cmd.command, ...args);`,
    `    }`,
    `    return await pipeline.exec();`,
    `  }),`,
    `});`,
    '',
  ];

  await writeFile(filePath, lines.join('\n'), 'utf-8');

  return {
    importPath: `./${basePath}`,
    routerIdentifier,
    routerKey,
    basePath,
  };
}

async function buildApiAttemptRouterFile(options: {
  outputDir: string;
  contextImport: string;
  requestSchemaImportPath: string;
}): Promise<GeneratedRouterInfo | null> {
  const { outputDir, contextImport, requestSchemaImportPath } = options;
  const routerKey = 'apiAttempt';
  const routerIdentifier = 'apiAttemptRouter';
  const basePath = 'apiAttempt';
  const filePath = path.join(outputDir, `${basePath}.ts`);

  const routerPathDepth = basePath.split('/').length - 1;
  const relativePrefixParts = new Array(routerPathDepth + 1).fill('..');
  const relativePrefix = relativePrefixParts.join('/');
  const adjustedContextImport = contextImport.startsWith('.')
    ? path.posix.join(relativePrefix, contextImport)
    : contextImport;

  const lines = [
    `import { z } from 'zod';`,
    `import { t } from '${adjustedContextImport}';`,
    `import { RequestSchema } from '${requestSchemaImportPath}';`,
    '',
    `const ApiAttemptCreateInput = z.object({`,
    `  endpoint: z.string(),`,
    `  method: z.enum(['query', 'mutate']).optional(),`,
    `  data: z.any().optional(),`,
    `  instances: z.array(z.string()).optional(),`,
    `  rootInstance: z.string().optional(),`,
    `  bypassMothership: z.boolean().optional(),`,
    `  dataLocation: z.enum(['local', 'remote']).optional(),`,
    `  status: z.enum(['pending', 'success', 'partial', 'failed']).optional(),`,
    `  results: z.any().optional(),`,
    `  startedAt: z.string().optional(),`,
    `  endedAt: z.string().optional(),`,
    `  options: z.record(z.string(), z.any()).optional(),`,
    `}).passthrough();`,
    '',
    `const ApiAttemptUpdateInput = z.object({`,
    `  id: z.string().min(1),`,
    `  payload: z.record(z.string(), z.any()),`,
    `});`,
    '',
    `const ApiAttemptFinalizeInput = z.object({`,
    `  id: z.string().min(1),`,
    `  payload: z.record(z.string(), z.any()).optional(),`,
    `  results: z.any().optional(),`,
    `});`,
    '',
    `const ApiAttemptDeleteInput = z.object({`,
    `  id: z.string().min(1),`,
    `});`,
    '',
    `const ApiAttemptListInput = z.object({`,
    `  status: z.string().optional(),`,
    `  limit: z.number().min(1).max(200).optional(),`,
    `  start: z.number().min(0).optional(),`,
    `});`,
    '',
    `const resolveStatus = (payload?: any) => {`,
    `  if (payload?.status) return payload.status as string;`,
    `  const failed = payload?.results?.failed?.length ?? 0;`,
    `  const success = payload?.results?.success?.length ?? 0;`,
    `  if (failed > 0 && success > 0) return 'partial';`,
    `  if (failed > 0) return 'failed';`,
    `  if (success > 0) return 'success';`,
    `  return 'pending';`,
    `};`,
    '',
    `export const ${routerIdentifier} = t.router({`,
    `  create: t.procedure`,
    `    .input(RequestSchema(ApiAttemptCreateInput))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const payload = {`,
    `        ...input.data,`,
    `        status: input.data?.status ?? 'pending',`,
    `        startedAt: input.data?.startedAt ?? new Date().toISOString(),`,
    `        updatedAt: new Date().toISOString(),`,
    `      };`,
    `      const query = /* surql */ \``,
    `        CREATE apiAttempt CONTENT $payload;`,
    `      \`;`,
    `      const result = await LRS(await dbInstance.query(query, { payload }));`,
    `      return result;`,
    `    }),`,
    `  update: t.procedure`,
    `    .input(RequestSchema(ApiAttemptUpdateInput))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const { id, payload } = input.data || { id: undefined, payload: undefined };`,
    `      if (!id || !payload) {`,
    `        throw new Error('apiAttempt.update requires id and payload');`,
    `      }`,
    `      const query = /* surql */ \``,
    `        LET $rid = type::record('apiAttempt', $id);`,
    `        UPDATE $rid MERGE $payload RETURN AFTER;`,
    `      \`;`,
    `      const result = await LRS(await dbInstance.query(query, {`,
    `        id,`,
    `        payload: { ...payload, updatedAt: new Date().toISOString() },`,
    `      }));`,
    `      return result;`,
    `    }),`,
    `  finalize: t.procedure`,
    `    .input(RequestSchema(ApiAttemptFinalizeInput))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const { id, payload, results } = input.data || { id: undefined, payload: undefined, results: undefined };`,
    `      if (!id) {`,
    `        throw new Error('apiAttempt.finalize requires id');`,
    `      }`,
    `      const mergedResults = results ?? (payload as any)?.results;`,
    `      const finalPayload = {`,
    `        ...(payload || {}),`,
    `        results: mergedResults,`,
    `        status: resolveStatus({ ...(payload || {}), results: mergedResults }),`,
    `        endedAt: payload?.endedAt ?? new Date().toISOString(),`,
    `        updatedAt: new Date().toISOString(),`,
    `      };`,
    `      const shouldDelete = finalPayload.status === 'success' && payload?.cleanupOnSuccess !== false;`,
    `      if (shouldDelete) {`,
    `        const delQuery = /* surql */ \``,
    `          LET $rid = type::record('apiAttempt', $id);`,
    `          DELETE $rid RETURN BEFORE;`,
    `        \`;`,
    `        await LRS(await dbInstance.query(delQuery, { id }));`,
    `        return { id, deleted: true };`,
    `      }`,
    `      const query = /* surql */ \``,
    `        LET $rid = type::record('apiAttempt', $id);`,
    `        UPDATE $rid MERGE $payload RETURN AFTER;`,
    `      \`;`,
    `      const result = await LRS(await dbInstance.query(query, { id, payload: finalPayload }));`,
    `      return result;`,
    `    }),`,
    `  delete: t.procedure`,
    `    .input(RequestSchema(ApiAttemptDeleteInput))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const { id } = input.data || { id: undefined };`,
    `      if (!id) {`,
    `        throw new Error('apiAttempt.delete requires id');`,
    `      }`,
    `      const query = /* surql */ \``,
    `        LET $rid = type::record('apiAttempt', $id);`,
    `        DELETE $rid RETURN BEFORE;`,
    `      \`;`,
    `      const result = await LRS(await dbInstance.query(query, { id }));`,
    `      return result;`,
    `    }),`,
    `  list: t.procedure`,
    `    .input(RequestSchema(ApiAttemptListInput.optional()))`,
    `    .query(async ({ input, ctx }) => {`,
    `      const { db } = ctx;`,
    `      const dbInstance = input?.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const { status, limit = 50, start = 0 } = input?.data || {};`,
    `      const filter = status ? \`WHERE status = $status\` : '';`,
    `      const query = /* surql */ \``,
    `        SELECT * FROM apiAttempt \${filter} ORDER BY startedAt DESC LIMIT $limit START $start;`,
    `      \`;`,
    `      const result = await dbInstance.query(query, { status, limit, start });`,
    `      return Array.isArray(result?.[0]) ? result[0] : result;`,
    `    }),`,
    `});`,
    '',
  ];

  await writeFile(filePath, lines.join('\n'), 'utf-8');

  return {
    importPath: `./${basePath}`,
    routerIdentifier,
    routerKey,
    basePath,
  };
}

function buildRouterBasePathMap(
  routerConfigs: Map<TableMigrationConfig, TableRouterDefinition>,
  routerNameMap: Map<string, TableMigrationConfig>,
  tablesByModel: Map<string, TableMigrationConfig>
): Map<TableMigrationConfig, string> {
  const cache = new Map<TableMigrationConfig, string>();
  for (const table of routerConfigs.keys()) {
    resolveRouterBasePath(table, routerConfigs, routerNameMap, tablesByModel, cache);
  }
  return cache;
}

function resolveRouterBasePath(
  table: TableMigrationConfig,
  routerConfigs: Map<TableMigrationConfig, TableRouterDefinition>,
  routerNameMap: Map<string, TableMigrationConfig>,
  tablesByModel: Map<string, TableMigrationConfig>,
  cache: Map<TableMigrationConfig, string>
): string {
  if (cache.has(table)) {
    return cache.get(table) as string;
  }

  const router = routerConfigs.get(table);
  const routerKey = getRouterKey(table, router);
  const parent = resolveRouterParent(table, router, routerNameMap, tablesByModel);

  let basePath: string;
  if (parent) {
    const parentBase = resolveRouterBasePath(parent, routerConfigs, routerNameMap, tablesByModel, cache);
    const parentKey = getRouterKey(parent, routerConfigs.get(parent));
    const segmentSeed = computeEmbedPrefix(parentKey, routerKey) || routerKey;
    const childSegment = sanitizeFileName(segmentSeed);
    basePath = path.posix.join(parentBase, childSegment);
  } else {
    basePath = sanitizeFileName(routerKey);
  }

  cache.set(table, basePath);
  return basePath;
}

function buildEmbedChildrenMap(
  routerConfigs: Map<TableMigrationConfig, TableRouterDefinition>,
  routerNameMap: Map<string, TableMigrationConfig>,
  tablesByModel: Map<string, TableMigrationConfig>,
  embeddedChildTables: Set<TableMigrationConfig>,
  routerBasePaths: Map<TableMigrationConfig, string>
): Map<TableMigrationConfig, EmbedChildRouter[]> {
  const map = new Map<TableMigrationConfig, EmbedChildRouter[]>();

  for (const [table, router] of routerConfigs.entries()) {
    const parent = resolveRouterParent(table, router, routerNameMap, tablesByModel);
    if (!parent) {
      continue;
    }

    const parentRouterKey = getRouterKey(parent, routerConfigs.get(parent));
    const childRouterKey = getRouterKey(table, router);
    const routerIdentifier = buildRouterIdentifier(childRouterKey);
    const parentBasePath = routerBasePaths.get(parent) ?? sanitizeFileName(parentRouterKey);
    const childBasePath = routerBasePaths.get(table) ?? sanitizeFileName(childRouterKey);
    const importPath = buildRelativeImportPath(parentBasePath, childBasePath);
    const prefix = computeEmbedPrefix(parentRouterKey, childRouterKey);

    const list = map.get(parent) ?? [];
    list.push({ routerIdentifier, importPath, prefix });
    map.set(parent, list);
    embeddedChildTables.add(table);
  }

  return map;
}

function buildRelativeImportPath(parentBasePath: string, childBasePath: string): string {
  const parentFile = `${parentBasePath}.ts`;
  const childFile = `${childBasePath}.ts`;
  const parentDir = path.posix.dirname(parentFile);
  let relative = path.posix.relative(parentDir, childFile);
  if (!relative.startsWith('.')) {
    relative = `./${relative}`;
  }
  relative = relative.replace(/\\/g, '/');
  return relative.replace(/\.ts$/, '');
}

async function buildRouterFile(
  table: TableMigrationConfig,
  router: TableRouterDefinition,
  crud: CrudDefinition | null,
  outputDir: string,
  contextImport: string,
  schemaImportPath: string,
  requestSchemaImportPath: string,
  typesenseCollectionsImportPath: string | undefined,
  embedChildren: EmbedChildRouter[],
  routerBasePath: string,
  tablesByModel: Map<string, TableMigrationConfig>,
  customEndpointKeys: Set<string>,
  relationInputsByModel: Map<string, { createIdentifier: string; updateIdentifier: string; lines: string[] }>,
  relationsByModel: Map<string, NormalizedRelation[]>,
  subtablesByParent: Map<string, TableMigrationConfig[]>,
  routerKeyByTable: Map<TableMigrationConfig, string>
): Promise<GeneratedRouterInfo | null> {
  const endpoints = normalizeRouterEndpoints(table, router, customEndpointKeys);
  const tableModel = table.table?.model;

  if (!tableModel) {
    return null;
  }

  const { crudTargets, resourceMap, customOperations } = analyzeRouterEndpoints(endpoints);
  const sanitizedResourceMap = stripTypesenseResource(resourceMap);

  const createConnector = resolveConnectorOperation(
    'create',
    crudTargets.get('create'),
    crud,
    table,
    tablesByModel
  );
  const updateConnector = resolveConnectorOperation(
    'update',
    crudTargets.get('update'),
    crud,
    table,
    tablesByModel
  );
  const deleteConnector = resolveConnectorOperation(
    'delete',
    crudTargets.get('delete'),
    crud,
    table,
    tablesByModel
  );

  const parentModel = isSubTable(table) ? getParentModelValue(table) : null;

  const viewOperations = Array.from(customOperations.entries()).filter(
    ([, config]) => config.target === 'view'
  );
  const functionOperations = Array.from(customOperations.entries()).filter(
    ([, config]) => config.target === 'function'
  );
  const typesenseOperations = extractTypesenseOperations(customOperations, table);
  const mainViewOperations = viewOperations.filter(([key]) => key.toLowerCase() !== 'typesense');
  const mainFunctionOperations = functionOperations.filter(([key]) => key.toLowerCase() !== 'typesense');
  const hasCreate = !!createConnector;
  const hasUpdate = !!updateConnector;
  const hasDelete = !!deleteConnector;
  const hasResource = Object.keys(sanitizedResourceMap).length > 0;
  const hasCustomViewOperations = mainViewOperations.length > 0;
  const hasCustomFunctionOperations = mainFunctionOperations.length > 0;
  const hasTypesense = typesenseOperations !== null;

  if (
    !hasCreate &&
    !hasUpdate &&
    !hasDelete &&
    !hasResource &&
    !hasCustomViewOperations &&
    !hasCustomFunctionOperations &&
    !hasTypesense &&
    embedChildren.length === 0
  ) {
    return null;
  }

  const tableNamePascal = sanitizePascal(table.name || tableModel);
  const routerKey = getRouterKey(table, router);
  const routerIdentifier = buildRouterIdentifier(routerKey);

  const schemaIdentifier = `Z_${tableNamePascal}`;
  const normalizedFields = normalizeFields(table.fields ?? []);
  const taxonomyPayloadOmitKeys = (table.taxonomies ?? [])
    .filter((taxonomy) => taxonomy.storeOnModel === false)
    .map((taxonomy) => taxonomy.payloadField)
    .filter((field): field is string => Boolean(field));
  const taxonomyPayloadInputKeys = Array.from(new Set(taxonomyPayloadOmitKeys));
  const filteredFields = taxonomyPayloadOmitKeys.length
    ? normalizedFields.filter((field) => !taxonomyPayloadOmitKeys.includes(field.name))
    : normalizedFields;
  const inputFields = filterInputFields(filteredFields);
  const schemaFieldNames = new Set(normalizedFields.map((field) => field.name));
  const omittedInputKeys = Array.from(
    new Set([
      ...filteredFields
        .filter((field) => field.meta.ignorePayload)
        .map((field) => field.name),
      ...taxonomyPayloadOmitKeys,
    ])
  ).filter((key) => schemaFieldNames.has(key));
  const requiredFields = inputFields.filter((field) => field.meta.required === true);
  const relationSchemas = relationInputsByModel.get(table.table?.model ?? '');
  const typesenseIdCast = resolveTypesenseIdCast(table, normalizedFields);

  const createSchemaIdentifier = `${tableNamePascal}CreateInput`;
  const updateSchemaIdentifier = `${tableNamePascal}UpdateInput`;
  const deleteSchemaIdentifier = `${tableNamePascal}DeleteInput`;
  const resourceSchemaIdentifier = `${tableNamePascal}ResourceInput`;
  const resourceKeyEnum = `${tableNamePascal}ResourceKey`;
  const typesenseResourceSchemaIdentifier = `${tableNamePascal}TypesenseResourceInput`;
  const typesenseListSchemaIdentifier = `${tableNamePascal}TypesenseListInput`;
  const typesenseCountSchemaIdentifier = `${tableNamePascal}TypesenseCountInput`;
  const typesenseCollectionConst = `${tableNamePascal}TypesenseCollection`;

  const fileSegments: string[] = [];

  const routerPathDepth = routerBasePath.split('/').length - 1; // number of subdirectories inside generated/
  const relativePrefixParts = new Array(routerPathDepth + 1).fill('..'); // +1 for generated folder itself
  const relativePrefix = relativePrefixParts.join('/');

  const adjustedContextImport = contextImport.startsWith('.')
    ? path.posix.join(relativePrefix, contextImport)
    : contextImport;

  const importLines: string[] = [`import { z } from 'zod';`, `import { t } from '${adjustedContextImport}';`];
  for (const child of embedChildren) {
    importLines.push(`import { ${child.routerIdentifier} } from '${child.importPath}';`);
  }
  if (hasTypesense && typesenseCollectionsImportPath) {
    importLines.push(`import { collections } from '${typesenseCollectionsImportPath}';`);
  }
  if (hasTypesense) {
    importLines.push(`import { upsertTypesenseDocuments } from '@schema/server/typesense';`);
  }
  importLines.push(
    '',
    `import { RequestSchema } from '${requestSchemaImportPath}';`,
    `import { ${schemaIdentifier}, RecordID_z } from '${schemaImportPath}';`,
    ''
  );
  fileSegments.push(...importLines);

  const taxonomyInputIdentifier =
    taxonomyPayloadInputKeys.length > 0 ? `${tableNamePascal}TaxonomyInput` : '';
  if (taxonomyPayloadInputKeys.length > 0) {
    fileSegments.push(
      `const ${taxonomyInputIdentifier} = z.object({`,
      ...taxonomyPayloadInputKeys.map((field) => `  ${field}: z.any().optional(),`),
      `});`,
      ''
    );
  }

  if (hasCreate) {
    if (relationSchemas?.lines?.length) {
      fileSegments.push(...relationSchemas.lines, '');
    }
    fileSegments.push(
      buildCreateSchema(
        createSchemaIdentifier,
        schemaIdentifier,
        inputFields,
        requiredFields,
        relationSchemas?.createIdentifier,
        Boolean(parentModel),
        omittedInputKeys,
        taxonomyInputIdentifier || undefined
      ),
      ''
    );
  }

  if (hasUpdate) {
    if (relationSchemas?.lines?.length && !hasCreate) {
      fileSegments.push(...relationSchemas.lines, '');
    }
    fileSegments.push(
      buildUpdateSchema(
        updateSchemaIdentifier,
        schemaIdentifier,
        relationSchemas?.updateIdentifier,
        omittedInputKeys,
        taxonomyInputIdentifier || undefined
      ),
      ''
    );
  }

  if (hasDelete) {
    fileSegments.push(
      `const ${deleteSchemaIdentifier} = z.object({`,
      `  id: z.union([z.string().min(1), z.number(), RecordID_z]),`,
      `});`,
      ''
    );
  }

  if (hasResource) {
    fileSegments.push(
      buildResourceSchema(resourceSchemaIdentifier, resourceKeyEnum, sanitizedResourceMap),
      ''
    );
  }

  if (hasTypesense) {
    fileSegments.push(
      buildTypesenseResourceSchema(typesenseResourceSchemaIdentifier),
      ''
    );
    fileSegments.push(buildViewInputSchema(typesenseListSchemaIdentifier), '');
    fileSegments.push(buildViewCountInputSchema(typesenseCountSchemaIdentifier), '');
    fileSegments.push(
      buildTypesenseCollectionConstant(
        typesenseCollectionConst,
        table.typesense?.schema,
        typesenseCollectionsImportPath ? table.typesense?.schema?.collection : undefined
      ),
      ''
    );
  }

  const viewOperationSchemas: Array<{
    methodKey: string;
    schemaIdentifier: string;
    viewName: string;
    countSchemaIdentifier?: string;
  }> = [];
  const functionOperationSchemas: Array<{
    methodKey: string;
    schemaIdentifier: string;
    functionName: string;
    countSchemaIdentifier?: string;
  }> = [];
  for (const [operationKey, config] of mainViewOperations) {
    const methodPascal = sanitizePascal(operationKey);
    const schemaIdentifier = `${tableNamePascal}${methodPascal || 'View'}Input`;
    const viewName = buildViewIdentifier(tableNamePascal, config.value ?? operationKey);
    fileSegments.push(buildViewInputSchema(schemaIdentifier), '');
    const isTypesense = operationKey.toLowerCase() === 'typesense';
    const countSchemaIdentifier = isTypesense
      ? (customEndpointKeys.has('typesensecount')
          ? undefined
          : `${tableNamePascal}${methodPascal || 'View'}CountInput`)
      : undefined;
    if (countSchemaIdentifier) {
      fileSegments.push(buildViewCountInputSchema(countSchemaIdentifier), '');
    }
    viewOperationSchemas.push({ methodKey: operationKey, schemaIdentifier, viewName, countSchemaIdentifier });
  }

  for (const [operationKey, config] of mainFunctionOperations) {
    const methodPascal = sanitizePascal(operationKey);
    const schemaIdentifier = `${tableNamePascal}${methodPascal || 'View'}Input`;
    const functionName = normalizeResourceFunctionName(config.value ?? operationKey);
    fileSegments.push(buildViewInputSchema(schemaIdentifier), '');
    const isTypesense = operationKey.toLowerCase() === 'typesense';
    const countSchemaIdentifier = isTypesense
      ? (customEndpointKeys.has('typesensecount')
          ? undefined
          : `${tableNamePascal}${methodPascal || 'View'}CountInput`)
      : undefined;
    if (countSchemaIdentifier) {
      fileSegments.push(buildViewCountInputSchema(countSchemaIdentifier), '');
    }
    functionOperationSchemas.push({ methodKey: operationKey, schemaIdentifier, functionName, countSchemaIdentifier });
  }

  const routerLines: string[] = [];
  routerLines.push(`export const ${routerIdentifier} = t.router({`);

  const taxonomyRouters = buildTaxonomyRouters(table, tableNamePascal, tableModel);
  if (taxonomyRouters.lines.length > 0) {
    fileSegments.push(...taxonomyRouters.lines, '');
  }

  const subtableProcedures = buildSubtableProcedures(
    table,
    tableNamePascal,
    tableModel,
    customEndpointKeys,
    tablesByModel
  );
  if (subtableProcedures.schemaLines.length > 0) {
    fileSegments.push(...subtableProcedures.schemaLines, '');
  }

  const relationRouters = buildRelationRouters(
    tableModel,
    tableNamePascal,
    relationsByModel
  );
  if (relationRouters.lines.length > 0) {
    fileSegments.push(...relationRouters.lines, '');
  }

  const parentSubtables = buildParentSubtableRouters(
    tableModel,
    tableNamePascal,
    subtablesByParent,
    routerKeyByTable,
    tablesByModel
  );
  if (parentSubtables.lines.length > 0) {
    fileSegments.push(...parentSubtables.lines, '');
  }

  if (createConnector) {
    routerLines.push(
      buildCreateProcedure(
        createSchemaIdentifier,
        routerKey,
        createConnector.functionName,
        parentModel ?? undefined
      )
    );
  }

  if (updateConnector) {
    routerLines.push(
      buildUpdateProcedure(
        updateSchemaIdentifier,
        updateConnector.functionName,
        tableModel
      )
    );
  }

  if (deleteConnector) {
    routerLines.push(
      buildDeleteProcedure(deleteSchemaIdentifier, deleteConnector.functionName, tableModel)
    );
  }

  if (taxonomyRouters.entries.length > 0) {
    routerLines.push(...taxonomyRouters.entries);
  }

  if (subtableProcedures.routerLines.length > 0) {
    routerLines.push(...subtableProcedures.routerLines);
  }

  if (relationRouters.entries.length > 0) {
    routerLines.push(...relationRouters.entries);
  }

  if (parentSubtables.entries.length > 0) {
    routerLines.push(...parentSubtables.entries);
  }

  if (hasResource) {
    routerLines.push(
      buildResourceProcedure(
        resourceSchemaIdentifier,
        resourceKeyEnum,
        tableNamePascal,
        tableModel,
        sanitizedResourceMap,
        table.views ?? table.resources ?? []
      )
    );
  }

  for (const viewOperation of viewOperationSchemas) {
    routerLines.push(
      buildViewProcedure(
        viewOperation.methodKey,
        viewOperation.schemaIdentifier,
        viewOperation.viewName
      )
    );
    if (viewOperation.countSchemaIdentifier) {
      routerLines.push(
        buildViewCountProcedure(
          `${viewOperation.methodKey}Count`,
          viewOperation.countSchemaIdentifier,
          viewOperation.viewName
        )
      );
    }
  }

  for (const fnOperation of functionOperationSchemas) {
    routerLines.push(
      buildFunctionViewProcedure(
        fnOperation.methodKey,
        fnOperation.schemaIdentifier,
        fnOperation.functionName,
        tableModel
      )
    );
    if (fnOperation.countSchemaIdentifier) {
      routerLines.push(
        buildFunctionViewCountProcedure(
          `${fnOperation.methodKey}Count`,
          fnOperation.countSchemaIdentifier,
          tableModel
        )
      );
    }
  }

  for (const child of embedChildren) {
    routerLines.push(`  ${child.prefix}: ${child.routerIdentifier},`);
  }

  if (hasTypesense && typesenseOperations) {
    routerLines.push(
      buildTypesenseRouter(
        typesenseOperations,
        typesenseResourceSchemaIdentifier,
        typesenseListSchemaIdentifier,
        typesenseCountSchemaIdentifier,
        typesenseCollectionConst,
        tableModel,
        tableNamePascal,
        typesenseIdCast
      )
    );
  }

  routerLines.push('});', '');

  fileSegments.push(routerLines.join('\n'));

  const normalizedBasePath = routerBasePath.replace(/\\/g, '/');
  const filePath = path.join(outputDir, `${normalizedBasePath}.ts`);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, fileSegments.join('\n'), 'utf-8');

  return {
    importPath: `./${normalizedBasePath}`,
    routerIdentifier,
    routerKey,
    basePath: normalizedBasePath,
  };
}

function analyzeRouterEndpoints(
  endpoints: RouterEndpoint[]
): {
  crudTargets: Map<string, RouterOperationConfig>;
  resourceMap: Record<string, RouterResourceMapping>;
  customOperations: Map<string, RouterOperationConfig>;
} {
  const crudTargets = new Map<string, RouterOperationConfig>();
  let resourceMap: Record<string, RouterResourceMapping> = {};
  const customOperations = new Map<string, RouterOperationConfig>();

  for (const endpoint of endpoints) {
    const [entryKey, entryValue] = Object.entries(endpoint)[0] ?? [];
    if (!entryKey || !entryValue) {
      continue;
    }

    if (entryKey === 'resource' && typeof entryValue === 'object') {
      resourceMap = entryValue as Record<string, RouterResourceMapping>;
      continue;
    }

    if (typeof entryValue === 'object' && 'target' in (entryValue as Record<string, unknown>)) {
      const config = entryValue as RouterOperationConfig;
      if (config.target === 'crud') {
        crudTargets.set(entryKey, config);
      } else {
        customOperations.set(entryKey, config);
      }
    }
  }

  return { crudTargets, resourceMap, customOperations };
}

function normalizeRouterEndpoints(
  table: TableMigrationConfig,
  router: TableRouterDefinition,
  customEndpointKeys?: Set<string>
): RouterEndpoint[] {
  const rawEndpoints = Array.isArray(router.endpoints)
    ? (router.endpoints as Array<RouterEndpoint | Record<string, unknown> | string>)
    : [];

  if (rawEndpoints.length === 0) {
    return [];
  }

  const viewNameLookup = buildViewNameLookup(table);
  const allViewNames = Array.from(viewNameLookup.values());

  const normalized: RouterEndpoint[] = [];
  const operationKeys = new Set<string>();
  let resourceMap: Record<string, RouterResourceMapping> | null = null;

  const mergeResourceMap = (map: Record<string, RouterResourceMapping> | null) => {
    if (!map || Object.keys(map).length === 0) {
      return;
    }
    resourceMap = { ...(resourceMap ?? {}), ...map };
  };

  for (const endpoint of rawEndpoints) {
    if (!endpoint) {
      continue;
    }

    if (typeof endpoint === 'string') {
      const trimmed = endpoint.trim();
      if (!trimmed) continue;

      const viewSelector = parseViewsSelector(trimmed);
      if (viewSelector) {
        mergeResourceMap(buildResourceMapFromSelector(viewSelector, viewNameLookup, allViewNames));
        continue;
      }

      const lower = trimmed.toLowerCase();
      if (lower === 'typesense' && table.typesense) {
        // Typesense router is handled separately; avoid treating as a view.
        operationKeys.add(lower);
        continue;
      }
      if (lower === 'create' || lower === 'update' || lower === 'delete') {
        normalized.push({ [lower]: { target: 'crud', value: lower } });
        operationKeys.add(lower);
        continue;
      }

      const viewName = resolveViewName(trimmed, viewNameLookup) ?? trimmed;
      normalized.push({ [trimmed]: { target: 'view', value: viewName } });
      operationKeys.add(trimmed.toLowerCase());
      continue;
    }

    if (typeof endpoint !== 'object') {
      continue;
    }

    const [entryKey, entryValue] = Object.entries(endpoint)[0] ?? [];
    if (!entryKey) {
      continue;
    }

    if (entryKey === 'resource' && entryValue && typeof entryValue === 'object') {
      mergeResourceMap(entryValue as Record<string, RouterResourceMapping>);
      continue;
    }

    if (entryKey === 'views' || entryKey === 'view') {
      mergeResourceMap(buildResourceMapFromSelector(entryValue, viewNameLookup, allViewNames));
      continue;
    }

    if (entryValue === null || entryValue === undefined || entryValue === true) {
      if (entryKey.toLowerCase() === 'typesense' && table.typesense) {
        operationKeys.add(entryKey.toLowerCase());
        continue;
      }
      normalized.push({ [entryKey]: { target: 'view', value: entryKey } });
      operationKeys.add(entryKey.toLowerCase());
      continue;
    }

    if (typeof entryValue === 'string') {
      const viewName = resolveViewName(entryValue, viewNameLookup) ?? entryValue;
      normalized.push({ [entryKey]: { target: 'view', value: viewName } });
      operationKeys.add(entryKey.toLowerCase());
      continue;
    }

    if (typeof entryValue === 'object' && 'target' in (entryValue as Record<string, unknown>)) {
      normalized.push({ [entryKey]: entryValue as RouterOperationConfig });
      operationKeys.add(entryKey.toLowerCase());
    }
  }

  if (resourceMap && Object.keys(resourceMap).length > 0) {
    normalized.push({ resource: resourceMap });
  }

  return normalized;
}

function parseViewsSelector(value: string): '*' | string[] | null {
  const match = value.match(/^views?\s*:\s*(.+)$/i);
  if (!match) {
    return null;
  }
  const raw = (match[1] ?? '').trim();
  if (!raw || raw === '*') {
    return '*';
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildViewNameLookup(table: TableMigrationConfig): Map<string, string> {
  const map = new Map<string, string>();
  const definitions = table.views ?? table.resources ?? [];
  for (const definition of definitions) {
    if (!definition?.name) {
      continue;
    }
    const normalized = normalizeResourceLookupKey(definition.name);
    if (!normalized) {
      continue;
    }
    if (!map.has(normalized)) {
      map.set(normalized, definition.name);
    }
  }
  return map;
}

function resolveViewName(
  value: string,
  lookup: Map<string, string>
): string | null {
  const normalized = normalizeResourceLookupKey(value);
  if (!normalized) {
    return null;
  }
  return lookup.get(normalized) ?? null;
}

function buildResourceMapFromSelector(
  selector: unknown,
  viewNameLookup: Map<string, string>,
  allViewNames: string[]
): Record<string, RouterResourceMapping> | null {
  if (selector === '*' || selector === undefined || selector === null || selector === true) {
    return buildResourceMap(allViewNames);
  }

  if (Array.isArray(selector)) {
    const names = selector.map((entry) => String(entry).trim()).filter(Boolean);
    return buildResourceMap(resolveViewNames(names, viewNameLookup));
  }

  if (typeof selector === 'string') {
    const names = selector
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    return buildResourceMap(resolveViewNames(names, viewNameLookup));
  }

  if (typeof selector === 'object') {
    const map: Record<string, RouterResourceMapping> = {};
    for (const [key, rawValue] of Object.entries(selector as Record<string, unknown>)) {
      if (!key) continue;
      if (rawValue && typeof rawValue === 'object' && 'target' in (rawValue as Record<string, unknown>)) {
        map[key] = rawValue as RouterResourceMapping;
        continue;
      }
      if (typeof rawValue === 'string') {
        const viewName = resolveViewName(rawValue, viewNameLookup) ?? rawValue;
        map[key] = { target: 'view', value: viewName };
        continue;
      }
      if (rawValue === null || rawValue === undefined || rawValue === true) {
        map[key] = { target: 'view', value: key };
      }
    }
    return Object.keys(map).length > 0 ? map : null;
  }

  return null;
}

function resolveViewNames(names: string[], lookup: Map<string, string>): string[] {
  return names.map((name) => resolveViewName(name, lookup) ?? name);
}

function buildResourceMap(viewNames: string[]): Record<string, RouterResourceMapping> {
  const map: Record<string, RouterResourceMapping> = {};
  for (const viewName of viewNames) {
    if (!viewName) continue;
    map[viewName] = { target: 'view', value: viewName };
  }
  return map;
}

function stripTypesenseResource(resourceMap: Record<string, RouterResourceMapping>): Record<string, RouterResourceMapping> {
  const out: Record<string, RouterResourceMapping> = {};
  for (const [key, value] of Object.entries(resourceMap)) {
    if (key.toLowerCase() === 'typesense') continue;
    out[key] = value;
  }
  return out;
}

type TypesenseOperation = {
  target: 'view' | 'function';
  value: string;
};

function extractTypesenseOperations(
  customOperations: Map<string, RouterOperationConfig>,
  table: TableMigrationConfig
): TypesenseOperation | null {
  const direct = Array.from(customOperations.entries()).find(
    ([key]) => key.toLowerCase() === 'typesense'
  );
  if (direct) {
    const config = direct[1];
    if (config.target === 'function') {
      return { target: 'function', value: normalizeResourceFunctionName(config.value ?? 'typesense') };
    }
    return { target: 'view', value: String(config.value ?? 'Typesense') };
  }

  const typesenseDef = table.typesense?.view;
  if (typesenseDef?.function) {
    return { target: 'function', value: normalizeResourceFunctionName(typesenseDef.function) };
  }
  if (typesenseDef?.name) {
    return { target: 'view', value: typesenseDef.name };
  }

  return null;
}

function buildTypesenseResourceSchema(identifier: string): string {
  return [
    `const ${identifier} = z.object({`,
    `  id: z.union([z.string().min(1), z.number()]),`,
    `});`,
  ].join('\n');
}

function buildTypesenseCollectionConstant(
  identifier: string,
  schema: Record<string, any> | undefined,
  collectionName?: string
): string {
  if (schema && collectionName) {
    return `const ${identifier} = collections['${collectionName}'];`;
  }
  if (!schema) {
    return `const ${identifier} = null;`;
  }
  const literal = JSON.stringify(schema, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join('\n');
  return [
    `const ${identifier} = ${literal} as const;`,
  ].join('\n');
}

function buildTypesenseRouter(
  operation: TypesenseOperation,
  resourceSchemaIdentifier: string,
  listSchemaIdentifier: string,
  countSchemaIdentifier: string,
  collectionConst: string,
  tableModel: string,
  tableNamePascal: string,
  idCast: string | null
): string {
  const listProcedure =
    operation.target === 'function'
      ? buildTypesenseFunctionListProcedure('list', listSchemaIdentifier, operation.value, tableModel)
      : buildTypesenseViewListProcedure('list', listSchemaIdentifier, buildViewIdentifier(tableNamePascal, operation.value));
  const refreshProcedure =
    operation.target === 'function'
      ? buildTypesenseFunctionRefreshProcedure(
          'refresh',
          listSchemaIdentifier,
          operation.value,
          tableModel,
          collectionConst
        )
      : buildTypesenseViewRefreshProcedure(
          'refresh',
          listSchemaIdentifier,
          buildViewIdentifier(tableNamePascal, operation.value),
          collectionConst
        );
  const countProcedure =
    operation.target === 'function'
      ? buildFunctionViewCountProcedure('count', countSchemaIdentifier, tableModel)
      : buildViewCountProcedure('count', countSchemaIdentifier, buildViewIdentifier(tableNamePascal, operation.value));

  const resourceProcedure = buildTypesenseResourceProcedure(
    'resource',
    resourceSchemaIdentifier,
    operation,
    tableModel,
    tableNamePascal,
    idCast
  );

  const collectionProcedure = buildTypesenseCollectionProcedure('collection', collectionConst);

  return [
    `  typesense: t.router({`,
    resourceProcedure,
    listProcedure,
    refreshProcedure,
    countProcedure,
    collectionProcedure,
    `  }),`,
  ].join('\n');
}

function buildTypesenseResourceProcedure(
  methodKey: string,
  schemaIdentifier: string,
  operation: TypesenseOperation,
  tableModel: string,
  tableNamePascal: string,
  idCast: string | null
): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  const lines: string[] = [];
  const idExpr = idCast ? `${idCast} $id` : '$id';
  lines.push(
    `  ${propertyKey}: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .query(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const id = input.data?.id;`,
    `      if (!id) {`,
    `        throw new Error('typesense.resource | id is required');`,
    `      }`
  );
  if (operation.target === 'function') {
    lines.push(
      `      const query = /* surql */ \``,
      `        RETURN ${operation.value}(type::record('${tableModel}', ${idExpr}));`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { id }));`,
      `      return result;`
    );
  } else {
    const viewName = buildViewIdentifier(tableNamePascal, operation.value);
    lines.push(
      `      const query = /* surql */ \``,
      `        SELECT * FROM only type::record("${viewName}", ${idExpr});`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { id }));`,
      `      return result;`
    );
  }
  lines.push(`    }),`);
  return lines.join('\n');
}

function buildTypesenseViewListProcedure(
  methodKey: string,
  schemaIdentifier: string,
  viewName: string
): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  return [
    `  ${propertyKey}: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .query(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;`,
    `      const start = typeof input.data?.start === 'number' ? input.data.start : -1;`,
    `      const params: Record<string, number> = {};`,
    `      let query = 'SELECT * FROM ${viewName}';`,
    `      if (limit >= 0) {`,
    `        query += ' LIMIT $limit';`,
    `        params.limit = limit;`,
    `      }`,
    `      if (start >= 0) {`,
    `        query += ' START $start';`,
    `        params.start = start;`,
    `      }`,
    `      query += ';';`,
    `      const result = await LRS(await dbInstance.query(/* surql */ query, params));`,
    `      return result;`,
    `    }),`,
  ].join('\n');
}

function buildTypesenseViewRefreshProcedure(
  methodKey: string,
  schemaIdentifier: string,
  viewName: string,
  collectionConst: string
): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  return [
    `  ${propertyKey}: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;`,
    `      const start = typeof input.data?.start === 'number' ? input.data.start : -1;`,
    `      const params: Record<string, number> = {};`,
    `      let query = 'SELECT * FROM ${viewName}';`,
    `      if (limit >= 0) {`,
    `        query += ' LIMIT $limit';`,
    `        params.limit = limit;`,
    `      }`,
    `      if (start >= 0) {`,
    `        query += ' START $start';`,
    `        params.start = start;`,
    `      }`,
    `      query += ';';`,
    `      const result = await LRS(await dbInstance.query(/* surql */ query, params));`,
    `      const records = Array.isArray(result) ? result : result ? [result] : [];`,
    `      const upserted = await upsertTypesenseDocuments(${collectionConst}, records, 'upsert');`,
    `      return { fetched: records.length, upserted, records };`,
    `    }),`,
  ].join('\n');
}

function buildTypesenseFunctionListProcedure(
  methodKey: string,
  schemaIdentifier: string,
  functionName: string,
  tableModel: string
): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  return [
    `  ${propertyKey}: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .query(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;`,
    `      const start = typeof input.data?.start === 'number' ? input.data.start : -1;`,
    `      const params: Record<string, number> = {};`,
      `      let query = 'LET $ids = SELECT value id FROM ${tableModel}';`,
    `      if (limit >= 0) {`,
    `        query += ' LIMIT $limit';`,
    `        params.limit = limit;`,
    `      }`,
    `      if (start >= 0) {`,
    `        query += ' START $start';`,
    `        params.start = start;`,
    `      }`,
      `      query += ';';`,
      `      query += ' LET $rids = array::map($ids, |$id| fn::ridParam("${tableModel}", $id));';`,
      `      query += ' LET $rids = array::filter($rids, |$rid| record::exists($rid));';`,
      `      query += ' RETURN array::map($rids, |$rid| ${functionName}($rid));';`,
    `      const result = await LRS(await dbInstance.query(/* surql */ query, params));`,
    `      return result;`,
    `    }),`,
  ].join('\n');
}

function buildTypesenseFunctionRefreshProcedure(
  methodKey: string,
  schemaIdentifier: string,
  functionName: string,
  tableModel: string,
  collectionConst: string
): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  return [
    `  ${propertyKey}: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;`,
    `      const start = typeof input.data?.start === 'number' ? input.data.start : -1;`,
    `      const params: Record<string, number> = {};`,
    `      let query = 'LET $ids = SELECT value id FROM ${tableModel}';`,
    `      if (limit >= 0) {`,
    `        query += ' LIMIT $limit';`,
    `        params.limit = limit;`,
    `      }`,
    `      if (start >= 0) {`,
    `        query += ' START $start';`,
    `        params.start = start;`,
    `      }`,
    `      query += ';';`,
    `      query += ' LET $rids = array::map($ids, |$id| fn::ridParam("${tableModel}", $id));';`,
    `      query += ' LET $rids = array::filter($rids, |$rid| record::exists($rid));';`,
    `      query += ' RETURN array::map($rids, |$rid| ${functionName}($rid));';`,
    `      const result = await LRS(await dbInstance.query(/* surql */ query, params));`,
    `      const records = Array.isArray(result) ? result : result ? [result] : [];`,
    `      const upserted = await upsertTypesenseDocuments(${collectionConst}, records, 'upsert');`,
    `      return { fetched: records.length, upserted, records };`,
    `    }),`,
  ].join('\n');
}

function buildTypesenseCollectionProcedure(methodKey: string, collectionConst: string): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  return [
    `  ${propertyKey}: t.procedure`,
    `    .query(async () => {`,
    `      return ${collectionConst};`,
    `    }),`,
  ].join('\n');
}

function resolveConnectorOperation(
  defaultKey: CrudOperationKind,
  connector: RouterOperationConfig | undefined,
  crud: CrudDefinition | null,
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>
): { key: CrudOperationKind; functionName: string } | null {
  if (!connector || connector.target !== 'crud') {
    return null;
  }

  const crudKey = toCrudOperationKey(connector.value, defaultKey);
  const operation = crud?.[crudKey];
  if (!isOperationEnabled(operation)) {
    return null;
  }

  const functionName = resolveCrudFunctionName(crudKey, operation, table, tablesByModel);
  return { key: crudKey, functionName };
}

function toCrudOperationKey(
  value: string | undefined,
  fallback: CrudOperationKind
): CrudOperationKind {
  if (!value) return fallback;
  switch (value.toLowerCase()) {
    case 'create':
      return 'create';
    case 'update':
      return 'update';
    case 'delete':
      return 'delete';
    default:
      return fallback;
  }
}

async function writeGeneratedIndex(
  generatedDir: string,
  routerInfos: GeneratedRouterInfo[]
): Promise<void> {
  const lines: string[] = [];

  const uniqueInfos: GeneratedRouterInfo[] = [];
  const seenKeys = new Set<string>();
  for (const info of routerInfos) {
    if (seenKeys.has(info.routerKey)) {
      console.warn(`⚠️  Skipping duplicate router key "${info.routerKey}" in generated index.`);
      continue;
    }
    seenKeys.add(info.routerKey);
    uniqueInfos.push(info);
  }

  if (uniqueInfos.length === 0) {
    lines.push(
      `export const generatedRouters = {};`,
      ''
    );
  } else {
    const importLines: string[] = [];
    for (const info of uniqueInfos) {
      importLines.push(`import { ${info.routerIdentifier} } from '${info.importPath}';`);
    }

    lines.push(...importLines, '', 'export const generatedRouters = {');
    for (const info of uniqueInfos) {
      lines.push(`  ${JSON.stringify(info.routerKey)}: ${info.routerIdentifier},`);
    }
    lines.push('};', '', ...uniqueInfos.map((info) => `export { ${info.routerIdentifier} };`), '');
  }

  await writeFile(path.join(generatedDir, 'index.ts'), lines.join('\n'), 'utf-8');
}

async function resolveCustomEndpointKeys(
  outputRoot: string,
  routerBasePath: string
): Promise<Set<string>> {
  const wrapperPath = path.join(outputRoot, `${routerBasePath}.ts`);
  const keys = new Set<string>();
  try {
    const file = await readFile(wrapperPath, 'utf-8');
    if (/\btypesensecount\b/i.test(file)) keys.add('typesensecount');
    if (/\btypesense\b/i.test(file)) keys.add('typesense');
  } catch {
    // no wrapper yet
  }
  return keys;
}

interface NormalizedField {
  name: string;
  meta: TableFieldMeta;
}

function normalizeFields(rawFields?: TableFieldEntry[]): NormalizedField[] {
  if (!rawFields) {
    return [];
  }
  return rawFields.flatMap((field) =>
    Object.entries(field)
      .filter(([, meta]) => !(meta as TableFieldMeta)?.transient)
      .map(([name, meta]) => ({ name, meta }))
  );
}

function filterInputFields(fields: NormalizedField[]): NormalizedField[] {
  return fields.filter((field) => !field.meta.ignorePayload);
}

function resolveTypesenseIdCast(
  table: TableMigrationConfig,
  fields: NormalizedField[]
): string | null {
  const idConfig = table.id;
  if (!idConfig) return null;

  const idSource = idConfig.structure ?? idConfig.source;
  if (!idSource || idSource === 'default') return null;
  if (Array.isArray(idSource)) return null;

  const field = fields.find((item) => item.name === idSource);
  if (!field) return null;

  const type = String(field.meta?.type ?? '').toLowerCase();
  if (type === 'int' || type === 'integer') return '<int>';
  if (type === 'number' || type === 'float' || type === 'decimal' || type === 'double') {
    return '<number>';
  }

  return null;
}

function buildRelationInputSchemas(
  tables: TableMigrationConfig[]
): Map<string, { createIdentifier: string; updateIdentifier: string; lines: string[] }> {
  const relations = collectRelations(tables);
  const grouped = new Map<string, NormalizedRelation[]>();

  for (const relation of relations) {
    if (relation.sourceModel !== relation.hookModel) continue;
    if (!relation.required && !relation.requiredOnHook) continue;

    const list = grouped.get(relation.hookModel) ?? [];
    if (!list.find((item) => item.payloadField === relation.payloadField)) {
      list.push(relation);
    }
    grouped.set(relation.hookModel, list);
  }

  const result = new Map<string, { createIdentifier: string; updateIdentifier: string; lines: string[] }>();
  for (const [model, items] of grouped.entries()) {
    if (!items.length) continue;
    const modelPascal = sanitizePascal(model);
    const createIdentifier = `${modelPascal}RelationCreateInput`;
    const updateIdentifier = `${modelPascal}RelationUpdateInput`;
    const lines = [
      `const ${createIdentifier} = z.object({`,
      ...buildRelationInputObject(items, true),
      `});`,
      `const ${updateIdentifier} = z.object({`,
      ...buildRelationInputObject(items, false),
      `});`,
    ];
    result.set(model, { createIdentifier, updateIdentifier, lines });
  }

  return result;
}

function buildRelationInputObject(
  relations: NormalizedRelation[],
  isCreate: boolean
): string[] {
  const lines: string[] = [];
  for (const relation of relations) {
    const field = relation.payloadField;
    const base = relation.cardinality === 'one'
      ? `z.string().min(1)`
      : `z.array(z.string())${relation.required ? '.min(1)' : ''}`;
    const schema = isCreate
      ? (relation.required ? base : `${base}.optional()`)
      : `${base}.optional()`;
    lines.push(`  ${field}: ${schema},`);
  }
  return lines;
}

function buildCreateSchema(
  identifier: string,
  schemaIdentifier: string,
  allFields: NormalizedField[],
  requiredFields: NormalizedField[],
  relationSchemaIdentifier?: string,
  includeParentId = false,
  omitKeys: string[] = [],
  extraSchemaIdentifier?: string
): string {
  const omitExpr =
    omitKeys.length > 0
      ? `${schemaIdentifier}.omit({\n${omitKeys.map((key) => `  ${key}: true,`).join('\n')}\n})`
      : schemaIdentifier;

  let baseExpr = '';
  if (allFields.length === 0) {
    baseExpr = 'z.object({})';
  } else if (requiredFields.length === 0) {
    baseExpr = `${omitExpr}.partial()`;
  } else {
    const pickBody = requiredFields
      .map((field) => `  ${field.name}: true,`)
      .join('\n');
    baseExpr = [
      `${omitExpr}.partial().merge(`,
      `  ${omitExpr}.pick({`,
      pickBody,
      `  })`,
      `)`
    ].join('\n');
  }

  let finalExpr = relationSchemaIdentifier
    ? `${baseExpr}.merge(${relationSchemaIdentifier})`
    : baseExpr;

  if (extraSchemaIdentifier) {
    finalExpr = `${finalExpr}.merge(${extraSchemaIdentifier})`;
  }

  if (includeParentId) {
    finalExpr = `${finalExpr}.merge(z.object({ parentId: z.union([z.string().min(1), z.number()]) }))`;
  }

  return `const ${identifier} = ${finalExpr};`;
}

function buildUpdateSchema(
  identifier: string,
  schemaIdentifier: string,
  relationSchemaIdentifier?: string,
  omitKeys: string[] = [],
  extraSchemaIdentifier?: string
): string {
  const omitExpr =
    omitKeys.length > 0
      ? `${schemaIdentifier}.omit({\n${omitKeys.map((key) => `  ${key}: true,`).join('\n')}\n})`
      : schemaIdentifier;
  const payloadBase = `${omitExpr}.omit({ id: true })`;
  let payloadSchema = relationSchemaIdentifier
    ? `${payloadBase}.partial().merge(${relationSchemaIdentifier})`
    : `${payloadBase}.partial()`;
  if (extraSchemaIdentifier) {
    payloadSchema = `${payloadSchema}.merge(${extraSchemaIdentifier})`;
  }
  return `const ${identifier} = z.union([\n  z.object({\n    id: z.union([z.string().min(1), z.number(), RecordID_z]),\n    payload: ${payloadSchema},\n  }),\n  z.object({\n    id: z.union([z.string().min(1), z.number(), RecordID_z]),\n  }).merge(${payloadSchema}),\n]);`;
}

function buildResourceSchema(
  schemaIdentifier: string,
  enumIdentifier: string,
  resourceMap: Record<string, any>
): string {
  const keys = Object.keys(resourceMap);
  const enumDefinition = `const ${enumIdentifier} = z.enum([${keys
    .map((key) => `'${key}'`)
    .join(', ')}]);`;

  const selectorLine =
    keys.length > 0 ? `  key: ${enumIdentifier}.optional(),` : `  key: z.string().optional(),`;

  return [
    keys.length > 0 ? enumDefinition : `const ${enumIdentifier} = z.enum([]);`,
    `const ${schemaIdentifier} = z.object({`,
    `  id: z.union([z.string().min(1), z.number(), z.object({ tb: z.string(), id: z.any() }).passthrough()]),`,
    selectorLine,
    `  resource: z.string().min(1).optional(),`,
    `}).refine((value) => Boolean(value.key ?? value.resource), {`,
    `  message: 'A resource key or name is required',`,
    `  path: ['resource'],`,
    `});`,
  ].join('\n');
}

function buildTaxonomyRouters(
  table: TableMigrationConfig,
  tableNamePascal: string,
  tableModel: string
): { lines: string[]; entries: string[] } {
  const taxonomies = table.taxonomies ?? [];
  if (taxonomies.length === 0) return { lines: [], entries: [] };

  const lines: string[] = [];
  const entries: string[] = [];

  for (const taxonomy of taxonomies) {
    const key = taxonomy.key;
    if (!key) continue;

    const keyPascal = sanitizePascal(key);
    const keyCamel = sanitizeCamel(key);
    const prefix = `${tableNamePascal}${keyPascal}`;

    const taxonomyPayloadSchema = `${prefix}TaxonomyPayload`;
    const termPayloadSchema = `${prefix}TermPayload`;
    const termSchema = `${prefix}TermInput`;
    const attachSchema = `${prefix}AttachInput`;
    const idSchema = `${prefix}IdInput`;
    const emptySchema = `${prefix}EmptyInput`;
    const routerIdentifier = `${prefix}Router`;

    const fnCreate = taxonomy.functions?.createTaxonomy ?? `create${prefix}Taxonomy`;
    const fnAdd = taxonomy.functions?.addTerm ?? `add${prefix}Term`;
    const fnRemove = taxonomy.functions?.removeTerm ?? `remove${prefix}Term`;
    const fnAttach = taxonomy.functions?.attachTerm ?? `attach${prefix}Term`;
    const fnDetach = taxonomy.functions?.detachTerm ?? `detach${prefix}Term`;
    const fnGetModel = taxonomy.functions?.getModelTerms ?? `get${prefix}Terms`;
    const fnGetTable = taxonomy.functions?.getTableTerms ?? `get${prefix}s`;

    lines.push(
      `const ${taxonomyPayloadSchema} = z.record(z.string(), z.any());`,
      `const ${termPayloadSchema} = z.union([z.string(), z.record(z.string(), z.any())]);`,
      `const ${termSchema} = z.any();`,
      `const ${attachSchema} = z.object({ id: z.union([z.string().min(1), z.number(), RecordID_z]), term: z.any() });`,
      `const ${idSchema} = z.object({ id: z.union([z.string().min(1), z.number(), RecordID_z]) });`,
      `const ${emptySchema} = z.object({}).optional();`,
      '',
      `const ${routerIdentifier} = t.router({`,
      `  createTaxonomy: t.procedure`,
      `    .input(RequestSchema(${taxonomyPayloadSchema}))`,
      `    .mutation(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const payload = input.data;`,
      `      if (!payload) {`,
      `        throw new Error('${prefix} taxonomy payload is required');`,
      `      }`,
      `      const query = /* surql */ \``,
      `        RETURN fn::${fnCreate}($payload);`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { payload }));`,
      `      return result;`,
      `    }),`,
      `  addTerm: t.procedure`,
      `    .input(RequestSchema(${termPayloadSchema}))`,
      `    .mutation(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const payload = input.data;`,
      `      if (!payload) {`,
      `        throw new Error('${prefix} term payload is required');`,
      `      }`,
      `      const query = /* surql */ \``,
      `        RETURN fn::${fnAdd}($payload);`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { payload }));`,
      `      return result;`,
      `    }),`,
      `  removeTerm: t.procedure`,
      `    .input(RequestSchema(${termSchema}))`,
      `    .mutation(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const term = input.data;`,
      `      if (!term) {`,
      `        throw new Error('${prefix} term is required');`,
      `      }`,
      `      const query = /* surql */ \``,
      `        RETURN fn::${fnRemove}($term);`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { term }));`,
      `      return result;`,
      `    }),`,
      `  attach: t.procedure`,
      `    .input(RequestSchema(${attachSchema}))`,
      `    .mutation(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const { id, term } = input.data || { id: undefined, term: undefined };`,
      `      if (!id || !term) {`,
        `        throw new Error('${prefix} attach requires id and term');`,
      `      }`,
      `      let resolvedId: any = id;`,
      `      if (resolvedId && typeof resolvedId === 'object') {`,
      `        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;`,
      `      }`,
      `      if (typeof resolvedId === 'string') {`,
      `        const trimmed = resolvedId.trim();`,
      `        const asNumber = Number(trimmed);`,
      `        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;`,
      `      }`,
      `      const query = /* surql */ \``,
      `        LET $rid = type::record('${tableModel}', $id);`,
      `        RETURN fn::${fnAttach}($rid, $term);`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { id: resolvedId, term }));`,
      `      return result;`,
      `    }),`,
      `  detach: t.procedure`,
      `    .input(RequestSchema(${attachSchema}))`,
      `    .mutation(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const { id, term } = input.data || { id: undefined, term: undefined };`,
      `      if (!id || !term) {`,
        `        throw new Error('${prefix} detach requires id and term');`,
      `      }`,
      `      let resolvedId: any = id;`,
      `      if (resolvedId && typeof resolvedId === 'object') {`,
      `        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;`,
      `      }`,
      `      if (typeof resolvedId === 'string') {`,
      `        const trimmed = resolvedId.trim();`,
      `        const asNumber = Number(trimmed);`,
      `        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;`,
      `      }`,
      `      const query = /* surql */ \``,
      `        LET $rid = type::record('${tableModel}', $id);`,
      `        RETURN fn::${fnDetach}($rid, $term);`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { id: resolvedId, term }));`,
      `      return result;`,
      `    }),`,
      `  getTerms: t.procedure`,
      `    .input(RequestSchema(${emptySchema}))`,
      `    .query(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const query = /* surql */ \``,
      `        RETURN fn::${fnGetModel}();`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query));`,
      `      return result;`,
      `    }),`,
      `  getRecordTerms: t.procedure`,
      `    .input(RequestSchema(${idSchema}))`,
      `    .query(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const { id } = input.data || { id: undefined };`,
      `      if (!id) {`,
      `        throw new Error('${prefix} getRecordTerms requires id');`,
      `      }`,
      `      let resolvedId: any = id;`,
      `      if (resolvedId && typeof resolvedId === 'object') {`,
      `        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;`,
      `      }`,
      `      if (typeof resolvedId === 'string') {`,
      `        const trimmed = resolvedId.trim();`,
      `        const asNumber = Number(trimmed);`,
      `        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;`,
      `      }`,
      `      const query = /* surql */ \``,
      `        LET $rid = type::record('${tableModel}', $id);`,
      `        RETURN fn::${fnGetTable}($rid);`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { id: resolvedId }));`,
      `      return result;`,
      `    }),`,
      `});`,
      ''
    );

    entries.push(`  ${keyCamel}: ${routerIdentifier},`);
  }

  return { lines, entries };
}

function buildCreateProcedure(
  schemaIdentifier: string,
  routerKey: string,
  functionName: string,
  parentModel?: string
): string {
  const needsParent = Boolean(parentModel);
  return [
    `  create: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const payload = input.data;`,
    `      if (!payload${needsParent ? ' || !payload.parentId' : ''}) {`,
    needsParent
      ? `        throw new Error('${capitalize(routerKey)} create payload is required (parentId missing)');`
      : `        throw new Error('${capitalize(routerKey)} create payload is required');`,
    `      }`,
    `      const query = /* surql */ \``,
    needsParent
      ? `        LET $parent = type::record('${parentModel}', $parentId);\n        LET $payload = fn::objectRemove($payload, ["parentId"]);\n        RETURN fn::${functionName}($parent, $payload);`
      : `        RETURN fn::${functionName}($payload);`,
    `      \`;`,
    needsParent
      ? `      const result = await LRS(await dbInstance.query(query, { payload, parentId: payload.parentId }));`
      : `      const result = await LRS(await dbInstance.query(query, { payload }));`,
    `      return result;`,
    `    }),`,
  ].join('\n');
}

function buildUpdateProcedure(
  schemaIdentifier: string,
  functionName: string,
  tableModel: string
): string {
  return [
    `  update: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const data = input.data || {};`,
    `      let { id } = data as any;`,
    `      let payload = (data as any).payload;`,
    `      if (!payload) {`,
    `        const { id: _id, payload: _payload, ...rest } = data as any;`,
    `        payload = rest;`,
    `      }`,
    `      if (!id || !payload || Object.keys(payload).length === 0) {`,
    `        throw new Error('${functionName} requires an id and payload');`,
    `      }`,
    `      if (id && typeof id === 'object') {`,
    `        id = (id as any).id ?? (id as any).value ?? id;`,
    `      }`,
    `      if (typeof id === 'string') {`,
    `        const trimmed = id.trim();`,
    `        const asNumber = Number(trimmed);`,
    `        id = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;`,
    `      }`,
      `      const query = /* surql */ \``,
      `        RETURN fn::${functionName}($id, $payload);`,
      `      \`;`,
    `      const result = await LRS(await dbInstance.query(query, { id, payload }));`,
    `      return result;`,
    `    }),`,
  ].join('\n');
}

function buildDeleteProcedure(
  schemaIdentifier: string,
  functionName: string,
  tableModel: string
): string {
  return [
    `  delete: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .mutation(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      let id = input.data?.id;`,
    `      if (!id) {`,
    `        throw new Error('${functionName} requires an id');`,
    `      }`,
    `      if (id && typeof id === 'object') {`,
    `        id = (id as any).id ?? (id as any).value ?? id;`,
    `      }`,
    `      if (typeof id === 'string') {`,
    `        const trimmed = id.trim();`,
    `        const asNumber = Number(trimmed);`,
    `        id = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;`,
    `      }`,
      `      const query = /* surql */ \``,
      `        RETURN fn::${functionName}($id);`,
      `      \`;`,
    `      const result = await LRS(await dbInstance.query(query, { id }));`,
    `      return result;`,
    `    }),`,
  ].join('\n');
}

function buildResourceProcedure(
  schemaIdentifier: string,
  enumIdentifier: string,
  tableNamePascal: string,
  tableModel: string,
  resourceMap: Record<string, RouterResourceMapping>,
  resourceDefinitions: ResourceDefinition[]
): string {
  const definitionViewMap = buildResourceDefinitionViewMap(tableNamePascal, resourceDefinitions);
  const entries: ResourceCaseEntry[] = Object.entries(resourceMap).map(([key, mapping]) => ({
    key,
    mapping,
    target: resolveResourceTarget(tableNamePascal, key, mapping, definitionViewMap, tableModel),
  }));

  const selectorMap = buildResourceSelectorMap(entries, tableNamePascal);
  const selectorMapLines = Object.entries(selectorMap).map(
    ([normalized, canonical]) => `  ${JSON.stringify(normalized)}: ${JSON.stringify(canonical)},`
  );

  const selectorMapBlock =
    selectorMapLines.length > 0
      ? ['const resourceSelectorMap: Record<string, string> = {', ...selectorMapLines, '};']
      : ['const resourceSelectorMap: Record<string, string> = {};'];

  const cases = entries.map(({ key, target }) => {
    const assignment =
      target.kind === 'view'
        ? `        resourceView = ${JSON.stringify(target.identifier)};\n        resourceReturnId = '${target.returnId}';\n        resourceBaseModel = '${target.tableModel}';`
        : `        resourceFn = ${JSON.stringify(target.identifier)};`;
    return [`      case '${key}':`, assignment, `        break;`].join('\n');
  });

  const defaultCase = `      default:\n        throw new Error(\`Unsupported resource key: \${resolvedKey}\`);\n`;

  return [
    `  resource: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .query(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const normalizeResourceSelector = (value: string): string =>`,
    `        value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();`,
    ...selectorMapBlock.map((line) => `      ${line}`),
    `      const { id, key, resource } = input.data || { id: undefined, key: undefined, resource: undefined };`,
    `      if (!id) {`,
    `        throw new Error('${tableNamePascal} resource requires an id and resource key');`,
    `      }`,
    `      let resolvedId: any = id;`,
    `      if (resolvedId && typeof resolvedId === 'object') {`,
    `        resolvedId = (resolvedId as any).id ?? (resolvedId as any).value ?? resolvedId;`,
    `      }`,
    `      if (typeof resolvedId === 'string') {`,
    `        const trimmed = resolvedId.trim();`,
    `        const asNumber = Number(trimmed);`,
    `        resolvedId = trimmed !== '' && !Number.isNaN(asNumber) ? asNumber : trimmed;`,
    `      }`,
    `      const selector = resource ?? key;`,
    `      if (!selector) {`,
    `        throw new Error('${tableNamePascal} resource requires an id and resource key');`,
    `      }`,
    `      const normalizedSelector = normalizeResourceSelector(selector);`,
    `      const resolvedKey = resourceSelectorMap[normalizedSelector];`,
    `      if (!resolvedKey) {`,
    `        throw new Error(\`Unsupported resource key: \${selector}\`);`,
    `      }`,
    `      let resourceFn: string | null = null;`,
    `      let resourceView: string | null = null;`,
    `      let resourceReturnId: 'record' | 'view' = 'record';`,
    `      let resourceBaseModel: string = '${tableModel}';`,
    `      switch (resolvedKey) {`,
    cases.join('\n'),
    defaultCase,
    `      }`,
    `      if (resourceView) {`,
    `        const selectIdClause = resourceReturnId === 'record'`,
    `          ? ',(type::record("${tableModel}", record::id($this.id))) as id'`,
    `          : '';`,
    `        const query = /* surql */ \``,
    `          SELECT * ${'${selectIdClause}'} FROM only type::record("${'${resourceView}'}", $id);`,
    `        \`;`,
    `        const result = await LRS(await dbInstance.query(query, { id: resolvedId }));`,
    `        return result;`,
    `      }`,
    `      if (resourceFn) {`,
    `        const query = /* surql */ \``,
    `          LET $rid = type::record('${tableModel}', $id);`,
    `          RETURN ${'${resourceFn}'}($rid);`,
    `        \`;`,
    `        const result = await LRS(await dbInstance.query(query, { id: resolvedId }));`,
    `        return result;`,
    `      }`,
    `      throw new Error(\`Unsupported resource key: \${resolvedKey}\`);`,
    `    }),`,
  ].join('\n');
}

function buildViewInputSchema(identifier: string): string {
  return [
    `const ${identifier} = z.object({`,
    `  limit: z.number().int().min(-1).optional(),`,
    `  start: z.number().int().min(-1).optional(),`,
    `});`,
  ].join('\n');
}

function buildViewCountInputSchema(identifier: string): string {
  return [
    `const ${identifier} = z.object({});`,
  ].join('\n');
}

function buildRelationRouters(
  tableModel: string,
  tableNamePascal: string,
  relationsByModel: Map<string, NormalizedRelation[]>
): { lines: string[]; entries: string[] } {
  const relations = (relationsByModel.get(tableModel) ?? []).filter(
    (relation) => relation.functionsEnabled
  );
  if (relations.length === 0) return { lines: [], entries: [] };

  const lines: string[] = [];
  const entries: string[] = [];
  const groupRouterIdentifier = `${tableNamePascal}RelationsRouter`;
  const groupEntries: string[] = [];
  const baseIdSchema = `z.union([z.string().min(1), z.number(), RecordID_z])`;
  const seen = new Set<string>();
  const seenPrefixes = new Set<string>();

  for (const relation of relations) {
    const modelPair = [relation.leftModel, relation.rightModel].sort().join(':');
    const dedupeKey = `${relation.edge}:${modelPair}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const isLeft = relation.leftModel === tableModel;
    const otherLabel = isLeft ? relation.rightLabel : relation.leftLabel;
    const otherKey = sanitizeCamel(otherLabel);
    const prefix = `${tableNamePascal}${otherLabel}Relation`;
    if (seenPrefixes.has(prefix)) {
      // Avoid duplicate symbols when the same relation is declared on both sides
      // or multiple relations share the same label in this model.
      continue;
    }
    seenPrefixes.add(prefix);
    const attachSchema = `${prefix}AttachInput`;
    const listSchema = `${prefix}ListInput`;
    const routerIdentifier = `${prefix}Router`;

    const idSchema = isLeft
      ? `z.union([${baseIdSchema}, z.array(${baseIdSchema})])`
      : baseIdSchema;
    const targetSchema = isLeft
      ? baseIdSchema
      : `z.union([${baseIdSchema}, z.array(${baseIdSchema})])`;

    const fnAttach = relation.functions.attach;
    const fnDetach = relation.functions.detach;
    const fnList = isLeft ? relation.functions.getRight : relation.functions.getLeft;

    lines.push(
      `const ${attachSchema} = z.object({ id: ${idSchema}, target: ${targetSchema} });`,
      `const ${listSchema} = z.object({ id: ${baseIdSchema} });`,
      '',
      `const ${routerIdentifier} = t.router({`,
      `  attach: t.procedure`,
      `    .input(RequestSchema(${attachSchema}))`,
      `    .mutation(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const { id, target } = input.data || { id: undefined, target: undefined };`,
      `      if (!id || !target) {`,
      `        throw new Error('${prefix} attach requires id and target');`,
      `      }`,
      `      const query = /* surql */ \``,
      isLeft
        ? `        RETURN fn::${fnAttach}($target, $id);`
        : `        RETURN fn::${fnAttach}($id, $target);`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { id, target }));`,
      `      return result;`,
      `    }),`,
      `  detach: t.procedure`,
      `    .input(RequestSchema(${attachSchema}))`,
      `    .mutation(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const { id, target } = input.data || { id: undefined, target: undefined };`,
      `      if (!id || !target) {`,
      `        throw new Error('${prefix} detach requires id and target');`,
      `      }`,
      `      const query = /* surql */ \``,
      isLeft
        ? `        RETURN fn::${fnDetach}($target, $id);`
        : `        RETURN fn::${fnDetach}($id, $target);`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { id, target }));`,
      `      return result;`,
      `    }),`,
      `  list: t.procedure`,
      `    .input(RequestSchema(${listSchema}))`,
      `    .query(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const { id } = input.data || { id: undefined };`,
      `      if (!id) {`,
      `        throw new Error('${prefix} list requires id');`,
      `      }`,
      `      const query = /* surql */ \``,
      `        RETURN fn::${fnList}($id);`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { id }));`,
      `      return result;`,
      `    }),`,
      `});`,
      ''
    );

    groupEntries.push(`  ${otherKey}: ${routerIdentifier},`);
  }

  lines.push(
    `const ${groupRouterIdentifier} = t.router({`,
    ...groupEntries,
    `});`,
    ''
  );

  entries.push(`  relations: ${groupRouterIdentifier},`);

  return { lines, entries };
}

function buildParentSubtableRouters(
  tableModel: string,
  tableNamePascal: string,
  subtablesByParent: Map<string, TableMigrationConfig[]>,
  routerKeyByTable: Map<TableMigrationConfig, string>,
  tablesByModel: Map<string, TableMigrationConfig>
): { lines: string[]; entries: string[] } {
  const subtables = subtablesByParent.get(tableModel) ?? [];
  if (subtables.length === 0) return { lines: [], entries: [] };

  const lines: string[] = [];
  const entries: string[] = [];
  const groupRouterIdentifier = `${tableNamePascal}SubtablesRouter`;
  const groupEntries: string[] = [];
  const baseIdSchema = `z.union([z.string().min(1), z.number(), RecordID_z])`;

  for (const child of subtables) {
    const childModel = child.table?.model;
    if (!childModel) continue;
    const childName = child.name || childModel;
    const childKey = routerKeyByTable.get(child) ?? sanitizeCamel(childName);
    const childLabel = sanitizePascal(childName);
    const prefix = `${tableNamePascal}${childLabel}Subtable`;
    const routerIdentifier = `${prefix}Router`;
    const tableType = child.tableType === 'submany' ? 'submany' : 'subsingle';
    const childCrud = normalizeCrudConfig(child);
    const createEnabled = isOperationEnabled(childCrud?.create);
    const updateEnabled = isOperationEnabled(childCrud?.update);
    const deleteEnabled = isOperationEnabled(childCrud?.delete);
    const childFields = normalizeFields(child.fields ?? []);
    const allowedSortFields = Array.from(
      new Set(['id', ...childFields.map((field) => field.name)])
    );
    const defaultSortField = allowedSortFields.includes('order') ? 'order' : undefined;

    const createSchema = `${prefix}CreateInput`;
    const updateSchema = `${prefix}UpdateInput`;
    const deleteSchema = `${prefix}DeleteInput`;
    const getSchema = `${prefix}GetInput`;
    const listSchema = `${prefix}ListInput`;

    if (createEnabled) {
      lines.push(
        `const ${createSchema} = z.object({`,
        `  id: ${baseIdSchema},`,
        `  payload: z.record(z.string(), z.any()),`,
        `});`
      );
    }
    if (updateEnabled) {
      lines.push(
        `const ${updateSchema} = z.object({`,
        `  id: ${baseIdSchema},`,
        `  payload: z.record(z.string(), z.any()),`,
        `});`
      );
    }
    if (deleteEnabled) {
      lines.push(
        `const ${deleteSchema} = z.object({`,
        `  id: ${baseIdSchema},`,
        `});`
      );
    }
    lines.push(
      `const ${getSchema} = z.object({`,
      `  id: ${baseIdSchema},`,
      `});`
    );
    if (tableType === 'submany') {
      lines.push(
        `const ${listSchema} = z.object({`,
        `  id: ${baseIdSchema},`,
        `  start: z.number().optional(),`,
        `  limit: z.number().optional(),`,
        `  sortBy: z.string().optional(),`,
        `  sortDir: z.enum(['asc', 'desc']).optional(),`,
        `  filters: z.record(z.string(), z.any()).optional(),`,
        `});`
      );
    }

    const createFn = createEnabled
      ? resolveCrudFunctionName('create', childCrud?.create, child, tablesByModel)
      : null;
    const updateFn = updateEnabled
      ? resolveCrudFunctionName('update', childCrud?.update, child, tablesByModel)
      : null;
    const deleteFn = deleteEnabled
      ? resolveCrudFunctionName('delete', childCrud?.delete, child, tablesByModel)
      : null;

    const edgeTable = resolveSubtableEdgeName(child, tableModel, childModel, tablesByModel);

    lines.push('', `const ${routerIdentifier} = t.router({`);

    if (createEnabled && createFn) {
      lines.push(
        `  create: t.procedure`,
        `    .input(RequestSchema(${createSchema}))`,
        `    .mutation(async ({ input, ctx }) => {`,
        `      const { db, LRS } = ctx;`,
        `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
        `        ? await (ctx as any).$api.DB(input.instance as any)`,
        `        : db;`,
        `      const { id, payload } = input.data || { id: undefined, payload: undefined };`,
        `      if (!id || !payload) {`,
        `        throw new Error('${prefix} create requires id and payload');`,
        `      }`,
        `      const query = /* surql */ \``,
        `        LET $parent = fn::ridParam('${tableModel}', $id);`,
        `        RETURN fn::${createFn}($parent, $payload);`,
        `      \`;`,
        `      const result = await LRS(await dbInstance.query(query, { id, payload }));`,
        `      return result;`,
        `    }),`
      );
    }

    if (updateEnabled && updateFn) {
      lines.push(
        `  update: t.procedure`,
        `    .input(RequestSchema(${updateSchema}))`,
        `    .mutation(async ({ input, ctx }) => {`,
        `      const { db, LRS } = ctx;`,
        `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
        `        ? await (ctx as any).$api.DB(input.instance as any)`,
        `        : db;`,
        `      const { id, payload } = input.data || { id: undefined, payload: undefined };`,
        `      if (!id || !payload) {`,
        `        throw new Error('${prefix} update requires id and payload');`,
        `      }`,
        `      const query = /* surql */ \``,
        `        RETURN fn::${updateFn}($id, $payload);`,
        `      \`;`,
        `      const result = await LRS(await dbInstance.query(query, { id, payload }));`,
        `      return result;`,
        `    }),`
      );
    }

    if (deleteEnabled && deleteFn) {
      lines.push(
        `  delete: t.procedure`,
        `    .input(RequestSchema(${deleteSchema}))`,
        `    .mutation(async ({ input, ctx }) => {`,
        `      const { db, LRS } = ctx;`,
        `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
        `        ? await (ctx as any).$api.DB(input.instance as any)`,
        `        : db;`,
        `      const { id } = input.data || { id: undefined };`,
        `      if (!id) {`,
        `        throw new Error('${prefix} delete requires id');`,
        `      }`,
        `      const query = /* surql */ \``,
        `        RETURN fn::${deleteFn}($id);`,
        `      \`;`,
        `      const result = await LRS(await dbInstance.query(query, { id }));`,
        `      return result;`,
        `    }),`
      );
    }

    lines.push(
      `  get: t.procedure`,
      `    .input(RequestSchema(${getSchema}))`,
      `    .query(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const raw = input.data?.id;`,
      `      if (!raw) {`,
      `        throw new Error('subtable.get | id is required');`,
      `      }`,
      `      const query = /* surql */ \``,
      `        LET $subId = if type::is_record($id) {`,
      `          return record::id($id);`,
      `        } else if type::is_object($id) && $id.tb && $id.id {`,
      `          return $id.id;`,
      `        } else if type::is_string($id) {`,
      `          let $parts = string::split($id, ":");`,
      `          if array::len($parts) > 1 {`,
      `            return $parts[array::len($parts) - 1];`,
      `          };`,
      `          return $id;`,
      `        } else {`,
      `          return $id;`,
      `        };`,
      `        LET $RID = if type::is_string($subId) && string::matches($subId, '^-?\\\\d+$') {`,
      `          return type::record("${childModel}", <int> $subId);`,
      `        } else {`,
      `          return type::record("${childModel}", $subId);`,
      `        };`,
      `        RETURN SELECT * FROM only $RID;`,
      `      \`;`,
      `      const result = await LRS(await dbInstance.query(query, { id: raw }));`,
      `      return result;`,
      `    }),`
    );

    if (tableType === 'submany') {
      lines.push(
        `  list: t.procedure`,
        `    .input(RequestSchema(${listSchema}))`,
        `    .query(async ({ input, ctx }) => {`,
        `      const { db, LRS } = ctx;`,
        `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
        `        ? await (ctx as any).$api.DB(input.instance as any)`,
        `        : db;`,
        `      const id = input.data?.id;`,
        `      if (!id) {`,
        `        throw new Error('subtable.list | id is required');`,
        `      }`,
        `      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;`,
        `      const start = typeof input.data?.start === 'number' ? input.data.start : -1;`,
        `      const params: Record<string, any> = { id };`,
        `      const allowedFields = new Set(${JSON.stringify(allowedSortFields)});`,
        `      const filters = input.data?.filters ?? {};`,
        `      const whereParts: string[] = [];`,
        `      for (const [key, value] of Object.entries(filters)) {`,
        `        if (value === undefined) continue;`,
        `        if (!allowedFields.has(key)) {`,
        `          throw new Error(\`subtable.list | unsupported filter: ${'${'}key}\`);`,
        `        }`,
        `        const paramKey = \`filter_${'${'}key.replace(/[^a-zA-Z0-9_]/g, "_")}\`;`,
        `        whereParts.push(\`${'${'}key} = $${'${'}paramKey}\`);`,
        `        params[paramKey] = value;`,
        `      }`,
        `      const sortBy = input.data?.sortBy ?? ${defaultSortField ? `'${defaultSortField}'` : 'undefined'};`,
        `      const sortDir = (input.data?.sortDir ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';`,
        `      if (sortBy && !allowedFields.has(sortBy)) {`,
        `        throw new Error(\`subtable.list | unsupported sort field: ${'${'}sortBy}\`);`,
        `      }`,
        `      let query = /* surql */ \``,
        `        LET $RID = fn::ridParam("${tableModel}", $id);`,
        `        RETURN SELECT * FROM ${childModel} WHERE <-( ${edgeTable} WHERE in = $RID );`,
        `      \`;`,
        `      if (whereParts.length > 0) {`,
        `        query += ' AND ' + whereParts.join(' AND ');`,
        `      }`,
        `      if (sortBy) {`,
        `        query += \` ORDER BY ${'${'}sortBy} ${'${'}sortDir}\`;`,
        `      }`,
        `      if (limit >= 0) {`,
        `        query += ' LIMIT $limit';`,
        `        params.limit = limit;`,
        `      }`,
        `      if (start >= 0) {`,
        `        query += ' START $start';`,
        `        params.start = start;`,
        `      }`,
        `      query += ';';`,
        `      const result = await LRS(await dbInstance.query(query, params));`,
        `      return result;`,
        `    }),`
      );
    }

    lines.push(`});`, '');
    groupEntries.push(`  ${childKey}: ${routerIdentifier},`);
  }

  lines.push(
    `const ${groupRouterIdentifier} = t.router({`,
    ...groupEntries,
    `});`,
    ''
  );

  entries.push(`  subtables: ${groupRouterIdentifier},`);

  return { lines, entries };
}

function buildSubtableProcedures(
  table: TableMigrationConfig,
  tableNamePascal: string,
  tableModel: string,
  customEndpointKeys: Set<string>,
  tablesByModel: Map<string, TableMigrationConfig>
): { schemaLines: string[]; routerLines: string[] } {
  if (!isSubTable(table)) {
    return { schemaLines: [], routerLines: [] };
  }

  const parentModel = getParentModelValue(table);
  if (!parentModel) {
    return { schemaLines: [], routerLines: [] };
  }

  const tableType = table.tableType === 'submany' ? 'submany' : 'subsingle';
  const tableFields = normalizeFields(table.fields ?? []);
  const allowedSortFields = Array.from(
    new Set(['id', ...tableFields.map((field) => field.name)])
  );
  const defaultSortField = allowedSortFields.includes('order') ? 'order' : undefined;
  const schemaLines: string[] = [];
  const routerLines: string[] = [];

  const buildSubIdResolver = () => [
    `      const raw = input.data?.id;`,
    `      if (!raw) {`,
    `        throw new Error('subtable.get | id is required');`,
    `      }`,
    `      const query = /* surql */ \``,
    `        LET $subId = if type::is_record($id) {`,
    `          return record::id($id);`,
    `        } else if type::is_object($id) && $id.tb && $id.id {`,
    `          return $id.id;`,
    `        } else if type::is_string($id) {`,
    `          let $parts = string::split($id, ":");`,
    `          if array::len($parts) > 1 {`,
    `            return $parts[array::len($parts) - 1];`,
    `          };`,
    `          return $id;`,
    `        } else {`,
    `          return $id;`,
    `        };`,
    `        LET $RID = if type::is_string($subId) && string::matches($subId, '^-?\\\\d+$') {`,
    `          return type::record("${tableModel}", <int> $subId);`,
    `        } else {`,
    `          return type::record("${tableModel}", $subId);`,
    `        };`,
    `        RETURN SELECT * FROM only $RID;`,
    `      \`;`,
  ];

  if (!customEndpointKeys.has('get')) {
    const getSchemaIdentifier = `${tableNamePascal}SubtableGetInput`;
    schemaLines.push(
      `const ${getSchemaIdentifier} = z.object({`,
      `  id: z.union([z.string().min(1), z.number(), RecordID_z]),`,
      `});`
    );

    routerLines.push(
      `  get: t.procedure`,
      `    .input(RequestSchema(${getSchemaIdentifier}))`,
      `    .query(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      ...buildSubIdResolver(),
      `      const result = await LRS(await dbInstance.query(query, { id: raw }));`,
      `      return result;`,
      `    }),`
    );
  }

  if (tableType === 'submany' && !customEndpointKeys.has('list')) {
    const listSchemaIdentifier = `${tableNamePascal}SubtableListInput`;
    schemaLines.push(
      `const ${listSchemaIdentifier} = z.object({`,
      `  id: z.union([z.string().min(1), z.number(), RecordID_z]),`,
      `  start: z.number().optional(),`,
      `  limit: z.number().optional(),`,
      `  sortBy: z.string().optional(),`,
      `  sortDir: z.enum(['asc', 'desc']).optional(),`,
      `  filters: z.record(z.string(), z.any()).optional(),`,
      `});`
    );

    const edgeTable = resolveSubtableEdgeName(table, parentModel, tableModel, tablesByModel);
    routerLines.push(
      `  list: t.procedure`,
      `    .input(RequestSchema(${listSchemaIdentifier}))`,
      `    .query(async ({ input, ctx }) => {`,
      `      const { db, LRS } = ctx;`,
      `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
      `        ? await (ctx as any).$api.DB(input.instance as any)`,
      `        : db;`,
      `      const id = input.data?.id;`,
      `      if (!id) {`,
      `        throw new Error('subtable.list | id is required');`,
      `      }`,
      `      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;`,
      `      const start = typeof input.data?.start === 'number' ? input.data.start : -1;`,
      `      const params: Record<string, any> = { id };`,
      `      const allowedFields = new Set(${JSON.stringify(allowedSortFields)});`,
      `      const filters = input.data?.filters ?? {};`,
      `      const whereParts: string[] = [];`,
      `      for (const [key, value] of Object.entries(filters)) {`,
      `        if (value === undefined) continue;`,
      `        if (!allowedFields.has(key)) {`,
      `          throw new Error(\`subtable.list | unsupported filter: ${'${'}key}\`);`,
      `        }`,
      `        const paramKey = \`filter_${'${'}key.replace(/[^a-zA-Z0-9_]/g, "_")}\`;`,
      `        whereParts.push(\`${'${'}key} = $${'${'}paramKey}\`);`,
      `        params[paramKey] = value;`,
      `      }`,
      `      const sortBy = input.data?.sortBy ?? ${defaultSortField ? `'${defaultSortField}'` : 'undefined'};`,
      `      const sortDir = (input.data?.sortDir ?? 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';`,
      `      if (sortBy && !allowedFields.has(sortBy)) {`,
      `        throw new Error(\`subtable.list | unsupported sort field: ${'${'}sortBy}\`);`,
      `      }`,
      `      let query = /* surql */ \``,
      `        LET $RID = fn::ridParam("${parentModel}", $id);`,
      `        RETURN SELECT * FROM ${tableModel} WHERE <-( ${edgeTable} WHERE in = $RID );`,
      `      \`;`,
      `      if (whereParts.length > 0) {`,
      `        query += ' AND ' + whereParts.join(' AND ');`,
      `      }`,
      `      if (sortBy) {`,
      `        query += \` ORDER BY ${'${'}sortBy} ${'${'}sortDir}\`;`,
      `      }`,
      `      if (limit >= 0) {`,
      `        query += ' LIMIT $limit';`,
      `        params.limit = limit;`,
      `      }`,
      `      if (start >= 0) {`,
      `        query += ' START $start';`,
      `        params.start = start;`,
      `      }`,
      `      query += ';';`,
      `      const result = await LRS(await dbInstance.query(query, params));`,
      `      return result;`,
      `    }),`
    );
  }

  return { schemaLines, routerLines };
}

function resolveSubtableEdgeName(
  table: TableMigrationConfig,
  parentModel: string,
  tableModel: string,
  tablesByModel: Map<string, TableMigrationConfig>
): string {
  const belongs = table.edges?.belongs ?? [];
  const match = belongs.find(
    (edge) => edge?.in === parentModel && edge?.out === tableModel
  );
  if (match?.table) {
    return match.table;
  }
  const relationMatch =
    table.relations?.find(
      (rel) => rel.edge && rel.left === parentModel && rel.right === tableModel
    ) ?? null;
  if (relationMatch?.edge) {
    return relationMatch.edge;
  }
  const parentTable = tablesByModel.get(parentModel);
  const parentEdgeMatch = parentTable?.edges?.has?.find(
    (edge) => edge?.out === tableModel && edge?.table
  );
  if (parentEdgeMatch?.table) {
    return parentEdgeMatch.table;
  }
  const parentRelationMatch =
    parentTable?.relations?.find(
      (rel) => rel.edge && rel.left === parentModel && rel.right === tableModel
    ) ?? null;
  if (parentRelationMatch?.edge) {
    return parentRelationMatch.edge;
  }
  return defaultEdgeTable(parentModel, tableModel);
}

function defaultEdgeTable(inModel: string, outModel: string): string {
  return `rel_${sanitizeIdentifier(inModel)}_${sanitizeIdentifier(outModel)}`;
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized.length > 0 ? sanitized : 'relation';
}

function buildViewProcedure(
  methodKey: string,
  schemaIdentifier: string,
  viewName: string
): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  return [
    `  ${propertyKey}: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .query(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;`,
    `      const start = typeof input.data?.start === 'number' ? input.data.start : -1;`,
    `      const params: Record<string, number> = {};`,
    `      let query = 'SELECT * FROM ${viewName}';`,
    `      if (limit >= 0) {`,
    `        query += ' LIMIT $limit';`,
    `        params.limit = limit;`,
    `      }`,
    `      if (start >= 0) {`,
    `        query += ' START $start';`,
    `        params.start = start;`,
    `      }`,
    `      query += ';';`,
    `      const result = await LRS(await dbInstance.query(/* surql */ query, params));`,
    `      return result;`,
    `    }),`,
  ].join('\n');
}

function buildViewCountProcedure(
  methodKey: string,
  schemaIdentifier: string,
  viewName: string
): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  return [
    `  ${propertyKey}: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .query(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const query = /* surql */ \``,
    `        RETURN count(select value id from ${viewName});`,
    `      \`;`,
    `      const result = await LRS(await dbInstance.query(query));`,
    `      return result;`,
    `    }),`,
  ].join('\n');
}

function buildFunctionViewProcedure(
  methodKey: string,
  schemaIdentifier: string,
  functionName: string,
  tableModel: string
): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  return [
    `  ${propertyKey}: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .query(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const limit = typeof input.data?.limit === 'number' ? input.data.limit : -1;`,
    `      const start = typeof input.data?.start === 'number' ? input.data.start : -1;`,
    `      const params: Record<string, number> = {};`,
    `      let query = 'RETURN array::map((SELECT VALUE id FROM ${tableModel}';`,
    `      if (limit >= 0) {`,
    `        query += ' LIMIT $limit';`,
    `        params.limit = limit;`,
    `      }`,
    `      if (start >= 0) {`,
    `        query += ' START $start';`,
    `        params.start = start;`,
    `      }`,
    `      query += '), |$id| ${functionName}($id));';`,
    `      const result = await LRS(await dbInstance.query(/* surql */ query, params));`,
    `      return result;`,
    `    }),`,
  ].join('\n');
}

function buildFunctionViewCountProcedure(
  methodKey: string,
  schemaIdentifier: string,
  tableModel: string
): string {
  const propertyKey = formatRouterPropertyKey(methodKey);
  return [
    `  ${propertyKey}: t.procedure`,
    `    .input(RequestSchema(${schemaIdentifier}))`,
    `    .query(async ({ input, ctx }) => {`,
    `      const { db, LRS } = ctx;`,
    `      const dbInstance = input.instance && (ctx as any).$api?.DB`,
    `        ? await (ctx as any).$api.DB(input.instance as any)`,
    `        : db;`,
    `      const query = /* surql */ \``,
    `        RETURN count(select value id from ${tableModel});`,
    `      \`;`,
    `      const result = await LRS(await dbInstance.query(query));`,
    `      return result;`,
    `    }),`,
  ].join('\n');
}

function buildViewIdentifier(tableNamePascal: string, value: string): string {
  const suffix = sanitizePascal(value || 'View');
  if (suffix.startsWith(tableNamePascal)) {
    return suffix;
  }
  return `${tableNamePascal}${suffix}`;
}

function formatRouterPropertyKey(key: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return key;
  }
  return JSON.stringify(key);
}

interface ResourceCaseEntry {
  key: string;
  mapping: RouterResourceMapping;
  target: ResourceTarget;
}

type ResourceTarget =
  | { kind: 'function'; identifier: string }
  | { kind: 'view'; identifier: string; returnId: 'record' | 'view'; tableModel: string };

function resolveResourceTarget(
  tableNamePascal: string,
  key: string,
  mapping: RouterResourceMapping,
  definitionViewMap: Map<
    string,
    { viewName: string; returnId: 'record' | 'view'; functionName?: string }
  >,
  tableModel: string
): ResourceTarget {
  if (mapping.target === 'view') {
    const view = resolveResourceView(tableNamePascal, key, mapping, definitionViewMap, tableModel);
    if (view.functionName) {
      const fnName = view.functionName.trim();
      if (fnName) {
        return { kind: 'function', identifier: normalizeResourceFunctionName(fnName) };
      }
    }
    return { kind: 'view', identifier: view.viewName, returnId: view.returnId, tableModel: view.tableModel };
  }

  return {
    kind: 'function',
    identifier: resolveResourceFunctionName(tableNamePascal, key, mapping),
  };
}

function resolveResourceView(
  tableNamePascal: string,
  key: string,
  mapping: RouterResourceMapping,
  definitionViewMap: Map<
    string,
    { viewName: string; returnId: 'record' | 'view'; functionName?: string }
  >,
  tableModel: string
): { viewName: string; returnId: 'record' | 'view'; tableModel: string; functionName?: string } {
  const candidates = [mapping.value, key];
  for (const candidate of candidates) {
    const normalized = normalizeResourceLookupKey(candidate);
    if (!normalized) {
      continue;
    }
    const mapped = definitionViewMap.get(normalized);
    if (mapped) {
      return { viewName: mapped.viewName, returnId: mapped.returnId, tableModel, functionName: mapped.functionName };
    }
  }

  const fallbackSource = mapping.value ?? key;
  const suffix = sanitizePascal(String(fallbackSource));
  const viewName = suffix.startsWith(tableNamePascal) ? suffix : `${tableNamePascal}${suffix}`;
  return { viewName, returnId: 'record', tableModel };
}

function buildResourceDefinitionViewMap(
  tableNamePascal: string,
  resourceDefinitions: ResourceDefinition[]
): Map<string, { viewName: string; returnId: 'record' | 'view'; functionName?: string }> {
  const map = new Map<
    string,
    { viewName: string; returnId: 'record' | 'view'; functionName?: string }
  >();
  for (const definition of resourceDefinitions) {
    if (!definition?.name) {
      continue;
    }
    const normalized = normalizeResourceLookupKey(definition.name);
    if (!normalized) {
      continue;
    }
    const viewName = `${tableNamePascal}${sanitizePascal(definition.name)}`;
    const returnId = definition.returnId === 'view' ? 'view' : 'record';
    map.set(normalized, {
      viewName,
      returnId,
      functionName: definition.function,
    });
  }
  return map;
}

function normalizeResourceFunctionName(value: string): string {
  return value.startsWith('fn::') ? value : `fn::${value}`;
}

function buildResourceSelectorMap(
  entries: ResourceCaseEntry[],
  tableNamePascal: string
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of entries) {
    const synonyms = new Set<string>();
    synonyms.add(entry.key);
    if (entry.mapping.value) {
      synonyms.add(entry.mapping.value);
    }

    for (const synonym of synonyms) {
      const normalized = normalizeResourceLookupKey(synonym);
      if (!normalized || normalized in map) {
        continue;
      }
      map[normalized] = entry.key;
    }
  }
  return map;
}

function normalizeResourceLookupKey(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function resolveResourceFunctionName(
  tableNamePascal: string,
  key: string,
  mapping: RouterResourceMapping
): string {
  if (mapping.function) {
    return mapping.function.startsWith('fn::') ? mapping.function : `fn::${mapping.function}`;
  }

  if (mapping.target === 'function' && mapping.value) {
    const targetFn = String(mapping.value);
    return targetFn.startsWith('fn::') ? targetFn : `fn::${targetFn}`;
  }

  const suffixSource = mapping.value ?? key;
  const suffix = sanitizePascal(String(suffixSource));
  return `fn::resource${tableNamePascal}${suffix}`;
}

function sanitizePascal(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'router';
}

function buildRouterIdentifier(routerKey: string): string {
  return `${routerKey}Router`;
}

function buildDefaultRouterName(table: TableMigrationConfig): string {
  const labelSource = table.name || table.table?.model || 'router';
  const pascal = sanitizePascal(labelSource);
  return decapitalize(pascal || 'router');
}

function getRouterConfig(table: TableMigrationConfig): TableRouterDefinition | null {
  if (table.router) {
    return table.router;
  }

  const legacy = (table as any).trpc;
  if (!legacy) {
    return null;
  }

  return {
    name: legacy.router ?? buildDefaultRouterName(table),
    endpoints: legacy.endpoints,
    parent: legacy.parent,
    embedInParent: legacy.embedInParent,
  };
}

function getRouterKey(
  table: TableMigrationConfig,
  router?: TableRouterDefinition | null
): string {
  if (router?.name) {
    return router.name;
  }
  if (table.router?.name) {
    return table.router.name;
  }
  const legacy = (table as any).trpc;
  if (legacy?.router) {
    return legacy.router;
  }
  return buildDefaultRouterName(table);
}

function computeEmbedPrefix(parentKey: string, childKey: string): string {
  if (childKey.startsWith(parentKey)) {
    const remainder = childKey.slice(parentKey.length);
    if (remainder.length > 0) {
      return decapitalize(remainder);
    }
  }
  return decapitalize(childKey);
}

function sanitizeCamel(value: string): string {
  const parts = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return 'router';
  }
  return parts
    .map((part, index) =>
      index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function resolveRouterParent(
  table: TableMigrationConfig,
  router: TableRouterDefinition | undefined,
  routerNameMap: Map<string, TableMigrationConfig>,
  tablesByModel: Map<string, TableMigrationConfig>
): TableMigrationConfig | null {
  if (router?.parent) {
    return routerNameMap.get(router.parent) ?? null;
  }
  if (router?.embedInParent) {
    return findParentTable(table, tablesByModel);
  }
  return null;
}

function findParentTable(
  table: TableMigrationConfig,
  tablesByModel: Map<string, TableMigrationConfig>
): TableMigrationConfig | null {
  const parentModel = getParentModelValue(table);
  if (!parentModel) {
    return null;
  }
  return tablesByModel.get(parentModel) ?? null;
}

function getParentModelValue(table: TableMigrationConfig): string | null {
  if (typeof table.structure === 'object' && table.structure?.type === 'parent' && table.structure.parentModel) {
    return table.structure.parentModel;
  }
  const edge = table.edges?.belongs?.find((item) => !!item.in);
  if (edge?.in) {
    return edge.in;
  }
  return null;
}

function decapitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
async function ensureRouterWrappers(
  routersRoot: string,
  routerInfos: GeneratedRouterInfo[],
  contextImport: string
): Promise<void> {
  for (const info of routerInfos) {
    const wrapperPath = path.join(routersRoot, `${info.basePath}.ts`);
    let exists = true;
    try {
      await access(wrapperPath);
    } catch {
      exists = false;
    }
    if (exists) {
      const current = await readFile(wrapperPath, 'utf-8').catch(() => null);
      if (current) {
        const updated = replaceContextImport(current, contextImport);
        if (updated !== current) {
          await writeFile(wrapperPath, updated, 'utf-8');
          console.log(`🧩 Updated router wrapper import: ${path.relative(process.cwd(), wrapperPath)}`);
        }
      }
      continue;
    }

    const dir = path.dirname(wrapperPath);
    await mkdir(dir, { recursive: true });

    const generatedImportPath = `./generated/${info.basePath.replace(/\\/g, '/')}`;
    const generatedAlias = `generated${capitalize(info.routerIdentifier)}`;
    const customAlias = `custom${capitalize(info.routerIdentifier)}`;

    const stub = `import { t } from '${contextImport}';\n` +
      `import { ${info.routerIdentifier} as ${generatedAlias} } from '${generatedImportPath}';\n\n` +
      `const ${customAlias} = t.router({\n` +
      `  // Add or override endpoints here. Example:\n` +
      `  // exampleEndpoint: t.procedure.query(async ({ ctx }) => ctx.db.select('...')),\n` +
      `});\n\n` +
      `export const ${info.routerIdentifier} = t.mergeRouters(${generatedAlias}, ${customAlias});\n` +
      `export type ${capitalize(info.routerIdentifier)} = typeof ${info.routerIdentifier};\n`;

    await writeFile(wrapperPath, stub, 'utf-8');
    console.log(`🧩 Created router wrapper stub: ${path.relative(process.cwd(), wrapperPath)}`);
  }
}

function replaceContextImport(source: string, contextImport: string): string {
  const importRegex = /import\s+\{\s*t\s*\}\s+from\s+['"][^'"]+['"]\s*;?/;
  if (!importRegex.test(source)) {
    return source;
  }
  return source.replace(importRegex, `import { t } from '${contextImport}';`);
}
