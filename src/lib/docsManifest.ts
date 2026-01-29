import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import type { AppConfig, TableFieldEntry, TableFieldMeta, TableMigrationConfig } from '../types/config';

type DocsManifestField = {
  key: string;
  type: string;
  rawType?: string;
  format?: string;
  isId?: boolean;
  assign?: boolean;
  ignorePayload?: boolean;
  required: boolean;
  nullable?: boolean;
  default?: unknown;
  description?: string;
  items?: DocsManifestField;
  fields?: DocsManifestField[];
};

type DocsManifestTable = {
  key: string;
  name: string;
  model: string;
  description?: string;
  data: 'local' | 'remote';
  fields: DocsManifestField[];
  capabilities: {
    router: boolean;
    crud: {
      create: boolean;
      update: boolean;
      delete: boolean;
    };
    typesense: boolean;
    taxonomies: string[];
    edges: boolean;
    relations: boolean;
    subtables: boolean;
  };
  subTables?: Array<{
    key: string;
    name?: string;
    model?: string;
    tableType?: 'subsingle' | 'submany';
    description?: string;
    fields?: DocsManifestField[];
  }>;
  taxonomies?: Array<{
    key: string;
    hierarchical?: boolean;
    cardinality?: 'one' | 'many';
    storeOnModel?: boolean;
    required?: boolean;
    processor?: 'functions' | 'events' | 'none';
    payloadField?: string;
    labels?: {
      singular?: string;
      plural?: string;
    };
    taxonomy?: {
      model?: string;
      fields?: DocsManifestField[];
    };
    term?: {
      model?: string;
      fields?: DocsManifestField[];
    };
  }>;
  typesense?: {
    enabled: boolean;
    collection?: string;
    view?: unknown;
    schema?: unknown;
    meta?: Record<string, unknown>;
  };
  docs: {
    types: string;
  };
  id?: {
    type?: string;
    structure?: string | string[];
    source?: string | string[];
    exportName?: string;
    exportType?: boolean;
    exportZodName?: string;
  };
};

type DocsManifest = {
  generatedAt: string;
  source: string;
  instances: {
    default: string;
    active: string[];
    all: string[];
  };
  tables: Record<string, DocsManifestTable>;
};

interface GenerateDocsManifestOptions {
  app: AppConfig;
  tables: TableMigrationConfig[];
  projectRoot: string;
  outputPath?: string;
}

const toCamel = (value: string): string => {
  const pascal = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : '';
};

const resolveSchemaDocsRoot = (app: AppConfig, projectRoot: string): string | null => {
  const schemaApp = app.documentation?.schemaApp;

  if (schemaApp?.location) {
    return path.resolve(projectRoot, schemaApp.location);
  }

  if (schemaApp?.project?.nuxtProjectRoot) {
    return path.resolve(projectRoot, schemaApp.project.nuxtProjectRoot);
  }

  const project = app.paths.projects.find((proj) => proj.name === 'schema-docs');
  if (project?.nuxtProjectRoot) {
    return path.resolve(projectRoot, project.nuxtProjectRoot);
  }

  return null;
};

const normalizeFieldType = (rawType?: string): { type: string; format?: string; rawType?: string } => {
  if (!rawType) return { type: 'unknown' };
  const lowered = rawType.toLowerCase();
  const program = lowered.split('<')[0] ?? lowered;
  const programType = program.trim();

  const formatMap: Record<string, string> = {
    email: 'email',
    password: 'password',
    url: 'url',
    uri: 'url',
    uuid: 'uuid',
    uniqueid: 'uniqueid',
    phone: 'phone',
    slug: 'slug',
    datetime: 'datetime',
    date: 'date',
    time: 'time',
    md5: 'md5',
  };

  if (programType in formatMap) {
    return { type: 'string', format: formatMap[programType], rawType };
  }

  if (programType.startsWith('record')) {
    return { type: 'record', format: 'record', rawType };
  }

  return { type: rawType };
};

