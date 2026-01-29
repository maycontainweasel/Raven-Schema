import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { Surreal } from 'surrealdb';

export interface AssetTrackingOptions {
  enabled?: boolean;
  projectRoot?: string;
  manifestPath?: string;
  recordId?: string;
  trackSeeds?: boolean;
}

export interface AssetImportMeta {
  source?: string;
  layer?: string;
  module?: string;
  table?: string;
  kind?: string;
}

export interface AssetEntry extends AssetImportMeta {
  version: number;
  hash: string;
  updatedAt: string;
}

export interface AssetManifest {
  version: number;
  updatedAt: string;
  assets: Record<string, AssetEntry>;
}

const DEFAULT_MANIFEST_RELATIVE = path.join('config', 'schema-assets.json');
export const DEFAULT_ASSET_RECORD_ID = 'app:schemaAssets';
export const DEFAULT_MANIFEST_RELATIVE_PATH = DEFAULT_MANIFEST_RELATIVE;

export async function createAssetTracker(
  options?: AssetTrackingOptions
): Promise<AssetTracker | null> {
  const enabled = options?.enabled ?? true;
  if (!enabled) return null;

  const projectRoot = options?.projectRoot ?? process.cwd();
  const manifestPath = options?.manifestPath
    ? path.resolve(projectRoot, options.manifestPath)
    : path.resolve(projectRoot, DEFAULT_MANIFEST_RELATIVE);
  const recordId = options?.recordId ?? DEFAULT_ASSET_RECORD_ID;

  const manifest = await readAssetManifest(manifestPath);
  return new AssetTracker(projectRoot, manifestPath, recordId, manifest);
}

export class AssetTracker {
  private projectRoot: string;
  private manifestPath: string;
  private recordId: string;
  private manifest: AssetManifest;

  constructor(projectRoot: string, manifestPath: string, recordId: string, manifest: AssetManifest) {
    this.projectRoot = projectRoot;
    this.manifestPath = manifestPath;
    this.recordId = recordId;
    this.manifest = manifest;
  }

  async recordImport(
    db: Surreal,
    payload: {
      filePath: string;
      content: string;
      meta?: AssetImportMeta;
    }
  ): Promise<void> {
    const key = resolveAssetKey(payload.filePath, this.projectRoot);
    const { entry, changed } = updateManifestEntry(
      this.manifest,
      key,
      payload.content,
      payload.meta
    );

    if (changed) {
      await saveManifest(this.manifestPath, this.manifest);
    }

    await upsertRemoteAsset(db, this.recordId, key, entry);
  }

  async recordGeneration(payload: {
    filePath: string;
    content: string;
    meta?: AssetImportMeta;
    compareContent?: string | null;
  }): Promise<void> {
    const key = resolveAssetKey(payload.filePath, this.projectRoot);
    const compareHash =
      payload.compareContent === null || payload.compareContent === undefined
        ? undefined
        : hashAssetContent(payload.compareContent);

    const { changed } = updateManifestEntry(
      this.manifest,
      key,
      payload.content,
      payload.meta,
      compareHash
    );

    if (changed) {
      await saveManifest(this.manifestPath, this.manifest);
    }
  }
}

export function hashAssetContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function resolveAssetKey(filePath: string, projectRoot: string): string {
  const abs = path.resolve(filePath);
  let rel = path.relative(projectRoot, abs);
  if (rel.startsWith('..') || rel === '') {
    rel = abs;
  }
  return rel.split(path.sep).join('/');
}

function cleanMeta(meta?: AssetImportMeta): AssetImportMeta {
  if (!meta) return {};
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as AssetImportMeta;
}

function updateManifestEntry(
  manifest: AssetManifest,
  key: string,
  content: string,
  meta?: AssetImportMeta,
  compareHash?: string
): { entry: AssetEntry; changed: boolean } {
  const hash = hashAssetContent(content);
  const now = new Date().toISOString();
  const existing = manifest.assets[key];
  const metaClean = cleanMeta(meta);

  if (compareHash && compareHash === hash) {
    if (!existing) {
      const entry: AssetEntry = {
        version: 1,
        hash,
        updatedAt: now,
        ...metaClean,
      };
      manifest.assets[key] = entry;
      manifest.updatedAt = now;
      return { entry, changed: true };
    }

    const merged: AssetEntry = {
      ...existing,
      ...metaClean,
      hash,
    };

    if (existing.hash !== hash) {
      merged.updatedAt = now;
    }

    const changed = JSON.stringify(existing) !== JSON.stringify(merged);
    if (changed) {
      manifest.assets[key] = merged;
      manifest.updatedAt = now;
    }
    return { entry: manifest.assets[key], changed };
  }

  if (!existing) {
    const entry: AssetEntry = {
      version: 1,
      hash,
      updatedAt: now,
      ...metaClean,
    };
    manifest.assets[key] = entry;
    manifest.updatedAt = now;
    return { entry, changed: true };
  }

  if (existing.hash !== hash) {
    const entry: AssetEntry = {
      ...existing,
      ...metaClean,
      version: existing.version + 1,
      hash,
      updatedAt: now,
    };
    manifest.assets[key] = entry;
    manifest.updatedAt = now;
    return { entry, changed: true };
  }

  if (Object.keys(metaClean).length > 0) {
    const merged: AssetEntry = {
      ...existing,
      ...metaClean,
    };
    const changed = JSON.stringify(existing) !== JSON.stringify(merged);
    if (changed) {
      manifest.assets[key] = merged;
      manifest.updatedAt = now;
    }
    return { entry: manifest.assets[key], changed };
  }

  return { entry: existing, changed: false };
}

export async function readAssetManifest(filePath: string): Promise<AssetManifest> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    if (!raw.trim()) {
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        assets: {},
      };
    }
    const parsed = JSON.parse(raw) as AssetManifest;
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid asset manifest format');
    }
    if (!parsed.assets || typeof parsed.assets !== 'object') {
      parsed.assets = {};
    }
    if (!parsed.version) parsed.version = 1;
    if (!parsed.updatedAt) parsed.updatedAt = new Date().toISOString();
    return parsed;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        assets: {},
      };
    }
    if (error instanceof SyntaxError) {
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        assets: {},
      };
    }
    throw error;
  }
}

async function saveManifest(filePath: string, manifest: AssetManifest): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
}

async function upsertRemoteAsset(
  db: Surreal,
  recordId: string,
  key: string,
  entry: AssetEntry
): Promise<void> {
  const tableMatch = recordId.match(/^([A-Za-z_][A-Za-z0-9_]*)\:/);
  if (tableMatch) {
    const table = tableMatch[1];
    await db.query(`DEFINE TABLE IF NOT EXISTS ${table} SCHEMALESS;`);
  }
  const keyLiteral = JSON.stringify(key);
  const entryLiteral = JSON.stringify(entry);
  const query = `UPSERT ${recordId} MERGE { ${keyLiteral}: ${entryLiteral}, lastImportAt: time::now() };`;
  await db.query(query);
}
