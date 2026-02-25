import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import type {
  AppConfig,
  CrudOperationDefinition,
  RouterEndpoint,
  TableFieldEntry,
  TableFieldMeta,
  TableMigrationConfig,
  TableModelSettingsConfig,
  TableRelationConfig,
} from '../types';

type ModelAuthority = 'source' | 'tenant';
type LegacyDataMode = 'local' | 'remote';
type ModelSchemaType = 'schemaless' | 'schemafull';

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

type GeneratedCrudContract = {
  enabled: boolean;
  create: string | null;
  update: string | null;
  delete: string | null;
};

type GeneratedRouterContract = {
  enabled: boolean;
  key: string;
  parent: string | null;
  embedInParent: boolean;
  procedures: string[];
};

type GeneratedBootstrapContract = {
  ensureTable: boolean;
  tableDefinition: {
    model: string;
    type: string;
    schemaType: ModelSchemaType;
    permissions: string;
  };
};

type GeneratedRelationContract = {
  edge: string;
  left: string;
  right: string;
  cardinality: 'one' | 'many';
  payloadField: string;
  storeOnModel: boolean;
  required: boolean;
  processor: string;
  hook: string;
};

type GeneratedAdminContract = {
  enabled: boolean;
};

type GeneratedModelEntry = {
  key: string;
  table: string;
  label: string;
  description: string;
  authority: ModelAuthority;
  data: LegacyDataMode;
  schemaType: ModelSchemaType;
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
  relations: GeneratedRelationContract[];
  fields: string[];
  requiredFields: string[];
  crud: GeneratedCrudContract;
  router: GeneratedRouterContract;
  bootstrap: GeneratedBootstrapContract;
  admin: GeneratedAdminContract;
  settingsRaw: Record<string, unknown>;
  warnings: string[];
};

type GeneratedCanonicalManifestDocument = {
  manifestVersion: '1.0.0';
  generatedAt: string;
  source: 'schema.modelsManifest';
  warnings: string[];
  models: Record<string, {
    key: string;
    table: string;
    label: string;
    description: string;
    authority: ModelAuthority;
    data: LegacyDataMode;
    schemaType: ModelSchemaType;
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
    relations: GeneratedRelationContract[];
    crud: GeneratedCrudContract;
    router: GeneratedRouterContract;
    bootstrap: GeneratedBootstrapContract;
    admin: GeneratedAdminContract;
    settingsRaw: Record<string, unknown>;
    warnings: string[];
  }>;
};

type GeneratedAdminManifestDocument = {
  version: 1;
  generatedAt: string;
  source: 'schema.modelsManifest';
  models: Record<string, {
    key: string;
    table: string;
    authority: ModelAuthority;
    data: LegacyDataMode;
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
    relations: GeneratedRelationContract[];
    crud: GeneratedCrudContract;
    router: GeneratedRouterContract;
    bootstrap: GeneratedBootstrapContract;
    admin: GeneratedAdminContract;
    settingsRaw: Record<string, unknown>;
    warnings: string[];
  }>;
};

type NormalizedModelSettings = {
  schemaType?: ModelSchemaType;
  authority?: ModelAuthority;
  bootstrap: {
    ensureTable: boolean;
    permissions?: Record<string, unknown>;
  };
  admin: {
    enabled?: boolean;
  };
  typesense: {
    enabled?: boolean;
  };
  raw: Record<string, unknown>;
  unknownKeys: string[];
  warnings: string[];
};

interface GenerateModelsManifestOptions {
  app: AppConfig;
  tables: TableMigrationConfig[];
  projectRoot: string;
  outputPath?: string;
}

