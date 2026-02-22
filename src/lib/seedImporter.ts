import { readFile, stat } from 'fs/promises';
import path from 'path';
import type { AppDatabaseConfig, OnExistingMode } from '../types';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker, DEFAULT_ASSET_RECORD_ID } from './assetTracker';
import { fetchRemoteAssetsFromDb, isAssetChanged } from './assetDiff';
import { applyOnExisting, normalizeOnExisting } from './onExisting';
import { connectSurreal } from './surrealClient';

export interface SeedImportOptions {
  dryRun?: boolean;
  seedsRoot: string;
  databaseKey: string;
  onExisting?: OnExistingMode;
  assetTracking?: AssetTrackingOptions;
  onlyChanged?: boolean;
}

export async function importSeeds(
  database: AppDatabaseConfig,
  options: SeedImportOptions
): Promise<void> {
  const { seedsRoot, databaseKey, dryRun } = options;
  const mode = normalizeOnExisting(options.onExisting);
  const seedFile = path.resolve(seedsRoot, `${databaseKey}.surql`);
  const bootstrapFile = path.resolve(seedsRoot, 'bootstrap.surql');
  const globalFile = path.resolve(seedsRoot, 'global.surql');
  const trackSeeds = options.assetTracking?.trackSeeds ?? false;

  const parts: Array<{ label: string; file: string }> = [];
  if (await fileExists(bootstrapFile)) parts.push({ label: 'bootstrap', file: bootstrapFile });
  if (await fileExists(globalFile)) parts.push({ label: 'global', file: globalFile });
  if (await fileExists(seedFile)) parts.push({ label: databaseKey, file: seedFile });

  if (parts.length === 0) {
    console.log(
      `ℹ️  No seed file for "${databaseKey}" (${seedFile}) and no bootstrap/global seed files; skipping.`
    );
    return;
  }

  if (dryRun) {
    parts.forEach(({ label, file }) => {
      console.log(`[dry-run] Would import seed (${label}) ${path.relative(process.cwd(), file)} (${mode})`);
    });
    return;
  }

  const db = await connectSurreal(database);
  const tracker = await createAssetTracker(options.assetTracking);
  try {
    let remoteAssets: Record<string, any> | null = null;
    if (options.onlyChanged) {
      const recordId = options.assetTracking?.recordId ?? DEFAULT_ASSET_RECORD_ID;
      remoteAssets = await fetchRemoteAssetsFromDb(db, recordId);
    }

    let importedCount = 0;
    for (const { label, file } of parts) {
      const rawContent = await readFile(file, 'utf-8');
      if (
        options.onlyChanged &&
        remoteAssets &&
        !isAssetChanged(file, rawContent, remoteAssets, options.assetTracking?.projectRoot ?? process.cwd())
      ) {
        continue;
      }
      const content = applyOnExisting(rawContent, mode);
      console.log(`🌱 Importing seed ${label} for "${databaseKey}"`);
      await db.query(content);
      importedCount += 1;
      if (tracker && trackSeeds) {
        await tracker.recordImport(db, {
          filePath: file,
          content: rawContent,
          meta: {
            source: 'seed',
            kind: label,
            table: databaseKey,
          },
        });
      }
      if (label === 'global') {
        console.log(`✅ Seed global processed for "${databaseKey}"`);
      }
    }

    if (options.onlyChanged && importedCount === 0) {
      console.log('ℹ️  No changed seed files to import (only-changed enabled).');
    } else if (importedCount > 0) {
      await tryInitTaxonomies(db, databaseKey);
    }
  } finally {
    await db.close();
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

// Uses connectSurreal helper.

async function tryInitTaxonomies(db: Awaited<ReturnType<typeof connectSurreal>>, databaseKey: string): Promise<void> {
  try {
    await db.query('RETURN fn::initTaxonomies();');
    console.log(`🧬 Taxonomies initialized for "${databaseKey}".`);
  } catch (error: any) {
    const message = String(error?.message ?? error ?? '');
    if (
      message.toLowerCase().includes('inittaxonomies') ||
      message.toLowerCase().includes('function') ||
      message.toLowerCase().includes('does not exist')
    ) {
      console.warn(`⚠️  Skipping taxonomy init for "${databaseKey}": ${message}`);
      return;
    }
    throw error;
  }
}
