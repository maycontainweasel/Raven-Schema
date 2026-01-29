import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import path from 'path';

import type { AppConfig, ProjectPathsConfig } from '../types';
import { loadSiteSpec } from './siteSpec';

export interface ProjectSetupReport {
  project: ProjectPathsConfig;
  appRoot: string;
  packageName: string | null;
  missingDeps: string[];
  missingDevDeps: string[];
  missingFiles: string[];
  missingConfig: string[];
  missingEnvFiles: string[];
  notes: string[];
}

const REQUIRED_DEPENDENCIES = [
  '@trpc/server',
  '@trpc/client',
  'trpc-nuxt',
  'superjson',
  'surrealdb',
  'typesense',
  'iron-webcrypto',
];

const DEPENDENCY_VERSIONS: Record<string, string> = {
  '@trpc/server': '^11.4.4',
  '@trpc/client': '^11.4.4',
  'trpc-nuxt': '1.2.0',
  'superjson': '^2.2.2',
  'surrealdb': '^2.0.0-alpha.16',
  'typesense': '^1.8.2',
  'iron-webcrypto': '^1.2.1',
  '@sentry/vue': '^10.5.0',
  '@sentry/node': '^10.5.0',
  '@sentry/vite-plugin': '^4.1.1',
  'ioredis': '^5.7.0',
};

const REQUIRED_FILES = [
  'server/trpc/routers/_app.ts',
  'server/trpc/routers/generated/index.ts',
  'server/trpc/routers/api.ts',
  'server/trpc/context.ts',
  'schema/context/trpc.ts',
];

const REQUIRED_ENV_FILES = ['.env', '.env.staging'];
const ADMIN_LAYER_FILES = [
  'layers/admin-core/nuxt.config.ts',
  'layers/generated/nuxt.config.ts',
];

export async function checkProjectSetup(options: {
  projectRoot: string;
  app: AppConfig;
  project: ProjectPathsConfig;
}): Promise<ProjectSetupReport | null> {
  const { projectRoot, project, app } = options;
  if (!project.nuxtProjectRoot) return null;

  const appRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
  const featureConfig = resolveSchemaKitFeatures(app, project);
  const requiredFiles = buildRequiredFiles(app, project);
  const packageJsonPath = path.join(appRoot, 'package.json');
  const pkg = await readJson(packageJsonPath).catch(() => null);
  if (!pkg) {
    return {
      project,
      appRoot,
      packageName: null,
      missingDeps: [...REQUIRED_DEPENDENCIES],
      missingDevDeps: [],
      missingFiles: requiredFiles,
      missingConfig: buildRequiredConfigMarkers(featureConfig),
      missingEnvFiles: [...REQUIRED_ENV_FILES],
      notes: [`package.json not found at ${packageJsonPath}`],
    };
  }

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const requiredDeps = buildRequiredDependencies(featureConfig, app.tooling);
  const missingDeps = requiredDeps.filter((dep) => !deps[dep]);

  const notes: string[] = [];
  const nuxtConfig = await findNuxtConfig(appRoot);
  if (!nuxtConfig) {
    const specEntry = await loadSiteSpec(projectRoot, project);
    if (!specEntry) {
      notes.push('nuxt.config not found (nuxt.config.ts/js/mjs).');
    }
  }

  const missingFiles = await findMissingFiles(appRoot, requiredFiles);
  const missingConfig: string[] = [];
  if (nuxtConfig) {
    const configContent = await readFile(nuxtConfig, 'utf-8').catch(() => '');
    const configMarkers = buildRequiredConfigMarkers(featureConfig);
    for (const marker of configMarkers) {
      if (!configContent.includes(marker)) {
        missingConfig.push(marker);
      }
    }
  }

  const missingEnvFiles = await findMissingFiles(appRoot, REQUIRED_ENV_FILES);
  if (missingEnvFiles.length === REQUIRED_ENV_FILES.length) {
    notes.push('No .env or .env.staging found in app root.');
  }

  return {
    project,
    appRoot,
    packageName: typeof pkg.name === 'string' ? pkg.name : null,
    missingDeps,
    missingDevDeps: [],
    missingFiles,
    missingConfig,
    missingEnvFiles,
    notes,
  };
}

