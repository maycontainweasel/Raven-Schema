import { mkdir, readFile, readdir, stat, writeFile, rm } from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

import type { ProjectPathsConfig } from '../types';
import { loadSiteSpec, writeSiteSpec, ensureNuxtConfigModule, ensureNuxtConfigTranspile } from './siteSpec';

const MODULE_FILE_NAME = 'index.ts';
const MODULE_REF = '~/modules/schema-kit';

export async function ensureSchemaKitModule(options: {
  projectRoot: string;
  project: ProjectPathsConfig;
  moduleSourceRoot: string;
  log?: boolean;
  mode?: 'copy' | 'shared';
  sync?: 'auto' | 'force' | 'off';
  sharedModulePath?: string;
}): Promise<void> {
  const { projectRoot, project, moduleSourceRoot, log = true } = options;
  if (!project.nuxtProjectRoot) return;

  const appRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
  const targetDir = path.join(appRoot, 'modules', 'schema-kit');
  const targetFile = path.join(targetDir, MODULE_FILE_NAME);
  const sourceFile = path.join(moduleSourceRoot, 'src', 'module.ts');
  const sourceRuntime = path.join(moduleSourceRoot, 'src', 'runtime');
  const sourceResources = path.join(moduleSourceRoot, 'src', 'resources');
  const sourceOverrides = path.join(moduleSourceRoot, 'src', 'overrides');
  const targetRuntime = path.join(targetDir, 'runtime');
  const hashFile = path.join(targetDir, '.schema-kit.hash');
  const configFile = path.join(appRoot, 'schema-kit.config.json');
  const targetGenerated = path.join(targetRuntime, 'generated');
  const preservedGenerated = path.join(appRoot, '.schema-kit.generated');
  let hasPreservedGenerated = false;

  if (options.mode !== 'shared') {
    const sourceContent = await readFile(sourceFile, 'utf-8').catch(() => null);
    if (!sourceContent) {
      console.warn(`⚠️  Schema kit module source not found: ${sourceFile}`);
      return;
    }

    if (options.sync === 'off') {
      if (log) {
        console.log(`ℹ️  schema-kit sync disabled for ${appRoot}`);
      }
    } else {
      if (options.sync === 'force') {
        const generatedStat = await stat(targetGenerated).catch(() => null);
        if (generatedStat?.isDirectory()) {
          await rm(preservedGenerated, { recursive: true, force: true }).catch(() => null);
          await copyDir(targetGenerated, preservedGenerated);
          hasPreservedGenerated = true;
        }
        await rm(targetDir, { recursive: true, force: true }).catch(() => null);
      }
      await mkdir(targetDir, { recursive: true });
      const currentHash = await computeModuleHash(sourceFile, sourceRuntime, configFile, [
        sourceResources,
        sourceOverrides,
      ]);
      const previousHash = await readFile(hashFile, 'utf-8').catch(() => null);
      const needsUpdate = options.sync === 'force' || !previousHash || previousHash.trim() !== currentHash;
      if (needsUpdate) {
        await writeFile(targetFile, sourceContent, 'utf-8');
        await copyDir(sourceRuntime, targetRuntime);
        await copyDir(sourceResources, targetRuntime, { overwrite: true });
        await copyDir(sourceOverrides, targetRuntime);
        await writeFile(hashFile, `${currentHash}\n`, 'utf-8');
        if (hasPreservedGenerated) {
          await copyDir(preservedGenerated, targetGenerated, { overwrite: false });
          await rm(preservedGenerated, { recursive: true, force: true }).catch(() => null);
        }
        if (log) {
          console.log(`🧩 Updated schema-kit module in ${appRoot}`);
        }
      } else if (log) {
        console.log(`✅ schema-kit module unchanged for ${appRoot}`);
      }
    }
  } else if (log) {
    console.log(`🔗 schema-kit shared mode active for ${appRoot}`);
  }

  await syncControllerDocs({
    appRoot,
    moduleSourceRoot,
    log,
  });
  await syncInfraDocs({
    appRoot,
    moduleSourceRoot,
    log,
  });

  const configPath = await findNuxtConfig(appRoot);
  if (!configPath) {
    const specEntry = await loadSiteSpec(projectRoot, project);
    if (specEntry) {
      const { spec, path: specPath } = specEntry;
      const moduleRef =
        options.mode === 'shared'
          ? resolveSharedModuleRef(appRoot, projectRoot, options.sharedModulePath)
          : MODULE_REF;
      const changed =
        ensureNuxtConfigModule(spec, moduleRef) ||
        ensureNuxtConfigTranspile(spec, 'trpc-nuxt');
      if (changed) {
        await writeSiteSpec(specPath, spec);
        if (log) {
          console.log(`🧩 Updated site YAML modules for ${project.name}`);
        }
      } else if (log) {
        console.log(`ℹ️  Site YAML modules already up to date for ${project.name}`);
      }
    } else {
      console.warn(`⚠️  nuxt.config not found in ${appRoot}`);
    }
    return;
  }

  const configContent = await readFile(configPath, 'utf-8');
  const moduleRef =
    options.mode === 'shared'
      ? resolveSharedModuleRef(appRoot, projectRoot, options.sharedModulePath)
      : MODULE_REF;
  const updated = ensureModuleInNuxtConfig(configContent, moduleRef);
  const withTranspile = ensureBuildTranspile(updated, 'trpc-nuxt');
  if (withTranspile !== configContent) {
    await writeFile(configPath, withTranspile, 'utf-8');
  }
}