const KNOWN_MODEL_SETTINGS_KEYS = new Set([
  'schemaType',
  'authority',
  'dataLocation',
  'bootstrap',
  'admin',
  'typesense',
]);

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
  const baseModelsTs = buildModelsFile(entries);
  const canonicalManifest = buildCanonicalManifest(entries);
  const adminManifest = buildAdminManifest(entries);

  const outputDir = path.dirname(outputPath);
  const canonicalJsonPath = path.join(outputDir, 'models.manifest.json');
  const canonicalTsPath = path.join(outputDir, 'models.manifest.ts');
  const adminJsonPath = path.join(outputDir, 'admin-models.json');
  const adminTsPath = path.join(outputDir, 'admin-manifest.ts');

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, baseModelsTs, 'utf-8');
  await writeFile(canonicalJsonPath, `${JSON.stringify(canonicalManifest, null, 2)}\n`, 'utf-8');
  await writeFile(canonicalTsPath, buildCanonicalManifestTs(canonicalManifest), 'utf-8');
  await writeFile(adminJsonPath, `${JSON.stringify(adminManifest, null, 2)}\n`, 'utf-8');
  await writeFile(adminTsPath, buildAdminManifestTs(adminManifest), 'utf-8');

  console.log(`🧩 Generated models manifest: ${path.relative(projectRoot, outputPath)}`);
  console.log(`🧩 Generated canonical models manifest: ${path.relative(projectRoot, canonicalJsonPath)}`);
  console.log(`🧩 Generated admin model manifest: ${path.relative(projectRoot, adminJsonPath)}`);
}