export async function applyProjectSetupFixes(report: ProjectSetupReport): Promise<string[]> {
  const created: string[] = [];
  if (!report.appRoot) return created;

  for (const rel of report.missingFiles) {
    const template = FILE_TEMPLATES[rel];
    if (!template) continue;
    const fullPath = path.join(report.appRoot, rel);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, template, 'utf-8');
    created.push(rel);
  }

  return created;
}

async function ensureSchemaKitOverrides(appRoot: string, created: string[]): Promise<void> {
  const overridesRoot = path.join(appRoot, 'schema', 'overrides', 'schema-kit');
  const runtimeRoot = path.join(overridesRoot, 'runtime');
  const folders = [
    runtimeRoot,
    path.join(runtimeRoot, 'composables'),
    path.join(runtimeRoot, 'components'),
    path.join(runtimeRoot, 'plugins'),
    path.join(runtimeRoot, 'server'),
    path.join(runtimeRoot, 'server', 'api'),
    path.join(runtimeRoot, 'server', 'plugins'),
  ];

  for (const folder of folders) {
    await mkdir(folder, { recursive: true });
  }

  const readmePath = path.join(overridesRoot, 'README.md');
  const readmeExists = await stat(readmePath).catch(() => null);
  if (!readmeExists?.isFile()) {
    const content = `# schema-kit overrides

Place override files here to replace schema-kit module runtime assets.

- \`schema/overrides/schema-kit/runtime\` mirrors \`modules/schema-kit/runtime\`.
- Any file present here takes precedence over the generated module runtime file.

Examples:
- Override composables: \`schema/overrides/schema-kit/runtime/composables/useCRUD.ts\`
- Override plugins: \`schema/overrides/schema-kit/runtime/plugins/trpc-client.ts\`
- Override server handlers: \`schema/overrides/schema-kit/runtime/server/api/aliases.get.ts\`
`;
    await writeFile(readmePath, content, 'utf-8');
    created.push(path.relative(appRoot, readmePath));
  }

  const contextPath = path.join(runtimeRoot, 'server', 'trpc', 'context.ts');
  const contextExists = await stat(contextPath).catch(() => null);
  const contextNeedsUpdate = contextExists?.isFile()
    ? (await readFile(contextPath, 'utf-8').catch(() => '')).includes('@pmv2/shared')
    : true;
  if (contextNeedsUpdate) {
    const moduleContextPath = path.resolve(__dirname, '..', '..', 'module', 'src', 'runtime', 'server', 'trpc', 'context.ts');
    let template = '';
    try {
      template = await readFile(moduleContextPath, 'utf-8');
    } catch {
      template = `import type { H3Event } from 'h3'
import { TRPCError } from '@trpc/server'
import { Surreal } from 'surrealdb'
import { readSession } from '@schema/server/auth/session'
import { getSurrealClient } from '@schema/server/plugins/surrealdb.server'
import { LR, LRS } from '@schema/utils/lrs'
import { dbInstances, defaultDbInstance } from '@schema/db'
import {
  t,
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  transformer,
} from '@schema/server/trpc'

export type ContextExt = Record<string, unknown>

const loadContextExtension = async () => {
  try {
    return await import('~~/schema/context/trpc')
  } catch {
    return null
  }
}

export async function createContext(event: H3Event) {
  const se =
    (event as any).context?.SE ||
    (typeof globalThis.$SE === 'function' ? globalThis.$SE : undefined)

  let db
  try {
    db = getSurrealClient()
  } catch (e: any) {
    se?.(new Error(\`Surreal not initialised: \${e?.message || e}\`), { where: 'schema-kit.createContext' })
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'SurrealDB unavailable' })
  }

  const redis = await resolveRedis()

  const session = await readSession(event).catch((e: any) => {
    se?.(new Error(\`readSession failed: \${e?.message || e}\`), { where: 'schema-kit.createContext' })
    return null
  })

  const api = {
    query: (query: string, vars?: Record<string, any>) => db.query(query, vars),
    DB: (instance: string) => getInstanceDB(instance),
  }

  const base = {
    event,
    session,
    db,
    redis,
    se,
    SE: se,
    $api: api,
    LR,
    LRS,
  }

  const ext = await loadContextExtension()
  const extra: ContextExt = ext?.createContextExt
    ? await ext.createContextExt(event, base)
    : {}

  return { ...base, ...extra }
}

export type Ctx = Awaited<ReturnType<typeof createContext>>

export { t, router, publicProcedure, protectedProcedure, adminProcedure, transformer }

async function resolveRedis() {
  try {
    const mod = await import('@schema/server/plugins/redis.server')
    return mod.getRedis()
  } catch {
    return undefined
  }
}

const instanceCache = new Map<string, Surreal>()

async function getInstanceDB(instance?: string): Promise<Surreal> {
  const key = instance || (defaultDbInstance as string) || 'pm'
  if (key === (defaultDbInstance as string) || key === 'pm') {
    try {
      return getSurrealClient()
    } catch {
      // fall through to manual connection
    }
  }
  if (instanceCache.has(key)) {
    return instanceCache.get(key) as Surreal
  }
  const cfg = (dbInstances as Record<string, any>)[key]
  if (!cfg) {
    throw new Error(\`Unknown database instance "\${key}"\`)
  }
  const client = new Surreal()
  const url = cfg.url.endsWith('/rpc') ? cfg.url : \`\${cfg.url}/rpc\`
  try {
    await client.connect(url, {
      namespace: cfg.namespace,
      database: cfg.database,
      auth: { username: cfg.username, password: cfg.password },
    })
  } catch {
    await client.connect(url)
    await client.signin({ username: cfg.username, password: cfg.password })
    await client.use({ namespace: cfg.namespace, database: cfg.database })
  }
  instanceCache.set(key, client)
  return client
}
`;
    }
    await mkdir(path.dirname(contextPath), { recursive: true });
    await writeFile(contextPath, template, 'utf-8');
    created.push(path.relative(appRoot, contextPath));
  }

const pluginStubs: Record<string, string> = {
    'server/plugins/surrealdb.server.ts': `import createSurrealDBServerPlugin, {
  getSurrealClient,
  getSurrealClientSafe,
} from '@schema/server/plugins/surrealdb.server'

export default defineNitroPlugin(async (nitroApp) => {
  const rc = useRuntimeConfig() as any
  const appName = rc?.public?.schemaKit?.appName || rc?.schemaKit?.appName || 'app'
  return createSurrealDBServerPlugin(appName)(nitroApp)
})

export { getSurrealClient, getSurrealClientSafe }
`,
    'server/plugins/redis.server.ts': `import createRedisServerPlugin from '@schema/server/plugins/redis.server'

export default defineNitroPlugin(async (nitroApp) => {
  const rc = useRuntimeConfig() as any
  const appName = rc?.public?.schemaKit?.appName || rc?.schemaKit?.appName || 'app'
  return createRedisServerPlugin(appName)(nitroApp)
})
`,
    'server/plugins/sentry.server.ts': `import createSentryServerPlugin from '@schema/server/plugins/sentry.server'

export default defineNitroPlugin(async (nitroApp) => {
  const rc = useRuntimeConfig() as any
  const appName = rc?.public?.schemaKit?.appName || rc?.schemaKit?.appName || 'app'
  return createSentryServerPlugin(appName)(nitroApp)
})
`,
  };

  for (const [relPath, template] of Object.entries(pluginStubs)) {
    const fullPath = path.join(runtimeRoot, relPath);
    const exists = await stat(fullPath).catch(() => null);
    const needsUpdate = exists?.isFile()
      ? (await readFile(fullPath, 'utf-8').catch(() => '')).includes('@pmv2/shared')
      : true;
    if (!needsUpdate) continue;
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, template, 'utf-8');
    created.push(path.relative(appRoot, fullPath));
  }
}

