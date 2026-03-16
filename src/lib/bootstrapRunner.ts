import { readFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { stat } from 'fs/promises';
import { join, resolve, parse } from 'path';
import type {
  AppDatabaseConfig,
  BootstrapFunctionImports,
  BootstrapTableImports,
  OnExistingMode,
  TableMigrationConfig,
} from '../types';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker, DEFAULT_ASSET_RECORD_ID } from './assetTracker';
import { fetchRemoteAssetsFromDb, isAssetChanged } from './assetDiff';
import { applyOnExisting, normalizeOnExisting } from './onExisting';
import { connectSurreal } from './surrealClient';

export interface BootstrapOptions {
  dryRun?: boolean;
  onExisting?: OnExistingMode;
  assetTracking?: AssetTrackingOptions;
  onlyChanged?: boolean;
  manifestPath?: string;
  tables?: TableMigrationConfig[];
  projectRoot?: string;
}

export async function runBootstrapFunctions(
  database: AppDatabaseConfig,
  config: BootstrapFunctionImports | undefined,
  options: BootstrapOptions = {},
  baseDirOverride?: string
): Promise<void> {
  if (!config) {
    console.log('ℹ️  No bootstrap function configuration found; skipping.');
    return;
  }

  const baseDir = baseDirOverride ?? resolve(process.cwd(), 'config', 'bootstrap', 'functions');
  const directories = config.directories ?? [];
  const files = config.files ?? [];
  const exclude = config.exclude ?? [];
  const defaultMode: OnExistingMode = normalizeOnExisting(options.onExisting ?? config.defaultOnExisting);

  const candidates = new Map<string, { content: string; filePath: string }>();

  const addFile = async (filePath: string) => {
    const absPath = resolve(baseDir, filePath);
    const fileStat = await safeStat(absPath);
    if (!fileStat?.isFile() || !absPath.endsWith('.surql')) {
      console.warn(`⚠️  Skipping non-surql file: ${absPath}`);
      return;
    }
    const name = parse(absPath).name;
    const content = await readFile(absPath, 'utf-8');
    candidates.set(name, { content, filePath: absPath });
  };

  // If directories specified, gather files (recursively)
  for (const dir of directories) {
    const dirPath = resolve(baseDir, dir);
    await collectSurqlFiles(dirPath, candidates);
  }

  if (files.length > 0) {
    const explicitSet = new Set(
      files.map((entry) => (entry.endsWith('.surql') ? entry : `${entry}.surql`))
    );
    const required = Array.from(explicitSet);
    const explicitCandidates = new Map<string, { content: string; filePath: string }>();
    for (const entry of required) {
      const absEntry = resolve(baseDir, entry);
      const fileStat = await safeStat(absEntry);
      if (!fileStat?.isFile()) {
        console.warn(`⚠️  Explicit function file not found: ${absEntry}`);
        continue;
      }
      const name = parse(absEntry).name;
      const content = await readFile(absEntry, 'utf-8');
      explicitCandidates.set(name, { content, filePath: absEntry });
    }
    candidates.clear();
    for (const [key, value] of explicitCandidates.entries()) {
      candidates.set(key, value);
    }
  }

  if (candidates.size === 0) {
    console.log('ℹ️  No functions selected for bootstrap.');
    return;
  }

  if (exclude.length > 0) {
    const excludeNames = new Set(exclude.map((entry) => parse(entry).name));
    for (const name of Array.from(candidates.keys())) {
      if (excludeNames.has(name)) {
        candidates.delete(name);
      }
    }
    if (candidates.size === 0) {
      console.log('ℹ️  All bootstrap functions excluded; nothing to import.');
      return;
    }
  }

  if (options.dryRun) {
    for (const functionName of candidates.keys()) {
      console.log(`[dry-run] DEFINE FUNCTION ${functionName} (${defaultMode})`);
    }
    return;
  }

  const db = await connectSurreal(database);
  const tracker = await createAssetTracker(options.assetTracking);

  try {
    if (options.onlyChanged) {
      const recordId = options.assetTracking?.recordId ?? DEFAULT_ASSET_RECORD_ID;
      const projectRoot = options.assetTracking?.projectRoot ?? process.cwd();
      const remoteAssets = await fetchRemoteAssetsFromDb(db, recordId);
      for (const [name, entry] of Array.from(candidates.entries())) {
        if (!isAssetChanged(entry.filePath, entry.content, remoteAssets, projectRoot)) {
          candidates.delete(name);
        }
      }
      if (candidates.size === 0) {
        console.log('ℹ️  No changed bootstrap functions to import (only-changed enabled).');
        return;
      }
    }

    for (const [functionName, entry] of candidates.entries()) {
      const modifiedQuery = applyOnExisting(entry.content, defaultMode);
      await db.query(modifiedQuery);
      console.log(`✅ Imported function ${functionName} (${defaultMode})`);
      if (tracker) {
        await tracker.recordImport(db, {
          filePath: entry.filePath,
          content: entry.content,
          meta: {
            source: 'bootstrap',
            layer: 'functions',
          },
        });
      }
    }
  } finally {
    await db.close();
  }
}