const mapFieldMeta = (key: string, meta: TableFieldMeta): DocsManifestField => {
  const normalized = normalizeFieldType(meta.type ?? 'unknown');
  const field: DocsManifestField = {
    key,
    type: normalized.type ?? 'unknown',
    required: Boolean(meta.required),
    ...(normalized.rawType ? { rawType: normalized.rawType } : {}),
    ...(normalized.format ? { format: normalized.format } : {}),
    ...(key === 'id' ? { isId: true } : {}),
  };

  if (meta.assign) field.assign = true;
  if (meta.ignorePayload) field.ignorePayload = true;
  if (meta.nullable !== undefined) field.nullable = meta.nullable;
  if (meta.default !== undefined) field.default = meta.default;
  if (meta.description) field.description = meta.description;

  if (meta.items) {
    field.items = mapFieldMeta(`${key}[]`, meta.items);
  }

  if (meta.fields) {
    field.fields = Object.entries(meta.fields).map(([childKey, childMeta]) =>
      mapFieldMeta(childKey, childMeta)
    );
  }

  return field;
};

const mapFields = (fields?: TableFieldEntry[]): DocsManifestField[] => {
  if (!fields) return [];
  const mapped: DocsManifestField[] = [];

  for (const entry of fields) {
    for (const [key, meta] of Object.entries(entry)) {
      mapped.push(mapFieldMeta(key, meta));
    }
  }

  return mapped;
};

const mapResourceFields = (fields?: Array<string | Record<string, any>>): DocsManifestField[] => {
  if (!fields) return [];
  const mapped: DocsManifestField[] = [];
  for (const entry of fields) {
    if (typeof entry === 'string') {
      mapped.push({ key: entry, type: 'string', required: false });
      continue;
    }
    const [key, value] = Object.entries(entry)[0] ?? [];
    if (!key) continue;
    const valueType = Array.isArray(value)
      ? 'array'
      : value === null
        ? 'unknown'
        : typeof value === 'string'
          ? value
          : typeof value === 'number'
            ? 'number'
            : typeof value === 'boolean'
              ? 'boolean'
              : 'object';
    mapped.push({ key, type: valueType, required: false });
  }
  return mapped;
};

const collectSubTables = (
  entries?: TableMigrationConfig[],
  seenKeys: Set<string> = new Set()
): DocsManifestTable['subTables'] => {
  if (!entries?.length) return [];
  const output: NonNullable<DocsManifestTable['subTables']> = [];

  const visit = (subs?: TableMigrationConfig[]) => {
    if (!subs?.length) return;
    subs.forEach((sub) => {
      const key = toCamel(String(sub.name ?? sub.table?.model ?? 'subtable'));
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        output.push({
          key,
          name: sub.name,
          model: sub.table?.model,
          tableType: sub.tableType,
          description: sub.description,
          fields: mapFields(sub.fields),
        });
      }

      if (sub.subTables?.length) {
        visit(sub.subTables);
      }
    });
  };

  visit(entries);
  return output;
};

const buildTypesDoc = (table: DocsManifestTable): string => {
  const rows = table.fields
    .map((field) => {
      const defaultValue = field.default === undefined ? '' : `\`${JSON.stringify(field.default)}\``;
      const typeLabel = field.rawType ?? field.type;
      return `| \`${field.key}\` | \`${typeLabel}\` | ${field.required ? 'yes' : 'no'} | ${defaultValue} |`;
    })
    .join('\n');

  const idLines = table.id
    ? [
        `## ID`,
        ``,
        `- Export name: \`${table.id.exportName ?? ''}\``,
        table.id.exportType ? `- Exported: yes` : `- Exported: no`,
        table.id.source ? `- Source: \`${JSON.stringify(table.id.source)}\`` : '',
        table.id.structure ? `- Structure: \`${JSON.stringify(table.id.structure)}\`` : '',
        ``,
      ].filter((line) => line !== '')
    : [];

  return [
    `# ${table.name} — Types`,
    ``,
    table.description ? `_${table.description}_` : '',
    table.description ? '' : '',
    `**Table:** \`${table.model}\``,
    ``,
    `## Fields`,
    ``,
    `| Field | Type | Required | Default |`,
    `| --- | --- | --- | --- |`,
    rows || '| (none) | | | |',
    ``,
    ...idLines,
    `## Notes`,
    `- Types are inferred from the graph + generated specs.`,
    `- Record ids returned by SurrealDB are objects; pass the record sub-id (\`record.id\`) to routers.`,
    ``,
  ]
    .filter((line) => line !== '')
    .join('\n');
};