export interface SurrealEnvValues {
  url?: string;
  user?: string;
  pass?: string;
  namespace?: string;
  database?: string;
  typesenseHost?: string;
  typesenseApiKey?: string;
  typesensePort?: string;
  typesenseEnableCors?: string;
}

export interface EnvSectionOptions {
  surrealdb?: boolean;
  typesense?: boolean;
  sentry?: boolean;
  redis?: boolean;
}

export async function applyEnvFileFixes(
  report: ProjectSetupReport,
  options?: {
    values?: SurrealEnvValues;
    sections?: EnvSectionOptions;
  }
): Promise<string[]> {
  const created: string[] = [];
  if (!report.appRoot) return created;

  const values = options?.values;
  const sections = options?.sections;
  const candidates = ['.env', '.env.staging'];

  for (const rel of report.missingEnvFiles) {
    const template = renderEnvTemplate(values, rel, sections);
    if (!template) continue;
    const fullPath = path.join(report.appRoot, rel);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, template, 'utf-8');
    created.push(rel);
  }

  for (const rel of candidates) {
    const fullPath = path.join(report.appRoot, rel);
    const s = await stat(fullPath).catch(() => null);
    if (!s?.isFile()) continue;
    const updated = await ensureEnvSections(fullPath, values, sections);
    if (updated) created.push(rel);
  }

  return created;
}

