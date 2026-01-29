import { readFile, stat } from 'fs/promises';
import path from 'path';
import type { Surreal } from 'surrealdb';

import type { AppDatabaseConfig } from '../types';
import type { AssetEntry, AssetManifest } from './assetTracker';
import {
  DEFAULT_ASSET_RECORD_ID,
  DEFAULT_MANIFEST_RELATIVE_PATH,
  hashAssetContent,
  readAssetManifest,
  resolveAssetKey,
} from './assetTracker';
import { connectSurreal } from './surrealClient';

export interface AssetDiffOptions {
  projectRoot?: string;
  manifestPath?: string;
  recordId?: string;
  rehashLocal?: boolean;
}

export interface AssetDiffEntry {
  key: string;
  local?: AssetEntry;
  remote?: AssetEntry;
  existsOnDisk: boolean;
}

export interface AssetDiffResult {
  changed: AssetDiffEntry[];
  missingRemote: AssetDiffEntry[];
  removedLocal: AssetDiffEntry[];
  identical: AssetDiffEntry[];
}

export async function loadLocalManifest(options: AssetDiffOptions = {}): Promise<{
  manifest: AssetManifest;
  manifestPath: string;
  projectRoot: string;
}> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const manifestPath = options.manifestPath
    ? path.resolve(projectRoot, options.manifestPath)
    : path.resolve(projectRoot, DEFAULT_MANIFEST_RELATIVE_PATH);
  const manifest = await readAssetManifest(manifestPath);
  return { manifest, manifestPath, projectRoot };
}

export async function fetchRemoteAssets(
  database: AppDatabaseConfig,
  recordId = DEFAULT_ASSET_RECORD_ID
): Promise<Record<string, AssetEntry>> {
  const db = await connectSurreal(database);
  try {
    return await fetchRemoteAssetsFromDb(db, recordId);
  } finally {
    await db.close();
  }
}

export async function fetchRemoteAssetsWithRaw(
  database: AppDatabaseConfig,
  recordId = DEFAULT_ASSET_RECORD_ID
): Promise<{
  assets: Record<string, AssetEntry>;
  result: unknown;
  query: { status?: string; detail?: unknown; payload?: unknown };
  row: unknown;
}> {
  const db = await connectSurreal(database);
  try {
    await ensureRecordTableExists(db, recordId);
    const result = await db.query(`SELECT * FROM ONLY ${recordId};`);
    const query = unwrapQueryResult(result);
    if (query.status === 'ERR') {
      const detail = query.detail ?? 'Unknown SurrealDB error';
      throw new Error(`Failed to load schemaAssets record: ${detail}`);
    }
    const payload = query.payload;
    const row = Array.isArray(payload) ? payload[0] : payload;
    const assets = parseAssetsFromRow(row);
    return { assets, result, query, row };
  } finally {
    await db.close();
  }
}

export async function fetchRemoteAssetsFromDb(
  db: Surreal,
  recordId = DEFAULT_ASSET_RECORD_ID
): Promise<Record<string, AssetEntry>> {
  await ensureRecordTableExists(db, recordId);
  const result = await db.query(`SELECT * FROM ONLY ${recordId};`);
  const query = unwrapQueryResult(result);
  if (query.status === 'ERR') {
    const detail = query.detail ?? 'Unknown SurrealDB error';
    throw new Error(`Failed to load schemaAssets record: ${detail}`);
  }
  const payload = query.payload;
  const row = Array.isArray(payload) ? payload[0] : payload;
  const assets = parseAssetsFromRow(row);
  if (Object.keys(assets).length > 0) return assets;

  return {};
}

async function ensureRecordTableExists(db: Surreal, recordId: string): Promise<void> {
  const tableMatch = recordId.match(/^([A-Za-z_][A-Za-z0-9_]*)\:/);
  if (!tableMatch) return;
  const table = tableMatch[1];
  await db.query(`DEFINE TABLE IF NOT EXISTS ${table} SCHEMALESS;`);
}

