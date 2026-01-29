import { mkdir, readFile, readdir, rm, stat, writeFile } from 'fs/promises';
import path from 'path';

import type { TableFieldEntry, TableFieldMeta, TableMigrationConfig } from '../types';

type ControllerManifestEntry = {
  key: string;
  typeName: string;
};

type GeneratorOptions = {
  tables: TableMigrationConfig[];
  moduleRoot: string;
};

const toPascal = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const decapitalize = (value: string) =>
  value ? value.charAt(0).toLowerCase() + value.slice(1) : value;

const buildDefaultRouterName = (table: TableMigrationConfig) => {
  const labelSource = table.name || table.table?.model || 'router';
  return decapitalize(toPascal(labelSource));
};

const getRouterKey = (table: TableMigrationConfig) => {
  if (table.router?.name) return table.router.name;
  const legacy = (table as any).trpc;
  if (legacy?.router) return legacy.router;
  return buildDefaultRouterName(table);
};

const collectFields = (fields?: TableFieldEntry[]): Array<{ name: string; meta: TableFieldMeta }> => {
  if (!fields) return [];
  const out: Array<{ name: string; meta: TableFieldMeta }> = [];
  for (const entry of fields) {
    for (const [name, meta] of Object.entries(entry)) {
      out.push({ name, meta });
    }
  }
  return out;
};

function resolveExportName(template: string, tableName: string, model: string): string {
  const namePascal = toPascal(tableName);
  return (
    template
      .replace(/__NAME__/g, namePascal)
      .replace(/__MODEL__/g, model)
      .replace(/\W+/g, '') || `${namePascal}ID`
  );
}

function buildIdTypeNames(table: TableMigrationConfig, tableNamePascal: string): {
  exportName?: string;
  subIdName?: string;
  hasExport: boolean;
} {
  const idConfig = table.id;
  if (!idConfig) {
    return { hasExport: false };
  }
  const exportType = idConfig.exportType ?? (idConfig as any).exportIDType ?? false;
  if (!exportType) {
    return { hasExport: false };
  }
  const nameTemplate = idConfig.exportName ?? `${tableNamePascal}ID`;
  const model = table.table?.model ?? table.name ?? tableNamePascal;
  const exportName = resolveExportName(nameTemplate, table.name ?? tableNamePascal, model);
  return { exportName, subIdName: `${exportName}SubId`, hasExport: true };
}

