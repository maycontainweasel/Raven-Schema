import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import type { AppConfig, ProjectPathsConfig, SchemaKitFeatures, SchemaKitSentryFeature, SchemaKitRedisFeature, SchemaKitSurrealFeature, SchemaKitAuthFeature } from '../types';
import { loadSiteSpec } from './siteSpec';

export interface SchemaKitConfig {
  appName?: string;
  aliases: Record<string, string>;
  validation?: {
    strict?: boolean;
  };
  features?: {
    typesense?: boolean;
    trpcClient?: boolean;
    trpcServer?: boolean;
    sentry?: SchemaKitSentryFeature;
    redis?: SchemaKitRedisFeature;
    surrealdb?: SchemaKitSurrealFeature;
    auth?: SchemaKitAuthFeature;
  };
}

type SchemaKitFeaturesInput = {
  typesense?: boolean | undefined;
  trpcClient?: boolean | undefined;
  trpcServer?: boolean | undefined;
  sentry?: SchemaKitSentryFeature | boolean | undefined;
  redis?: SchemaKitRedisFeature | boolean | undefined;
  surrealdb?: SchemaKitSurrealFeature | boolean | undefined;
  auth?: SchemaKitAuthFeature | boolean | undefined;
};

type SerializedSchemaKitFeatures = NonNullable<SchemaKitConfig['features']>;

export async function writeSchemaKitConfig(options: {
  projectRoot: string;
  project: ProjectPathsConfig;
  app: AppConfig;
}): Promise<void> {
  const { projectRoot, project, app } = options;
  if (!project.nuxtProjectRoot) return;

  const appRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
  const aliases: Record<string, string> = {};
  const moduleMode = app.schemaKit?.module?.mode ?? 'copy';

  const requestSchemaImport =
    project.imports?.requestSchema === '@schema' || app.requestSchema?.projectOutput
      ? '@schema/request-schema'
      : project.imports?.requestSchema;
  if (requestSchemaImport === '@schema/request-schema') {
    const schemaRuntimeAbs = app.requestSchema?.projectOutput
      ? path.resolve(appRoot, app.requestSchema.projectOutput)
      : path.resolve(appRoot, 'modules', 'schema-kit', 'runtime', 'generated', 'request-schema.ts');
    const rel = toRelativePath(path.relative(appRoot, schemaRuntimeAbs));
    aliases[requestSchemaImport] = rel;
  }

  if (moduleMode !== 'shared') {
    const schemaRuntimeAbs = path.resolve(appRoot, 'modules', 'schema-kit', 'runtime');
    const rel = toRelativePath(path.relative(appRoot, schemaRuntimeAbs));
    aliases['@schema'] = rel;
  }

  if (project.generated?.types) {
    const typesAbs = path.resolve(projectRoot, project.generated.types);
    const rel = toRelativePath(path.relative(appRoot, typesAbs));
    aliases['@schema/types'] = rel;
  }

  const typesenseCollectionsImport = project.imports?.typesenseCollections;
  if (typesenseCollectionsImport || app.typesense?.projectOutput) {
    const typesenseAbs =
      typesenseCollectionsImport === '@schema/typesense/collections' && app.typesense?.projectOutput
        ? path.resolve(appRoot, app.typesense.projectOutput, 'collections.ts')
        : typesenseCollectionsImport
          ? resolveImportPath(projectRoot, appRoot, typesenseCollectionsImport)
          : app.typesense?.projectOutput
            ? path.resolve(appRoot, app.typesense.projectOutput, 'collections.ts')
            : null;
    if (typesenseAbs) {
      const rel = toRelativePath(path.relative(appRoot, typesenseAbs));
      aliases['@schema/typesense/collections'] = rel;
    }
  }

  const dbImport =
    app.databasesExport?.projectOutput ? '@schema/db' : undefined;
  if (dbImport && app.databasesExport?.projectOutput) {
    const dbAbs = path.resolve(appRoot, app.databasesExport.projectOutput);
    const rel = toRelativePath(path.relative(appRoot, dbAbs));
    aliases[dbImport] = rel;
  }

  const modelsImport =
    app.modelsExport?.projectOutput ? '@schema/models' : undefined;
  if (modelsImport && app.modelsExport?.projectOutput) {
    const modelsAbs = path.resolve(appRoot, app.modelsExport.projectOutput);
    const rel = toRelativePath(path.relative(appRoot, modelsAbs));
    aliases[modelsImport] = rel;
  }

  const specEntry = await loadSiteSpec(projectRoot, project);
  const siteFeatures =
    specEntry?.spec?.schemaKit?.capabilities ??
    specEntry?.spec?.schemaKit?.features ??
    specEntry?.spec?.capabilities;
  const featureConfig = resolveSchemaKitFeatures(app, project, siteFeatures);
  const resolvedFeatures = applySchemaKitDefaults(app, project, featureConfig);
  const normalizedFeatures = compactConfigFeatures({
    typesense: resolvedFeatures?.typesense,
    trpcClient: resolvedFeatures?.trpcClient,
    trpcServer: resolvedFeatures?.trpcServer,
    sentry: normalizeSentryFeature(resolvedFeatures?.sentry),
    redis: normalizeRedisFeature(resolvedFeatures?.redis),
    surrealdb: normalizeSurrealFeature(resolvedFeatures?.surrealdb),
    auth: normalizeAuthFeature(resolvedFeatures?.auth),
  });
  const config: SchemaKitConfig = {
    appName: project.name,
    aliases,
    validation: {
      strict: app.schemaKit?.validation?.strict !== false,
    },
    features: normalizedFeatures,
  };

  const outputPath = path.join(appRoot, 'schema-kit.config.json');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');
}

