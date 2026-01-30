import path from 'path';
import { readFile, writeFile, stat } from 'fs/promises';
import YAML from 'yaml';

import { toKebabCase } from './util';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  env?: Record<string, unknown>;
}

export async function runSiteEnvSync(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  updatePackage?: boolean;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const sitesRoot = path.resolve(projectRoot, 'sites');

  const specPath = resolveSpecPath(options, sitesRoot, projectRoot);
  const spec = await readSiteSpec(specPath);
  if (!spec) {
    throw new Error(`Site spec not found or invalid: ${specPath}`);
  }

  const targetPath = path.isAbsolute(spec.target)
    ? spec.target
    : path.resolve(repoRoot, spec.target);

  await writeEnvFiles(targetPath, spec.env);

  const updatePackage = options.updatePackage !== false;
  if (updatePackage) {
    await updatePackageJson(targetPath, repoRoot, spec);
  }

  console.log(`✅ Env synced for ${spec.slug} → ${path.relative(repoRoot, targetPath)}`);
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
    throw new Error('Site name or --spec is required.');
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
    env: parsed.env as Record<string, unknown> | undefined,
  };
}

async function writeEnvFiles(
  targetPath: string,
  envConfig: Record<string, unknown> | undefined
): Promise<void> {
  if (!envConfig || Object.keys(envConfig).length === 0) return;
  const { localLines, stagingLines } = buildEnvLines(envConfig);
  if (localLines.length > 0) {
    await writeFile(path.join(targetPath, '.env'), `${localLines.join('\n')}\n`, 'utf-8');
  }
  if (stagingLines.length > 0) {
    await writeFile(path.join(targetPath, '.env.staging'), `${stagingLines.join('\n')}\n`, 'utf-8');
  }
}

function buildEnvLines(envConfig: Record<string, unknown>): {
  localLines: string[];
  stagingLines: string[];
} {
  const localLines: string[] = [];
  const stagingLines: string[] = [];

  for (const [key, value] of Object.entries(envConfig)) {
    const normalized = normalizeEnvValue(value);
    if (normalized.local !== undefined) {
      localLines.push(`${key}=${normalized.local}`);
    }
    if (normalized.staging !== undefined) {
      stagingLines.push(`${key}=${normalized.staging}`);
    }
  }

  return { localLines, stagingLines };
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

  if (isPlainObject(value)) {
    const local = value.local !== undefined ? String(value.local) : undefined;
    const staging = value.staging !== undefined ? String(value.staging) : local;
    return { local, staging };
  }

  return {};
}

function looksLocal(value: string): boolean {
  return value.includes('localhost') || value.includes('127.0.0.1');
}

async function updatePackageJson(
  targetPath: string,
  repoRoot: string,
  spec: SiteSpec
): Promise<void> {
  if (!spec.env || Object.keys(spec.env).length === 0) return;
  const packagePath = path.join(targetPath, 'package.json');
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

  if (!hasScriptOverride(override, 'inst')) {
    const relRoot = toPosixPath(path.relative(targetPath, repoRoot)) || '.';
    override.scripts = {
      ...(isPlainObject(base.scripts) ? base.scripts : {}),
      ...(isPlainObject(override.scripts) ? override.scripts : {}),
      inst: `pnpm -C ${relRoot} --filter ${spec.slug} install`,
    };
  }

  if (!hasScriptOverride(override, 'add')) {
    const relRoot = toPosixPath(path.relative(targetPath, repoRoot)) || '.';
    override.scripts = {
      ...(isPlainObject(base.scripts) ? base.scripts : {}),
      ...(isPlainObject(override.scripts) ? override.scripts : {}),
      add: `pnpm -C ${relRoot} --filter ${spec.slug} add`,
    };
  }
  if (!hasScriptOverride(override, 'remove')) {
    const relRoot = toPosixPath(path.relative(targetPath, repoRoot)) || '.';
    override.scripts = {
      ...(isPlainObject(base.scripts) ? base.scripts : {}),
      ...(isPlainObject(override.scripts) ? override.scripts : {}),
      remove: `pnpm -C ${relRoot} --filter ${spec.slug} remove`,
    };
  }

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

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}

function hasScriptOverride(override: Record<string, unknown>, script: string): boolean {
  if (!isPlainObject(override.scripts)) return false;
  return Object.prototype.hasOwnProperty.call(override.scripts, script);
}