function buildControllerSource(options: {
  table: TableMigrationConfig;
  routerKey: string;
  tableNamePascal: string;
  modelType: string;
  idTypeName: string | null;
  subIdTypeName: string | null;
  collectionId: string;
  hasTypesense: boolean;
}): string {
  const {
    table,
    routerKey,
    tableNamePascal,
    modelType,
    idTypeName,
    subIdTypeName,
    collectionId,
    hasTypesense,
  } = options;
  const requiredFields = collectFields(table.fields)
    .filter((field) => field.meta.required)
    .map((field) => field.name)
    .filter((name) => name !== 'id');
  const requiredUnion = requiredFields.map((name) => `'${name}'`).join(' | ');

  const createType = requiredFields.length
    ? `Pick<${modelType}, ${requiredUnion}> & Partial<Omit<${modelType}, 'id'>>`
    : `Partial<Omit<${modelType}, 'id'>>`;

  const updateType = `Partial<Omit<${modelType}, 'id'>>`;
  const recordIdType = idTypeName ? `NonNullable<${modelType}['id']> | ${idTypeName}` : `NonNullable<${modelType}['id']>`;
  const subIdType = subIdTypeName ?? 'any';
  const idImportLine = idTypeName
    ? `import type { ${modelType}, ${idTypeName}, ${subIdTypeName} } from '@schema/types'`
    : `import type { ${modelType} } from '@schema/types'`;
  const idTypeFallback = idTypeName
    ? ''
    : `type ${tableNamePascal}Id = any;\n` +
      `type ${tableNamePascal}IdSubId = any;\n`;
  const subIdTypeAlias = subIdTypeName ?? `${tableNamePascal}IdSubId`;
  const idTypeAlias = idTypeName ?? `${tableNamePascal}Id`;

  const typesenseImport = hasTypesense
    ? `import type { ${tableNamePascal}Document, TypesenseCollectionSchema } from '@schema/typesense/collections'`
    : `type ${tableNamePascal}Document = any;\ntype TypesenseCollectionSchema = any;`;

  return `import { useCRUD, type ApiOptions } from '../../composables/useCRUD'
${idImportLine}
${typesenseImport}
import type { ControllerIdInput, ControllerOverride } from '../_shared'

${idTypeFallback}export type ${tableNamePascal}CreateInput = ${createType}

export type ${tableNamePascal}UpdateInput = ${updateType}
export type ${tableNamePascal}RecordId = ${recordIdType}
export type ${tableNamePascal}IdInput = ControllerIdInput<${subIdTypeAlias}, ${tableNamePascal}RecordId, ${modelType}>

export interface ${tableNamePascal}Controller {
  // Create a new ${routerKey} record.
  create: (payload: ${tableNamePascal}CreateInput, options?: ApiOptions) => Promise<${modelType} | null>
  // Create multiple ${routerKey} records in sequence.
  createMany: (payloads: ${tableNamePascal}CreateInput[], options?: ApiOptions) => Promise<(${modelType} | null)[]>
  // Update a ${routerKey} by id (record object or sub-id).
  update: (id: ${tableNamePascal}IdInput, payload: ${tableNamePascal}UpdateInput, options?: ApiOptions) => Promise<${modelType} | null>
  // Update multiple ${routerKey} records in sequence.
  updateMany: (
    items: Array<{ id: ${tableNamePascal}IdInput; payload: ${tableNamePascal}UpdateInput }>,
    options?: ApiOptions
  ) => Promise<(${modelType} | null)[]>
  // Delete a ${routerKey} by id (record object or sub-id).
  delete: (id: ${tableNamePascal}IdInput, options?: ApiOptions) => Promise<${modelType} | null>
  // Delete multiple ${routerKey} records in sequence.
  deleteMany: (ids: ${tableNamePascal}IdInput[], options?: ApiOptions) => Promise<(${modelType} | null)[]>
  // Fetch a resource view/function for the ${routerKey}.
  get: (id: ${tableNamePascal}IdInput, resourceKey: string, options?: ApiOptions) => Promise<any>
  // Taxonomy helper for this model.
  taxonomy: (key: string) => TaxonomyController
  // Subtable helper for this model.
  subtable: (key: string) => SubtableController
  // Relation helper for this model.
  relation: (key: string) => RelationController
  // Typesense helper for this model.
  typesense: () => TypesenseController
  // Refresh Typesense for a specific record id.
  refreshTypesenseFor: (id: ${tableNamePascal}IdInput, options?: ApiOptions) => Promise<any>
}

export interface TaxonomyController {
  createTaxonomy: (payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  addTerm: (payload: any, options?: ApiOptions) => Promise<any>
  removeTerm: (term: any, options?: ApiOptions) => Promise<any>
  attach: (id: ${tableNamePascal}IdInput, term: any, options?: ApiOptions) => Promise<any>
  detach: (id: ${tableNamePascal}IdInput, term: any, options?: ApiOptions) => Promise<any>
  getTerms: (options?: ApiOptions) => Promise<any>
  getRecordTerms: (id: ${tableNamePascal}IdInput, options?: ApiOptions) => Promise<any>
}

export interface SubtableController {
  create: (id: ${tableNamePascal}IdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  update: (id: ${tableNamePascal}IdInput, payload: Record<string, any>, options?: ApiOptions) => Promise<any>
  delete: (id: ${tableNamePascal}IdInput, options?: ApiOptions) => Promise<any>
  get: (id: ${tableNamePascal}IdInput, options?: ApiOptions) => Promise<any>
  list: (id: ${tableNamePascal}IdInput, params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<any>
}

export interface RelationController {
  attach: (id: ${tableNamePascal}IdInput, target: any, options?: ApiOptions) => Promise<any>
  detach: (id: ${tableNamePascal}IdInput, target: any, options?: ApiOptions) => Promise<any>
  list: (id: ${tableNamePascal}IdInput, options?: ApiOptions) => Promise<any>
}

export interface TypesenseController {
  get: (id: ${tableNamePascal}IdInput, options?: ApiOptions) => Promise<${tableNamePascal}Document | null>
  list: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<${tableNamePascal}Document[]>
  refresh: (params?: { start?: number; limit?: number }, options?: ApiOptions) => Promise<${tableNamePascal}Document[]>
  count: (options?: ApiOptions) => Promise<number>
  collection: (options?: ApiOptions) => Promise<TypesenseCollectionSchema | null>
}

export type ${tableNamePascal}ControllerOverride = ControllerOverride<${tableNamePascal}Controller>

export function createGenerated${tableNamePascal}Controller(): ${tableNamePascal}Controller {
  const crud = useCRUD()
  const { $process } = crud
  const resolveSubId = (value: ${tableNamePascal}IdInput) => crud.resolveRecordSubId<${subIdTypeAlias}>(value)

  // Create a ${routerKey} via the TRPC endpoint.
  const create: ${tableNamePascal}Controller['create'] = async (payload, options) => {
    return await $process<${tableNamePascal}CreateInput, ${modelType}>('${routerKey}.create', payload, options)
  }

  // Create multiple ${routerKey} records in sequence.
  const createMany: ${tableNamePascal}Controller['createMany'] = async (payloads, options) => {
    const results: Array<${modelType} | null> = []
    for (const payload of payloads) {
      results.push(await create(payload, options))
    }
    return results
  }

  // Update a ${routerKey} via the TRPC endpoint.
  const update: ${tableNamePascal}Controller['update'] = async (id, payload, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('${tableNamePascal} update requires a valid id')
    return await $process<{ id: ${subIdTypeAlias}; payload: ${tableNamePascal}UpdateInput }, ${modelType}>(
      '${routerKey}.update',
      { id: resolvedId, payload },
      options
    )
  }

  // Update multiple ${routerKey} records in sequence.
  const updateMany: ${tableNamePascal}Controller['updateMany'] = async (items, options) => {
    const results: Array<${modelType} | null> = []
    for (const item of items) {
      results.push(await update(item.id, item.payload, options))
    }
    return results
  }

  // Delete a ${routerKey} via the TRPC endpoint.
  const del: ${tableNamePascal}Controller['delete'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('${tableNamePascal} delete requires a valid id')
    return await $process<{ id: ${subIdTypeAlias} }, ${modelType}>('${routerKey}.delete', { id: resolvedId }, options)
  }

  // Delete multiple ${routerKey} records in sequence.
  const deleteMany: ${tableNamePascal}Controller['deleteMany'] = async (ids, options) => {
    const results: Array<${modelType} | null> = []
    for (const id of ids) {
      results.push(await del(id, options))
    }
    return results
  }

  // Fetch a resource view/function for a ${routerKey}.
  const get: ${tableNamePascal}Controller['get'] = async (id, resourceKey, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('${tableNamePascal} get requires a valid id')
    if (!resourceKey) throw new Error('${tableNamePascal} get requires a resource key')
    return await $process('${routerKey}.resource', { id: resolvedId, resource: resourceKey }, options)
  }

  const taxonomy: ${tableNamePascal}Controller['taxonomy'] = (key: string) => {
    const prefix = \`${routerKey}.\${key}\`
    return {
      createTaxonomy: (payload, options) =>
        $process(\`\${prefix}.createTaxonomy\`, payload, options),
      addTerm: (payload, options) =>
        $process(\`\${prefix}.addTerm\`, payload, options),
      removeTerm: (term, options) =>
        $process(\`\${prefix}.removeTerm\`, term, options),
      attach: (id, term, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('taxonomy.attach requires a valid id')
        return $process(\`\${prefix}.attach\`, { id: resolvedId, term }, options)
      },
      detach: (id, term, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('taxonomy.detach requires a valid id')
        return $process(\`\${prefix}.detach\`, { id: resolvedId, term }, options)
      },
      getTerms: (options) =>
        $process(\`\${prefix}.getTerms\`, {}, options),
      getRecordTerms: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('taxonomy.getRecordTerms requires a valid id')
        return $process(\`\${prefix}.getRecordTerms\`, { id: resolvedId }, options)
      },
    }
  }

  const subtable: ${tableNamePascal}Controller['subtable'] = (key: string) => {
    const prefix = \`${routerKey}.subtables.\${key}\`
    return {
      create: (id, payload, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.create requires a valid id')
        return $process(\`\${prefix}.create\`, { id: resolvedId, payload }, options)
      },
      update: (id, payload, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.update requires a valid id')
        return $process(\`\${prefix}.update\`, { id: resolvedId, payload }, options)
      },
      delete: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.delete requires a valid id')
        return $process(\`\${prefix}.delete\`, { id: resolvedId }, options)
      },
      get: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.get requires a valid id')
        return $process(\`\${prefix}.get\`, { id: resolvedId }, options)
      },
      list: (id, params, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('subtable.list requires a valid id')
        return $process(\`\${prefix}.list\`, { id: resolvedId, ...(params ?? {}) }, options)
      },
    }
  }

  const relation: ${tableNamePascal}Controller['relation'] = (key: string) => {
    const prefix = \`${routerKey}.relations.\${key}\`
    return {
      attach: (id, target, options) => {
        const resolvedId = resolveSubId(id)
        const resolvedTarget = resolveSubId(target)
        if (!resolvedId || !resolvedTarget) throw new Error('relation.attach requires id and target')
        return $process(\`\${prefix}.attach\`, { id: resolvedId, target: resolvedTarget }, options)
      },
      detach: (id, target, options) => {
        const resolvedId = resolveSubId(id)
        const resolvedTarget = resolveSubId(target)
        if (!resolvedId || !resolvedTarget) throw new Error('relation.detach requires id and target')
        return $process(\`\${prefix}.detach\`, { id: resolvedId, target: resolvedTarget }, options)
      },
      list: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('relation.list requires a valid id')
        return $process(\`\${prefix}.list\`, { id: resolvedId }, options)
      },
    }
  }

  // Typesense helper wrapper for this model.
  const typesense: ${tableNamePascal}Controller['typesense'] = () => {
    const prefix = \`${routerKey}.typesense\`
    return {
      get: (id, options) => {
        const resolvedId = resolveSubId(id)
        if (!resolvedId) throw new Error('typesense.get requires a valid id')
        return $process(\`\${prefix}.resource\`, { id: resolvedId }, options)
      },
      list: (params, options) =>
        $process(\`\${prefix}.list\`, { ...(params ?? {}) }, options),
      refresh: (params, options) =>
        $process(\`\${prefix}.refresh\`, { ...(params ?? {}) }, options),
      count: (options) =>
        $process(\`\${prefix}.count\`, {}, options),
      collection: (options) =>
        $process(\`\${prefix}.collection\`, {}, options),
    }
  }

  // Refresh Typesense for a single record id.
  const refreshTypesenseFor: ${tableNamePascal}Controller['refreshTypesenseFor'] = async (id, options) => {
    const resolvedId = resolveSubId(id)
    if (!resolvedId) throw new Error('refreshTypesenseFor requires a valid id')
    return crud.updateTypesenseForRecord({
      collectionId: '${collectionId}',
      id: resolvedId,
      endpoint: '${routerKey}.typesense.resource',
      instance: options?.instance,
      instances: options?.instances,
      bypassMothership: options?.bypassMothership,
    })
  }

  return {
    create,
    createMany,
    update,
    updateMany,
    delete: del,
    deleteMany,
    get,
    taxonomy,
    subtable,
    relation,
    typesense,
    refreshTypesenseFor,
  }
}
`;
}