async function syncControllerDocs(options: {
  appRoot: string;
  moduleSourceRoot: string;
  log?: boolean;
}): Promise<void> {
  const { appRoot, moduleSourceRoot, log = true } = options;
  const sourceDocs = path.join(moduleSourceRoot, 'docs', 'controllers');
  const targetDocs = path.join(appRoot, 'docs', 'controllers');
  const sourceStat = await stat(sourceDocs).catch(() => null);
  if (!sourceStat?.isDirectory()) {
    return;
  }
  await copyDir(sourceDocs, targetDocs);
  if (log) {
    console.log(`📘 Synced controller docs → ${path.relative(appRoot, targetDocs)}`);
  }
}

async function syncInfraDocs(options: {
  appRoot: string;
  moduleSourceRoot: string;
  log?: boolean;
}): Promise<void> {
  const { appRoot, moduleSourceRoot, log = true } = options;
  const sourceDocs = path.join(moduleSourceRoot, 'docs', 'infra');
  const targetDocs = path.join(appRoot, 'docs', 'infra');
  const sourceStat = await stat(sourceDocs).catch(() => null);
  if (!sourceStat?.isDirectory()) {
    return;
  }
  await copyDir(sourceDocs, targetDocs);
  if (log) {
    console.log(`📦 Synced infra docs → ${path.relative(appRoot, targetDocs)}`);
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

function ensureModuleInNuxtConfig(source: string, moduleRef: string): string {
  if (source.includes(moduleRef)) return source;

  const modulesIndex = source.indexOf('modules:');
  if (modulesIndex >= 0) {
    const bracketStart = source.indexOf('[', modulesIndex);
    if (bracketStart === -1) return source;
    const bracketEnd = findMatchingBracket(source, bracketStart);
    if (bracketEnd === -1) return source;

    const content = source.slice(bracketStart + 1, bracketEnd);
    if (content.includes(moduleRef)) return source;

    const trimmed = content.replace(/\s*$/, '');
    const trailing = content.slice(trimmed.length);
    const needsComma = trimmed.trim().length > 0 && !trimmed.trim().endsWith(',');
    const insert = `${trimmed}${needsComma ? ',' : ''} '${moduleRef}'${trailing}`;

    return `${source.slice(0, bracketStart + 1)}${insert}${source.slice(bracketEnd)}`;
  }

  const defineIndex = source.indexOf('defineNuxtConfig');
  if (defineIndex === -1) return source;
  const braceIndex = source.indexOf('{', defineIndex);
  if (braceIndex === -1) return source;
  const insertion = `\n  modules: ['${moduleRef}'],`;
  return `${source.slice(0, braceIndex + 1)}${insertion}${source.slice(braceIndex + 1)}`;
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

function ensureBuildTranspile(source: string, entry: string): string {
  if (source.includes(entry)) return source;

  const buildIndex = source.indexOf('build:');
  if (buildIndex >= 0) {
    const braceStart = source.indexOf('{', buildIndex);
    if (braceStart === -1) return source;
    const braceEnd = findMatchingBrace(source, braceStart);
    if (braceEnd === -1) return source;

    const block = source.slice(braceStart + 1, braceEnd);
    const transpileIndex = block.indexOf('transpile');
    if (transpileIndex >= 0) {
      const arrayStart = block.indexOf('[', transpileIndex);
      if (arrayStart === -1) return source;
      const arrayEnd = findMatchingBracket(block, arrayStart);
      if (arrayEnd === -1) return source;

      const before = block.slice(0, arrayStart + 1);
      const inside = block.slice(arrayStart + 1, arrayEnd).trim();
      const after = block.slice(arrayEnd);
      const needsComma = inside.length > 0 && !inside.trim().endsWith(',');
      const insert = `${inside}${needsComma ? ',' : ''} '${entry}'`;
      const nextBlock = `${before}${insert}${after}`;
      return `${source.slice(0, braceStart + 1)}${nextBlock}${source.slice(braceEnd)}`;
    }

    const insertion = `\n    transpile: ['${entry}'],`;
    return `${source.slice(0, braceStart + 1)}${insertion}${source.slice(braceStart + 1)}`;
  }

  const defineIndex = source.indexOf('defineNuxtConfig');
  if (defineIndex === -1) return source;
  const braceIndex = source.indexOf('{', defineIndex);
  if (braceIndex === -1) return source;
  const insertion = `\n  build: { transpile: ['${entry}'] },`;
  return `${source.slice(0, braceIndex + 1)}${insertion}${source.slice(braceIndex + 1)}`;
}

function findMatchingBrace(source: string, start: number): number {
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

async function copyDir(
  sourceDir: string,
  targetDir: string,
  options: { overwrite?: boolean } = {}
): Promise<void> {
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
      await copyDir(from, to, options);
    } else if (entry.isFile()) {
      if (options.overwrite === false) {
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

function resolveSharedModuleRef(
  appRoot: string,
  projectRoot: string,
  sharedModulePath?: string
): string {
  if (!sharedModulePath) return MODULE_REF;
  const looksLikePackage =
    !sharedModulePath.startsWith('.') &&
    !sharedModulePath.startsWith('/') &&
    !sharedModulePath.includes('/') &&
    !sharedModulePath.includes('\\');
  if (looksLikePackage || sharedModulePath.startsWith('@')) {
    return sharedModulePath;
  }
  const resolved = sharedModulePath.startsWith('.')
    ? path.resolve(projectRoot, sharedModulePath)
    : sharedModulePath.startsWith('/')
      ? sharedModulePath
      : path.resolve(projectRoot, sharedModulePath);
  const rel = path.relative(appRoot, resolved);
  if (rel.startsWith('..')) {
    return rel.replace(/\\/g, '/');
  }
  return rel.startsWith('.') ? `./${rel.replace(/\\/g, '/')}` : `./${rel.replace(/\\/g, '/')}`;
}

async function computeModuleHash(
  sourceFile: string,
  sourceRuntimeDir: string,
  configFile: string,
  extraDirs: string[] = []
): Promise<string> {
  const hash = createHash('sha256');
  const files = await collectFiles(sourceRuntimeDir);
  for (const dir of extraDirs) {
    const extraFiles = await collectFiles(dir);
    files.push(...extraFiles);
  }
  files.sort();
  for (const file of files) {
    hash.update(file);
    const content = await readFile(file, 'utf-8').catch(() => '');
    hash.update(content);
  }
  const moduleContent = await readFile(sourceFile, 'utf-8').catch(() => '');
  hash.update(sourceFile);
  hash.update(moduleContent);
  const configContent = await readFile(configFile, 'utf-8').catch(() => '');
  hash.update(configFile);
  hash.update(configContent);
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
