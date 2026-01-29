import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { readFile, writeFile, stat } from 'fs/promises';
import { spawn } from 'child_process';
import YAML from 'yaml';

import { resolveNginxConfig, deriveNginxFileName } from './nginxSetup';
import { toKebabCase } from './util';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  nuxtConfig?: Record<string, unknown>;
}

export async function runSiteDelete(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  hostname?: string;
  yes?: boolean;
  skipRestart?: boolean;
  removeApp?: boolean;
  keepSpec?: boolean;
  keepNginx?: boolean;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const sitesRoot = path.resolve(projectRoot, 'sites');

  const specPath = resolveDeleteSpecPath(options, sitesRoot, projectRoot);
  const spec = specPath ? await readSiteSpec(specPath) : null;

  const slug = spec?.slug ?? toKebabCase(options.name ?? '');
  let hostname =
    options.hostname ||
    resolveHostnameFromSpec(spec) ||
    (slug ? `${slug}.schema.dev` : '');

  if (!hostname) {
    hostname = await promptInput('Hostname');
  }
  if (!hostname) {
    throw new Error('Hostname is required.');
  }

  const appTarget = resolveAppTarget(repoRoot, spec, slug);
  const removeApp = await resolveRemoveAppChoice(appTarget, options.removeApp, options.yes);
  const removeSpec = await resolveRemoveSpecChoice(
    specPath,
    options.keepSpec,
    options.yes
  );

  const resolved = await resolveNginxConfig(projectRoot);
  const configFileName = deriveNginxFileName(hostname);
  const configPath = path.resolve(resolved.serversPath, `${configFileName}.conf`);
  const certPath = path.resolve(resolved.certsPath, `${hostname}.pem`);
  const certKeyPath = path.resolve(resolved.certsPath, `${hostname}-key.pem`);

  const configExists = await stat(configPath).catch(() => null);
  const certExists = await stat(certPath).catch(() => null);
  const certKeyExists = await stat(certKeyPath).catch(() => null);
  const hostsContent = await readFile(resolved.hostsPath, 'utf-8').catch(() => '');
  const hostsHasEntry = hostsContent
    .split('\n')
    .some((line) => line.trim().length > 0 && line.split(/\s+/).includes(hostname));

  console.log('\nDelete plan:');
  console.log(
    `- Nginx config: ${
      options.keepNginx ? 'keep' : configExists?.isFile() ? 'remove' : 'not found'
    } (${configPath})`
  );
  console.log(
    `- Cert: ${
      options.keepNginx ? 'keep' : certExists?.isFile() ? 'remove' : 'not found'
    } (${certPath})`
  );
  console.log(
    `- Cert key: ${
      options.keepNginx ? 'keep' : certKeyExists?.isFile() ? 'remove' : 'not found'
    } (${certKeyPath})`
  );
  console.log(
    `- Hosts entry: ${
      options.keepNginx ? 'keep' : hostsHasEntry ? 'remove' : 'not found'
    } (${resolved.hostsPath})`
  );
  if (appTarget) {
    const appExists = await stat(appTarget).catch(() => null);
    console.log(`- App folder: ${removeApp && appExists ? 'remove' : 'keep'} (${appTarget})`);
  }
  if (specPath) {
    const specExists = await stat(specPath).catch(() => null);
    console.log(`- Site spec: ${removeSpec && specExists ? 'remove' : 'keep'} (${specPath})`);
  }

  if (!options.yes) {
    const confirm = await promptYesNo('Proceed with nginx cleanup?', false);
    if (!confirm) {
      console.log('Aborted.');
      return;
    }
  }

  if (!options.keepNginx) {
    if (configExists?.isFile()) {
      await runSudo(['rm', '-f', configPath]);
    }
    if (certExists?.isFile()) {
      await runSudo(['rm', '-f', certPath]);
    }
    if (certKeyExists?.isFile()) {
      await runSudo(['rm', '-f', certKeyPath]);
    }
    if (hostsHasEntry) {
      const updated = removeHostEntry(hostsContent, hostname);
      await writeFileWithSudo(resolved.hostsPath, updated);
    }
  }

  if (!options.skipRestart && !options.keepNginx) {
    const restart = options.yes ? true : await promptYesNo('Restart nginx now?', true);
    if (restart) {
      await runShellCommand(`sudo ${resolved.restartCommand}`);
    }
  }

  if (removeApp && appTarget) {
    const appExists = await stat(appTarget).catch(() => null);
    if (appExists) {
      await rmSafe(appTarget, repoRoot);
    }
  }

  if (removeSpec && specPath) {
    const specExists = await stat(specPath).catch(() => null);
    if (specExists) {
      await rmSafeLocal(specPath, projectRoot);
    }
  }

  console.log('✅ Nginx cleanup complete.');
}

