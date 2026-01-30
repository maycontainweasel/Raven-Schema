import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import YAML from 'yaml';

import { toKebabCase } from './util';
import { loadLayerPackages, loadSitePackages, loadSiteSpec, mergePackages } from '../lib/sitePackages';

export async function runSitePkgSync(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  appPath?: string;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const slug = options.name ? toKebabCase(options.name) : '';

  const { spec } = await loadSiteSpec(projectRoot, slug, options.specPath);
  const templateRoot = path.resolve(projectRoot, spec.template ?? 'templates/nuxt-4.3.0');
  const templatePkg = await readPackageJson(path.join(templateRoot, 'package.json')).catch(() => null);
  const appRoot = options.appPath
    ? (path.isAbsolute(options.appPath) ? options.appPath : path.resolve(repoRoot, options.appPath))
    : (path.isAbsolute(spec.target) ? spec.target : path.resolve(repoRoot, spec.target));

  const basePkg = await readPackageJson(path.join(appRoot, 'package.json'));
  const layerPackages = await loadLayerPackages(projectRoot, spec.layers);
  const sitePackages = await loadSitePackages(projectRoot, spec);
  const featurePackages = await loadSchemaKitFeaturePackages(appRoot);
  const mergedPackages = mergePackages(...layerPackages, sitePackages, featurePackages);

  const nextBase = templatePkg ? mergeBasePackage(templatePkg, basePkg) : basePkg;
  const next = applyPackages(nextBase, mergedPackages);
  await writeFile(path.join(appRoot, 'package.json'), `${JSON.stringify(next, null, 2)}\n`, 'utf-8');

  console.log(`✅ Packages synced for ${spec.slug}`);
}

async function loadSchemaKitFeaturePackages(appRoot: string): Promise<{
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}> {
  const configPath = path.join(appRoot, 'schema-kit.config.json');
  const exists = await readFile(configPath, 'utf-8').catch(() => null);
  if (!exists) return {};
  let parsed: any = null;
  try {
    parsed = JSON.parse(exists);
  } catch {
    return {};
  }
  const features = parsed?.features ?? {};
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};

  const sentry = features.sentry;
  const sentryEnabled = typeof sentry === 'boolean'
    ? sentry
    : sentry?.enabled !== false;
  if (sentryEnabled) {
    deps['@sentry/vue'] = '^10.5.0';
    deps['@sentry/node'] = '^10.5.0';
    const wantsSourceMaps = typeof sentry === 'object'
      ? sentry.sourceMaps !== false
      : true;
    if (wantsSourceMaps) {
      devDeps['@sentry/vite-plugin'] = '^4.1.1';
    }
  }

  const redis = features.redis;
  const redisEnabled = typeof redis === 'boolean'
    ? redis
    : redis?.enabled === true;
  if (redisEnabled) {
    deps['ioredis'] = '^5.7.0';
  }

  if (Object.keys(deps).length === 0) return {};
  return {
    dependencies: deps,
    devDependencies: Object.keys(devDeps).length > 0 ? devDeps : undefined,
  };
}

async function readPackageJson(filePath: string): Promise<Record<string, unknown>> {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
}

function mergeBasePackage(
  templatePkg: Record<string, unknown>,
  current: Record<string, unknown>
): Record<string, unknown> {
  const out = { ...templatePkg, ...current };
  out.scripts = {
    ...(isPlainObject(templatePkg.scripts) ? templatePkg.scripts : {}),
    ...(isPlainObject(current.scripts) ? current.scripts : {}),
  };
  out.dependencies = {
    ...(isPlainObject(templatePkg.dependencies) ? templatePkg.dependencies : {}),
    ...(isPlainObject(current.dependencies) ? current.dependencies : {}),
  };
  out.devDependencies = {
    ...(isPlainObject(templatePkg.devDependencies) ? templatePkg.devDependencies : {}),
    ...(isPlainObject(current.devDependencies) ? current.devDependencies : {}),
  };
  return out;
}

function applyPackages(
  base: Record<string, unknown>,
  packages: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
): Record<string, unknown> {
  const next = { ...base };
  if (packages.dependencies) {
    next.dependencies = {
      ...(isPlainObject(base.dependencies) ? base.dependencies : {}),
      ...packages.dependencies,
    };
  }
  if (packages.devDependencies) {
    next.devDependencies = {
      ...(isPlainObject(base.devDependencies) ? base.devDependencies : {}),
      ...packages.devDependencies,
    };
  }
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
