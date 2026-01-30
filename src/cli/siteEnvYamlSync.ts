import path from 'path';
import { readFile, writeFile, stat } from 'fs/promises';
import YAML from 'yaml';

import { toKebabCase } from './util';
import { loadLayerEnvDefaults, mergeEnvDefaults } from '../lib/siteEnvDefaults';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  layers?: string[];
}

interface EnvSyncOptions {
  projectRoot: string;
  name?: string;
  specPath?: string;
  appPath?: string;
  envPath?: string;
  updatePackage?: boolean;
  writeRuntimeConfig?: boolean;
  writeEnvConfig?: boolean;
}

export async function runSiteEnvYamlSync(options: EnvSyncOptions): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const sitesRoot = path.resolve(projectRoot, 'sites');

  const { appRoot, spec } = await resolveAppRoot(options, sitesRoot, projectRoot, repoRoot);
  const envPath = options.envPath
    ? resolveEnvPath(options.envPath, appRoot, projectRoot)
    : path.join(appRoot, 'env.yaml');

  const { envSpecRaw, customBlock, customKeys, hadFile, hasMarker } = await readEnvYamlWithCustom(envPath);
  const layerDefaults = spec?.layers && spec.layers.length > 0
    ? await loadLayerEnvDefaults(projectRoot, spec.layers)
    : {};
  const { merged: envSpec, added } = mergeEnvDefaults(envSpecRaw, layerDefaults);
  for (const key of customKeys) {
    delete (envSpec as Record<string, unknown>)[key];
  }
  if (added.length > 0 || Object.keys(envSpecRaw).length === 0 || !hadFile || !hasMarker) {
    const output = buildEnvYamlOutput(envSpec, customBlock, hadFile);
    await writeFile(envPath, output, 'utf-8');
  }
  const { localLines, stagingLines, envConfig, runtimeConfig } = buildEnvOutputs(envSpec);

  await writeEnvFile(path.join(appRoot, '.env'), localLines);
  await writeEnvFile(path.join(appRoot, '.env.staging'), stagingLines);

  if (options.writeEnvConfig !== false) {
    const envConfigPath = path.join(appRoot, 'env.config.cjs');
    const envConfigBody = `module.exports = ${JSON.stringify(envConfig, null, 2)};\n`;
    await writeFile(envConfigPath, envConfigBody, 'utf-8');
  }

  if (options.writeRuntimeConfig !== false) {
    const runtimePath = path.join(appRoot, 'nuxt.config.runtime.ts');
    const runtimeBody = `export default ${JSON.stringify({ runtimeConfig }, null, 2)};\n`;
    await writeFile(runtimePath, runtimeBody, 'utf-8');
  }

  if (options.updatePackage !== false) {
    await updatePackageJson(appRoot, repoRoot);
  }

  console.log(`✅ env.yaml synced → ${path.relative(repoRoot, appRoot)}`);
}

async function resolveAppRoot(
  options: EnvSyncOptions,
  sitesRoot: string,
  projectRoot: string,
  repoRoot: string
): Promise<{ appRoot: string; spec: SiteSpec | null }> {
  if (options.appPath) {
    return {
      appRoot: path.isAbsolute(options.appPath)
      ? options.appPath
      : path.resolve(repoRoot, options.appPath),
      spec: null,
    };
  }
  const specPath = resolveSpecPath(options, sitesRoot, projectRoot);
  const spec = await readSiteSpec(specPath);
  if (!spec) {
    throw new Error(`Site spec not found or invalid: ${specPath}`);
  }
  return {
    appRoot: path.isAbsolute(spec.target)
    ? spec.target
    : path.resolve(repoRoot, spec.target),
    spec,
  };
}

function resolveSpecPath(
  options: { name?: string; specPath?: string },
  sitesRoot: string,
  projectRoot: string
): string {
  if (options.specPath) {
    return resolveProvidedSpecPath(options.specPath, projectRoot, sitesRoot);
  }
  if (!options.name) {
    throw new Error('Site name, --spec, or --app is required.');
  }
  const slug = toKebabCase(options.name);
  return path.resolve(sitesRoot, `${slug}.yaml`);
}

function resolveProvidedSpecPath(
  specPath: string,
  projectRoot: string,
  sitesRoot: string
): string {
  if (path.isAbsolute(specPath)) return specPath;
  const normalized = specPath.replace(/^[./]+/, '');
  const hasSeparator = normalized.includes(path.sep);
  if (hasSeparator) {
    return path.resolve(projectRoot, normalized);
  }
  return path.resolve(sitesRoot, normalized);
}

