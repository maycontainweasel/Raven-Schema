import { readFile, readdir } from 'fs/promises';
import path from 'path';
import type { AppDatabaseConfig, OnExistingMode, TableMigrationConfig } from '../types';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker, DEFAULT_ASSET_RECORD_ID } from './assetTracker';
import { fetchRemoteAssetsFromDb, isAssetChanged } from './assetDiff';
import { getTableAssetDir } from './tableAssetPaths';
import { applyOnExisting, normalizeOnExisting } from './onExisting';
import { connectSurreal } from './surrealClient';
import { cleanupTableArtifacts } from './tableCleanup';

export type AssetLayer = 'functions' | 'events' | 'views' | 'indexes' | 'edges';

const LAYER_PREFIX: Record<AssetLayer, string> = {
  functions: 'F_',
  events: 'E_',
  views: 'V_',
  indexes: 'I_',
  edges: 'L_',
};

export interface SurqlImportOptions {
  dryRun?: boolean;
  migrationsRoot: string;
  overrides?: Partial<Record<AssetLayer, string>>;
  layers?: AssetLayer[];
  fileFilters?: SurqlFileFilters;
  cleanupFilters?: CleanupFilters;
  onExisting?: OnExistingMode;
  assetTracking?: AssetTrackingOptions;
  onlyChanged?: boolean;
}

export type SurqlFileFilters = {
  include?: Partial<Record<AssetLayer, string[]>>;
  exclude?: Partial<Record<AssetLayer, string[]>>;
};

export type CleanupFilters = {
  events?: { include?: '*' | string[]; exclude?: string[] };
  indexes?: { include?: '*' | string[]; exclude?: string[] };
  views?: { include?: '*' | string[]; exclude?: string[] };
};

interface SurqlFile {
  table: TableMigrationConfig;
  name: string;
  layer: AssetLayer;
  source: 'override' | 'generated';
  content: string;
  filePath: string;
}

/**
 * Import generated SURQL assets (functions/events/views/indexes) into SurrealDB.
 * For a given table and layer, override files take precedence over generated files.
 */
export async function importSurqlAssets(
  database: AppDatabaseConfig,
  tables: TableMigrationConfig[],
  options: SurqlImportOptions
): Promise<void> {
  const layers = options.layers && options.layers.length > 0
    ? options.layers
    : (['functions', 'events', 'views', 'indexes', 'edges'] as AssetLayer[]);

  let files = await collectSurqlFiles(tables, layers, options);
  if (options.fileFilters) {
    files = applyFileFilters(files, options.fileFilters);
  }
  const onExisting = normalizeOnExisting(options.onExisting);

  if (files.length === 0) {
    console.log('ℹ️  No SURQL files found to import for selected layers.');
    return;
  }

  if (options.dryRun) {
    for (const file of files) {
      console.log(`[dry-run] Would import ${file.name} (${file.layer}, ${file.source}, ${onExisting})`);
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
      const filtered = files.filter((file) =>
        isAssetChanged(file.filePath, file.content, remoteAssets, projectRoot)
      );
      if (filtered.length === 0) {
        console.log('ℹ️  No changed assets to import (only-changed enabled).');
        return;
      }
      files = filtered;
    }

    const cleanupPlan = buildCleanupPlan(files);
    for (const [tableName, targets] of cleanupPlan) {
      await cleanupTableArtifacts(db, tableName, {
        dropEvents: targets.events,
        dropIndexes: targets.indexes,
        dropViews: targets.views,
        includeEvents: options.cleanupFilters?.events?.include,
        excludeEvents: options.cleanupFilters?.events?.exclude,
        includeIndexes: options.cleanupFilters?.indexes?.include,
        excludeIndexes: options.cleanupFilters?.indexes?.exclude,
        includeViews: options.cleanupFilters?.views?.include,
        excludeViews: options.cleanupFilters?.views?.exclude,
        dryRun: false,
      });
    }

    for (const file of files) {
      const content = applyOnExisting(file.content, onExisting);
      console.log(`📤 Importing ${file.name} (${file.layer}, ${file.source})`);
      await db.query(content);
      if (tracker) {
        const tableName = file.table.table?.model ?? file.table.name;
        await tracker.recordImport(db, {
          filePath: file.filePath,
          content: file.content,
          meta: {
            source: file.source,
            layer: file.layer,
            table: tableName,
          },
        });
      }
    }
  } finally {
    await db.close();
  }
}

