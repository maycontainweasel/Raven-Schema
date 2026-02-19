import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import type { AppConfig, TableFieldEntry, TableFieldMeta, TableMigrationConfig } from '../types';

type ModelDataMode = 'local' | 'remote';

type GeneratedTaxonomyActions = {
  getTerms: string;
  getRecordTerms: string;
  attach: string;
  detach: string;
  addTerm: string;
};

type GeneratedSubtableActions = {
  create: string;
  update: string;
  delete: string;
  get: string;
  list: string;
};

type GeneratedModelEntry = {
  key: string;
  table: string;
  data: ModelDataMode;
  slugPolicy?: string;
  capabilities: string[];
  hasTypesense: boolean;
  typesenseCollection: string | null;
  typesenseFields: string[];
  typesenseSortableFields: string[];
  taxonomyKeys: string[];
  subtableKeys: string[];
  taxonomies: Array<{ key: string; actions: GeneratedTaxonomyActions }>;
  subtables: Array<{ key: string; actions: GeneratedSubtableActions }>;
  fields: string[];
  requiredFields: string[];
};

type GeneratedAdminManifestDocument = {
  version: 1;
  generatedAt: string;
  source: 'schema.modelsManifest';
  models: Record<string, {
    key: string;
    table: string;
    data: ModelDataMode;
    slugPolicy?: string;
    capabilities: string[];
    fields: string[];
    requiredFields: string[];
    typesense: {
      enabled: boolean;
      collection: string | null;
      fields: string[];
      sortableFields: string[];
    };
    taxonomyKeys: string[];
    subtableKeys: string[];
    taxonomies: Array<{ key: string; actions: GeneratedTaxonomyActions }>;
    subtables: Array<{ key: string; actions: GeneratedSubtableActions }>;
  }>;
};

interface GenerateModelsManifestOptions {
  app: AppConfig;
  tables: TableMigrationConfig[];
  projectRoot: string;
  outputPath?: string;
}

export async function generateModelsManifest(
  options: GenerateModelsManifestOptions
): Promise<void> {
  const { app, tables, projectRoot, outputPath: overrideOutput } = options;
  const cfg = app.modelsExport ?? {};

  const defaultOutput = path.resolve(projectRoot, 'config/generated/models.ts');
  const outputPath =
    overrideOutput ??
    (cfg.output
      ? path.isAbsolute(cfg.output)
        ? cfg.output
        : path.resolve(projectRoot, cfg.output)
      : defaultOutput);

  const entries = buildEntries(tables);
  const content = buildModelsFile(entries);
  const adminManifest = buildAdminManifest(entries);

  const outputDir = path.dirname(outputPath);
  const adminJsonPath = path.join(outputDir, 'admin-models.json');
  const adminTsPath = path.join(outputDir, 'admin-manifest.ts');

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, content, 'utf-8');
  await writeFile(adminJsonPath, `${JSON.stringify(adminManifest, null, 2)}\n`, 'utf-8');
  await writeFile(adminTsPath, buildAdminManifestTs(adminManifest), 'utf-8');

  console.log(`🧩 Generated models manifest: ${path.relative(projectRoot, outputPath)}`);
  console.log(`🧩 Generated admin model manifest: ${path.relative(projectRoot, adminJsonPath)}`);
}

function buildEntries(tables: TableMigrationConfig[]): GeneratedModelEntry[] {
  return tables
    .filter((table) => table.tableType !== 'subsingle' && table.tableType !== 'submany')
    .filter((table) => table.router && table.table?.model)
    .map((table) => {
      const tableModel = normalizeIdentifier(table.table.model);
      const key = toCamel(String(table.router?.name ?? table.name ?? table.table.model));
      const admin = (table as any).admin ?? {};
      const data = normalizeDataMode(admin.data);
      const slugPolicy = sanitizeOptionalString(admin.slugPolicy);

      const taxonomyKeys = uniqueStrings(
        (Array.isArray(table.taxonomies) ? table.taxonomies : [])
          .map((taxonomy) => normalizeIdentifier(taxonomy?.key)),
      );
      const subtableKeys = uniqueStrings(
        (Array.isArray(table.subTables) ? table.subTables : [])
          .map((subtable) => toCamel(String(subtable?.model ?? subtable?.name ?? ''))),
      );
      const { fields, requiredFields } = extractFields(table.fields);

      const typesenseSchema = table.typesense?.schema;
      const hasTypesense = Boolean(typesenseSchema);
      const typesenseCollectionRaw = sanitizeOptionalString(typesenseSchema?.collection);
      const typesenseCollection = hasTypesense ? (typesenseCollectionRaw || tableModel) : null;
      const typesenseFields = uniqueStrings(
        (Array.isArray(typesenseSchema?.fields) ? typesenseSchema.fields : [])
          .map((field) => normalizeIdentifier((field as any)?.name)),
      );
      const typesenseSortableFields = uniqueStrings(
        (Array.isArray(typesenseSchema?.sortableFields) ? typesenseSchema.sortableFields : [])
          .map((field) => normalizeIdentifier(field)),
      );

      const capabilities = uniqueStrings([
        table.router ? 'router' : '',
        table.crud ? 'crud' : '',
        hasTypesense ? 'typesense' : '',
        taxonomyKeys.length ? 'taxonomies' : '',
        subtableKeys.length ? 'subtables' : '',
        table.instance ? 'instance' : '',
      ]);

      const taxonomies = taxonomyKeys.map((taxonomyKey) => ({
        key: taxonomyKey,
        actions: taxonomyActions(key, taxonomyKey),
      }));

      const subtables = subtableKeys.map((subtableKey) => ({
        key: subtableKey,
        actions: subtableActions(key, subtableKey),
      }));

      return {
        key,
        table: tableModel,
        data,
        ...(slugPolicy ? { slugPolicy } : {}),
        capabilities,
        hasTypesense,
        typesenseCollection,
        typesenseFields,
        typesenseSortableFields,
        taxonomyKeys,
        subtableKeys,
        taxonomies,
        subtables,
        fields,
        requiredFields,
      };
    })
    .filter((entry) => entry.key.length > 0 && entry.table.length > 0)
    .sort((a, b) => a.key.localeCompare(b.key));
}