export async function ensureRedisCompose(appRoot: string): Promise<string | null> {
  const fileName = 'docker-compose.redis.yml';
  const fullPath = path.join(appRoot, fileName);
  const exists = await stat(fullPath).catch(() => null);
  if (exists?.isFile()) return null;

  const content = [
    'services:',
    '  redis:',
    '    image: redis:7-alpine',
    '    container_name: schema-kit-redis',
    '    ports:',
    '      - "6389:6379"',
    '    command: ["redis-server", "--appendonly", "yes", "--requirepass", "RedisBurntMyMoustache2025"]',
    '    volumes:',
    '      - redis_data:/data',
    '    healthcheck:',
    '      test: ["CMD", "redis-cli", "-a", "RedisBurntMyMoustache2025", "ping"]',
    '      interval: 5s',
    '      timeout: 3s',
    '      retries: 10',
    '',
    'volumes:',
    '  redis_data:',
    '',
  ].join('\n');

  await writeFile(fullPath, content, 'utf-8');
  return fileName;
}

export async function ensureTypesenseCompose(appRoot: string): Promise<string | null> {
  const fileName = 'docker-compose.typesense.yml';
  const fullPath = path.join(appRoot, fileName);
  const exists = await stat(fullPath).catch(() => null);
  if (exists?.isFile()) return null;

  const content = [
    'services:',
    '  typesense:',
    '    image: typesense/typesense:0.25.2',
    '    container_name: schema-kit-typesense',
    '    ports:',
    '      - "8109:8108"',
    '    environment:',
    '      TYPESENSE_API_KEY: TypesenseBurntMyMoustache2025',
    '      TYPESENSE_DATA_DIR: /data',
    '      TYPESENSE_ENABLE_CORS: "true"',
    '    volumes:',
    '      - typesense_data:/data',
    '    healthcheck:',
    '      test: ["CMD", "wget", "-qO-", "http://localhost:8108/health"]',
    '      interval: 5s',
    '      timeout: 3s',
    '      retries: 10',
    '',
    'volumes:',
    '  typesense_data:',
    '',
  ].join('\n');

  await writeFile(fullPath, content, 'utf-8');
  return fileName;
}

export async function buildInstallHint(
  report: ProjectSetupReport,
  repoRoot: string,
  repoMode?: 'turbo' | 'standalone'
): Promise<string> {
  if (report.missingDeps.length === 0) return '';
  const depsWithVersions = report.missingDeps.map((dep) => formatDependency(dep)).join(' ');
  const usePnpmWorkspace = repoMode === 'standalone'
    ? false
    : await hasPnpmWorkspace(repoRoot);
  if (usePnpmWorkspace && report.packageName) {
    return `pnpm --filter ${report.packageName} add ${depsWithVersions}`;
  }
  return `pnpm add ${depsWithVersions} (run in ${report.appRoot})`;
}

async function readJson(filePath: string): Promise<any | null> {
  const s = await stat(filePath).catch(() => null);
  if (!s?.isFile()) return null;
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
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

async function hasPnpmWorkspace(root: string): Promise<boolean> {
  const ws = path.join(root, 'pnpm-workspace.yaml');
  const s = await stat(ws).catch(() => null);
  return Boolean(s?.isFile());
}

async function findMissingFiles(root: string, files: string[]): Promise<string[]> {
  const missing: string[] = [];
  for (const rel of files) {
    const fullPath = path.join(root, rel);
    const s = await stat(fullPath).catch(() => null);
    if (!s?.isFile()) missing.push(rel);
  }
  return missing;
}

async function hasAnyEnvFile(root: string): Promise<boolean> {
  const candidates = ['.env', '.env.local'];
  for (const name of candidates) {
    const fullPath = path.join(root, name);
    const s = await stat(fullPath).catch(() => null);
    if (s?.isFile()) return true;
  }
  return false;
}

type FeatureToggle = { enabled?: boolean } | boolean | undefined;

function normalizeToggle(value: FeatureToggle): { enabled?: boolean } | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return { enabled: value };
  return value;
}