export async function runBootstrapTables(
  database: AppDatabaseConfig,
  config: BootstrapTableImports | undefined,
  options: BootstrapOptions = {}
): Promise<void> {
  const manifestPath = options.manifestPath ?? resolve(process.cwd(), 'config', 'generated', 'models.manifest.json');
  const projectRoot = options.projectRoot ?? process.cwd();
  const includeModels = normalizeIncludeModels(config?.files);

  const manifestDefinitions = await loadManifestBootstrapTables(manifestPath);
  const fallbackDefinitions = buildFallbackBootstrapTables(options.tables ?? []);
  const merged = mergeBootstrapTableDefinitions([
    ...manifestDefinitions,
    ...fallbackDefinitions,
  ]);
  const filtered = filterBootstrapTables(merged, includeModels);

  if (filtered.length === 0) {
    console.log('ℹ️  No bootstrap tables resolved; skipping.');
    return;
  }

  if (options.dryRun) {
    for (const table of filtered) {
      console.log(`[dry-run] ${buildDefineTableStatement(table)}`);
    }
    return;
  }

  const db = await connectSurreal(database);
  try {
    for (const table of filtered) {
      const statement = buildDefineTableStatement(table);
      await db.query(statement);
      console.log(`✅ Ensured table ${table.model} (${table.type.toUpperCase()}, ${table.schemaType.toUpperCase()})`);
    }
  } finally {
    await db.close();
  }

  const manifestRelative = normalizeRelativePath(projectRoot, manifestPath);
  console.log(`🧱 Bootstrap tables ensured (${filtered.length}) using ${manifestRelative}`);
}

type BootstrapSchemaType = 'schemaless' | 'schemafull';

interface BootstrapTableDefinition {
  model: string;
  type: string;
  schemaType: BootstrapSchemaType;
  permissions: string;
  in?: string;
  out?: string;
}

interface ManifestModelBootstrap {
  ensureTable?: boolean;
  tableDefinition?: {
    model?: string;
    type?: string;
    schemaType?: string;
    permissions?: string;
    in?: string;
    out?: string;
  };
  taxonomyTables?: Array<{
    model?: string;
    type?: string;
    schemaType?: string;
    permissions?: string;
    in?: string;
    out?: string;
  }>;
  taxonomyEdges?: Array<{
    model?: string;
    type?: string;
    schemaType?: string;
    permissions?: string;
    in?: string;
    out?: string;
  }>;
}

interface CanonicalModelsManifest {
  bootstrapTables?: Array<{
    model?: string;
    type?: string;
    schemaType?: string;
    permissions?: string;
    in?: string;
    out?: string;
  }>;
  models?: Record<string, { bootstrap?: ManifestModelBootstrap }>;
}

async function loadManifestBootstrapTables(manifestPath: string): Promise<BootstrapTableDefinition[]> {
  try {
    const raw = await readFile(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as CanonicalModelsManifest;

    if (Array.isArray(parsed.bootstrapTables) && parsed.bootstrapTables.length > 0) {
      return parsed.bootstrapTables
        .map((entry) => normalizeBootstrapTableDefinition(entry))
        .filter((entry): entry is BootstrapTableDefinition => Boolean(entry));
    }

    const fromModels: BootstrapTableDefinition[] = [];
    const models = parsed.models ?? {};
    for (const modelEntry of Object.values(models)) {
      const bootstrap = modelEntry?.bootstrap;
      if (!bootstrap || bootstrap.ensureTable === false) continue;
      if (bootstrap.tableDefinition) {
        const normalized = normalizeBootstrapTableDefinition(bootstrap.tableDefinition);
        if (normalized) fromModels.push(normalized);
      }
      for (const taxonomyTable of bootstrap.taxonomyTables ?? []) {
        const normalized = normalizeBootstrapTableDefinition(taxonomyTable);
        if (normalized) fromModels.push(normalized);
      }
      for (const taxonomyEdge of bootstrap.taxonomyEdges ?? []) {
        const normalized = normalizeBootstrapTableDefinition(taxonomyEdge);
        if (normalized) fromModels.push(normalized);
      }
    }

    return fromModels;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn(`⚠️  Failed reading models manifest at ${manifestPath}:`, error?.message ?? error);
    }
    return [];
  }
}