function buildModelsFile(entries: GeneratedModelEntry[]): string {
  const body = entries
    .map((entry) => {
      const props = [
        `table: ${JSON.stringify(entry.table)}`,
        `data: ${JSON.stringify(entry.data)}`,
        ...(entry.slugPolicy ? [`slugPolicy: ${JSON.stringify(entry.slugPolicy)}`] : []),
      ];
      return `  ${JSON.stringify(entry.key)}: { ${props.join(', ')} }`;
    })
    .join(',\n');

  return [
    `// AUTO-GENERATED — models manifest for admin UI`,
    `export type ModelEntry = {`,
    `  table: string;`,
    `  data: 'local' | 'remote';`,
    `  slugPolicy?: string;`,
    `};`,
    ``,
    `export const models = {`,
    body || '  // no models configured',
    `} as const;`,
    ``,
    `export type ModelKey = keyof typeof models;`,
    ``,
  ].join('\n');
}

function buildAdminManifest(entries: GeneratedModelEntry[]): GeneratedAdminManifestDocument {
  const models = Object.fromEntries(
    entries.map((entry) => {
      return [entry.key, {
        key: entry.key,
        table: entry.table,
        data: entry.data,
        ...(entry.slugPolicy ? { slugPolicy: entry.slugPolicy } : {}),
        capabilities: entry.capabilities,
        fields: entry.fields,
        requiredFields: entry.requiredFields,
        typesense: {
          enabled: entry.hasTypesense,
          collection: entry.typesenseCollection,
          fields: entry.typesenseFields,
          sortableFields: entry.typesenseSortableFields,
        },
        taxonomyKeys: entry.taxonomyKeys,
        subtableKeys: entry.subtableKeys,
        taxonomies: entry.taxonomies,
        subtables: entry.subtables,
      }];
    }),
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'schema.modelsManifest',
    models,
  };
}

function buildAdminManifestTs(manifest: GeneratedAdminManifestDocument): string {
  const serialized = JSON.stringify(manifest, null, 2);

  return [
    `// AUTO-GENERATED — rich admin model manifest for Helios model manager`,
    `export const adminManifest = ${serialized} as const;`,
    ``,
    `export type AdminManifest = typeof adminManifest;`,
    `export type AdminManifestModel = AdminManifest['models'][keyof AdminManifest['models']];`,
    ``,
  ].join('\n');
}

function extractFields(entries?: TableFieldEntry[]): { fields: string[]; requiredFields: string[] } {
  const fields: string[] = [];
  const requiredFields: string[] = [];

  for (const entry of entries ?? []) {
    if (!entry || typeof entry !== 'object') continue;
    for (const [fieldKey, rawMeta] of Object.entries(entry)) {
      const key = normalizeIdentifier(fieldKey);
      if (!key) continue;
      fields.push(key);
      const meta = (rawMeta && typeof rawMeta === 'object' ? rawMeta : {}) as TableFieldMeta;
      if (meta.required === true) requiredFields.push(key);
    }
  }

  return {
    fields: uniqueStrings(fields),
    requiredFields: uniqueStrings(requiredFields),
  };
}

function normalizeDataMode(value: unknown): ModelDataMode {
  return String(value ?? '').trim().toLowerCase() === 'remote' ? 'remote' : 'local';
}

function sanitizeOptionalString(value: unknown): string {
  const next = String(value ?? '').trim();
  return next.length > 0 ? next : '';
}

function normalizeIdentifier(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? '').trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function taxonomyActions(modelKey: string, taxonomyKey: string): GeneratedTaxonomyActions {
  const prefix = `${modelKey}.${taxonomyKey}`;
  return {
    getTerms: `${prefix}.getTerms`,
    getRecordTerms: `${prefix}.getRecordTerms`,
    attach: `${prefix}.attach`,
    detach: `${prefix}.detach`,
    addTerm: `${prefix}.addTerm`,
  };
}

function subtableActions(modelKey: string, subtableKey: string): GeneratedSubtableActions {
  const prefix = `${modelKey}.subtables.${subtableKey}`;
  return {
    create: `${prefix}.create`,
    update: `${prefix}.update`,
    delete: `${prefix}.delete`,
    get: `${prefix}.get`,
    list: `${prefix}.list`,
  };
}

function toCamel(value: string): string {
  const pascal = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : '';
}
