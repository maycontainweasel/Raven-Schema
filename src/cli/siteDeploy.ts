import path from 'path';
import { readFile, stat, writeFile } from 'fs/promises';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import YAML from 'yaml';

import { toKebabCase } from './util';
import { runSiteEnvYamlSync } from './siteEnvYamlSync';
import { runSiteDeployInit } from './siteDeployInit';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  deploy?: Record<string, unknown>;
}

interface DeployAnswers {
  host: string;
  user: string | null;
  domain: string;
  port: number;
  appDir: string;
  pm2Name: string;
  pm2Command: string;
  restartCommand: string;
  restartNginx: boolean;
  rsyncDelete: boolean;
  buildCommand: string;
}

export async function runSiteDeploy(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  host?: string;
  user?: string;
  domain?: string;
  appDir?: string;
  port?: number;
  buildCommand?: string;
  rsyncDelete?: boolean;
  restartNginx?: boolean;
  noBuild?: boolean;
  noEnvSync?: boolean;
  noSync?: boolean;
  noPm2?: boolean;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const sitesRoot = path.resolve(projectRoot, 'sites');

  let spec = await loadSiteSpec(options, sitesRoot, projectRoot);
  if (!spec) {
    throw new Error('Site spec not found. Provide a name or --spec.');
  }

  if (!isSetupComplete(spec)) {
    if (!process.stdin.isTTY) {
      throw new Error('Deploy setup is incomplete. Run site:deploy:setup first.');
    }
    await runSiteDeployInit({
      projectRoot,
      name: spec.slug,
      specPath: options.specPath,
      host: options.host,
      user: options.user,
      domain: options.domain,
      port: options.port,
      appDir: options.appDir,
    });
    spec = await loadSiteSpec(options, sitesRoot, projectRoot);
    if (!spec) {
      throw new Error('Site spec not found after deploy setup.');
    }
  }

  const slug = spec.slug;
  const appRoot = path.isAbsolute(spec.target)
    ? spec.target
    : path.resolve(repoRoot, spec.target);

  const defaults = deriveDefaults(spec, slug, appRoot);
  const answers = resolveAnswers(options, defaults);

  const sshTarget = answers.user ? `${answers.user}@${answers.host}` : answers.host;
  const resolvedAppDir = await resolveRemoteAppDir(sshTarget, answers.appDir);
  const resolvedAnswers = resolvedAppDir && resolvedAppDir !== answers.appDir
    ? { ...answers, appDir: resolvedAppDir }
    : answers;

  if (!options.noEnvSync) {
    await runSiteEnvYamlSync({
      projectRoot,
      name: slug,
      appPath: appRoot,
      updatePackage: true,
      writeRuntimeConfig: true,
      writeEnvConfig: true,
    });
  }

  if (!options.noBuild) {
    console.log('🏗️  Building app...');
    await runLocalCommand(answers.buildCommand, appRoot);
  }

  const outputDir = path.join(appRoot, '.output');
  const outputExists = await stat(outputDir).catch(() => null);
  if (!outputExists?.isDirectory()) {
    throw new Error(`Build output not found: ${outputDir}`);
  }

  await runSsh(sshTarget, `mkdir -p ${shellEscapePath(`${resolvedAnswers.appDir}/output`)}`);

  if (!options.noSync) {
    console.log('🚚 Syncing .output → output ...');
    await runRsync(
      `${outputDir}${path.sep}`,
      `${sshTarget}:${resolvedAnswers.appDir}/output/`,
      resolvedAnswers.rsyncDelete
    );
  }

  const ecosystemPath = path.join(appRoot, 'ecosystem.config.cjs');
  const envConfigPath = path.join(appRoot, 'env.config.cjs');

  await writeLocalEcosystemConfig(ecosystemPath, resolvedAnswers, spec.deploy);

  await runRsync(
    ecosystemPath,
    `${sshTarget}:${resolvedAnswers.appDir}/`,
    false
  );

  const envExists = await stat(envConfigPath).catch(() => null);
  if (envExists?.isFile()) {
    await runRsync(
      envConfigPath,
      `${sshTarget}:${resolvedAnswers.appDir}/`,
      false
    );
  }

  if (!options.noPm2) {
    console.log('🚀 Starting/reloading PM2...');
    const pm2Available = await remoteCommandExists(sshTarget, resolvedAnswers.pm2Command);
    if (!pm2Available) {
      console.warn(`⚠️  ${resolvedAnswers.pm2Command} not found on the remote host. Skipping PM2 start.`);
    } else {
      await runSsh(
        sshTarget,
        `cd ${shellEscapePath(resolvedAnswers.appDir)} && ${buildPm2Command(resolvedAnswers.pm2Command, 'startOrReload ecosystem.config.cjs --update-env')}`
      );
    }
  }

  if (resolvedAnswers.restartNginx) {
    console.log('🔁 Restarting nginx...');
    await runSsh(sshTarget, `sudo ${resolvedAnswers.restartCommand}`);
  }

  console.log('✅ Deploy complete.');
  const scheme = hasSslEnabled(spec?.deploy) ? 'https' : 'http';
  console.log(`🌐 URL: ${scheme}://${resolvedAnswers.domain}`);
}

