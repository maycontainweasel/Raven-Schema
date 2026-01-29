import path from 'path';
import { readFile, writeFile, stat } from 'fs/promises';
import YAML from 'yaml';

import { toKebabCase } from './util';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  nuxtConfig?: Record<string, unknown>;
  packageJson?: Record<string, unknown>;
  env?: Record<string, unknown>;
}

export async function runSiteAdopt(options: {
  projectRoot: string;
  name?: string;
  appPath?: string;
  specPath?: string;
  force?: boolean;
  updateApp?: boolean;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const sitesRoot = path.resolve(projectRoot, 'sites');

  const appRoot = await resolveAppRoot(repoRoot, options);
  const appName = await resolveAppName(appRoot, options.name);
  const slug = toKebabCase(appName);
  const specPath = resolveSpecPath(sitesRoot, appName, options.specPath, projectRoot);

  const envConfig = await readEnvConfig(appRoot);
  const targetRel = path.relative(repoRoot, appRoot);

  const spec: SiteSpec = {
    name: appName,
    slug,
    template: 'templates/nuxt-4.3.0',
    target: targetRel,
    env: Object.keys(envConfig).length > 0 ? envConfig : undefined,
  };

  const specExists = await stat(specPath).catch(() => null);
  if (specExists?.isFile() && !options.force) {
    throw new Error(`Spec already exists: ${specPath} (use --force to overwrite)`);
  }
  await writeFile(specPath, YAML.stringify(spec), 'utf-8');

  if (options.updateApp !== false) {
    await adoptNuxtConfig(appRoot);
  }

  console.log(`✅ Adopted site: ${path.relative(repoRoot, appRoot)}`);
  console.log(`📝 Spec written: ${path.relative(projectRoot, specPath)}`);
}

async function resolveAppRoot(
  repoRoot: string,
  options: { appPath?: string; name?: string }
): Promise<string> {
  const candidates: string[] = [];
  if (options.appPath) {
    candidates.push(options.appPath);
  }
  if (options.name) {
    candidates.push(path.join('apps', options.name));
  }

  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(repoRoot, candidate);
    const exists = await stat(resolved).catch(() => null);
    if (exists?.isDirectory()) {
      return resolved;
    }
  }

  throw new Error('Unable to resolve app folder. Provide --app or a valid site name.');
}

async function resolveAppName(appRoot: string, fallback?: string): Promise<string> {
  const pkgPath = path.join(appRoot, 'package.json');
  const pkg = await readFile(pkgPath, 'utf-8').catch(() => null);
  if (pkg) {
    const parsed = JSON.parse(pkg) as { name?: string };
    if (parsed.name && parsed.name.trim()) {
      return parsed.name.trim();
    }
  }
  if (fallback && fallback.trim()) return fallback.trim();
  return path.basename(appRoot);
}

function resolveSpecPath(
  sitesRoot: string,
  name: string,
  specPath: string | undefined,
  projectRoot: string
): string {
  if (specPath) {
    return path.isAbsolute(specPath)
      ? specPath
      : path.resolve(projectRoot, specPath);
  }
  const slug = toKebabCase(name);
  return path.resolve(sitesRoot, `${slug}.yaml`);
}

async function readEnvConfig(appRoot: string): Promise<Record<string, unknown>> {
  const envLocal = await readEnvFile(path.join(appRoot, '.env'));
  const envStaging = await readEnvFile(path.join(appRoot, '.env.staging'));
  const keys = new Set([...Object.keys(envLocal), ...Object.keys(envStaging)]);
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    out[key] = {
      local: envLocal[key],
      staging: envStaging[key] ?? envLocal[key],
    };
  }
  return out;
}

async function readEnvFile(filePath: string): Promise<Record<string, string>> {
  const exists = await stat(filePath).catch(() => null);
  if (!exists?.isFile()) return {};
  const content = await readFile(filePath, 'utf-8');
  const out: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

async function adoptNuxtConfig(appRoot: string): Promise<void> {
  const nuxtConfigPath = path.join(appRoot, 'nuxt.config.ts');
  const existing = await readFile(nuxtConfigPath, 'utf-8').catch(() => null);
  if (!existing) return;

  if (existing.includes('nuxt.config.generated') && existing.includes('nuxt.config.runtime')) {
    return;
  }

  const legacyPath = path.join(appRoot, 'nuxt.config.legacy.ts');
  const legacyExists = await stat(legacyPath).catch(() => null);
  if (!legacyExists?.isFile()) {
    await writeFile(legacyPath, existing, 'utf-8');
  }

  const runtimePath = path.join(appRoot, 'nuxt.config.runtime.ts');
  const runtimeExists = await stat(runtimePath).catch(() => null);
  if (!runtimeExists?.isFile()) {
    await writeFile(runtimePath, 'export default {};\n', 'utf-8');
  }

  const generatedPath = path.join(appRoot, 'nuxt.config.generated.ts');
  const generatedExists = await stat(generatedPath).catch(() => null);
  if (!generatedExists?.isFile()) {
    await writeFile(generatedPath, '// Generated by schema site tooling. Do not edit directly.\nexport default {};\n', 'utf-8');
  }

  const wrapper = `// https://nuxt.com/docs/api/configuration/nuxt-config
import generated from './nuxt.config.generated';
import runtime from './nuxt.config.runtime';
import legacy from './nuxt.config.legacy';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

const overrides = legacy;

export default defineNuxtConfig(mergeConfig(mergeConfig(generated, runtime), overrides));
`;

  await writeFile(nuxtConfigPath, wrapper, 'utf-8');
}
