import path from 'path';
import { readFile, writeFile, stat } from 'fs/promises';
import YAML from 'yaml';

import type { ProjectPathsConfig, SchemaKitFeatures } from '../types';

export interface SiteSpecRecord extends Record<string, unknown> {
  name: string;
  slug: string;
  template: string;
  target: string;
  nuxtConfig?: Record<string, unknown>;
  packageJson?: Record<string, unknown>;
  env?: Record<string, unknown>;
  deploy?: Record<string, unknown>;
  layers?: string[];
  capabilities?: SchemaKitFeatures;
  schemaKit?: {
    capabilities?: SchemaKitFeatures;
    features?: SchemaKitFeatures;
  };
}

export async function loadSiteSpec(
  projectRoot: string,
  project: ProjectPathsConfig
): Promise<{ path: string; spec: SiteSpecRecord } | null> {
  const sitesRoot = path.resolve(projectRoot, 'sites');
  const appRoot = project.nuxtProjectRoot
    ? path.resolve(projectRoot, project.nuxtProjectRoot)
    : null;

  if (appRoot) {
    const entries = await readDirYaml(sitesRoot);
    for (const entry of entries) {
      const parsed = await readSpecFile(entry);
      if (!parsed) continue;
      const targetAbs = resolveTarget(projectRoot, parsed.target);
      if (targetAbs && path.resolve(targetAbs) === path.resolve(appRoot)) {
        return {
          path: entry,
          spec: parsed,
        };
      }
    }
  }

  const slug = toKebabCase(project.name ?? path.basename(project.nuxtProjectRoot ?? 'site'));
  const specPath = path.resolve(sitesRoot, `${slug}.yaml`);
  const parsed = await readSpecFile(specPath);
  if (!parsed) return null;
  return { path: specPath, spec: parsed };
}

export async function writeSiteSpec(filePath: string, spec: SiteSpecRecord): Promise<void> {
  await writeFile(filePath, YAML.stringify(spec), 'utf-8');
}

export function ensureNuxtConfigExtends(
  spec: SiteSpecRecord,
  layerRefs: string[],
  remove = false
): boolean {
  const uniqueRefs = Array.from(new Set(layerRefs)).filter(Boolean);
  if (uniqueRefs.length === 0) return false;

  const nuxtConfig = (spec.nuxtConfig ??= {});
  const current = Array.isArray(nuxtConfig.extends) ? nuxtConfig.extends : [];
  const currentStrings = current.filter((entry) => typeof entry === 'string') as string[];

  if (remove) {
    const filtered = currentStrings.filter((entry) => !uniqueRefs.includes(entry));
    const changed = filtered.length !== currentStrings.length;
    if (changed) {
      nuxtConfig.extends = filtered;
    }
    return changed;
  }

  const next = [...currentStrings];
  let changed = false;
  for (const ref of uniqueRefs) {
    if (!next.includes(ref)) {
      next.push(ref);
      changed = true;
    }
  }
  if (changed) {
    nuxtConfig.extends = next;
  }
  return changed;
}

export function ensureNuxtConfigModule(
  spec: SiteSpecRecord,
  moduleRef: string
) {
  if (!moduleRef) return false;
  const nuxtConfig = (spec.nuxtConfig ??= {});
  const current = Array.isArray(nuxtConfig.modules) ? nuxtConfig.modules : [];
  const currentStrings = current.filter((entry) => typeof entry === 'string') as string[];
  if (currentStrings.includes(moduleRef)) return false;
  nuxtConfig.modules = [...currentStrings, moduleRef];
  return true;
}

export function ensureNuxtConfigTranspile(
  spec: SiteSpecRecord,
  entry: string
): boolean {
  if (!entry) return false;
  const nuxtConfig = (spec.nuxtConfig ??= {});
  const build = (nuxtConfig.build = isPlainObject(nuxtConfig.build) ? nuxtConfig.build : {});
  const transpile = Array.isArray((build as any).transpile)
    ? ((build as any).transpile as unknown[])
    : [];
  const strings = transpile.filter((item) => typeof item === 'string') as string[];
  if (strings.includes(entry)) return false;
  (build as any).transpile = [...strings, entry];
  nuxtConfig.build = build;
  return true;
}