function deriveDefaults(spec: SiteSpec, slug: string, appRoot: string): DeployAnswers {
  const deploy = spec.deploy ?? {};
  const host = (deploy as any).host ?? '';
  const user = (deploy as any).user ?? null;
  const domain = (deploy as any).domain ?? '';
  const port = Number((deploy as any).port ?? 4041);
  const appDirValue = (deploy as any).appDir;
  const appDir = normalizeRemotePath(
    typeof appDirValue === 'string' && appDirValue.trim() ? appDirValue : `~/${slug}`
  );
  const pm2Name = (deploy as any).pm2Name ?? slug;
  const pm2Command = (deploy as any).pm2Command ?? 'pm2';
  const restartCommand = (deploy as any).restartCommand ?? 'systemctl reload nginx';
  const restartNginx = (deploy as any).restartNginx ?? false;
  const rsyncDelete = (deploy as any).rsyncDelete ?? true;
  const buildCommand = (deploy as any).buildCommand ?? 'pnpm run build';

  return {
    host,
    user,
    domain,
    port: Number.isFinite(port) && port > 0 ? port : 4041,
    appDir,
    pm2Name,
    pm2Command,
    restartCommand,
    restartNginx: Boolean(restartNginx),
    rsyncDelete: Boolean(rsyncDelete),
    buildCommand,
  };
}

function resolveAnswers(options: {
  host?: string;
  user?: string;
  domain?: string;
  appDir?: string;
  port?: number;
  buildCommand?: string;
  rsyncDelete?: boolean;
  restartNginx?: boolean;
}, defaults: DeployAnswers): DeployAnswers {
  const host = options.host ?? defaults.host;
  const domain = options.domain ?? defaults.domain;
  if (!host || !domain) {
    throw new Error('host and domain are required for deploy.');
  }
  return {
    ...defaults,
    host,
    user: options.user ?? defaults.user,
    domain,
    port: options.port ?? defaults.port,
    appDir: options.appDir ? normalizeRemotePath(options.appDir) : defaults.appDir,
    buildCommand: options.buildCommand ?? defaults.buildCommand,
    rsyncDelete: options.rsyncDelete ?? defaults.rsyncDelete,
    restartNginx: options.restartNginx ?? defaults.restartNginx,
  };
}

function isSetupComplete(spec: SiteSpec): boolean {
  return Boolean(spec.deploy && (spec.deploy as any).setupComplete);
}

async function loadSiteSpec(
  options: { name?: string; specPath?: string },
  sitesRoot: string,
  projectRoot: string
): Promise<SiteSpec | null> {
  let specPath: string | null = null;
  if (options.specPath) {
    specPath = resolveProvidedSpecPath(options.specPath, projectRoot, sitesRoot);
  } else if (options.name) {
    const slug = toKebabCase(options.name);
    specPath = path.resolve(sitesRoot, `${slug}.yaml`);
  }
  if (!specPath) return null;
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
    deploy: parsed.deploy as Record<string, unknown> | undefined,
  };
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

async function writeLocalEcosystemConfig(
  filePath: string,
  answers: DeployAnswers,
  deploy?: Record<string, unknown>
): Promise<void> {
  const body = buildEcosystemConfig(answers, deploy);
  await ensureLocalDir(path.dirname(filePath));
  await writeFile(filePath, body, 'utf-8');
}