function normalizeFileToken(token: string): string {
  return path.parse(token).name.toLowerCase();
}

function normalizeFilterMap(
  map?: Partial<Record<AssetLayer, string[]>>
): Partial<Record<AssetLayer, string[]>> {
  if (!map) return {};
  const out: Partial<Record<AssetLayer, string[]>> = {};
  (Object.keys(map) as AssetLayer[]).forEach((key) => {
    const entries = map[key];
    if (!entries || entries.length === 0) return;
    out[key] = entries.map((entry) => normalizeFileToken(entry));
  });
  return out;
}

function applyFileFilters(files: SurqlFile[], filters: SurqlFileFilters): SurqlFile[] {
  const includeMap = normalizeFilterMap(filters.include);
  const excludeMap = normalizeFilterMap(filters.exclude);

  return files.filter((file) => {
    const key = normalizeFileToken(file.name);
    const includes = includeMap[file.layer];
    if (includes && includes.length > 0 && !includes.includes(key)) {
      return false;
    }
    const excludes = excludeMap[file.layer];
    if (excludes && excludes.length > 0 && excludes.includes(key)) {
      return false;
    }
    return true;
  });
}

async function collectSurqlFiles(
  tables: TableMigrationConfig[],
  layers: AssetLayer[],
  options: SurqlImportOptions
): Promise<SurqlFile[]> {
  const files: SurqlFile[] = [];

  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) tablesByModel.set(model, table);
  }

  for (const table of tables) {
    const relPath = getTableAssetDir(table, tablesByModel, '');
    const generatedDir = path.resolve(options.migrationsRoot, relPath);

    for (const layer of layers) {
      const overrideDir = options.overrides?.[layer]
        ? path.resolve(options.overrides[layer] as string, relPath)
        : null;
      const prefix = LAYER_PREFIX[layer];

      const candidates = new Map<string, SurqlFile>();

      if (overrideDir) {
        const overrides = await readLayerFiles(overrideDir, table, layer, prefix, 'override');
        for (const file of overrides) {
          candidates.set(file.name.toLowerCase(), file);
        }
      }

      const generated = await readLayerFiles(generatedDir, table, layer, prefix, 'generated');
      for (const file of generated) {
        if (!candidates.has(file.name.toLowerCase())) {
          candidates.set(file.name.toLowerCase(), file);
        }
      }

      candidates.forEach((file) => files.push(file));
    }
  }

  return files;
}

async function readLayerFiles(
  dir: string,
  table: TableMigrationConfig,
  layer: AssetLayer,
  prefix: string,
  source: 'override' | 'generated'
): Promise<SurqlFile[]> {
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  const files: SurqlFile[] = [];
  for (const entry of entries) {
    if (!entry.startsWith(prefix) || !entry.endsWith('.surql')) continue;
    // Skip bundle files (Z_*) and any other non-layer content
    if (entry.startsWith('Z_')) continue;

    const filePath = path.join(dir, entry);
    const content = await readFile(filePath, 'utf-8');
    files.push({
      table,
      name: entry,
      layer,
      source,
      content,
      filePath,
    });
  }

  return files;
}

// Uses connectSurreal helper.

type CleanupTargets = { events: boolean; indexes: boolean; views: boolean };

function buildCleanupPlan(files: SurqlFile[]): Map<string, CleanupTargets> {
  const plan = new Map<string, CleanupTargets>();

  for (const file of files) {
    const tableName = file.table.table?.model ?? file.table.name;
    if (!tableName) continue;

    const entry = plan.get(tableName) ?? { events: false, indexes: false, views: false };
    if (file.layer === 'events') entry.events = true;
    if (file.layer === 'indexes') entry.indexes = true;
    if (file.layer === 'views') entry.views = true;
    plan.set(tableName, entry);
  }

  // Strip tables where no cleanup target is true
  for (const [tableName, flags] of plan) {
    if (!flags.events && !flags.indexes && !flags.views) {
      plan.delete(tableName);
    }
  }

  return plan;
}
