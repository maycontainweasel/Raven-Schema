import { createHash } from 'crypto';
import { mkdir, readFile, readdir, stat, writeFile, rm } from 'fs/promises';
import path from 'path';

import type { AppConfig, ProjectPathsConfig } from '../types';
import { loadSiteSpec, writeSiteSpec, ensureNuxtConfigExtends } from './siteSpec';
import { readLayerMeta } from './layerRegistry';

export type LayerSyncMode = 'auto' | 'force' | 'off';

export async function syncProjectLayers(options: {
  projectRoot: string;
  app: AppConfig;
  project: ProjectPathsConfig;
  mode?: LayerSyncMode;
  log?: boolean;
}): Promise<void> {
  const { projectRoot, app, project } = options;
  if (!project.nuxtProjectRoot) return;

  const specEntry = await loadSiteSpec(projectRoot, project);
  const layers = Array.isArray(specEntry?.spec.layers)
    ? specEntry?.spec.layers ?? []
    : resolveLayerList(app, project);
  const layersDisabled = Array.isArray(specEntry?.spec.layers)
    ? specEntry?.spec.layers.length === 0
    : project.layers === 'none' || project.layers === false;
  if (layers.length === 0 && !layersDisabled) return;

  const appRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
  const sourceRoot = path.resolve(projectRoot, app.layers?.source ?? 'layers');
  const mode = options.mode ?? app.layers?.sync ?? 'auto';
  const log = options.log ?? app.layers?.log ?? true;
  const managedLayerNames = await listManagedLayers(sourceRoot);
  const desiredLayerNames = new Set(layers);

  if (mode === 'off') {
    if (log) {
      console.log(`ℹ️  Layer sync disabled for ${project.name}`);
    }
    return;
  }

  const layerRefs = layers.map((name) => `./layers/${name}`);
  const lockEntries: LayerLockEntry[] = [];

  for (const layerName of layers) {
    const meta = await readLayerMeta(projectRoot, layerName, { autoCreate: true });
    const sourceDir = path.join(sourceRoot, layerName);
    const sourceStat = await stat(sourceDir).catch(() => null);
    if (!sourceStat?.isDirectory()) {
      console.warn(`⚠️  Layer source not found: ${sourceDir}`);
      continue;
    }

    const targetDir = path.join(appRoot, 'layers', layerName);
    const hashFile = path.join(targetDir, '.layer.hash');
    let currentHash = '';
    let needsUpdate = mode === 'force';

    if (!needsUpdate) {
      currentHash = await computeLayerHash(sourceDir);
      const previousHash = await readFile(hashFile, 'utf-8').catch(() => null);
      needsUpdate = !previousHash || previousHash.trim() !== currentHash;
    } else {
      currentHash = await computeLayerHash(sourceDir);
    }

    if (!needsUpdate) {
      if (log) {
        console.log(`✅ Layer unchanged: ${project.name} → ${layerName}`);
      }
      lockEntries.push(buildLayerLockEntry(meta, currentHash, sourceDir));
      continue;
    }

    await copyDir(sourceDir, targetDir);
    if (currentHash) {
      await writeFile(hashFile, `${currentHash}\n`, 'utf-8');
    }
    if (log) {
      console.log(`🧩 Synced layer: ${project.name} → ${layerName}`);
    }
    lockEntries.push(buildLayerLockEntry(meta, currentHash, sourceDir));
  }

  await removeUnusedLayerDirs(appRoot, managedLayerNames, desiredLayerNames, log);
  await writeLayerLock(appRoot, lockEntries);

  const configPath = await findNuxtConfig(appRoot);
  if (!configPath) {
    const specEntry = await loadSiteSpec(projectRoot, project);
    if (specEntry) {
      const { spec, path: specPath } = specEntry;
      const changed = ensureNuxtConfigExtends(spec, layerRefs, layersDisabled);
      if (changed) {
        await writeSiteSpec(specPath, spec);
        if (log) {
          console.log(`🧩 Updated site YAML extends for ${project.name}`);
        }
      } else if (log) {
        console.log(`ℹ️  Site YAML extends already up to date for ${project.name}`);
      }
    } else {
      console.warn(`⚠️  nuxt.config not found in ${appRoot}`);
    }
    return;
  }

  const configContent = await readFile(configPath, 'utf-8');
  const updated = layersDisabled
    ? stripLayerEntries(configContent)
    : ensureLayersInNuxtConfig(configContent, layerRefs, managedLayerNames);
  if (updated !== configContent) {
    await writeFile(configPath, updated, 'utf-8');
  }
  if (!layersDisabled && layerRefs.length > 0) {
    warnLayerOrderMismatch(updated, layerRefs, project.name);
  }
}

interface LayerLockEntry {
  name: string;
  version: string;
  hash: string;
  source: string;
}

