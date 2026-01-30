import path from 'path';
import { readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { copy } from 'fs-extra';
import YAML from 'yaml';

import { toKebabCase } from './util';
import { runNginxSetup, resolveNginxConfig, deriveNginxFileName } from './nginxSetup';
import { ensureNuxtConfigExtends } from '../lib/siteSpec';
import { loadLayerEnvDefaults, mergeEnvDefaults } from '../lib/siteEnvDefaults';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  nuxtConfig?: Record<string, unknown>;
  packageJson?: Record<string, unknown>;
  env?: Record<string, unknown>;
  deploy?: Record<string, unknown>;
  layers?: string[];
}

export interface SiteCreateResult {
  slug: string;
  targetPath: string;
  specPath: string;
}

interface NginxAnswers {
  hostname: string;
  proxyPort: number;
  listenPort: number;
  hmrPort: number;
  allowHosts: string[];
  origin: string;
  skipMkcert: boolean;
  skipNginxApply: boolean;
}

const DEFAULT_TEMPLATE = 'templates/nuxt-4.3.0';
const DEFAULT_SITES_DIR = 'sites';
const EXCLUDE_NAMES = new Set([
  'node_modules',
  '.nuxt',
  '.output',
  '.git',
  '.DS_Store',
  '.turbo',
  '.cache',
  'dist',
]);
const DEFAULT_SSL_REDIRECT = true;

export async function runSiteCreate(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  template?: string;
  target?: string;
  force?: boolean;
  nginxMode?: 'apply' | 'config' | 'skip';
  admin?: boolean;
}): Promise<SiteCreateResult> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const sitesRoot = path.resolve(projectRoot, DEFAULT_SITES_DIR);
  await mkdir(sitesRoot, { recursive: true });

  const providedSpecPath = options.specPath
    ? resolveProvidedSpecPath(options.specPath, projectRoot, sitesRoot)
    : null;
  const specExists = providedSpecPath
    ? await stat(providedSpecPath).catch(() => null)
    : null;

  let spec: SiteSpec | null = null;
  if (specExists && !options.force) {
    spec = await readSiteSpec(providedSpecPath as string);
    if (!spec) {
      throw new Error(`Unable to read spec: ${providedSpecPath}`);
    }
  }

  const specLocked = !!spec && options.force !== true;

  let name = specLocked
    ? spec?.name ?? ''
    : options.name?.trim() ?? '';
  if (!name && !specLocked) {
    name = await promptInput('Site name');
  }
  if (!name) {
    throw new Error('Site name is required.');
  }

  const slug = specLocked
    ? spec?.slug ?? toKebabCase(name)
    : toKebabCase(name);
  const specPath = providedSpecPath ?? resolveSpecPath(undefined, sitesRoot, slug);

  if (!spec || options.force) {
    const template = options.template?.trim() || DEFAULT_TEMPLATE;
    const target = options.target?.trim() || `apps/${slug}`;
    spec = {
      name,
      slug,
      template,
      target,
      deploy: {
        ssl: {
          email: resolveDefaultSslEmail(),
          redirect: DEFAULT_SSL_REDIRECT,
        },
      },
    };
  }

  let nginxAnswers: NginxAnswers | null = null;
  if (!specLocked && spec) {
    nginxAnswers = await maybeCollectNginxAnswers({
      projectRoot,
      slug,
      existingConfig: spec.nuxtConfig,
      mode: options.nginxMode ?? 'prompt',
    });
    if (nginxAnswers) {
      spec.nuxtConfig = mergeConfig(
        spec.nuxtConfig ?? {},
        buildNuxtConfigForNginx(nginxAnswers)
      ) as Record<string, unknown>;
    }
    spec.layers = ensureSchemaCoreLayer(spec.layers);
    if (options.admin) {
      spec.layers = ensureAdminLayer(spec.layers);
    }
    if (Array.isArray(spec.layers) && spec.layers.length > 0) {
      const layerRefs = spec.layers.map((name) => `./layers/${name}`);
      ensureNuxtConfigExtends(spec, layerRefs);
    }
    await writeSiteSpec(specPath, spec);
  }

  const templatePath = resolveTemplatePath(projectRoot, spec.template);
  const targetPath = resolveTargetPath(repoRoot, spec.target);
  await ensureTargetDir(targetPath, options.force === true);

  if (path.resolve(templatePath) === path.resolve(targetPath)) {
    throw new Error('Template path and target path are the same.');
  }

  await copy(templatePath, targetPath, {
    filter: (src) => {
      const base = path.basename(src);
      return !EXCLUDE_NAMES.has(base);
    },
  });

  if (nginxAnswers && !nginxAnswers.skipNginxApply) {
    await runNginxSetup(
      {
        name: nginxAnswers.hostname,
        port: nginxAnswers.proxyPort,
        listenPort: nginxAnswers.listenPort,
        file: deriveNginxFileName(nginxAnswers.hostname),
        apply: true,
        yes: true,
        skipMkcert: nginxAnswers.skipMkcert,
      },
      projectRoot
    );
  }

  await writeGeneratedNuxtConfig(targetPath, spec.nuxtConfig);
  await ensureNuxtRuntimeFile(targetPath);
  await updatePackageJson(targetPath, repoRoot, slug, spec);
  await runSitePkgSyncFromCreate(projectRoot, spec, targetPath);
  await ensureEnvYaml(targetPath, projectRoot, spec.layers);
  await writeEnvFiles(targetPath, spec.env);
  await writeEcosystemConfig(targetPath, spec.deploy);

  console.log(`✅ Site created: ${path.relative(repoRoot, targetPath)}`);
  console.log(`📝 Spec written: ${path.relative(projectRoot, specPath)}`);
  const url = nginxAnswers
    ? `https://${nginxAnswers.hostname}:${nginxAnswers.listenPort}`
    : resolveSiteUrlFromConfig(spec.nuxtConfig);
  if (url) {
    console.log(`🌐 URL: ${url}`);
  }

  return {
    slug,
    targetPath,
    specPath,
  };
}

