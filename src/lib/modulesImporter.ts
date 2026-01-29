import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';
import type { AppDatabaseConfig, OnExistingMode } from '../types';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker, DEFAULT_ASSET_RECORD_ID } from './assetTracker';
import { fetchRemoteAssetsFromDb, isAssetChanged } from './assetDiff';
import { applyOnExisting, normalizeOnExisting } from './onExisting';
import { connectSurreal } from './surrealClient';

export interface ModuleImportOptions {
  dryRun?: boolean;
  modulesRoot: string;
  modules: string[];
  onExisting?: OnExistingMode;
  assetTracking?: AssetTrackingOptions;
  onlyChanged?: boolean;
}

export async function importModules(
  database: AppDatabaseConfig,
  options: ModuleImportOptions
): Promise<void> {
  const { modulesRoot, modules, dryRun } = options;
  const onExisting = normalizeOnExisting(options.onExisting);

  if (modules.length === 0) {
    console.log('ℹ️  No modules selected; skipping.');
    return;
  }

  const files = await collectModuleFiles(modulesRoot, modules);

  if (files.length === 0) {
    console.log('ℹ️  No module files found to import.');
    return;
  }

  if (dryRun) {
    files.forEach((file) => {
      const tag = file.override ? 'override' : 'generated';
      console.log(`[dry-run] Would import ${file.display} [${tag}] (${onExisting})`);
    });
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
        isAssetChanged(file.fullPath, file.content, remoteAssets, projectRoot)
      );
      if (filtered.length === 0) {
        console.log('ℹ️  No changed module assets to import (only-changed enabled).');
        return;
      }
      files.length = 0;
      files.push(...filtered);
    }

    for (const file of files) {
      const content = applyOnExisting(file.content, onExisting);
      const tag = file.override ? 'override' : 'generated';
      console.log(`📦 Importing module asset: ${file.display} [${tag}]`);
      await db.query(content);
      if (tracker) {
        await tracker.recordImport(db, {
          filePath: file.fullPath,
          content: file.content,
          meta: {
            source: file.override ? 'module-override' : 'module',
            module: file.module,
          },
        });
      }
    }
  } finally {
    await db.close();
  }
}

interface ModuleFile {
  module: string;
  display: string;
  content: string;
  override: boolean;
  fullPath: string;
}

async function collectModuleFiles(
  root: string,
  modules: string[]
): Promise<ModuleFile[]> {
  const results: ModuleFile[] = [];

  for (const mod of modules) {
    const modRoot = path.resolve(root, mod);

    const seen = new Set<string>(); // relative path key, prefer overrides
    const seenBasenames = new Set<string>();

    // overrides (highest priority)
    const overrideDir = path.join(modRoot, 'overrides');
    const overrideFiles = await listAllSurqlWithRel(overrideDir);
    for (const file of overrideFiles) {
      if (path.basename(file.full).startsWith('Z_')) continue; // never import bundles
      const key = file.rel.toLowerCase();
      seen.add(key);
      seenBasenames.add(path.basename(file.rel).toLowerCase());
      const content = await readFile(file.full, 'utf-8');
      if (!isLikelySurreal(content)) {
        console.warn(`⚠️  Skipping non-Surreal file ${mod}/overrides/${file.rel}`);
        continue;
      }
      results.push({
        module: mod,
        display: `${mod}/overrides/${file.rel}`,
        content,
        override: true,
        fullPath: file.full,
      });
    }

    // base file: <module>.surql
    const baseFile = path.join(modRoot, `${mod}.surql`);
    if (await existsFile(baseFile)) {
      const key = `${mod}.surql`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        seenBasenames.add(path.basename(baseFile).toLowerCase());
        const content = await readFile(baseFile, 'utf-8');
        if (!isLikelySurreal(content)) {
          console.warn(`⚠️  Skipping non-Surreal base file ${mod}/${mod}.surql`);
        } else {
          results.push({
            module: mod,
            display: `${mod}/${mod}.surql`,
            content,
            override: false,
            fullPath: baseFile,
          });
        }
      }
    }

    // functions folder: functions/*.surql
    const fnDir = path.join(modRoot, 'functions');
    const fnFiles = await listSurqlFiles(fnDir);
    for (const file of fnFiles) {
      const rel = `functions/${path.basename(file)}`;
      const key = rel.toLowerCase();
      const base = path.basename(file).toLowerCase();
      if (seen.has(key) || seenBasenames.has(base)) continue;
      seen.add(key);
      seenBasenames.add(base);
      const content = await readFile(file, 'utf-8');
      if (!isLikelySurreal(content)) {
        console.warn(`⚠️  Skipping non-Surreal function file ${mod}/${rel}`);
        continue;
      }
      results.push({
        module: mod,
        display: `${mod}/${rel}`,
        content,
        override: false,
        fullPath: file,
      });
    }

    // migrations folder: include generated assets (skip bundles)
    const migDir = path.join(modRoot, 'migrations');
    const migFiles = await listAllSurqlWithRel(migDir);
    migFiles.sort((a, b) => {
      const depthA = a.rel.split('/').length;
      const depthB = b.rel.split('/').length;
      if (depthA !== depthB) return depthB - depthA; // prefer deeper paths
      return a.rel.localeCompare(b.rel);
    });
    for (const file of migFiles) {
      const base = path.basename(file.full);
      if (base.startsWith('Z_')) continue; // skip bundles
      const key = `migrations/${file.rel}`.toLowerCase();
      const baseLower = base.toLowerCase();
      if (seen.has(key) || seenBasenames.has(baseLower)) continue;
      seen.add(key);
      seenBasenames.add(baseLower);
      const content = await readFile(file.full, 'utf-8');
      if (!isLikelySurreal(content)) {
        console.warn(`⚠️  Skipping non-Surreal migration file ${mod}/migrations/${file.rel}`);
        continue;
      }
      results.push({
        module: mod,
        display: `${mod}/migrations/${file.rel}`,
        content,
        override: false,
        fullPath: file.full,
      });
    }
  }

  // Sort for nicer log grouping: by module, then base/generated first, overrides last.
  return results.sort((a, b) => {
    if (a.module !== b.module) return a.module.localeCompare(b.module);
    if (a.override !== b.override) return a.override ? 1 : -1;
    return a.display.localeCompare(b.display);
  });
}

async function listSurqlFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir);
    return entries
      .filter((entry) => entry.toLowerCase().endsWith('.surql'))
      .map((entry) => path.join(dir, entry));
  } catch {
    return [];
  }
}

async function listAllSurql(dir: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...await listAllSurql(full));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.surql')) {
        out.push(full);
      }
    }
  } catch {
    return [];
  }
  return out;
}

async function listAllSurqlWithRel(dir: string): Promise<Array<{ full: string; rel: string }>> {
  const out: Array<{ full: string; rel: string }> = [];
  const walk = async (current: string, prefix: string) => {
    let entries: any[] = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = prefix ? path.posix.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.surql')) {
        out.push({ full, rel });
      }
    }
  };
  await walk(dir, '');
  return out;
}

async function existsFile(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

function isLikelySurreal(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  // reject YAML/spec-style files
  if (/^version\s*:/i.test(trimmed)) return false;
  return /(DEFINE|SELECT|CREATE|UPDATE|DELETE|RELATE|RETURN|LET)\b/i.test(trimmed);
}

// Uses connectSurreal helper.
