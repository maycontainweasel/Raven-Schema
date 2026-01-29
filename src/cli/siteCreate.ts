import path from 'path';
import { readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { copy } from 'fs-extra';
import YAML from 'yaml';

import { toKebabCase } from './util';
import { runNginxSetup, resolveNginxConfig, deriveNginxFileName } from './nginxSetup';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  nuxtConfig?: Record<string, unknown>;
  packageJson?: Record<string, unknown>;
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

export async function runSiteCreate(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  template?: string;
  target?: string;
  force?: boolean;
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
    };
  }

  let nginxAnswers: NginxAnswers | null = null;
  if (!specLocked && spec) {
    nginxAnswers = await maybeCollectNginxAnswers({
      projectRoot,
      slug,
      existingConfig: spec.nuxtConfig,
    });
    if (nginxAnswers) {
      spec.nuxtConfig = mergeConfig(
        spec.nuxtConfig ?? {},
        buildNuxtConfigForNginx(nginxAnswers)
      ) as Record<string, unknown>;
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
  await ensureNuxtOverridesFile(targetPath);
  await updatePackageJson(targetPath, slug, spec);

  console.log(`✅ Site created: ${path.relative(repoRoot, targetPath)}`);
  console.log(`📝 Spec written: ${path.relative(projectRoot, specPath)}`);
  if (nginxAnswers) {
    console.log(`🌐 URL: https://${nginxAnswers.hostname}:${nginxAnswers.listenPort}`);
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

async function ensureNuxtOverridesFile(targetPath: string): Promise<void> {
  const filePath = path.join(targetPath, 'nuxt.config.overrides.ts');
  const exists = await stat(filePath).catch(() => null);
  if (exists?.isFile()) return;
  await writeFile(filePath, 'export default {};\n', 'utf-8');
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

async function maybeCollectNginxAnswers(options: {
  projectRoot: string;
  slug: string;
  existingConfig?: Record<string, unknown>;
}): Promise<NginxAnswers | null> {
  if (!process.stdin.isTTY) return null;
  const run = await promptYesNo('Run nginx setup now?', false);
  if (!run) return null;

  const resolved = await resolveNginxConfig(options.projectRoot);
  const defaults = deriveNginxDefaults(options.slug, options.existingConfig, resolved);

  const hostname = await promptHostname('Hostname', defaults.hostname);
  const proxyPort = await promptNumber('Proxy port (Nuxt dev server)', defaults.proxyPort);
  const listenPort = await promptNumber('Listen port (SSL)', defaults.listenPort);
  const hmrPort = await promptOptionalNumber('HMR port (blank for auto)', defaults.hmrPort);
  const finalHmrPort =
    hmrPort ?? generateRandomPort(42000, 49999, [proxyPort, listenPort]);

  const configFileName = deriveNginxFileName(hostname);
  const configPath = path.resolve(resolved.serversPath, `${configFileName}.conf`);
  const configExists = await stat(configPath).catch(() => null);
  let skipNginxApply = false;
  if (configExists?.isFile()) {
    const overwrite = await promptYesNo(
      `Nginx config exists (${configPath}). Overwrite?`,
      false
    );
    if (!overwrite) {
      skipNginxApply = true;
    }
  }

  const certPath = path.resolve(resolved.certsPath, `${hostname}.pem`);
  const certKeyPath = path.resolve(resolved.certsPath, `${hostname}-key.pem`);
  const certExists = await stat(certPath).catch(() => null);
  const keyExists = await stat(certKeyPath).catch(() => null);
  let skipMkcert = false;
  if ((certExists?.isFile() || keyExists?.isFile()) && !skipNginxApply) {
    const reuse = await promptYesNo(
      'Certificate already exists. Reuse existing certs?',
      true
    );
    skipMkcert = reuse;
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

async function promptInput(label: string): Promise<string> {
  if (!process.stdin.isTTY) return '';
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${label}: `);
  rl.close();
  return answer.trim();
}