function resolveProvidedSpecPath(
  specPath: string,
  projectRoot: string,
  sitesRoot: string
): string {
  if (path.isAbsolute(specPath)) {
    return specPath;
  }
  const normalized = specPath.replace(/^[./]+/, '');
  const hasSeparator = normalized.includes(path.sep);
  if (hasSeparator) {
    return path.resolve(projectRoot, normalized);
  }
  return path.resolve(sitesRoot, normalized);
}

function resolveSpecPath(specPath: string | undefined, sitesRoot: string, slug: string): string {
  if (!specPath) {
    return path.resolve(sitesRoot, `${slug}.yaml`);
  }
  return path.isAbsolute(specPath)
    ? specPath
    : path.resolve(sitesRoot, specPath);
}

function resolveTemplatePath(projectRoot: string, template: string): string {
  if (!template) {
    return path.resolve(projectRoot, DEFAULT_TEMPLATE);
  }
  return path.isAbsolute(template)
    ? template
    : path.resolve(projectRoot, template);
}

function resolveTargetPath(repoRoot: string, target: string): string {
  if (!target) {
    return path.resolve(repoRoot, 'apps');
  }
  return path.isAbsolute(target)
    ? target
    : path.resolve(repoRoot, target);
}

async function readSiteSpec(specPath: string): Promise<SiteSpec | null> {
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
    nuxtConfig: parsed.nuxtConfig as Record<string, unknown> | undefined,
    packageJson: parsed.packageJson as Record<string, unknown> | undefined,
    env: parsed.env as Record<string, unknown> | undefined,
    deploy: parsed.deploy as Record<string, unknown> | undefined,
  };
}

async function writeSiteSpec(specPath: string, spec: SiteSpec): Promise<void> {
  const output = YAML.stringify(spec);
  await writeFile(specPath, output, 'utf-8');
}

async function ensureTargetDir(targetPath: string, force: boolean): Promise<void> {
  const existing = await stat(targetPath).catch(() => null);
  if (!existing) {
    await mkdir(targetPath, { recursive: true });
    return;
  }
  if (!force) {
    throw new Error(`Target already exists: ${targetPath} (use --force to overwrite)`);
  }
  await rm(targetPath, { recursive: true, force: true });
  await mkdir(targetPath, { recursive: true });
}