function buildFallbackBootstrapTables(tables: TableMigrationConfig[]): BootstrapTableDefinition[] {
  const definitions: BootstrapTableDefinition[] = [];
  if (tables.length === 0) {
    return definitions;
  }

  definitions.push({
    model: 'app',
    type: 'NORMAL',
    schemaType: 'schemaless',
    permissions: 'full',
  });

  for (const table of tables) {
    const tableModel = sanitizeIdentifier(table.table?.model ?? '');
    if (!tableModel) continue;

    const ensureTable = resolveEnsureTableSetting(table);
    if (ensureTable) {
      definitions.push({
        model: tableModel,
        type: String(table.table?.type ?? 'NORMAL').trim().toUpperCase() || 'NORMAL',
        schemaType: resolveSchemaType(table),
        permissions: String(table.table?.permissions ?? 'full').trim().toLowerCase() || 'full',
      });
    }

    for (const relation of table.relations ?? []) {
      const edge = sanitizeIdentifier(relation.edge ?? '');
      const left = sanitizeIdentifier(relation.left ?? '');
      const right = sanitizeIdentifier(relation.right ?? '');
      if (!edge || !left || !right) continue;
      definitions.push({
        model: edge,
        type: 'RELATION',
        schemaType: 'schemafull',
        permissions: 'full',
        in: left,
        out: right,
      });
    }

    const tableLabel = toPascalCase(table.name || tableModel);
    for (const taxonomy of table.taxonomies ?? []) {
      const taxonomyKey = sanitizeIdentifier(taxonomy.key ?? '');
      if (!taxonomyKey) continue;

      const taxonomyModel = sanitizeIdentifier(taxonomy.taxonomy?.model ?? 'tax');
      const termModel = sanitizeIdentifier(
        taxonomy.term?.model ?? `t_${sanitizeIdentifier(tableModel).toLowerCase()}_${taxonomyKey.toLowerCase()}`
      );
      const labelSingular = toPascalCase(taxonomy.labels?.singular ?? taxonomyKey);
      const labelPlural = toPascalCase(taxonomy.labels?.plural ?? labelSingular);
      const defaultEdgeBase =
        labelPlural && labelSingular && labelPlural !== labelSingular
          ? labelPlural
          : (labelSingular || labelPlural || 'Term');

      if (taxonomyModel) {
        definitions.push({
          model: taxonomyModel,
          type: 'NORMAL',
          schemaType: 'schemaless',
          permissions: 'full',
        });
      }

      if (termModel) {
        definitions.push({
          model: termModel,
          type: 'NORMAL',
          schemaType: 'schemaless',
          permissions: 'full',
        });
      }

      const defaultTaxonomyToTerms = sanitizeIdentifier(`${tableLabel}${defaultEdgeBase}Terms`);
      const defaultRecordToTerm = sanitizeIdentifier(`${tableLabel}${defaultEdgeBase}`);
      const edgeTaxonomyToTerm = sanitizeIdentifier(
        taxonomy.edges?.taxonomyToTerms ?? taxonomy.taxonomyEdgeName ?? defaultTaxonomyToTerms
      );
      const edgeRecordToTerm = sanitizeIdentifier(
        taxonomy.edges?.recordToTerm ?? taxonomy.edgeName ?? defaultRecordToTerm
      );

      if (edgeTaxonomyToTerm && taxonomyModel && termModel) {
        definitions.push({
          model: edgeTaxonomyToTerm,
          type: 'RELATION',
          schemaType: 'schemafull',
          permissions: 'full',
          in: taxonomyModel,
          out: termModel,
        });
      }

      if (edgeRecordToTerm && tableModel && termModel) {
        definitions.push({
          model: edgeRecordToTerm,
          type: 'RELATION',
          schemaType: 'schemafull',
          permissions: 'full',
          in: tableModel,
          out: termModel,
        });
      }
    }
  }

  return definitions;
}

function resolveEnsureTableSetting(table: TableMigrationConfig): boolean {
  const modelSettings = (table as any).modelSettings;
  if (
    modelSettings &&
    typeof modelSettings === 'object' &&
    modelSettings.bootstrap &&
    typeof modelSettings.bootstrap === 'object' &&
    typeof modelSettings.bootstrap.ensureTable === 'boolean'
  ) {
    return modelSettings.bootstrap.ensureTable;
  }
  return true;
}

function resolveSchemaType(table: TableMigrationConfig): BootstrapSchemaType {
  const modelSettings = (table as any).modelSettings;
  const configuredSchemaType = String(modelSettings?.schemaType ?? '').trim().toLowerCase();
  if (configuredSchemaType === 'schemafull' || configuredSchemaType === 'schemaful') {
    return 'schemafull';
  }

  const schemaMode = String(table.table?.schemaMode ?? '').trim().toLowerCase();
  if (schemaMode === 'schemaful' || schemaMode === 'schemafull') {
    return 'schemafull';
  }

  return 'schemaless';
}