export async function generateDocsManifest(options: GenerateDocsManifestOptions): Promise<void> {
  const { app, tables, projectRoot, outputPath: overrideOutput } = options;
  const schemaDocsRoot = resolveSchemaDocsRoot(app, projectRoot);

  if (!schemaDocsRoot) {
    console.log('ℹ️  No schema-docs app configured. Skipping docs manifest generation.');
    return;
  }

  const outputPath = overrideOutput ?? path.resolve(schemaDocsRoot, 'app/data/docs-manifest.json');
  const docsRoot = path.resolve(schemaDocsRoot, 'docs/api/models');

  const dbEntries = Object.entries(app.databases ?? {});
  const activeInstances = dbEntries
    .filter(([, config]) => config.active)
    .map(([key]) => key);
  const allInstances = dbEntries.map(([key]) => key);
  const activeRoots = dbEntries.filter(([, config]) => config.root === true && config.active);
  const rootKey = activeRoots.length > 0
    ? activeRoots[0][0]
    : dbEntries.find(([, config]) => config.root === true)?.[0] ?? null;
  const defaultKey = app.environment.defaultDatabase;
  const hasDefault = dbEntries.some(([key, config]) => key === defaultKey && config.active);
  const activeFallback = dbEntries.find(([, config]) => config.active)?.[0] ?? null;
  const resolvedDefault = rootKey ?? (hasDefault ? defaultKey : activeFallback) ?? defaultKey;

  const manifest: DocsManifest = {
    generatedAt: new Date().toISOString(),
    source: 'config/specs',
    instances: {
      default: resolvedDefault,
      active: activeInstances,
      all: allInstances,
    },
    tables: {},
  };

  const mainTables = tables.filter(
    (table) => table.tableType !== 'subsingle' && table.tableType !== 'submany'
  );

  for (const table of mainTables) {
    const key = toCamel(String(table.name ?? table.table?.model ?? 'table'));
    const fields = mapFields(table.fields);
    const dataSource = table.admin?.data ?? 'local';

    const entry: DocsManifestTable = {
      key,
      name: table.name ?? key,
      model: table.table?.model ?? key,
      description: table.description,
      data: dataSource,
      fields,
      capabilities: {
        router: Boolean(table.router),
        crud: {
          create: Boolean(table.crud?.create?.enabled),
          update: Boolean(table.crud?.update?.enabled),
          delete: Boolean(table.crud?.delete?.enabled),
        },
        typesense: Boolean(table.typesense),
        taxonomies: table.taxonomies?.map((tax) => tax.key) ?? [],
        edges: Boolean(table.edges),
        relations: Boolean(table.relations?.length),
        subtables: Boolean(table.subTables?.length),
      },
      subTables: collectSubTables(table.subTables),
      taxonomies: table.taxonomies?.map((tax) => ({
        key: tax.key,
        hierarchical: tax.hierarchical,
        cardinality: tax.cardinality,
        storeOnModel: tax.storeOnModel,
        required: tax.required,
        processor: tax.processor,
        payloadField: tax.payloadField,
        labels: tax.labels,
        taxonomy: {
          model: tax.taxonomy?.model,
          fields: mapResourceFields(tax.taxonomy?.fields),
        },
        term: {
          model: tax.term?.model,
          fields: mapResourceFields(tax.term?.fields),
        },
      })),
      ...(table.typesense
        ? {
            typesense: {
              enabled: true,
              collection: table.typesense.schema?.collection,
              view: table.typesense.view,
              schema: table.typesense.schema,
              meta: table.typesense.meta ?? {},
            },
          }
        : { typesense: { enabled: false } }),
      docs: {
        types: `docs/api/models/${key}/types.md`,
      },
      id: table.id
        ? {
            type: table.id.type,
            structure: table.id.structure,
            source: table.id.source,
            exportName: table.id.exportName,
            exportType: table.id.exportType,
            exportZodName: table.id.exportZodName,
          }
        : undefined,
    };

    manifest.tables[key] = entry;

    const tableDocsDir = path.join(docsRoot, key);
    await mkdir(tableDocsDir, { recursive: true });
    const typesDoc = buildTypesDoc(entry);
    await writeFile(path.join(tableDocsDir, 'types.md'), typesDoc, 'utf-8');
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`🧾 Generated docs manifest: ${path.relative(projectRoot, outputPath)}`);
}
