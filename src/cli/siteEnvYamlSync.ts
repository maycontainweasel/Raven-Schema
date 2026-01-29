import path from 'path';
import { readFile, writeFile, stat } from 'fs/promises';
import YAML from 'yaml';

import { toKebabCase } from './util';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
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

  const appRoot = await resolveAppRoot(options, sitesRoot, projectRoot, repoRoot);
  const envPath = options.envPath
    ? resolveEnvPath(options.envPath, appRoot, projectRoot)
    : path.join(appRoot, 'env.yaml');

  const envSpec = await readEnvYaml(envPath);
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
): Promise<string> {
  if (options.appPath) {
    return path.isAbsolute(options.appPath)
      ? options.appPath
      : path.resolve(repoRoot, options.appPath);
  }
  const specPath = resolveSpecPath(options, sitesRoot, projectRoot);
  const spec = await readSiteSpec(specPath);
  if (!spec) {
    throw new Error(`Site spec not found or invalid: ${specPath}`);
  }
  return path.isAbsolute(spec.target)
    ? spec.target
    : path.resolve(repoRoot, spec.target);
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
  };
}

async function readEnvYaml(envPath: string): Promise<Record<string, unknown>> {
  const exists = await stat(envPath).catch(() => null);
  if (!exists?.isFile()) {
    throw new Error(`env.yaml not found: ${envPath}`);
  }
  const content = await readFile(envPath, 'utf-8');
  const parsed = YAML.parse(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`env.yaml must be a YAML mapping: ${envPath}`);
  }
  return parsed as Record<string, unknown>;
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
    const local = value[0] !== undefined ? String(value[0]) : undefined;
    const staging = value[1] !== undefined ? String(value[1]) : local;
    return { local, staging };
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const local = record.local !== undefined ? String(record.local) : undefined;
    const staging = record.staging !== undefined ? String(record.staging) : local;
    return { local, staging };
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return { local: String(value), staging: String(value) };
  }

  return {};
}

function looksLocal(value: string): boolean {
  return value.includes('localhost') || value.includes('127.0.0.1');
}

function isScalar(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
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
    return ['public', ...splitRuntimeSegments(rest)];
  }
  if (key.startsWith('NUXT_APP_')) {
    const rest = key.slice('NUXT_APP_'.length);
    return ['app', ...splitRuntimeSegments(rest)];
  }
  if (key.startsWith('NUXT_')) {
    const rest = key.slice('NUXT_'.length);
    return splitRuntimeSegments(rest);
  }
  return null;
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