function resolveEnvPath(envPath: string, appRoot: string, projectRoot: string): string {
  if (path.isAbsolute(envPath)) return envPath;
  const normalized = envPath.replace(/^[./]+/, '');
  const hasSeparator = normalized.includes(path.sep);
  if (hasSeparator) {
    return path.resolve(projectRoot, normalized);
  }
  return path.resolve(appRoot, normalized);
}

async function readSiteSpec(specPath: string): Promise<SiteSpec | null> {
  const exists = await stat(specPath).catch(() => null);
  if (!exists?.isFile()) return null;
  const content = await readFile(specPath, 'utf-8');
  const parsed = YAML.parse(content) as Partial<SiteSpec>;
  if (!parsed?.name || !parsed.slug || !parsed.template || !parsed.target) {
    return null;
  }
  return {
    name: String(parsed.name),
    slug: String(parsed.slug),
    template: String(parsed.template),
    target: String(parsed.target),
    layers: Array.isArray((parsed as any).layers)
      ? (parsed as any).layers.map((entry: any) => String(entry).trim()).filter(Boolean)
      : undefined,
  };
}

const CUSTOM_ENV_MARKER = '# --- schema:custom ---';

async function readEnvYamlWithCustom(envPath: string): Promise<{
  envSpecRaw: Record<string, unknown>;
  customBlock: string | null;
  customKeys: Set<string>;
  hadFile: boolean;
  hasMarker: boolean;
}> {
  const exists = await stat(envPath).catch(() => null);
  if (!exists?.isFile()) {
    return {
      envSpecRaw: {},
      customBlock: null,
      customKeys: new Set(),
      hadFile: false,
      hasMarker: false,
    };
  }
  const content = await readFile(envPath, 'utf-8');
  const parsed = YAML.parse(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`env.yaml must be a YAML mapping: ${envPath}`);
  }
  const markerIndex = content.indexOf(CUSTOM_ENV_MARKER);
  if (markerIndex === -1) {
    return {
      envSpecRaw: parsed as Record<string, unknown>,
      customBlock: null,
      customKeys: new Set(),
      hadFile: true,
      hasMarker: false,
    };
  }
  const afterMarker = content.slice(markerIndex + CUSTOM_ENV_MARKER.length);
  const customBlock = afterMarker.replace(/^\r?\n/, '');
  let customParsed: Record<string, unknown> = {};
  try {
    const candidate = YAML.parse(customBlock);
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      customParsed = candidate as Record<string, unknown>;
    }
  } catch {
    customParsed = {};
  }
  return {
    envSpecRaw: parsed as Record<string, unknown>,
    customBlock,
    customKeys: new Set(Object.keys(customParsed)),
    hadFile: true,
    hasMarker: true,
  };
}

function buildEnvYamlOutput(
  envSpec: Record<string, unknown>,
  customBlock: string | null,
  hadFile: boolean
): string {
  const header = YAML.stringify(envSpec).trimEnd();
  let output = header ? `${header}\n` : '';
  if (customBlock !== null || !hadFile) {
    output += `${CUSTOM_ENV_MARKER}\n`;
    if (customBlock) {
      output += customBlock.replace(/^\r?\n/, '');
      if (!output.endsWith('\n')) output += '\n';
    }
  }
  if (!output.endsWith('\n')) output += '\n';
  return output;
}

function buildEnvOutputs(envSpec: Record<string, unknown>): {
  localLines: string[];
  stagingLines: string[];
  envConfig: Record<string, string>;
  runtimeConfig: Record<string, unknown>;
} {
  const localLines: string[] = [];
  const stagingLines: string[] = [];
  const envConfig: Record<string, string> = {};
  const runtimeConfig: Record<string, unknown> = {};

  for (const [rawKey, rawValue] of Object.entries(envSpec)) {
    if (!isScalar(rawValue)) {
      continue;
    }
    const key = String(rawKey).trim();
    if (!key) continue;

    const normalized = normalizeEnvValue(rawValue);
    if (normalized.local !== undefined) {
      localLines.push(formatEnvLine(key, normalized.local));
    }
    if (normalized.staging !== undefined) {
      stagingLines.push(formatEnvLine(key, normalized.staging));
      envConfig[key] = String(normalized.staging);
    } else if (normalized.local !== undefined) {
      envConfig[key] = String(normalized.local);
    }

    const runtimePath = mapEnvKeyToRuntimePath(key);
    if (runtimePath) {
      setRuntimeConfigValue(runtimeConfig, runtimePath, '');
    }
  }

  return { localLines, stagingLines, envConfig, runtimeConfig };
}