async function updatePackageJson(
  targetPath: string,
  repoRoot: string,
  slug: string,
  spec: SiteSpec
): Promise<void> {
  const packagePath = path.join(targetPath, 'package.json');
  const content = await readFile(packagePath, 'utf-8').catch(() => null);
  if (!content) return;
  const base = JSON.parse(content) as Record<string, unknown>;
  const overrideRaw = normalizeConfigValue(spec.packageJson ?? {});
  const override = isPlainObject(overrideRaw) ? overrideRaw : {};

  const port = resolveDevServerPort(spec.nuxtConfig);
  if (port && !hasScriptOverride(override, 'dev')) {
    override.scripts = {
      ...(isPlainObject(base.scripts) ? base.scripts : {}),
      ...(isPlainObject(override.scripts) ? override.scripts : {}),
      dev: `nuxt dev --port ${port}`,
    };
  }

  if (spec.env && Object.keys(spec.env).length > 0 && !hasScriptOverride(override, 'build')) {
    override.scripts = {
      ...(isPlainObject(base.scripts) ? base.scripts : {}),
      ...(isPlainObject(override.scripts) ? override.scripts : {}),
      build: 'dotenv -e .env.staging -- nuxi build',
    };
    override.dependencies = {
      ...(isPlainObject(base.dependencies) ? base.dependencies : {}),
      ...(isPlainObject(override.dependencies) ? override.dependencies : {}),
      'dotenv-cli': '^7.4.0',
    };
  }

  if (!hasScriptOverride(override, 'inst')) {
    const relRoot = toPosixPath(path.relative(targetPath, repoRoot)) || '.';
    override.scripts = {
      ...(isPlainObject(base.scripts) ? base.scripts : {}),
      ...(isPlainObject(override.scripts) ? override.scripts : {}),
      inst: `pnpm -C ${relRoot} --filter ${slug} install`,
    };
  }
  if (!hasScriptOverride(override, 'add')) {
    const relRoot = toPosixPath(path.relative(targetPath, repoRoot)) || '.';
    override.scripts = {
      ...(isPlainObject(base.scripts) ? base.scripts : {}),
      ...(isPlainObject(override.scripts) ? override.scripts : {}),
      add: `pnpm -C ${relRoot} --filter ${slug} add`,
    };
  }
  if (!hasScriptOverride(override, 'remove')) {
    const relRoot = toPosixPath(path.relative(targetPath, repoRoot)) || '.';
    override.scripts = {
      ...(isPlainObject(base.scripts) ? base.scripts : {}),
      ...(isPlainObject(override.scripts) ? override.scripts : {}),
      remove: `pnpm -C ${relRoot} --filter ${slug} remove`,
    };
  }

  const merged = mergeConfig(base, override) as Record<string, unknown>;
  merged.name = slug;
  await writeFile(packagePath, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
}

async function writeGeneratedNuxtConfig(
  targetPath: string,
  config: Record<string, unknown> | undefined
): Promise<void> {
  const filePath = path.join(targetPath, 'nuxt.config.generated.ts');
  const normalized = normalizeConfigValue(config ?? {});
  const body = JSON.stringify(normalized, null, 2);
  const output = `// Generated by schema site tooling. Do not edit directly.\nexport default ${body};\n`;
  await writeFile(filePath, output, 'utf-8');
}

async function ensureNuxtRuntimeFile(targetPath: string): Promise<void> {
  const filePath = path.join(targetPath, 'nuxt.config.runtime.ts');
  const exists = await stat(filePath).catch(() => null);
  if (exists?.isFile()) return;
  await writeFile(filePath, 'export default {};\n', 'utf-8');
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

async function ensureEnvYaml(
  targetPath: string,
  projectRoot: string,
  layers: string[] | undefined
): Promise<void> {
  const envPath = path.join(targetPath, 'env.yaml');
  const exists = await stat(envPath).catch(() => null);
  if (exists?.isFile()) return;
  const defaults = layers && layers.length > 0
    ? await loadLayerEnvDefaults(projectRoot, layers)
    : {};
  const { merged } = mergeEnvDefaults({}, defaults);
  await writeFile(envPath, YAML.stringify(merged), 'utf-8');
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

async function writeEcosystemConfig(
  targetPath: string,
  deployConfig: Record<string, unknown> | undefined
): Promise<void> {
  if (!deployConfig || Object.keys(deployConfig).length === 0) return;
  const ecosystem = (deployConfig as Record<string, unknown>).ecosystem;
  if (!ecosystem || !isPlainObject(ecosystem)) return;
  const body = JSON.stringify(ecosystem, null, 2);
  const output = `module.exports = ${body};\n`;
  await writeFile(path.join(targetPath, 'ecosystem.config.cjs'), output, 'utf-8');
}

async function runSitePkgSyncFromCreate(
  projectRoot: string,
  spec: SiteSpec,
  targetPath: string
): Promise<void> {
  try {
    const { runSitePkgSync } = await import('./sitePkgSync');
    await runSitePkgSync({
      projectRoot,
      name: spec.slug,
      appPath: targetPath,
    });
  } catch (error) {
    console.warn('⚠️  Failed to sync packages after site:create.', error);
  }
}

function normalizeConfigValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeConfigValue(item)).filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const normalized = normalizeConfigValue(val);
      if (normalized !== undefined) {
        out[key] = normalized;
      }
    }
    return out;
  }
  if (value === undefined) return undefined;
  return value;
}

