import { readFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { stat } from 'fs/promises';
import { join, resolve, parse } from 'path';
import type {
  AppDatabaseConfig,
  BootstrapFunctionImports,
  BootstrapTableImports,
  OnExistingMode,
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
  _database: AppDatabaseConfig,
  _config: BootstrapTableImports | undefined,
  _options: BootstrapOptions = {}
): Promise<void> {
  console.log('ℹ️  Bootstrap tables processing is not yet implemented.');
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