export async function diffAssets(
  manifest: AssetManifest,
  remoteAssets: Record<string, AssetEntry>,
  options: AssetDiffOptions = {}
): Promise<AssetDiffResult> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const rehashLocal = options.rehashLocal ?? true;

  const changed: AssetDiffEntry[] = [];
  const missingRemote: AssetDiffEntry[] = [];
  const removedLocal: AssetDiffEntry[] = [];
  const identical: AssetDiffEntry[] = [];

  const keys = new Set<string>([
    ...Object.keys(manifest.assets ?? {}),
    ...Object.keys(remoteAssets ?? {}),
  ]);

  for (const key of keys) {
    if (isIgnoredAssetKey(key)) {
      continue;
    }
    const local = manifest.assets[key];
    const remote = remoteAssets[key];
    const existsOnDisk = local ? await fileExists(resolveKeyPath(key, projectRoot)) : false;
    const diskHash = rehashLocal && existsOnDisk
      ? await hashFile(resolveKeyPath(key, projectRoot))
      : undefined;
    const effectiveLocal = diskHash && local
      ? { ...local, hash: diskHash }
      : local;

    if (!local && remote) {
      removedLocal.push({ key, local, remote, existsOnDisk: false });
      continue;
    }

    if (!local) continue;

    if (!existsOnDisk) {
      if (remote) {
        removedLocal.push({ key, local: effectiveLocal, remote, existsOnDisk });
      }
      continue;
    }

    if (!remote) {
      missingRemote.push({ key, local: effectiveLocal, remote, existsOnDisk });
      continue;
    }

    if (remote.hash !== effectiveLocal?.hash) {
      changed.push({ key, local: effectiveLocal, remote, existsOnDisk });
    } else {
      identical.push({ key, local: effectiveLocal, remote, existsOnDisk });
    }
  }

  return { changed, missingRemote, removedLocal, identical };
}

export function isAssetChanged(
  filePath: string,
  content: string,
  remoteAssets: Record<string, AssetEntry>,
  projectRoot: string
): boolean {

  const key = resolveAssetKey(filePath, projectRoot);
  const remote = remoteAssets[key];
  if (!remote) return true;
  const hash = hashAssetContent(content);
  return remote.hash !== hash;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

async function hashFile(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  return hashAssetContent(content);
}

function resolveKeyPath(key: string, projectRoot: string): string {
  if (path.isAbsolute(key)) return key;
  return path.resolve(projectRoot, key);
}

export function isIgnoredAssetKey(key: string): boolean {
  const normalized = key.replace(/\\/g, '/');
  if (normalized.includes('/config/bootstrap/seed/')) return true;
  if (/\/Z_[^/]+\.surql$/i.test(normalized)) return true;
  return false;
}

function extractAssetEntries(value: unknown): Record<string, AssetEntry> {
  if (!value || typeof value !== 'object') return {};
  const record = { ...(value as Record<string, unknown>) };
  delete record.id;
  delete record.lastImportAt;
  delete record.updatedAt;
  delete record.version;
  delete record.assets;

  const entries = Object.entries(record).filter(([, entry]) => {
    if (!entry || typeof entry !== 'object') return false;
    const v = entry as any;
    return typeof v.hash === 'string' && typeof v.version === 'number';
  });

  return Object.fromEntries(entries) as Record<string, AssetEntry>;
}

function normalizeRow(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return value as Record<string, unknown>;
  }
}

function parseAssetsFromRow(row: unknown): Record<string, AssetEntry> {
  if (!row || typeof row !== 'object') return {};
  const normalized = normalizeRow(row);
  const direct = extractAssetEntries(normalized);
  const nested = normalized?.assets && typeof normalized.assets === 'object'
    ? extractAssetEntries(normalized.assets)
    : {};
  const nestedManifest = normalized?.assets && typeof normalized.assets === 'object'
    ? extractAssetEntries((normalized.assets as any).assets)
    : {};
  return { ...nestedManifest, ...nested, ...direct };
}

function unwrapQueryResult(result: unknown): { status?: string; detail?: unknown; payload?: unknown } {
  if (Array.isArray(result) && result.length > 0 && result[0] && typeof result[0] === 'object') {
    const first = result[0] as any;
    if (!('status' in first) && !('result' in first)) {
      return { payload: result };
    }
    return { status: first.status, detail: first.detail, payload: first.result };
  }
  if (result && typeof result === 'object') {
    const obj = result as any;
    if ('result' in obj || 'status' in obj) {
      return { status: obj.status, detail: obj.detail, payload: obj.result };
    }
    return { payload: result };
  }
  return { payload: undefined };
}

// Uses connectSurreal helper.