function buildEntries(tables: TableMigrationConfig[]): GeneratedModelEntry[] {
  return tables
    .filter((table) => table.tableType !== 'subsingle' && table.tableType !== 'submany')
    .filter((table) => table.table?.model)
    .map((table) => {
      const tableModel = normalizeIdentifier(table.table.model);
      if (!tableModel) return null;

      const key = toCamel(String(table.router?.name ?? table.name ?? table.table.model));
      const label = sanitizeOptionalString(table.name) || titleCase(tableModel);
      const description = sanitizeOptionalString(table.description);

      const admin = (table as any).admin ?? {};
      const modelSettings = normalizeModelSettings((table as any).modelSettings);

      const schemaType = modelSettings.schemaType ?? resolveSchemaType(table);
      const authority =
        modelSettings.authority ??
        normalizeAuthority((admin as any).authority ?? admin.data) ??
        'source';
      const data = toLegacyDataMode(authority);
      const slugPolicy = sanitizeOptionalString(admin.slugPolicy);
      const adminEnabled =
        typeof modelSettings.admin.enabled === 'boolean'
          ? modelSettings.admin.enabled
          : typeof admin.enabled === 'boolean'
            ? admin.enabled
            : Boolean(table.router);

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
      const typesenseCollectionRaw = sanitizeOptionalString(typesenseSchema?.collection);
      const requestedTypesenseEnabled = modelSettings.typesense.enabled;
      const hasTypesenseSchema = Boolean(typesenseSchema);
      const hasTypesense =
        typeof requestedTypesenseEnabled === 'boolean'
          ? requestedTypesenseEnabled && hasTypesenseSchema
          : hasTypesenseSchema;
      const typesenseCollection = hasTypesense ? (typesenseCollectionRaw || tableModel) : null;
      const typesenseFields = uniqueStrings(
        (Array.isArray(typesenseSchema?.fields) ? typesenseSchema.fields : [])
          .map((field) => normalizeIdentifier((field as any)?.name)),
      );
      const typesenseSortableFields = uniqueStrings(
        (Array.isArray(typesenseSchema?.sortableFields) ? typesenseSchema.sortableFields : [])
          .map((field) => normalizeIdentifier(field)),
      );

      const crud = buildCrudContract(table, key, Boolean(table.router));
      const router = buildRouterContract(table, key, crud);
      const relations = buildRelationsContract(table.relations);

      const capabilities = uniqueStrings([
        table.router ? 'router' : '',
        crud.enabled ? 'crud' : '',
        hasTypesense ? 'typesense' : '',
        taxonomyKeys.length ? 'taxonomies' : '',
        subtableKeys.length ? 'subtables' : '',
        relations.length ? 'relations' : '',
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

      const warnings = [...modelSettings.warnings];
      if (requestedTypesenseEnabled === true && !hasTypesenseSchema) {
        warnings.push(
          `typesense.enabled=true but no typesense schema was generated for model "${tableModel}".`,
        );
      }
      if (crud.enabled && !table.router) {
        warnings.push(`crud is enabled for "${tableModel}" but router is missing.`);
      }

      const bootstrap: GeneratedBootstrapContract = {
        ensureTable: modelSettings.bootstrap.ensureTable,
        tableDefinition: {
          model: tableModel,
          type: String(table.table?.type ?? 'NORMAL').trim().toUpperCase() || 'NORMAL',
          schemaType,
          permissions: String(table.table?.permissions ?? 'full').trim().toLowerCase() || 'full',
        },
      };

      return {
        key,
        table: tableModel,
        label,
        description,
        authority,
        data,
        schemaType,
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
        relations,
        fields,
        requiredFields,
        crud,
        router,
        bootstrap,
        admin: { enabled: adminEnabled },
        settingsRaw: modelSettings.raw,
        warnings,
      };
    })
    .filter((entry): entry is GeneratedModelEntry => Boolean(entry))
    .filter((entry) => entry.key.length > 0 && entry.table.length > 0)
    .sort((a, b) => a.key.localeCompare(b.key));
}

function buildModelsFile(entries: GeneratedModelEntry[]): string {
  const body = entries
    .map((entry) => {
      const props = [
        `table: ${JSON.stringify(entry.table)}`,
        `authority: ${JSON.stringify(entry.authority)}`,
        `data: ${JSON.stringify(entry.data)}`,
        `schemaType: ${JSON.stringify(entry.schemaType)}`,
        ...(entry.slugPolicy ? [`slugPolicy: ${JSON.stringify(entry.slugPolicy)}`] : []),
      ];
      return `  ${JSON.stringify(entry.key)}: { ${props.join(', ')} }`;
    })
    .join(',\n');

  return [
    `// AUTO-GENERATED — models manifest for schema-kit runtime`,
    `export type ModelEntry = {`,
    `  table: string;`,
    `  authority: 'source' | 'tenant';`,
    `  data: 'local' | 'remote';`,
    `  schemaType?: 'schemaless' | 'schemafull';`,
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

function buildCanonicalManifest(entries: GeneratedModelEntry[]): GeneratedCanonicalManifestDocument {
  const models = Object.fromEntries(
    entries.map((entry) => {
      return [entry.key, {
        key: entry.key,
        table: entry.table,
        label: entry.label,
        description: entry.description,
        authority: entry.authority,
        data: entry.data,
        schemaType: entry.schemaType,
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
        relations: entry.relations,
        crud: entry.crud,
        router: entry.router,
        bootstrap: entry.bootstrap,
        admin: entry.admin,
        settingsRaw: entry.settingsRaw,
        warnings: entry.warnings,
      }];
    }),
  );

  const warnings = entries.flatMap((entry) =>
    entry.warnings.map((warning) => `${entry.key}: ${warning}`),
  );

  return {
    manifestVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    source: 'schema.modelsManifest',
    warnings,
    models,
  };
}

function buildCanonicalManifestTs(manifest: GeneratedCanonicalManifestDocument): string {
  const serialized = JSON.stringify(manifest, null, 2);

  return [
    `// AUTO-GENERATED — canonical models manifest`,
    `export const modelsManifest = ${serialized} as const;`,
    ``,
    `export type ModelsManifest = typeof modelsManifest;`,
    `export type ModelsManifestModel = ModelsManifest['models'][keyof ModelsManifest['models']];`,
    ``,
  ].join('\n');
}

function buildAdminManifest(entries: GeneratedModelEntry[]): GeneratedAdminManifestDocument {
  const models = Object.fromEntries(
    entries.map((entry) => {
      return [entry.key, {
        key: entry.key,
        table: entry.table,
        authority: entry.authority,
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
        relations: entry.relations,
        crud: entry.crud,
        router: entry.router,
        bootstrap: entry.bootstrap,
        admin: entry.admin,
        settingsRaw: entry.settingsRaw,
        warnings: entry.warnings,
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

function buildCrudContract(
  table: TableMigrationConfig,
  routerKey: string,
  routerEnabled: boolean
): GeneratedCrudContract {
  if (!table.crud || !routerEnabled) {
    return {
      enabled: false,
      create: null,
      update: null,
      delete: null,
    };
  }

  const create = resolveCrudProcedure(table.crud.create, 'create', routerKey);
  const update = resolveCrudProcedure(table.crud.update, 'update', routerKey);
  const remove = resolveCrudProcedure(table.crud.delete, 'delete', routerKey);

  return {
    enabled: Boolean(create || update || remove),
    create,
    update,
    delete: remove,
  };
}

function resolveCrudProcedure(
  operation: CrudOperationDefinition | undefined,
  fallback: string,
  routerKey: string
): string | null {
  if (operation && operation.enabled === false) {
    return null;
  }
  const name = sanitizeOptionalString(operation?.name) || fallback;
  return `${routerKey}.${name}`;
}

function buildRouterContract(
  table: TableMigrationConfig,
  routerKey: string,
  crud: GeneratedCrudContract
): GeneratedRouterContract {
  if (!table.router) {
    return {
      enabled: false,
      key: routerKey,
      parent: null,
      embedInParent: false,
      procedures: [],
    };
  }

  const procedures = uniqueStrings([
    ...extractRouterProcedures(table.router?.endpoints, routerKey),
    ...(crud.create ? [crud.create] : []),
    ...(crud.update ? [crud.update] : []),
    ...(crud.delete ? [crud.delete] : []),
  ]).sort((a, b) => a.localeCompare(b));

  return {
    enabled: true,
    key: routerKey,
    parent: sanitizeOptionalString(table.router.parent) || null,
    embedInParent: table.router.embedInParent === true,
    procedures,
  };
}

function extractRouterProcedures(
  endpoints: RouterEndpoint[] | undefined,
  routerKey: string
): string[] {
  if (!Array.isArray(endpoints)) return [];
  const procedures: string[] = [];

  for (const endpoint of endpoints) {
    if (!endpoint || typeof endpoint !== 'object' || Array.isArray(endpoint)) continue;
    const asRecord = endpoint as Record<string, unknown>;

    if (isPlainObject(asRecord.resource)) {
      for (const key of Object.keys(asRecord.resource)) {
        const op = sanitizeProcedureName(key);
        if (op) procedures.push(`${routerKey}.${op}`);
      }
      continue;
    }

    for (const key of Object.keys(asRecord)) {
      if (key === 'resource') continue;
      const op = sanitizeProcedureName(key);
      if (op) procedures.push(`${routerKey}.${op}`);
    }
  }

  return procedures;
}

function buildRelationsContract(relations: TableRelationConfig[] | undefined): GeneratedRelationContract[] {
  return (Array.isArray(relations) ? relations : [])
    .map((relation) => {
      const edge = sanitizeOptionalString(relation.edge);
      const left = normalizeIdentifier(relation.left);
      const right = normalizeIdentifier(relation.right);
      if (!edge || !left || !right) return null;

      const cardinality = String(relation.cardinality ?? 'many').trim().toLowerCase() === 'one'
        ? 'one'
        : 'many';
      const payloadField = sanitizeOptionalString(relation.payloadField) || `${right}${cardinality === 'many' ? 's' : ''}`;

      return {
        edge,
        left,
        right,
        cardinality,
        payloadField,
        storeOnModel: relation.storeOnModel !== false,
        required: relation.required === true,
        processor: sanitizeOptionalString(relation.processor) || 'functions',
        hook: sanitizeOptionalString(relation.hook) || 'right',
      } satisfies GeneratedRelationContract;
    })
    .filter((entry): entry is GeneratedRelationContract => Boolean(entry));
}

function normalizeModelSettings(raw: unknown): NormalizedModelSettings {
  const source = isPlainObject(raw) ? raw as TableModelSettingsConfig : {};
  const safeRaw = cloneRecord(source);
  const warnings: string[] = [];

  const schemaType = normalizeSchemaTypeValue(source.schemaType);
  if (source.schemaType !== undefined && !schemaType) {
    warnings.push(`Invalid modelSettings.schemaType value "${String(source.schemaType)}".`);
  }

  const authority =
    normalizeAuthority(source.authority) ??
    normalizeAuthority(source.dataLocation);
  if (source.authority !== undefined && !normalizeAuthority(source.authority)) {
    warnings.push(`Invalid modelSettings.authority value "${String(source.authority)}".`);
  } else if (source.dataLocation !== undefined && !normalizeAuthority(source.dataLocation)) {
    warnings.push(`Invalid modelSettings.dataLocation value "${String(source.dataLocation)}".`);
  }

  const bootstrapEnsureTable =
    isPlainObject(source.bootstrap) && typeof source.bootstrap.ensureTable === 'boolean'
      ? source.bootstrap.ensureTable
      : true;

  const bootstrapPermissions =
    isPlainObject(source.bootstrap) && isPlainObject(source.bootstrap.permissions)
      ? source.bootstrap.permissions
      : undefined;

  const adminEnabled =
    isPlainObject(source.admin) && typeof source.admin.enabled === 'boolean'
      ? source.admin.enabled
      : undefined;

  const typesenseEnabled =
    isPlainObject(source.typesense) && typeof source.typesense.enabled === 'boolean'
      ? source.typesense.enabled
      : undefined;

  const unknownKeys = Object.keys(source).filter((key) => !KNOWN_MODEL_SETTINGS_KEYS.has(key));
  if (unknownKeys.length > 0) {
    warnings.push(
      `Unknown model settings key(s): ${unknownKeys.join(', ')}. Preserving as passthrough metadata.`,
    );
  }

  return {
    ...(schemaType ? { schemaType } : {}),
    ...(authority ? { authority } : {}),
    bootstrap: {
      ensureTable: bootstrapEnsureTable,
      ...(bootstrapPermissions ? { permissions: bootstrapPermissions } : {}),
    },
    admin: {
      ...(typeof adminEnabled === 'boolean' ? { enabled: adminEnabled } : {}),
    },
    typesense: {
      ...(typeof typesenseEnabled === 'boolean' ? { enabled: typesenseEnabled } : {}),
    },
    raw: safeRaw,
    unknownKeys,
    warnings,
  };
}

function resolveSchemaType(table: TableMigrationConfig): ModelSchemaType {
  const raw = String(table.table?.schemaMode ?? '').trim().toLowerCase();
  if (raw === 'schemaful' || raw === 'schemafull') return 'schemafull';
  return 'schemaless';
}

function normalizeSchemaTypeValue(value: unknown): ModelSchemaType | undefined {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'schemaless') return 'schemaless';
  if (normalized === 'schemaful' || normalized === 'schemafull') return 'schemafull';
  return undefined;
}

function normalizeAuthority(value: unknown): ModelAuthority | undefined {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (['source', 'local', 'mothership', 'central', 'global', 'home'].includes(normalized)) return 'source';
  if (['tenant', 'remote', 'instance'].includes(normalized)) return 'tenant';
  return undefined;
}

function toLegacyDataMode(authority: ModelAuthority): LegacyDataMode {
  return authority === 'tenant' ? 'remote' : 'local';
}

function sanitizeOptionalString(value: unknown): string {
  const next = String(value ?? '').trim();
  return next.length > 0 ? next : '';
}

function sanitizeProcedureName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '');
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

function titleCase(value: string): string {
  return value
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cloneRecord(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isPlainObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