function buildWrapperSource(routerKey: string, tableNamePascal: string): string {
  return `import { createGenerated${tableNamePascal}Controller, type ${tableNamePascal}Controller } from './generated/${routerKey}'
import { mergeController } from './_shared'
import { extend${tableNamePascal}Controller } from '@schema/custom-controllers/${routerKey}'

export function create${tableNamePascal}Controller(): ${tableNamePascal}Controller {
  const base = createGenerated${tableNamePascal}Controller()
  return mergeController(base, extend${tableNamePascal}Controller)
}

export type { ${tableNamePascal}Controller }
`;
}

function buildCustomStubSource(tableNamePascal: string, routerKey: string): string {
  return `import type { ${tableNamePascal}Controller, ${tableNamePascal}ControllerOverride } from '../generated/${routerKey}'

export const extend${tableNamePascal}Controller: ${tableNamePascal}ControllerOverride | undefined = undefined

export type { ${tableNamePascal}Controller }
`;
}

function buildControllersIndex(entries: ControllerManifestEntry[]): string {
  const importLines: string[] = [];
  const typeLines: string[] = [];
  const mapLines: string[] = [];

  for (const entry of entries) {
    importLines.push(`import { create${entry.typeName} } from './${entry.key}'`);
    typeLines.push(`import type { ${entry.typeName} } from './${entry.key}'`);
    mapLines.push(`  ${entry.key}: create${entry.typeName}(),`);
  }

  return `${importLines.join('\n')}
${typeLines.join('\n')}

export type ControllersMap = {
${entries.map((entry) => `  ${entry.key}: ${entry.typeName};`).join('\n')}
}

export function createControllers(): ControllersMap {
  return {
${mapLines.join('\n')}
  }
}
`;
}