function ensureSchemaCoreLayer(layers: string[] | undefined): string[] {
  const current = Array.isArray(layers) ? layers : [];
  const entries = current.filter(Boolean);
  if (!entries.includes('schema-core')) {
    return [...entries, 'schema-core'];
  }
  return entries;
}

function ensureAdminLayer(layers: string[] | undefined): string[] {
  const current = Array.isArray(layers) ? layers : [];
  const entries = current.filter(Boolean);
  if (!entries.includes('admin-core')) {
    return [...entries, 'admin-core'];
  }
  return entries;
}

function resolveDevServerPort(config: Record<string, unknown> | undefined): number | null {
  if (!config) return null;
  const devServer = (config as Record<string, unknown>).devServer;
  if (!devServer || typeof devServer !== 'object') return null;
  const port = (devServer as Record<string, unknown>).port;
  if (typeof port === 'number' && Number.isFinite(port)) return port;
  if (typeof port === 'string') {
    const parsed = Number(port);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasScriptOverride(override: Record<string, unknown>, script: string): boolean {
  if (!isPlainObject(override.scripts)) return false;
  return Object.prototype.hasOwnProperty.call(override.scripts, script);
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

async function maybeCollectNginxAnswers(options: {
  projectRoot: string;
  slug: string;
  existingConfig?: Record<string, unknown>;
  mode: 'prompt' | 'apply' | 'config' | 'skip';
}): Promise<NginxAnswers | null> {
  if (options.mode === 'skip') return null;
  if (!process.stdin.isTTY && options.mode === 'prompt') return null;
  if (options.mode === 'prompt') {
    const run = await promptYesNo('Run nginx setup now?', false);
    if (!run) {
      const capture = await promptYesNo(
        'Capture nginx settings for config without applying?',
        false
      );
      if (!capture) return null;
      options.mode = 'config';
    }
  }

  const resolved = await resolveNginxConfig(options.projectRoot);
  const defaults = deriveNginxDefaults(options.slug, options.existingConfig, resolved);

  const hostname = await promptHostname('Hostname', defaults.hostname);
  const proxyPort = await promptNumber('Proxy port (Nuxt dev server)', defaults.proxyPort);
  const listenPort = await promptNumber('Listen port (SSL)', defaults.listenPort);
  const hmrPort = await promptOptionalNumber('HMR port (blank for auto)', defaults.hmrPort);
  const finalHmrPort =
    hmrPort ?? generateRandomPort(42000, 49999, [proxyPort, listenPort]);

  let skipNginxApply = options.mode === 'config';
  if (!skipNginxApply) {
    const configFileName = deriveNginxFileName(hostname);
    const configPath = path.resolve(resolved.serversPath, `${configFileName}.conf`);
    const configExists = await stat(configPath).catch(() => null);
    if (configExists?.isFile()) {
      const overwrite = await promptYesNo(
        `Nginx config exists (${configPath}). Overwrite?`,
        false
      );
      if (!overwrite) {
        skipNginxApply = true;
      }
    }
  }

  let skipMkcert = false;
  if (!skipNginxApply) {
    const certPath = path.resolve(resolved.certsPath, `${hostname}.pem`);
    const certKeyPath = path.resolve(resolved.certsPath, `${hostname}-key.pem`);
    const certExists = await stat(certPath).catch(() => null);
    const keyExists = await stat(certKeyPath).catch(() => null);
    if (certExists?.isFile() || keyExists?.isFile()) {
      const reuse = await promptYesNo(
        'Certificate already exists. Reuse existing certs?',
        true
      );
      skipMkcert = reuse;
    }
  }

  return {
    hostname,
    proxyPort,
    listenPort,
    hmrPort: finalHmrPort,
    allowHosts: [hostname],
    origin: `https://${hostname}:${listenPort}`,
    skipMkcert,
    skipNginxApply,
  };
}

function deriveNginxDefaults(
  slug: string,
  existingConfig: Record<string, unknown> | undefined,
  resolved: Awaited<ReturnType<typeof resolveNginxConfig>>
): {
  hostname: string;
  proxyPort: number;
  listenPort: number;
  hmrPort: number | null;
} {
  const viteServer = resolvePath(existingConfig, ['vite', 'server']);
  const allowedHosts = Array.isArray(viteServer?.allowedHosts)
    ? viteServer?.allowedHosts
    : [];
  const defaultHost =
    typeof allowedHosts?.[0] === 'string' && allowedHosts[0]
      ? allowedHosts[0]
      : `${slug}.schema.dev`;
  const devServer = resolvePath(existingConfig, ['devServer']);
  const proxyPort = normalizeNumber(devServer?.port) ?? resolved.defaultProxyPort;
  const listenPort = resolved.defaultListenPort;
  const hmrPort = normalizeNumber(viteServer?.hmr?.port) ?? null;
  return {
    hostname: defaultHost,
    proxyPort,
    listenPort,
    hmrPort,
  };
}

function buildNuxtConfigForNginx(answers: NginxAnswers): Record<string, unknown> {
  return {
    devServer: {
      port: answers.proxyPort,
      host: '0.0.0.0',
    },
    vite: {
      server: {
        allowedHosts: answers.allowHosts,
        origin: answers.origin,
        hmr: {
          protocol: 'wss',
          host: answers.hostname,
          clientPort: answers.listenPort,
          path: '/__vitews',
          port: answers.hmrPort,
        },
      },
    },
  };
}

function resolvePath(
  value: Record<string, unknown> | undefined,
  pathSegments: string[]
): any {
  if (!value) return undefined;
  let current: any = value;
  for (const segment of pathSegments) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function generateRandomPort(min: number, max: number, exclude: number[]): number {
  const safeMin = Math.max(1024, Math.floor(min));
  const safeMax = Math.max(safeMin + 1, Math.floor(max));
  for (let i = 0; i < 20; i += 1) {
    const candidate = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
    if (!exclude.includes(candidate)) return candidate;
  }
  let candidate = safeMin;
  while (exclude.includes(candidate) && candidate <= safeMax) {
    candidate += 1;
  }
  return candidate;
}

async function promptYesNo(question: string, defaultYes: boolean): Promise<boolean> {
  if (!process.stdin.isTTY) return defaultYes;
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await promptInput(`${question} (${hint})`);
  if (!answer) return defaultYes;
  return /^y(es)?$/i.test(answer.trim());
}

async function promptNumber(label: string, fallback: number): Promise<number> {
  const raw = await promptInput(`${label} (${fallback})`);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid number: ${raw}`);
  }
  return parsed;
}

function resolveDefaultSslEmail(): string {
  return (
    process.env.MPD_SSL_EMAIL ||
    process.env.DEPLOY_SSL_EMAIL ||
    ''
  );
}

async function promptOptionalNumber(
  label: string,
  fallback: number | null
): Promise<number | null> {
  const suffix = fallback ? ` (${fallback})` : '';
  const raw = await promptInput(`${label}${suffix}`);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid number: ${raw}`);
  }
  return parsed;
}

async function promptHostname(label: string, fallback: string): Promise<string> {
  let value = '';
  for (let i = 0; i < 3; i += 1) {
    const raw = await promptInput(`${label} (${fallback})`);
    value = raw || fallback;
    if (isValidHostname(value)) {
      return value;
    }
    console.warn(`⚠️  "${value}" does not look like a valid hostname.`);
  }
  if (!value) {
    throw new Error('Hostname is required.');
  }
  return value;
}

function isValidHostname(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^[a-zA-Z0-9.-]+$/.test(trimmed)) return false;
  if (trimmed.startsWith('.') || trimmed.endsWith('.')) return false;
  if (trimmed.includes('..')) return false;
  return true;
}

function resolveSiteUrlFromConfig(
  config: Record<string, unknown> | undefined
): string | null {
  if (!config) return null;
  const origin = resolvePath(config, ['vite', 'server', 'origin']);
  if (typeof origin === 'string' && origin.length > 0) {
    return origin;
  }
  const allowedHosts = resolvePath(config, ['vite', 'server', 'allowedHosts']);
  const listenPort = resolvePath(config, ['vite', 'server', 'hmr', 'clientPort']);
  if (Array.isArray(allowedHosts) && typeof allowedHosts[0] === 'string') {
    const host = allowedHosts[0];
    if (listenPort) {
      return `https://${host}:${listenPort}`;
    }
    return `https://${host}`;
  }
  return null;
}

async function promptInput(label: string): Promise<string> {
  if (!process.stdin.isTTY) return '';
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${label}: `);
  rl.close();
  return answer.trim();
}