function buildLayerLockEntry(meta: { name: string; version: string }, hash: string, sourceDir: string): LayerLockEntry {
  return {
    name: meta.name,
    version: meta.version,
    hash,
    source: sourceDir,
  };
}

async function writeLayerLock(appRoot: string, entries: LayerLockEntry[]): Promise<void> {
  const outputPath = path.join(appRoot, 'layers.lock.json');
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const payload = {
    updatedAt: new Date().toISOString(),
    layers: sorted,
  };
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

function resolveLayerList(app: AppConfig, project: ProjectPathsConfig): string[] {
  if (project.layers === false || project.layers === 'none') {
    return [];
  }
  if (Array.isArray(project.layers) && project.layers.length > 0) {
    return project.layers.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (Array.isArray(app.layers?.defaults) && app.layers?.defaults.length > 0) {
    return app.layers.defaults.map((entry) => String(entry).trim()).filter(Boolean);
  }
  return [];
}

async function computeLayerHash(sourceDir: string): Promise<string> {
  const hash = createHash('sha256');
  const files = await collectFiles(sourceDir);
  files.sort();
  for (const file of files) {
    hash.update(file);
    const content = await readFile(file, 'utf-8').catch(() => '');
    hash.update(content);
  }
  return hash.digest('hex');
}

async function collectFiles(root: string): Promise<string[]> {
  const rootStat = await stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) {
    return [];
  }
  const out: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectFiles(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function copyDir(sourceDir: string, targetDir: string): Promise<void> {
  const sourceStat = await stat(sourceDir).catch(() => null);
  if (!sourceStat?.isDirectory()) {
    return;
  }

  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(sourceDir, entry.name);
    const to = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else if (entry.isFile()) {
      if (entry.name === 'layer.override.yaml') {
        const existing = await stat(to).catch(() => null);
        if (existing?.isFile()) {
          continue;
        }
      }
      const content = await readFile(from, 'utf-8');
      await writeFile(to, content, 'utf-8');
    }
  }
}

async function findNuxtConfig(root: string): Promise<string | null> {
  const candidates = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'];
  for (const name of candidates) {
    const fullPath = path.join(root, name);
    const s = await stat(fullPath).catch(() => null);
    if (s?.isFile()) return fullPath;
  }
  return null;
}

function ensureLayersInNuxtConfig(
  source: string,
  layerRefs: string[],
  managedLayers: Set<string>
): string {
  const uniqueRefs = Array.from(new Set(layerRefs)).filter(Boolean);
  if (uniqueRefs.length === 0) return source;

  const extendsIndex = source.indexOf('extends:');
  if (extendsIndex >= 0) {
    const bracketStart = source.indexOf('[', extendsIndex);
    if (bracketStart === -1) return source;
    const bracketEnd = findMatchingBracket(source, bracketStart);
    if (bracketEnd === -1) return source;

    const block = source.slice(bracketStart + 1, bracketEnd);
    const existing = extractStringArray(block);
    const isComplex = hasNonStringContent(block);

    if (isComplex) {
      const missing = uniqueRefs.filter((entry) => !existing.includes(entry));
      if (missing.length === 0) return source;
      const indent = detectIndent(source, extendsIndex);
      const innerIndent = `${indent}  `;
      const insert = missing.map((entry) => `${innerIndent}'${entry}',`).join('\n');
      const trimmed = block.replace(/\s*$/, '');
      const needsComma = trimmed.trim().length > 0 && !trimmed.trim().endsWith(',');
      const nextBlock = `${trimmed}${needsComma ? ',' : ''}\n${insert}\n${indent}`;
      const before = source.slice(0, bracketStart + 1);
      const after = source.slice(bracketEnd);
      return `${before}${nextBlock}${after}`;
    }

    const desiredSet = new Set(uniqueRefs);
    const extras = existing.filter((entry) => !desiredSet.has(entry));
    const ordered = [...uniqueRefs, ...filterManagedExtras(extras, managedLayers)];

    const lineStart = source.lastIndexOf('\n', extendsIndex) + 1;
    const indent = detectIndent(source, extendsIndex);
    const innerIndent = `${indent}  `;
    const lines = ordered.map((entry) => `${innerIndent}'${entry}',`).join('\n');

    const before = source.slice(0, lineStart);
    const after = source.slice(bracketEnd + 1);
    const commaMatch = after.match(/^\s*,/);
    const afterStart = bracketEnd + 1 + (commaMatch ? commaMatch[0].length : 0);
    const suffix = commaMatch ? ',' : '';
    return `${before}${indent}extends: [\n${lines}\n${indent}]${suffix}${source.slice(afterStart)}`;
  }

  const defineIndex = source.indexOf('defineNuxtConfig');
  if (defineIndex === -1) return source;
  const braceIndex = source.indexOf('{', defineIndex);
  if (braceIndex === -1) return source;

  const lines = uniqueRefs.map((entry) => `  '${entry}',`).join('\n');
  const insertion = `\n  extends: [\n${lines}\n  ],`;
  return `${source.slice(0, braceIndex + 1)}${insertion}${source.slice(braceIndex + 1)}`;
}

function extractStringArray(source: string): string[] {
  const values: string[] = [];
  const regex = /(['"])(.*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    values.push(match[2]);
  }
  return values;
}

function hasNonStringContent(source: string): boolean {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/(['"])(?:\\.|[^\\])*?\1/g, '')
    .replace(/[\s,]/g, '');
  return stripped.length > 0;
}

function detectIndent(source: string, index: number): string {
  const lineStart = source.lastIndexOf('\n', index) + 1;
  const line = source.slice(lineStart, index);
  const match = line.match(/^\s*/);
  return match ? match[0] : '';
}

function findMatchingBracket(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function warnLayerOrderMismatch(source: string, desired: string[], projectName: string): void {
  const extendsIndex = source.indexOf('extends:');
  if (extendsIndex < 0) return;
  const bracketStart = source.indexOf('[', extendsIndex);
  if (bracketStart === -1) return;
  const bracketEnd = findMatchingBracket(source, bracketStart);
  if (bracketEnd === -1) return;

  const block = source.slice(bracketStart + 1, bracketEnd);
  const existing = extractStringArray(block);
  if (existing.length === 0) return;

  const desiredNormalized = desired.map((entry) => entry.trim()).filter(Boolean);
  let lastIndex = -1;
  for (const entry of desiredNormalized) {
    const idx = existing.indexOf(entry);
    if (idx === -1) {
      console.warn(`⚠️  Layer \"${entry}\" missing in ${projectName} extends order.`);
      return;
    }
    if (idx < lastIndex) {
      console.warn(
        `⚠️  Layer order mismatch in ${projectName}. Expected: ${desiredNormalized.join(' → ')}.`
      );
      return;
    }
    lastIndex = idx;
  }
}

function filterManagedExtras(entries: string[], managedLayers: Set<string>): string[] {
  if (managedLayers.size === 0) return entries;
  return entries.filter((entry) => {
    if (!entry.startsWith('./layers/')) return true;
    const name = entry.replace(/^\.\/layers\//, '');
    return !managedLayers.has(name);
  });
}

async function listManagedLayers(sourceRoot: string): Promise<Set<string>> {
  try {
    const entries = await readdir(sourceRoot, { withFileTypes: true });
    const names = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    return new Set(names);
  } catch {
    return new Set();
  }
}

async function removeUnusedLayerDirs(
  appRoot: string,
  managedLayers: Set<string>,
  desiredLayers: Set<string>,
  log?: boolean
): Promise<void> {
  if (managedLayers.size === 0) return;
  for (const name of managedLayers) {
    if (desiredLayers.has(name)) continue;
    const targetDir = path.join(appRoot, 'layers', name);
    const existing = await stat(targetDir).catch(() => null);
    if (!existing?.isDirectory()) continue;
    await rm(targetDir, { recursive: true, force: true });
    if (log) {
      console.log(`🧹 Removed unused layer: ${path.relative(appRoot, targetDir)}`);
    }
  }
}

function stripLayerEntries(source: string): string {
  const extendsIndex = source.indexOf('extends:');
  if (extendsIndex < 0) return source;
  const bracketStart = source.indexOf('[', extendsIndex);
  if (bracketStart === -1) return source;
  const bracketEnd = findMatchingBracket(source, bracketStart);
  if (bracketEnd === -1) return source;

  const block = source.slice(bracketStart + 1, bracketEnd);
  const existing = extractStringArray(block);
  if (existing.length === 0) return source;
  if (hasNonStringContent(block)) {
    console.warn('⚠️  Unable to strip layer entries: extends contains non-string values.');
    return source;
  }

  const filtered = existing.filter((entry) => !entry.startsWith('./layers/'));
  if (filtered.length === existing.length) return source;

  const lineStart = source.lastIndexOf('\n', extendsIndex) + 1;
  const indent = detectIndent(source, extendsIndex);
  const innerIndent = `${indent}  `;
  const lines = filtered.map((entry) => `${innerIndent}'${entry}',`).join('\n');

  const before = source.slice(0, lineStart);
  const after = source.slice(bracketEnd + 1);
  const commaMatch = after.match(/^\s*,/);
  const afterStart = bracketEnd + 1 + (commaMatch ? commaMatch[0].length : 0);
  const suffix = commaMatch ? ',' : '';
  return `${before}${indent}extends: [\n${lines}\n${indent}]${suffix}${source.slice(afterStart)}`;
}