function toRelativePath(value: string): string {
  if (value.startsWith('.')) return value.replace(/\\/g, '/');
  return `./${value.replace(/\\/g, '/')}`;
}

function resolveImportPath(projectRoot: string, appRoot: string, value: string): string | null {
  if (!value) return null;
  if (value.startsWith('~~/')) {
    return path.resolve(appRoot, value.slice(3));
  }
  if (value.startsWith('~/') || value.startsWith('@/')) {
    return path.resolve(appRoot, value.slice(2));
  }
  if (value.startsWith('.')) {
    return path.resolve(appRoot, value);
  }
  return path.resolve(projectRoot, value);
}

export function resolveSchemaKitFeatures(
  app: AppConfig,
  project: ProjectPathsConfig,
  siteFeatures?: SchemaKitFeatures
): SchemaKitFeatures | undefined {
  const base = app.schemaKit?.features;
  const overrides = app.schemaKit?.projects?.find((entry) => entry.name === project.name)?.features;
  if (!base && !overrides && !siteFeatures) return undefined;
  return compactSchemaKitFeatures({
    ...base,
    ...overrides,
    ...siteFeatures,
    sentry: mergeFeature(base?.sentry, overrides?.sentry, siteFeatures?.sentry),
    redis: mergeFeature(base?.redis, overrides?.redis, siteFeatures?.redis),
    surrealdb: mergeFeature(base?.surrealdb, overrides?.surrealdb, siteFeatures?.surrealdb),
  });
}

export function applySchemaKitDefaults(
  app: AppConfig,
  project: ProjectPathsConfig,
  features?: SchemaKitFeatures
): SchemaKitFeatures {
  const isAdmin = isAdminProject(app, project);
  const defaults: SchemaKitFeatures = {
    surrealdb: {
      enabled: true,
      reconnectOnAuthLoss: true,
      retryFailedRequestsAfterReconnect: true,
    },
    typesense: isAdmin,
    sentry: false,
    redis: false,
    auth: false,
    trpcClient: true,
    trpcServer: true,
  };
  return compactSchemaKitFeatures({
    ...defaults,
    ...(features ?? {}),
    sentry: mergeFeature(defaults.sentry, features?.sentry),
    redis: mergeFeature(defaults.redis, features?.redis),
    surrealdb: mergeFeature(defaults.surrealdb, features?.surrealdb),
    auth: mergeFeature(defaults.auth, features?.auth),
  });
}

function compactSchemaKitFeatures(features: SchemaKitFeaturesInput): SchemaKitFeatures {
  const compacted: SchemaKitFeatures = {};

  if (features.typesense !== undefined) compacted.typesense = features.typesense;
  if (features.trpcClient !== undefined) compacted.trpcClient = features.trpcClient;
  if (features.trpcServer !== undefined) compacted.trpcServer = features.trpcServer;
  if (features.sentry !== undefined) compacted.sentry = features.sentry;
  if (features.redis !== undefined) compacted.redis = features.redis;
  if (features.surrealdb !== undefined) compacted.surrealdb = features.surrealdb;
  if (features.auth !== undefined) compacted.auth = features.auth;

  return compacted;
}

function compactConfigFeatures(features: SerializedSchemaKitFeatures | {
  typesense?: boolean | undefined;
  trpcClient?: boolean | undefined;
  trpcServer?: boolean | undefined;
  sentry?: SchemaKitSentryFeature | undefined;
  redis?: SchemaKitRedisFeature | undefined;
  surrealdb?: SchemaKitSurrealFeature | undefined;
  auth?: SchemaKitAuthFeature | undefined;
}): SerializedSchemaKitFeatures {
  const compacted: SerializedSchemaKitFeatures = {};

  if (features.typesense !== undefined) compacted.typesense = features.typesense;
  if (features.trpcClient !== undefined) compacted.trpcClient = features.trpcClient;
  if (features.trpcServer !== undefined) compacted.trpcServer = features.trpcServer;
  if (features.sentry !== undefined) compacted.sentry = features.sentry;
  if (features.redis !== undefined) compacted.redis = features.redis;
  if (features.surrealdb !== undefined) compacted.surrealdb = features.surrealdb;
  if (features.auth !== undefined) compacted.auth = features.auth;

  return compacted;
}

function mergeFeature<T extends { enabled?: boolean }>(
  base?: T | boolean,
  override?: T | boolean,
  site?: T | boolean
): T | undefined {
  const baseObj = normalizeToggle(base);
  const overrideObj = normalizeToggle(override);
  const siteObj = normalizeToggle(site);
  if (!baseObj && !overrideObj && !siteObj) return undefined;
  return { ...(baseObj ?? {}), ...(overrideObj ?? {}), ...(siteObj ?? {}) } as T;
}

function normalizeToggle<T extends { enabled?: boolean }>(value?: T | boolean): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return { enabled: value } as T;
  return value as T;
}

function normalizeSentryFeature(value?: SchemaKitSentryFeature | boolean): SchemaKitSentryFeature | undefined {
  return normalizeToggle(value);
}

function normalizeRedisFeature(value?: SchemaKitRedisFeature | boolean): SchemaKitRedisFeature | undefined {
  return normalizeToggle(value);
}

function normalizeSurrealFeature(value?: SchemaKitSurrealFeature | boolean): SchemaKitSurrealFeature | undefined {
  return normalizeToggle(value);
}

function normalizeAuthFeature(value?: SchemaKitAuthFeature | boolean): SchemaKitAuthFeature | undefined {
  return normalizeToggle(value);
}

function isAdminProject(app: AppConfig, project: ProjectPathsConfig): boolean {
  const adminProjects = app?.ui?.projects ?? [];
  if (project?.name && adminProjects.includes(project.name)) return true;
  if (project?.name && /admin/i.test(project.name)) return true;
  return false;
}