function resolveSchemaKitFeatures(app: AppConfig, project: ProjectPathsConfig) {
  const base = app.schemaKit?.features;
  const override = app.schemaKit?.projects?.find((entry) => entry.name === project.name)?.features;
  if (!base && !override) return undefined;
  return {
    ...base,
    ...override,
    sentry: mergeFeature(base?.sentry, override?.sentry),
    redis: mergeFeature(base?.redis, override?.redis),
    surrealdb: mergeFeature(base?.surrealdb, override?.surrealdb),
  };
}

function mergeFeature(base?: FeatureToggle, override?: FeatureToggle) {
  const baseObj = normalizeToggle(base);
  const overrideObj = normalizeToggle(override);
  if (!baseObj && !overrideObj) return undefined;
  return { ...(baseObj ?? {}), ...(overrideObj ?? {}) };
}

function buildRequiredDependencies(
  features?: ReturnType<typeof resolveSchemaKitFeatures>,
  tooling?: AppConfig['tooling']
): string[] {
  const projectSetup = tooling?.projectSetup;
  let required = projectSetup?.requiredDependencies?.length
    ? [...projectSetup.requiredDependencies]
    : [...REQUIRED_DEPENDENCIES];
  if (projectSetup?.includeSharedPackage === false) {
    required = required.filter((dep) => dep !== '@pmv2/shared');
  }
  if (projectSetup?.includeSharedPackage === true) {
    required.push('@pmv2/shared');
  }
  if (projectSetup?.excludeDependencies?.length) {
    const exclude = new Set(projectSetup.excludeDependencies);
    required = required.filter((dep) => !exclude.has(dep));
  }
  const sentry = normalizeToggle(features?.sentry);
  const redis = normalizeToggle(features?.redis);
  if (sentry?.enabled !== false) {
    required.push('@sentry/vue', '@sentry/node');
    if ((features?.sentry as any)?.sourceMaps !== false) {
      required.push('@sentry/vite-plugin');
    }
  }
  if (redis?.enabled === true) {
    required.push('ioredis');
  }
  return Array.from(new Set(required));
}

function formatDependency(dep: string): string {
  const version = DEPENDENCY_VERSIONS[dep];
  return version ? `${dep}@${version}` : dep;
}

function buildRequiredConfigMarkers(features?: ReturnType<typeof resolveSchemaKitFeatures>): string[] {
  const markers: string[] = ['runtimeConfig'];
  const surreal = normalizeToggle(features?.surrealdb);
  if (surreal?.enabled !== false) {
    markers.push('surrealdb');
  }
  if (features?.typesense !== false) {
    markers.push('typesense');
  }
  const sentry = normalizeToggle(features?.sentry);
  const redis = normalizeToggle(features?.redis);
  if (sentry?.enabled !== false && !markers.includes('sentry')) {
    markers.push('sentry');
  }
  if (redis?.enabled === true && !markers.includes('redis')) {
    markers.push('redis');
  }
  return markers;
}

function isAdminProject(app: AppConfig, project: ProjectPathsConfig): boolean {
  const adminProjects = app?.ui?.projects ?? [];
  if (project?.name && adminProjects.includes(project.name)) return true;
  if (project?.name && /admin/i.test(project.name)) return true;
  return false;
}

function buildRequiredFiles(app: AppConfig, project: ProjectPathsConfig): string[] {
  const required = [...REQUIRED_FILES];
  if (isAdminProject(app, project)) {
    required.push(...ADMIN_LAYER_FILES);
  }
  return required;
}