export function ensureRuntimeConfigBlocks(
  spec: SiteSpecRecord,
  options: {
    surrealdb?: boolean;
    typesense?: boolean;
    sentry?: boolean;
    redis?: boolean;
  }
): boolean {
  const nuxtConfig = (spec.nuxtConfig ??= {});
  const runtimeConfig = (nuxtConfig.runtimeConfig = isPlainObject(nuxtConfig.runtimeConfig)
    ? nuxtConfig.runtimeConfig
    : {});
  let changed = false;

  const publicBlock = (runtimeConfig.public = isPlainObject(runtimeConfig.public)
    ? runtimeConfig.public
    : {});

  if (options.surrealdb && !isPlainObject(runtimeConfig.surrealdb)) {
    runtimeConfig.surrealdb = {
      url: '',
      namespace: '',
      database: '',
      user: '',
      pass: '',
    };
    changed = true;
  }

  if (options.typesense) {
    if (!isPlainObject(runtimeConfig.typesense)) {
      runtimeConfig.typesense = {
        host: '',
        apiKey: '',
        port: '',
        enableCors: '',
      };
      changed = true;
    }
    if (!isPlainObject(publicBlock.typesense)) {
      publicBlock.typesense = {
        host: '',
        apiKey: '',
        port: '',
        enableCors: '',
      };
      changed = true;
    }
  }

  if (options.sentry) {
    if (!isPlainObject(runtimeConfig.sentry)) {
      runtimeConfig.sentry = { dsn: '', env: '' };
      changed = true;
    }
    if (!isPlainObject(publicBlock.sentry)) {
      publicBlock.sentry = { dsn: '', env: '' };
      changed = true;
    }
  }

  if (options.redis && !isPlainObject(runtimeConfig.redis)) {
    runtimeConfig.redis = {
      host: '',
      port: 6379,
      password: '',
      fileLoggingEnabled: false,
    };
    changed = true;
  }

  nuxtConfig.runtimeConfig = runtimeConfig;
  return changed;
}

function toKebabCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase())
    .join('-');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readDirYaml(root: string): Promise<string[]> {
  const { readdir } = await import('fs/promises');
  const entries = await readdir(root).catch(() => []);
  return entries
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .map((name) => path.resolve(root, name));
}

async function readSpecFile(filePath: string): Promise<SiteSpecRecord | null> {
  const exists = await stat(filePath).catch(() => null);
  if (!exists?.isFile()) return null;
  const content = await readFile(filePath, 'utf-8');
  const parsed = YAML.parse(content);
  if (!isPlainObject(parsed)) return null;
  if (!parsed.name || !parsed.slug || !parsed.template || !parsed.target) return null;
  const schemaKitRaw = isPlainObject(parsed.schemaKit)
    ? (parsed.schemaKit as Record<string, unknown>)
    : null;
  const schemaKitValue = schemaKitRaw
    ? (() => {
        const next: { capabilities?: SchemaKitFeatures; features?: SchemaKitFeatures } = {};
        if (isPlainObject(schemaKitRaw.capabilities)) {
          next.capabilities = schemaKitRaw.capabilities as SchemaKitFeatures;
        }
        if (isPlainObject(schemaKitRaw.features)) {
          next.features = schemaKitRaw.features as SchemaKitFeatures;
        }
        return next;
      })()
    : undefined;
  return {
    ...(parsed as Record<string, unknown>),
    name: String(parsed.name),
    slug: String(parsed.slug),
    template: String(parsed.template),
    target: String(parsed.target),
    nuxtConfig: isPlainObject(parsed.nuxtConfig)
      ? (parsed.nuxtConfig as Record<string, unknown>)
      : undefined,
    packageJson: isPlainObject(parsed.packageJson)
      ? (parsed.packageJson as Record<string, unknown>)
      : undefined,
    env: isPlainObject(parsed.env)
      ? (parsed.env as Record<string, unknown>)
      : undefined,
    deploy: isPlainObject(parsed.deploy)
      ? (parsed.deploy as Record<string, unknown>)
      : undefined,
    layers: Array.isArray(parsed.layers)
      ? parsed.layers.map((entry) => String(entry).trim()).filter(Boolean)
      : undefined,
    capabilities: isPlainObject(parsed.capabilities)
      ? (parsed.capabilities as SchemaKitFeatures)
      : undefined,
    schemaKit: schemaKitValue,
  };
}

function resolveTarget(projectRoot: string, target: string): string | null {
  if (!target) return null;
  return path.isAbsolute(target) ? target : path.resolve(projectRoot, target);
}