function normalizeBootstrapTableDefinition(
  value: {
    model?: string;
    type?: string;
    schemaType?: string;
    permissions?: string;
    in?: string;
    out?: string;
  }
): BootstrapTableDefinition | null {
  const model = sanitizeIdentifier(value.model ?? '');
  if (!model) return null;

  const type = String(value.type ?? 'NORMAL').trim().toUpperCase() || 'NORMAL';
  const schemaRaw = String(value.schemaType ?? 'schemaless').trim().toLowerCase();
  const schemaType: BootstrapSchemaType =
    schemaRaw === 'schemafull' || schemaRaw === 'schemaful' ? 'schemafull' : 'schemaless';
  const permissions = String(value.permissions ?? 'full').trim().toLowerCase() || 'full';
  const inModel = sanitizeIdentifier(value.in ?? '');
  const outModel = sanitizeIdentifier(value.out ?? '');

  return {
    model,
    type,
    schemaType,
    permissions,
    ...(inModel ? { in: inModel } : {}),
    ...(outModel ? { out: outModel } : {}),
  };
}

function mergeBootstrapTableDefinitions(
  entries: BootstrapTableDefinition[]
): BootstrapTableDefinition[] {
  const byTable = new Map<string, BootstrapTableDefinition>();

  for (const entry of entries) {
    const key = entry.model.toLowerCase();
    const existing = byTable.get(key);
    if (!existing) {
      byTable.set(key, entry);
      continue;
    }

    const merged: BootstrapTableDefinition = {
      model: existing.model,
      type: existing.type === 'RELATION' || entry.type !== 'RELATION' ? existing.type : 'RELATION',
      schemaType:
        existing.schemaType === 'schemafull' || entry.schemaType !== 'schemafull'
          ? existing.schemaType
          : 'schemafull',
      permissions: existing.permissions || entry.permissions || 'full',
      ...(existing.in ? { in: existing.in } : entry.in ? { in: entry.in } : {}),
      ...(existing.out ? { out: existing.out } : entry.out ? { out: entry.out } : {}),
    };

    byTable.set(key, merged);
  }

  return Array.from(byTable.values()).sort((a, b) => a.model.localeCompare(b.model));
}

function filterBootstrapTables(
  entries: BootstrapTableDefinition[],
  includeModels: Set<string> | null
): BootstrapTableDefinition[] {
  if (!includeModels || includeModels.size === 0) return entries;
  return entries.filter((entry) => includeModels.has(entry.model.toLowerCase()));
}

function buildDefineTableStatement(entry: BootstrapTableDefinition): string {
  const schemaMode = entry.schemaType === 'schemafull' ? 'SCHEMAFULL' : 'SCHEMALESS';
  const tableType = String(entry.type || 'NORMAL').trim().toUpperCase() || 'NORMAL';
  const permissions = String(entry.permissions || 'full').trim().toUpperCase() || 'FULL';

  if (tableType === 'RELATION') {
    const inModel = sanitizeIdentifier(entry.in ?? '') || 'record';
    const outModel = sanitizeIdentifier(entry.out ?? '') || 'record';
    return `DEFINE TABLE IF NOT EXISTS ${entry.model} ${schemaMode} TYPE RELATION IN ${inModel} OUT ${outModel} PERMISSIONS ${permissions};`;
  }

  return `DEFINE TABLE IF NOT EXISTS ${entry.model} ${schemaMode} TYPE ${tableType} PERMISSIONS ${permissions};`;
}

function normalizeIncludeModels(files?: string[]): Set<string> | null {
  if (!files || files.length === 0) return null;
  const normalized = files
    .map((entry) => parse(entry).name.trim().toLowerCase())
    .filter(Boolean);
  return normalized.length > 0 ? new Set(normalized) : null;
}

function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function sanitizeIdentifier(value: string): string {
  return String(value ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeRelativePath(projectRoot: string, targetPath: string): string {
  const rel = targetPath.startsWith(projectRoot) ? targetPath.slice(projectRoot.length + 1) : targetPath;
  return rel || targetPath;
}

async function collectSurqlFiles(
  dir: string,
  target: Map<string, { content: string; filePath: string }>
): Promise<void> {
  const dirStat = await safeStat(dir);
  if (!dirStat?.isDirectory()) {
    console.warn(`⚠️  Bootstrap directory not found: ${dir}`);
    return;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectSurqlFiles(entryPath, target);
    } else if (entry.isFile() && entry.name.endsWith('.surql')) {
      const content = await readFile(entryPath, 'utf-8');
      const name = parse(entry.name).name;
      target.set(name, { content, filePath: entryPath });
    }
  }
}

// Uses connectSurreal helper.

async function safeStat(filePath: string) {
  try {
    return await stat(filePath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