const FILE_TEMPLATES: Record<string, string> = {
  'server/api/trpc/[trpc].ts': `import { toWebRequest } from 'h3'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '~~/server/trpc/routers/_app'
import { createContext } from '@schema/server/trpc/context'

export default eventHandler(async (event) => {
  const req = toWebRequest(event)
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext(event),
  })
})
`,
  'server/trpc/routers/_app.ts': `import { t } from '@schema/server/trpc/context'
import { generatedRouters } from './generated'
import { apiRouter, dbRouter } from './api'

export const appRouter = t.router({
  ...generatedRouters,
  db: dbRouter,
  api: apiRouter,
})

export type AppRouter = typeof appRouter
`,
  'server/trpc/routers/api.ts': `import { z } from 'zod'
import { t } from '@schema/server/trpc/context'
import { RequestSchema } from '@schema/request-schema'

const DbQueryInput = z.object({
  query: z.string().min(1),
  vars: z.record(z.string(), z.any()).optional(),
})

export const dbRouter = t.router({
  query: t.procedure
    .input(RequestSchema(DbQueryInput))
    .mutation(async ({ input, ctx }) => {
      const { db } = ctx as any
      const dbInstance = input.instance && (ctx as any).$api?.DB
        ? await (ctx as any).$api.DB(input.instance as any)
        : db
      const payload = input.data || {}
      if (!payload?.query) {
        throw new Error('api.db.query requires a query string')
      }
      return dbInstance.query(payload.query, payload.vars ?? {})
    }),
})

export const apiRouter = t.router({
  db: dbRouter,
})
`,
  'server/trpc/routers/generated/index.ts': `export const generatedRouters = {}\n`,
  'server/trpc/context.ts': `export * from '@schema/server/trpc/context'\n`,
  'schema/context/trpc.ts': `import type { H3Event } from 'h3'

type ContextBase = Record<string, unknown>

// Optional app-specific context additions.
// Return an object whose keys will be merged into the base context.
export async function createContextExt(_event: H3Event, _base: ContextBase) {
  return {}
}
`,
};

function renderEnvTemplate(
  values?: SurrealEnvValues,
  filename?: string,
  sections?: EnvSectionOptions
): string | null {
  if (!filename) return null;
  const label = filename === '.env.staging' ? ' (staging)' : '';
  const includeSurreal = sections?.surrealdb !== false;
  const includeTypesense = sections?.typesense !== false;
  const includeSentry = sections?.sentry === true;
  const includeRedis = sections?.redis === true;
  const lines = [
    ...(includeSurreal
      ? [
          `# SurrealDB connection${label}`,
          `NUXT_SURREALDB_URL=${values?.url ?? ''}`,
          `NUXT_SURREALDB_USER=${values?.user ?? ''}`,
          `NUXT_SURREALDB_PASS=${values?.pass ?? ''}`,
          `NUXT_SURREALDB_NAMESPACE=${values?.namespace ?? ''}`,
          `NUXT_SURREALDB_DATABASE=${values?.database ?? ''}`,
          '',
        ]
      : []),
    ...(includeTypesense
      ? [
          `# Typesense connection${label}`,
          `NUXT_TYPESENSE_HOST=${values?.typesenseHost ?? ''}`,
          `NUXT_PUBLIC_TYPESENSE_HOST=${values?.typesenseHost ?? ''}`,
          `NUXT_TYPESENSE_API_KEY=${values?.typesenseApiKey ?? ''}`,
          `NUXT_PUBLIC_TYPESENSE_API_KEY=${values?.typesenseApiKey ?? ''}`,
          `NUXT_TYPESENSE_PORT=${values?.typesensePort ?? ''}`,
          `NUXT_PUBLIC_TYPESENSE_PORT=${values?.typesensePort ?? ''}`,
          `NUXT_TYPESENSE_ENABLE_CORS=${values?.typesenseEnableCors ?? ''}`,
          `NUXT_PUBLIC_TYPESENSE_ENABLE_CORS=${values?.typesenseEnableCors ?? ''}`,
          '',
        ]
      : []),
    ...(includeSentry
      ? [
          `# Sentry${label}`,
          `NUXT_SENTRY_DSN=`,
          `NUXT_SENTRY_ENV=`,
          `NUXT_PUBLIC_SENTRY_DSN=`,
          `NUXT_PUBLIC_SENTRY_ENV=`,
          '',
          `# Sentry source maps${label}`,
          `SENTRY_AUTH_TOKEN=`,
          `SENTRY_ORG=`,
          `SENTRY_PROJECT=`,
          `SENTRY_RELEASE=`,
          '',
        ]
      : []),
    ...(includeRedis
      ? [
          `# Redis${label}`,
          `NUXT_REDIS__HOST=`,
          `NUXT_REDIS__PORT=`,
          `NUXT_REDIS__PASSWORD=`,
          '',
        ]
      : []),
  ];
  return lines.join('\n');
}