function normalizeEnvValue(value: unknown): { local?: string; staging?: string } {
  if (value === null) {
    return { local: '', staging: '' };
  }
  if (typeof value === 'string') {
    if (value.includes('|')) {
      const parts = value.split('|').map((part) => part.trim()).filter(Boolean);
      const left = parts[0];
      const right = parts[1];
      if (left && right) {
        if (looksLocal(right) && !looksLocal(left)) {
          return { local: right, staging: left };
        }
        if (looksLocal(left) && !looksLocal(right)) {
          return { local: left, staging: right };
        }
        return { local: left, staging: right };
      }
    }
    return { local: value, staging: value };
  }

  if (Array.isArray(value)) {
    const local = value[0] === null ? '' : value[0] !== undefined ? String(value[0]) : undefined;
    const staging = value[1] === null ? '' : value[1] !== undefined ? String(value[1]) : local;
    return { local, staging };
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const local = record.local === null ? '' : record.local !== undefined ? String(record.local) : undefined;
    const staging = record.staging === null ? '' : record.staging !== undefined ? String(record.staging) : local;
    return { local, staging };
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return { local: String(value), staging: String(value) };
  }

  if (value === undefined) return {};
  return { local: String(value), staging: String(value) };
}

function looksLocal(value: string): boolean {
  return value.includes('localhost') || value.includes('127.0.0.1');
}

function isScalar(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    Array.isArray(value) ||
    (value && typeof value === 'object' && !Array.isArray(value))
  );
}

function formatEnvLine(key: string, value: string): string {
  if (/[\s#]/.test(value)) {
    return `${key}=\"${value.replace(/\"/g, '\\\\\"')}\"`;
  }
  return `${key}=${value}`;
}

function mapEnvKeyToRuntimePath(key: string): string[] | null {
  if (key.startsWith('NUXT_PUBLIC_')) {
    const rest = key.slice('NUXT_PUBLIC_'.length);
    return ['public', ...splitRuntimeSegmentsWithGroup(rest)];
  }
  if (key.startsWith('NUXT_APP_')) {
    const rest = key.slice('NUXT_APP_'.length);
    return ['app', ...splitRuntimeSegmentsWithGroup(rest)];
  }
  if (key.startsWith('NUXT_')) {
    const rest = key.slice('NUXT_'.length);
    return splitRuntimeSegmentsWithGroup(rest);
  }
  return null;
}

const GROUPED_RUNTIME_KEYS = new Set(['SURREALDB', 'TYPESENSE', 'REDIS', 'SENTRY']);

function splitRuntimeSegmentsWithGroup(raw: string): string[] {
  const parts = raw.split('_').filter(Boolean);
  if (parts.length > 1 && GROUPED_RUNTIME_KEYS.has(parts[0])) {
    const group = toCamelCase([parts[0]]);
    const rest = toCamelCase(parts.slice(1));
    return rest ? [group, rest] : [group];
  }
  return splitRuntimeSegments(raw);
}

function splitRuntimeSegments(raw: string): string[] {
  return raw
    .split('__')
    .map((segment) => toCamelCase(segment.split('_').filter(Boolean)))
    .filter(Boolean);
}

function toCamelCase(parts: string[]): string {
  return parts
    .map((part) => part.toLowerCase())
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join('');
}

function setRuntimeConfigValue(target: Record<string, unknown>, pathParts: string[], value: unknown): void {
  if (pathParts.length === 0) return;
  const [head, ...rest] = pathParts;
  if (!rest.length) {
    if (target[head] === undefined) {
      target[head] = value;
    }
    return;
  }
  const next = target[head];
  if (!next || typeof next !== 'object' || Array.isArray(next)) {
    target[head] = {};
  }
  setRuntimeConfigValue(target[head] as Record<string, unknown>, rest, value);
}

async function writeEnvFile(filePath: string, lines: string[]): Promise<void> {
  if (lines.length === 0) return;
  await writeFile(filePath, `${lines.join('\n')}\n`, 'utf-8');
}

async function updatePackageJson(appRoot: string, repoRoot: string): Promise<void> {
  const packagePath = path.join(appRoot, 'package.json');
  const content = await readFile(packagePath, 'utf-8').catch(() => null);
  if (!content) return;
  const base = JSON.parse(content) as Record<string, unknown>;
  const override: Record<string, unknown> = {};

  override.scripts = {
    ...(isPlainObject(base.scripts) ? base.scripts : {}),
    build: 'dotenv -e .env.staging -- nuxi build',
  };
  override.dependencies = {
    ...(isPlainObject(base.dependencies) ? base.dependencies : {}),
    'dotenv-cli': '^7.4.0',
  };

  const merged = mergeConfig(base, override) as Record<string, unknown>;
  await writeFile(packagePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
}

function mergeConfig(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (Array.isArray(base) || Array.isArray(override)) {
    return override;
  }
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      out[key] = mergeConfig(out[key], value);
    }
    return out;
  }
  return override;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