function resolveDeleteSpecPath(
  options: { name?: string; specPath?: string },
  sitesRoot: string,
  projectRoot: string
): string | null {
  if (options.specPath) {
    return resolveProvidedSpecPath(options.specPath, projectRoot, sitesRoot);
  }
  if (!options.name) return null;
  const slug = toKebabCase(options.name);
  return path.resolve(sitesRoot, `${slug}.yaml`);
}

function resolveProvidedSpecPath(specPath: string, projectRoot: string, sitesRoot: string): string {
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
    nuxtConfig: parsed.nuxtConfig as Record<string, unknown> | undefined,
  };
}

function resolveHostnameFromSpec(spec: SiteSpec | null): string | null {
  if (!spec?.nuxtConfig) return null;
  const viteServer = resolvePath(spec.nuxtConfig, ['vite', 'server']);
  const allowedHosts = Array.isArray(viteServer?.allowedHosts)
    ? viteServer?.allowedHosts
    : [];
  const firstHost = allowedHosts.find((host: any) => typeof host === 'string' && host.length > 0);
  return typeof firstHost === 'string' ? firstHost : null;
}

function resolveAppTarget(repoRoot: string, spec: SiteSpec | null, slug: string): string | null {
  if (spec?.target) {
    return path.isAbsolute(spec.target)
      ? spec.target
      : path.resolve(repoRoot, spec.target);
  }
  if (!slug) return null;
  return path.resolve(repoRoot, 'apps', slug);
}

async function resolveRemoveAppChoice(
  appTarget: string | null,
  removeAppFlag: boolean | undefined,
  skipPrompt?: boolean
): Promise<boolean> {
  if (!appTarget) return false;
  if (removeAppFlag !== undefined) return removeAppFlag;
  if (skipPrompt) return true;
  return promptYesNo('Remove the app folder too?', true);
}

async function resolveRemoveSpecChoice(
  specPath: string | null,
  keepSpec: boolean | undefined,
  skipPrompt?: boolean
): Promise<boolean> {
  if (!specPath) return false;
  if (keepSpec === true) return false;
  if (skipPrompt) return true;
  return promptYesNo('Remove the site YAML spec too?', true);
}

async function rmSafe(targetPath: string, repoRoot: string): Promise<void> {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(repoRoot);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error(`Refusing to delete outside repo: ${resolvedTarget}`);
  }
  const { rm } = await import('fs/promises');
  await rm(resolvedTarget, { recursive: true, force: true });
}

async function rmSafeLocal(targetPath: string, projectRoot: string): Promise<void> {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(projectRoot);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error(`Refusing to delete outside project: ${resolvedTarget}`);
  }
  const { rm } = await import('fs/promises');
  await rm(resolvedTarget, { recursive: true, force: true });
}

function resolvePath(value: Record<string, unknown>, pathSegments: string[]): any {
  let current: any = value;
  for (const segment of pathSegments) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
}

function removeHostEntry(content: string, hostname: string): string {
  const lines = content.split('\n');
  const updated = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      const parts = trimmed.split(/\s+/);
      if (!parts.includes(hostname)) return line;
      const ip = parts[0];
      const hosts = parts.slice(1).filter((entry) => entry !== hostname);
      if (hosts.length === 0) return '';
      return `${ip} ${hosts.join(' ')}`;
    })
    .filter((line) => line !== '')
    .join('\n');
  return updated.endsWith('\n') ? updated : `${updated}\n`;
}

async function runSudo(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('sudo', args, { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`sudo ${args.join(' ')} exited with ${code}`));
    });
  });
}

async function runShellCommand(command: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(command, { stdio: 'inherit', shell: true });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${command} (exit ${code})`));
    });
  });
}

async function writeFileWithSudo(targetPath: string, contents: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('sudo', ['tee', targetPath], { stdio: ['pipe', 'inherit', 'inherit'] });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Failed to write ${targetPath} (exit ${code})`));
    });
    proc.stdin.write(contents);
    proc.stdin.end();
  });
}

async function promptInput(label: string): Promise<string> {
  if (!process.stdin.isTTY) return '';
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${label}: `);
  rl.close();
  return answer.trim();
}

async function promptYesNo(question: string, defaultYes: boolean): Promise<boolean> {
  if (!process.stdin.isTTY) return defaultYes;
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await promptInput(`${question} (${hint})`);
  if (!answer) return defaultYes;
  return /^y(es)?$/i.test(answer.trim());
}