function buildRuntimeIndex(entries: ControllerManifestEntry[]): string {
  const exports = entries
    .map(
      (entry) =>
        `export { create${entry.typeName} } from './controllers/${entry.key}';\n` +
        `export type { ${entry.typeName} } from './controllers/${entry.key}';`
    )
    .join('\n');

  return `export * from '@schema/request-schema';
export { useCRUD } from './composables/useCRUD';
export { useTypesense } from './composables/useTypesense';
export { useTypesenseSearch } from './composables/useTypesenseSearch';
export { useTypesenseDirectory } from './composables/useTypesenseDirectory';
${exports}
export { createControllers } from './controllers';
export type { ControllersMap } from './controllers';
`;
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function buildSharedSource(): string {
  return `export type ControllerIdInput<TSubId, TRecordId, TRecord> =
  | TSubId
  | TRecordId
  | TRecord
  | { id: TSubId | TRecordId }
  | { tb: string; id: TSubId | TRecordId }

export type ControllerOverride<T> = Partial<T> | ((base: T) => Partial<T>)

export function mergeController<T extends Record<string, any>>(
  base: T,
  override?: ControllerOverride<T>
): T {
  if (!override) return base
  const patch = typeof override === 'function' ? override(base) : override
  return { ...base, ...(patch ?? {}) }
}
`;
}

export async function generateControllers(options: GeneratorOptions): Promise<void> {
  const { tables, moduleRoot } = options;
  const runtimeRoot = path.join(moduleRoot, 'src', 'runtime');
  const controllersRoot = path.join(runtimeRoot, 'controllers');
  const generatedRoot = path.join(controllersRoot, 'generated');
  const customRoot = path.join(controllersRoot, 'custom');
  const manifestDir = path.join(runtimeRoot, 'generated');

  await ensureDir(controllersRoot);
  await writeFile(path.join(controllersRoot, '_shared.ts'), buildSharedSource(), 'utf-8');
  await rm(generatedRoot, { recursive: true, force: true });
  await ensureDir(generatedRoot);
  await ensureDir(customRoot);
  await ensureDir(manifestDir);

  const manifest: ControllerManifestEntry[] = [];

  for (const table of tables) {
    const routerKey = getRouterKey(table);
    const modelName = table.name || table.table?.model || routerKey;
    const tableNamePascal = toPascal(modelName);
    const modelType = tableNamePascal;
    const idTypes = buildIdTypeNames(table, tableNamePascal);
    const collectionId = table.table?.model ?? routerKey;
    const hasTypesense = Boolean(table.typesense);

    const controllerSource = buildControllerSource({
      table,
      routerKey,
      tableNamePascal,
      modelType,
      idTypeName: idTypes.exportName ?? null,
      subIdTypeName: idTypes.subIdName ?? null,
      collectionId,
      hasTypesense,
    });
    await writeFile(path.join(generatedRoot, `${routerKey}.ts`), controllerSource, 'utf-8');

    const wrapperPath = path.join(controllersRoot, `${routerKey}.ts`);
    await writeFile(wrapperPath, buildWrapperSource(routerKey, tableNamePascal), 'utf-8');

    const customPath = path.join(customRoot, `${routerKey}.ts`);
    const existingCustom = await stat(customPath).catch(() => null);
    if (!existingCustom?.isFile()) {
      await writeFile(customPath, buildCustomStubSource(tableNamePascal, routerKey), 'utf-8');
    }

    manifest.push({ key: routerKey, typeName: `${tableNamePascal}Controller` });
  }

  manifest.sort((a, b) => a.key.localeCompare(b.key));
  await writeFile(
    path.join(runtimeRoot, 'generated', 'controller-manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf-8'
  );

  const indexSource = buildControllersIndex(manifest);
  await writeFile(path.join(controllersRoot, 'index.ts'), indexSource, 'utf-8');

  const runtimeIndex = buildRuntimeIndex(manifest);
  await writeFile(path.join(runtimeRoot, 'index.ts'), runtimeIndex, 'utf-8');

  const pluginPath = path.join(runtimeRoot, 'plugins', 'user-controller.ts');
  const pluginSource = `import { defineNuxtPlugin } from '#app'
import { createControllers } from '../controllers'

export default defineNuxtPlugin(() => {
  const controllers = createControllers()
  return {
    provide: {
      ...controllers,
    },
  }
})
`;
  await writeFile(pluginPath, pluginSource, 'utf-8');
}