function buildEcosystemConfig(
  answers: DeployAnswers,
  deploy?: Record<string, unknown>
): string {
  const ecosystem = deploy && (deploy as any).ecosystem;
  if (ecosystem && typeof ecosystem === 'object') {
    return `module.exports = ${JSON.stringify(ecosystem, null, 2)};\n`;
  }
  const config = {
    apps: [
      {
        name: answers.pm2Name,
        exec_mode: 'fork',
        cwd: answers.appDir,
        script: 'output/server/index.mjs',
        node_args: '',
        env: {
          HOST: '0.0.0.0',
          PORT: answers.port,
          NODE_ENV: 'production',
        },
      },
    ],
  };
  return `module.exports = ${JSON.stringify(config, null, 2)};\n`;
}

const execFileAsync = promisify(execFile);

async function ensureLocalDir(dirPath: string): Promise<void> {
  await execFileAsync('mkdir', ['-p', dirPath]);
}

async function runSshCapture(target: string, command: string): Promise<string> {
  const { stdout } = await execFileAsync('ssh', [target, buildRemoteCommand(command)], {
    encoding: 'utf-8',
  });
  return stdout;
}

async function remoteCommandExists(target: string, command: string): Promise<boolean> {
  const cmd = buildCommandExistsCheck(command);
  const output = await runSshCapture(target, cmd);
  return output.trim() === 'yes';
}

async function resolveRemoteHome(target: string): Promise<string> {
  const output = await runSshCapture(target, 'printf %s "$HOME"');
  return output.trim();
}

async function resolveRemoteAppDir(target: string, appDir: string): Promise<string> {
  const trimmed = appDir?.trim();
  if (!trimmed) return appDir;
  if (!trimmed.includes('$HOME') && !trimmed.startsWith('~')) return appDir;
  const home = await resolveRemoteHome(target);
  if (!home) return appDir;
  let resolved = trimmed.replace(/^~(?=\/|$)/, home);
  resolved = resolved.replace(/\$HOME/g, home);
  return resolved;
}

async function runLocalCommand(command: string, cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(command, { shell: true, stdio: 'inherit', cwd });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${command} (exit ${code})`));
    });
  });
}

async function runRsync(source: string, dest: string, del: boolean): Promise<void> {
  const args = ['-az'];
  if (del) args.push('--delete');
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('rsync', [...args, source, dest], { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`rsync exited with ${code}`));
    });
  });
}

async function runSsh(target: string, command: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ssh', [target, buildRemoteCommand(command)], { stdio: 'inherit' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ssh exited with ${code}`));
    });
  });
}

function buildRemoteCommand(command: string): string {
  const escaped = command.replace(/(["\\$`])/g, '\\$1');
  return `bash -lc "${escaped}"`;
}

function shellEscapePath(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function normalizeRemotePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('~/')) {
    return `$HOME/${trimmed.slice(2)}`;
  }
  if (trimmed === '~') {
    return '$HOME';
  }
  return trimmed;
}

function buildPm2Command(command: string, args: string): string {
  if (isPathLikeCommand(command)) {
    return `${shellEscapePath(command)} ${args}`;
  }
  const cmd = command.split(/\s+/)[0];
  return [
    `if command -v ${cmd} >/dev/null 2>&1; then ${command} ${args};`,
    `elif [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 && ${command} ${args};`,
    `else ${command} ${args}; fi`,
  ].join(' ');
}

function buildCommandExistsCheck(command: string): string {
  if (isPathLikeCommand(command)) {
    return `test -x ${shellEscapePath(command)} && echo yes || echo no`;
  }
  const cmd = command.split(/\s+/)[0];
  return [
    `command -v ${cmd} >/dev/null 2>&1 && echo yes`,
    `[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 && command -v ${cmd} >/dev/null 2>&1 && echo yes`,
    `echo no`,
  ].join(' || ');
}

function isPathLikeCommand(command: string): boolean {
  const trimmed = command.trim();
  return trimmed.includes('/') || trimmed.startsWith('.');
}

function hasSslEnabled(deploy?: Record<string, unknown>): boolean {
  if (!deploy) return false;
  const ssl = (deploy as any).ssl;
  if (!ssl) return false;
  if (typeof ssl === 'boolean') return ssl;
  if (typeof ssl !== 'object') return false;
  return (ssl as any).enabled !== false;
}