async function ensureEnvSections(
  filePath: string,
  values?: SurrealEnvValues,
  sections?: EnvSectionOptions
): Promise<boolean> {
  const raw = await readFile(filePath, 'utf-8').catch(() => '');
  if (!raw) return false;
  const includeSurreal = sections?.surrealdb !== false;
  const includeTypesense = sections?.typesense !== false;
  const includeSentry = sections?.sentry === true;
  const includeRedis = sections?.redis === true;
  const missingBlocks: string[] = [];
  const label = path.basename(filePath) === '.env.staging' ? ' (staging)' : '';

  const hasKey = (key: string) => new RegExp(`^${key}=`, 'm').test(raw);

  if (includeSurreal) {
    const keys = [
      'NUXT_SURREALDB_URL',
      'NUXT_SURREALDB_USER',
      'NUXT_SURREALDB_PASS',
      'NUXT_SURREALDB_NAMESPACE',
      'NUXT_SURREALDB_DATABASE',
    ];
    const toAdd = keys.filter((key) => !hasKey(key));
    if (toAdd.length) {
      missingBlocks.push(
        [`# SurrealDB connection${label}`]
          .concat(
            toAdd.map((key) => {
              if (key === 'NUXT_SURREALDB_URL') return `${key}=${values?.url ?? ''}`;
              if (key === 'NUXT_SURREALDB_USER') return `${key}=${values?.user ?? ''}`;
              if (key === 'NUXT_SURREALDB_PASS') return `${key}=${values?.pass ?? ''}`;
              if (key === 'NUXT_SURREALDB_NAMESPACE') return `${key}=${values?.namespace ?? ''}`;
              if (key === 'NUXT_SURREALDB_DATABASE') return `${key}=${values?.database ?? ''}`;
              return `${key}=`;
            })
          )
          .join('\n')
      );
    }
  }

  if (includeTypesense) {
    const keys = [
      'NUXT_TYPESENSE_HOST',
      'NUXT_PUBLIC_TYPESENSE_HOST',
      'NUXT_TYPESENSE_API_KEY',
      'NUXT_PUBLIC_TYPESENSE_API_KEY',
      'NUXT_TYPESENSE_PORT',
      'NUXT_PUBLIC_TYPESENSE_PORT',
      'NUXT_TYPESENSE_ENABLE_CORS',
      'NUXT_PUBLIC_TYPESENSE_ENABLE_CORS',
    ];
    const toAdd = keys.filter((key) => !hasKey(key));
    if (toAdd.length) {
      missingBlocks.push(
        [`# Typesense connection${label}`]
          .concat(
            toAdd.map((key) => {
              if (key.includes('HOST')) return `${key}=${values?.typesenseHost ?? ''}`;
              if (key.includes('API_KEY')) return `${key}=${values?.typesenseApiKey ?? ''}`;
              if (key.includes('PORT')) return `${key}=${values?.typesensePort ?? ''}`;
              if (key.includes('ENABLE_CORS')) return `${key}=${values?.typesenseEnableCors ?? ''}`;
              return `${key}=`;
            })
          )
          .join('\n')
      );
    }
  }

  if (includeSentry) {
    const keys = [
      'NUXT_SENTRY_DSN',
      'NUXT_SENTRY_ENV',
      'NUXT_PUBLIC_SENTRY_DSN',
      'NUXT_PUBLIC_SENTRY_ENV',
      'SENTRY_AUTH_TOKEN',
      'SENTRY_ORG',
      'SENTRY_PROJECT',
      'SENTRY_RELEASE',
    ];
    const toAdd = keys.filter((key) => !hasKey(key));
    if (toAdd.length) {
      const lines = ['# Sentry' + label]
        .concat(toAdd.filter((key) => key.startsWith('NUXT_') || key.startsWith('NUXT_PUBLIC_')).map((key) => `${key}=`));
      const maps = toAdd.filter((key) => key.startsWith('SENTRY_') && !key.startsWith('NUXT_'));
      if (maps.length) {
        lines.push('', `# Sentry source maps${label}`, ...maps.map((key) => `${key}=`));
      }
      missingBlocks.push(lines.join('\n'));
    }
  }

  if (includeRedis) {
    const keys = ['NUXT_REDIS__HOST', 'NUXT_REDIS__PORT', 'NUXT_REDIS__PASSWORD'];
    const toAdd = keys.filter((key) => !hasKey(key));
    if (toAdd.length) {
      missingBlocks.push(
        [`# Redis${label}`].concat(toAdd.map((key) => `${key}=`)).join('\n')
      );
    }
  }

  if (!missingBlocks.length) return false;
  const separator = raw.endsWith('\n') ? '' : '\n';
  const next = `${raw}${separator}\n${missingBlocks.join('\n\n')}\n`;
  await writeFile(filePath, next, 'utf-8');
  return true;
}
