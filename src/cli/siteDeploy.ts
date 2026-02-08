import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { readFile, stat, writeFile, mkdir, rm } from 'fs/promises';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import YAML from 'yaml';

import { toKebabCase } from './util';
import { runSiteEnvYamlSync } from './siteEnvYamlSync';
import { runSiteDeployInit } from './siteDeployInit';
import { runSiteDeploySsl } from './siteDeploySsl';

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
  remoteBase?: string;
  remoteRoot?: string;
  remoteName: string;
  pm2Name: string;
  pm2Command: string;
  nginxSitesEnabled: string;
  restartCommand: string;
  nginxSudo: boolean;
  restartNginx: boolean;
  rsyncDelete: boolean;
  buildCommand: string;
}

type DeployStep = 'init' | 'verify' | 'ssl' | 'deploy';

interface DeployState {
  preflight?: boolean;
  init?: boolean;
  verify?: boolean;
  ssl?: boolean;
  sslVerified?: boolean;
  deploy?: boolean;
  updatedAt?: string;
}

interface DeployContext {
  spec: SiteSpec;
  slug: string;
  appRoot: string;
  answers: DeployAnswers;
  resolvedAnswers: DeployAnswers;
  sshTarget: string;
  nginxPath: string;
  statePath: string;
  localStatePath: string;
}

export async function runSiteDeploy(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  host?: string;
  user?: string;
  domain?: string;
  appDir?: string;
  remoteBase?: string;
  remoteRoot?: string;
  remotePath?: string;
  port?: number;
  buildCommand?: string;
  rsyncDelete?: boolean;
  restartNginx?: boolean;
  noBuild?: boolean;
  noEnvSync?: boolean;
  noSync?: boolean;
  noPm2?: boolean;
  overwriteNginx?: boolean;
  overwriteApp?: boolean;
  yes?: boolean;
  skipVerify?: boolean;
  skipAudit?: boolean;
  reset?: boolean;
  resetRemote?: boolean;
  resetOnly?: boolean;
  from?: string;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const sitesRoot = path.resolve(projectRoot, 'sites');

  let spec = await loadSiteSpec(options, sitesRoot, projectRoot);
  if (!spec) {
    throw new Error('Site spec not found. Provide a name or --spec.');
  }

  const seedHost = options.host ?? (spec.deploy as any)?.host;
  const seedDomain = options.domain ?? (spec.deploy as any)?.domain;
  const initYes = options.yes ?? Boolean(seedHost && seedDomain);
  if ((!seedHost || !seedDomain) && process.stdin.isTTY) {
    await runSiteDeployInit({
      projectRoot,
      name: spec.slug,
      specPath: options.specPath,
      host: options.host,
      user: options.user,
      domain: options.domain,
      port: options.port,
      appDir: options.appDir,
      remoteBase: options.remoteBase,
      remoteRoot: options.remoteRoot,
      remotePath: options.remotePath,
      overwriteNginx: options.overwriteNginx,
      overwriteApp: options.overwriteApp,
      yes: initYes,
      skipAudit: options.skipAudit,
    });
    spec = await loadSiteSpec(options, sitesRoot, projectRoot);
    if (!spec) {
      throw new Error('Site spec not found after deploy setup.');
    }
  }

  const resolveContext = async (currentSpec: SiteSpec): Promise<DeployContext> => {
    const slug = currentSpec.slug;
    const appRoot = path.isAbsolute(currentSpec.target)
      ? currentSpec.target
      : path.resolve(repoRoot, currentSpec.target);
    const defaults = deriveDefaults(currentSpec, slug, appRoot);
    const answers = resolveAnswers(options, defaults);
    const sshTarget = answers.user ? `${answers.user}@${answers.host}` : answers.host;
    const resolvedAppDir = await resolveRemoteAppDir(sshTarget, answers.appDir);
    const resolvedAnswers = resolvedAppDir && resolvedAppDir !== answers.appDir
      ? { ...answers, appDir: resolvedAppDir }
      : answers;
    const nginxPath = path.posix.join(
      resolvedAnswers.nginxSitesEnabled,
      resolvedAnswers.domain
    );
    const statePath = path.posix.join(resolvedAnswers.appDir, '.deploy-state.json');
    const localStatePath = path.resolve(projectRoot, '.deploy', `${slug}.json`);
    return {
      spec: currentSpec,
      slug,
      appRoot,
      answers,
      resolvedAnswers,
      sshTarget,
      nginxPath,
      statePath,
      localStatePath,
    };
  };

  let context = await resolveContext(spec);

  await assertSafeRemotePath(context.sshTarget, context.resolvedAnswers.appDir);

  if (options.reset) {
    await removeRemoteState(context.sshTarget, context.statePath);
    await removeLocalState(context.localStatePath);
  }

  if (options.resetRemote || options.resetOnly) {
    await resetRemoteResources(context);
    await removeRemoteState(context.sshTarget, context.statePath);
    await removeLocalState(context.localStatePath);
    if (options.resetOnly) {
      console.log('🧹 Reset-only complete. Exiting before deploy.');
      return;
    }
  }

  let state = options.reset || options.resetRemote
    ? null
    : await readRemoteState(context.sshTarget, context.statePath);

  state = await updateLocalState(context.localStatePath, state, { preflight: true });

  const initComplete = options.resetRemote ? false : await isRemoteInitComplete(context);
  const normalizedFrom = normalizeStep(options.from);
  const fromIndex = stepIndex(normalizedFrom);
  const shouldRunInit = !initComplete || options.overwriteNginx || options.overwriteApp || normalizedFrom === 'init';

  if (shouldRunInit) {
    await runSiteDeployInit({
      projectRoot,
      name: context.slug,
      specPath: options.specPath,
      host: options.host,
      user: options.user,
      domain: options.domain,
      port: options.port,
      appDir: options.appDir,
      remoteBase: options.remoteBase,
      remoteRoot: options.remoteRoot,
      remotePath: options.remotePath,
      overwriteNginx: options.overwriteNginx,
      overwriteApp: options.overwriteApp,
      yes: initYes,
      skipAudit: options.skipAudit,
    });
    spec = await loadSiteSpec(options, sitesRoot, projectRoot);
    if (!spec) {
      throw new Error('Site spec not found after deploy setup.');
    }
    context = await resolveContext(spec);
    state = await updateRemoteState(context, state, { init: true });
  }

  const skipVerify = Boolean(options.skipVerify || options.yes || !process.stdin.isTTY);
  if (!skipVerify && fromIndex <= stepIndex('verify') && !state?.verify) {
    let verified = await tryHttpVerify(context);
    if (verified) {
      console.log('✅ HTTP verify passed (curl).');
    } else if (!process.stdin.isTTY) {
      throw new Error(
        `HTTP verify failed for http://${context.resolvedAnswers.domain}. Re-run with --skip-verify to bypass.`
      );
    } else {
      const proceed = await promptYesNo(
        `Confirm http://${context.resolvedAnswers.domain} is serving?`,
        true
      );
      if (!proceed) {
        console.log('Aborted before SSL/deploy.');
        return;
      }
      verified = true;
    }
    if (verified) {
      state = await updateRemoteState(context, state, { verify: true });
    }
  }

  if (fromIndex <= stepIndex('ssl') && hasSslEnabled(context.spec.deploy)) {
    console.log('🔐 SSL enabled in site config. Running certbot...');
    const certPath = `/etc/letsencrypt/live/${context.resolvedAnswers.domain}/fullchain.pem`;
    const certExists = await remoteFileExists(context.sshTarget, certPath, { sudo: true });
    if (!certExists) {
      let sslConfig = getSslConfig(context.spec.deploy);
      let email = sslConfig?.email;
      if (!email) {
        if (!process.stdin.isTTY) {
          throw new Error('SSL email is required to request certificates.');
        }
        email = await promptRequiredInput('SSL email', '');
        if (email) {
          const specPath = resolveProvidedSpecPath(
            options.specPath ?? `${context.slug}.yaml`,
            projectRoot,
            sitesRoot
          );
          await writeSslEmail(specPath, email);
          const nextSsl = { ...(sslConfig ?? {}), email, redirect: sslConfig?.redirect ?? true };
          context.spec = {
            ...context.spec,
            deploy: { ...(context.spec.deploy ?? {}), ssl: nextSsl },
          };
          sslConfig = nextSsl;
        }
      }
      const canSkipPrompts = Boolean(email);
      await runSiteDeploySsl({
        projectRoot,
        name: context.slug,
        specPath: options.specPath,
        host: context.answers.host,
        user: context.answers.user ?? undefined,
        domain: context.answers.domain,
        email,
        redirect: sslConfig?.redirect,
        yes: options.yes ?? canSkipPrompts,
      });
    }

    if (!skipVerify && !state?.sslVerified) {
      let verified = await tryUrlVerify(context, 'https');
      if (verified) {
        console.log('✅ HTTPS verify passed (curl).');
      } else if (!process.stdin.isTTY) {
        throw new Error(
          `HTTPS verify failed for https://${context.resolvedAnswers.domain}. Re-run with --skip-verify to bypass.`
        );
      } else {
        const proceed = await promptYesNo(
          `Confirm https://${context.resolvedAnswers.domain} is serving?`,
          true
        );
        if (!proceed) {
          console.log('Aborted before deploy.');
          return;
        }
        verified = true;
      }
      if (verified) {
        state = await updateRemoteState(context, state, { ssl: true, sslVerified: true });
      }
    } else {
      state = await updateRemoteState(context, state, { ssl: true, sslVerified: true });
    }
  }

  if (fromIndex <= stepIndex('deploy')) {
    await runDeployStep(context, projectRoot, {
      noEnvSync: options.noEnvSync,
      noBuild: options.noBuild,
      noSync: options.noSync,
      noPm2: options.noPm2,
    });
    state = await updateRemoteState(context, state, { deploy: true });
  }

  const scheme = hasSslEnabled(context.spec.deploy) ? 'https' : 'http';
  console.log(`🌐 URL: ${scheme}://${context.resolvedAnswers.domain}`);
}

function deriveDefaults(spec: SiteSpec, slug: string, appRoot: string): DeployAnswers {
  const deploy = spec.deploy ?? {};
  const remoteBase = normalizeRemoteBase((deploy as any).remoteBase);
  const remotePathValue = typeof (deploy as any).remotePath === 'string'
    ? (deploy as any).remotePath
    : undefined;
  const parsedRemotePath = buildPathsFromRemotePath(remotePathValue, remoteBase);
  const remoteName = String((deploy as any).remoteName ?? parsedRemotePath.remoteName ?? slug);
  const remoteRoot = typeof (deploy as any).remoteRoot === 'string'
    ? (deploy as any).remoteRoot
    : parsedRemotePath.remoteRoot;
  const host = (deploy as any).host ?? '';
  const user = (deploy as any).user ?? null;
  const domain = (deploy as any).domain ?? '';
  const port = Number((deploy as any).port ?? 4041);
  const appDirValue = (deploy as any).appDir;
  const appDirFallback = parsedRemotePath.appDir
    ?? (remoteRoot && remoteRoot.trim()
      ? `${remoteRoot.replace(/\/+$/, '')}/${remoteName || slug}`
      : `~/${remoteName || slug}`);
  const appDir = normalizeRemotePath(
    typeof appDirValue === 'string' && appDirValue.trim() ? appDirValue : appDirFallback
  );
  const pm2Name = (deploy as any).pm2Name ?? remoteName;
  const pm2Command = (deploy as any).pm2Command ?? 'pm2';
  const nginxSitesEnabled = (deploy as any).nginxSitesEnabled ?? '/etc/nginx/sites-enabled';
  const restartCommand = (deploy as any).restartCommand ?? 'systemctl reload nginx';
  const nginxSudo = (deploy as any).nginxSudo ?? false;
  const restartNginx = (deploy as any).restartNginx ?? false;
  const rsyncDelete = (deploy as any).rsyncDelete ?? true;
  const buildCommand = (deploy as any).buildCommand ?? 'pnpm run build';

  return {
    host,
    user,
    domain,
    port: Number.isFinite(port) && port > 0 ? port : 4041,
    appDir,
    remoteBase,
    remoteRoot,
    remoteName,
    pm2Name,
    pm2Command,
    nginxSitesEnabled,
    restartCommand,
    nginxSudo: Boolean(nginxSudo),
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
  remoteBase?: string;
  remoteRoot?: string;
  remotePath?: string;
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
  const remoteBase = normalizeRemoteBase(options.remoteBase ?? defaults.remoteBase ?? '$HOME') || '$HOME';
  const parsedRemotePath = buildPathsFromRemotePath(options.remotePath, remoteBase);
  const remoteName = parsedRemotePath.remoteName ?? defaults.remoteName;
  const remoteRoot = typeof options.remoteRoot === 'string' && options.remoteRoot.trim()
    ? options.remoteRoot
    : parsedRemotePath.remoteRoot ?? defaults.remoteRoot;
  const appDir = resolveAppDir({
    explicit: options.appDir ?? parsedRemotePath.appDir,
    remoteRoot,
    remoteName,
    fallback: defaults.appDir,
  });
  return {
    ...defaults,
    host,
    user: options.user ?? defaults.user,
    domain,
    port: options.port ?? defaults.port,
    appDir,
    remoteBase,
    remoteRoot,
    remoteName,
    buildCommand: options.buildCommand ?? defaults.buildCommand,
    rsyncDelete: options.rsyncDelete ?? defaults.rsyncDelete,
    restartNginx: options.restartNginx ?? defaults.restartNginx,
  };
}

function resolveAppDir(params: {
  explicit?: string;
  remoteRoot?: string;
  remoteName: string;
  fallback: string;
}): string {
  if (params.explicit && params.explicit.trim()) {
    return normalizeRemotePath(params.explicit);
  }
  if (params.remoteRoot && params.remoteRoot.trim()) {
    const root = params.remoteRoot.replace(/\/+$/, '');
    return normalizeRemotePath(`${root}/${params.remoteName}`);
  }
  return params.fallback;
}

function normalizeRemoteBase(value?: string): string | undefined {
  if (!value || !value.trim()) return undefined;
  const trimmed = value.trim();
  if (trimmed === '~') return '$HOME';
  if (trimmed.startsWith('~/')) return `$HOME/${trimmed.slice(2)}`;
  if (trimmed.startsWith('$HOME')) {
    const normalized = trimmed.replace(/^\$HOME\/?/, '');
    return normalized ? `$HOME/${normalized}` : '$HOME';
  }
  return trimmed;
}

function buildPathsFromRemotePath(value?: string, baseRoot?: string): {
  remoteRoot?: string;
  remoteName?: string;
  appDir?: string;
} {
  if (!value || !value.trim()) return {};
  const base = normalizeRemoteBase(baseRoot ?? '$HOME') || '$HOME';
  let trimmed = value.trim();
  trimmed = trimmed.replace(/^~\/?/, '');
  trimmed = trimmed.replace(/^\$HOME\/?/, '');
  trimmed = trimmed.replace(/^\/+/, '');
  if (!trimmed) return {};
  const parts = trimmed.split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return {};
  const remoteName = parts[parts.length - 1];
  const rootParts = parts.slice(0, -1);
  const basePrefix = base.replace(/\/+$/, '');
  const remoteRoot = rootParts.length ? `${basePrefix}/${rootParts.join('/')}` : basePrefix;
  const appDir = `${basePrefix}/${parts.join('/')}`;
  return { remoteRoot, remoteName, appDir };
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
  const extraEnv = deploy && (deploy as any).pm2Env;
  const mergedEnv = {
    HOST: '0.0.0.0',
    PORT: answers.port,
    NODE_ENV: 'production',
    ...(extraEnv && typeof extraEnv === 'object' ? extraEnv : {}),
  };
  const config = {
    apps: [
      {
        name: answers.pm2Name,
        exec_mode: 'fork',
        cwd: answers.appDir,
        script: 'output/server/index.mjs',
        node_args: '',
        env: mergedEnv,
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
  return /\byes\b/.test(output);
}

async function tryHttpVerify(context: DeployContext): Promise<boolean> {
  return tryUrlVerify(context, 'http');
}

async function tryUrlVerify(
  context: DeployContext,
  scheme: 'http' | 'https'
): Promise<boolean> {
  const url = `${scheme}://${context.resolvedAnswers.domain}`;
  const curlAvailable = await remoteCommandExists(context.sshTarget, 'curl');
  if (curlAvailable) {
    const cmd = `curl -sS --max-time 5 -o - -w '\\n__STATUS__%{http_code}' ${shellEscapePath(url)}`;
    try {
      const output = await runSshCapture(context.sshTarget, cmd);
      const lines = output.trim().split('\n');
      const statusLine = lines.find((line) => line.startsWith('__STATUS__'));
      const status = statusLine ? Number(statusLine.replace('__STATUS__', '')) : NaN;
      if (Number.isFinite(status)) {
        return status >= 200 && status < 400;
      }
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }
  const wgetAvailable = await remoteCommandExists(context.sshTarget, 'wget');
  if (!wgetAvailable) return false;
  const cmd = `wget -qO- --timeout=5 ${shellEscapePath(url)}`;
  try {
    const output = await runSshCapture(context.sshTarget, cmd);
    return output.trim().length > 0;
  } catch {
    return false;
  }
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

async function runDeployStep(
  context: DeployContext,
  projectRoot: string,
  options: {
    noEnvSync?: boolean;
    noBuild?: boolean;
    noSync?: boolean;
    noPm2?: boolean;
  }
): Promise<void> {
  const { appRoot, resolvedAnswers, sshTarget, spec } = context;

  if (!options.noEnvSync) {
    const envPath = path.join(appRoot, 'env.yaml');
    const envExists = await stat(envPath).catch(() => null);
    if (envExists?.isFile()) {
      await runSiteEnvYamlSync({
        projectRoot,
        name: context.slug,
        appPath: appRoot,
        updatePackage: true,
        writeRuntimeConfig: true,
        writeEnvConfig: true,
      });
    } else {
      console.log('ℹ️  env.yaml not found; skipping env sync.');
    }
  }

  if (!options.noBuild) {
    console.log('🏗️  Building app...');
    await runLocalCommand(resolvedAnswers.buildCommand, appRoot);
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
    await runSsh(
      sshTarget,
      maybeWithSudo(resolvedAnswers.restartCommand, resolvedAnswers.nginxSudo)
    );
  }

  console.log('✅ Deploy complete.');
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
    `test -x /usr/sbin/${cmd} >/dev/null 2>&1 && echo yes`,
    `test -x /usr/local/sbin/${cmd} >/dev/null 2>&1 && echo yes`,
    `test -x /usr/bin/${cmd} >/dev/null 2>&1 && echo yes`,
    `test -x /usr/local/bin/${cmd} >/dev/null 2>&1 && echo yes`,
    `test -x /snap/bin/${cmd} >/dev/null 2>&1 && echo yes`,
    `[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 && command -v ${cmd} >/dev/null 2>&1 && echo yes`,
    `echo no`,
  ].join(' || ');
}

function isPathLikeCommand(command: string): boolean {
  const trimmed = command.trim();
  return trimmed.includes('/') || trimmed.startsWith('.');
}

async function isRemoteInitComplete(context: DeployContext): Promise<boolean> {
  const [nginxExists, appExists, ecoExists] = await Promise.all([
    remoteFileExists(context.sshTarget, context.nginxPath),
    remoteDirExists(context.sshTarget, context.resolvedAnswers.appDir),
    remoteFileExists(context.sshTarget, `${context.resolvedAnswers.appDir}/ecosystem.config.cjs`),
  ]);
  return nginxExists && appExists && ecoExists;
}

async function resetRemoteResources(context: DeployContext): Promise<void> {
  const { sshTarget, resolvedAnswers, nginxPath } = context;
  if (!resolvedAnswers.appDir || !resolvedAnswers.appDir.trim()) {
    throw new Error('Remote app directory is required for reset.');
  }
  await assertSafeRemotePath(sshTarget, resolvedAnswers.appDir);
  console.log('🧹 Resetting remote deploy resources...');
  const pm2Available = await remoteCommandExists(sshTarget, resolvedAnswers.pm2Command);
  if (pm2Available) {
    await runSsh(
      sshTarget,
      `${buildPm2Command(resolvedAnswers.pm2Command, `delete ${resolvedAnswers.pm2Name}`)} >/dev/null 2>&1 || true`
    );
  }
  await killPortIfInUse(sshTarget, resolvedAnswers.port);
  await runSsh(sshTarget, `rm -rf ${shellEscapePath(resolvedAnswers.appDir)} >/dev/null 2>&1 || true`);
  await runSsh(sshTarget, `sudo rm -f ${shellEscapePath(nginxPath)} >/dev/null 2>&1 || true`);
  const certName = resolvedAnswers.domain;
  await runSsh(
    sshTarget,
    `sudo rm -rf /etc/letsencrypt/live/${certName} /etc/letsencrypt/archive/${certName} /etc/letsencrypt/renewal/${certName}.conf >/dev/null 2>&1 || true`
  );
  await pruneEmptyParents(sshTarget, resolvedAnswers.appDir, resolvedAnswers.remoteBase);
  console.log('🔧 Testing nginx config...');
  await runSsh(sshTarget, maybeWithSudo('nginx -t', resolvedAnswers.nginxSudo));
  await runSsh(
    sshTarget,
    maybeWithSudo(resolvedAnswers.restartCommand, resolvedAnswers.nginxSudo)
  );
  console.log('✅ Remote reset complete.');
}

function maybeWithSudo(command: string, useSudo: boolean): string {
  return useSudo ? `sudo ${command}` : command;
}

async function assertSafeRemotePath(target: string, appDir: string): Promise<void> {
  const trimmed = appDir.trim();
  if (!trimmed) {
    throw new Error('Remote app directory is empty; refusing to reset.');
  }
  const unsafeRoots = new Set(['/', '/root', '/home']);
  if (unsafeRoots.has(trimmed)) {
    throw new Error(`Refusing to reset remote path "${trimmed}". Set deploy.appDir to a subdirectory.`);
  }
  const home = await resolveRemoteHome(target);
  if (home && trimmed === home) {
    throw new Error(
      `Refusing to reset remote path "${trimmed}" (user home). Set deploy.appDir to a subdirectory like "${home}/<app>".`
    );
  }
}

async function pruneEmptyParents(
  target: string,
  appDir: string,
  baseDir?: string
): Promise<void> {
  const resolvedBase = baseDir
    ? await resolveRemoteAppDir(target, baseDir)
    : await resolveRemoteHome(target);
  if (!resolvedBase) return;
  const stopDir = resolvedBase.replace(/\/+$/, '');
  const appParent = path.posix.dirname(appDir.replace(/\/+$/, ''));
  if (!appParent.startsWith(`${stopDir}/`) || appParent === stopDir) {
    return;
  }
  const cmd = `find ${shellEscapePath(appParent)} -depth -type d -empty -delete`;
  await runSsh(target, cmd);
}

async function killPortIfInUse(target: string, port: number): Promise<void> {
  if (!Number.isFinite(port) || port <= 0) return;
  const inUse = await remotePortInUse(target, port);
  if (!inUse) return;
  const proceed = await promptYesNo(
    `Port ${port} is still in use. Kill the process using this port?`,
    false
  );
  if (!proceed) return;
  if (await remoteCommandExists(target, 'fuser')) {
    await runSsh(target, `sudo fuser -k ${port}/tcp >/dev/null 2>&1 || true`);
    return;
  }
  if (await remoteCommandExists(target, 'lsof')) {
    await runSsh(target, `sudo lsof -ti :${port} | xargs -r sudo kill -9`);
    return;
  }
  console.warn('⚠️  Unable to kill port (fuser/lsof not found).');
}

async function remotePortInUse(target: string, port: number): Promise<boolean> {
  if (await remoteCommandExists(target, 'ss')) {
    const cmd = `ss -ltn | awk '{print $4}' | grep -q ':${port}$' && echo yes || echo no`;
    const output = await runSshCapture(target, cmd);
    return /\byes\b/.test(output);
  }
  if (await remoteCommandExists(target, 'netstat')) {
    const cmd = `netstat -ltn | awk '{print $4}' | grep -q ':${port}$' && echo yes || echo no`;
    const output = await runSshCapture(target, cmd);
    return /\byes\b/.test(output);
  }
  return false;
}

async function remoteFileExists(
  target: string,
  remotePath: string,
  options?: { sudo?: boolean }
): Promise<boolean> {
  const prefix = options?.sudo ? 'sudo ' : '';
  const cmd = `${prefix}test -f ${shellEscapePath(remotePath)} && echo yes || echo no`;
  const output = await runSshCapture(target, cmd);
  return output.trim() === 'yes';
}

async function remoteDirExists(target: string, remotePath: string): Promise<boolean> {
  const cmd = `test -d ${shellEscapePath(remotePath)} && echo yes || echo no`;
  const output = await runSshCapture(target, cmd);
  return output.trim() === 'yes';
}

async function readRemoteState(target: string, statePath: string): Promise<DeployState | null> {
  const exists = await remoteFileExists(target, statePath);
  if (!exists) return null;
  const raw = await runSshCapture(target, `cat ${shellEscapePath(statePath)}`);
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as DeployState;
  } catch {
    return null;
  }
}

async function removeRemoteState(target: string, statePath: string): Promise<void> {
  await runSsh(target, `rm -f ${shellEscapePath(statePath)} >/dev/null 2>&1 || true`);
}

async function updateRemoteState(
  context: DeployContext,
  state: DeployState | null,
  patch: Partial<DeployState>
): Promise<DeployState> {
  const next: DeployState = {
    ...(state ?? {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeRemoteFile(context.sshTarget, context.statePath, JSON.stringify(next, null, 2));
  await writeLocalState(context.localStatePath, next);
  return next;
}

async function updateLocalState(
  localPath: string,
  state: DeployState | null,
  patch: Partial<DeployState>
): Promise<DeployState> {
  const next: DeployState = {
    ...(state ?? {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeLocalState(localPath, next);
  return next;
}

async function writeRemoteFile(target: string, remotePath: string, contents: string): Promise<void> {
  const cmd = `cat > ${shellEscapePath(remotePath)}`;
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ssh', [target, buildRemoteCommand(cmd)], { stdio: ['pipe', 'inherit', 'inherit'] });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ssh exited with ${code}`));
    });
    proc.stdin.write(contents);
    proc.stdin.end();
  });
}

async function writeLocalState(localPath: string, state: DeployState): Promise<void> {
  const dir = path.dirname(localPath);
  await mkdir(dir, { recursive: true });
  await writeFile(localPath, JSON.stringify(state, null, 2), 'utf-8');
}

async function removeLocalState(localPath: string): Promise<void> {
  await rm(localPath, { force: true }).catch(() => null);
}

function normalizeStep(step?: string): DeployStep | undefined {
  if (!step) return undefined;
  const normalized = step.trim().toLowerCase();
  if (normalized === 'init' || normalized === 'verify' || normalized === 'ssl' || normalized === 'deploy') {
    return normalized;
  }
  throw new Error(`Unknown deploy step: ${step}`);
}

function stepIndex(step?: DeployStep): number {
  switch (step) {
    case 'verify':
      return 1;
    case 'ssl':
      return 2;
    case 'deploy':
      return 3;
    case 'init':
    default:
      return 0;
  }
}

async function promptYesNo(question: string, defaultYes: boolean): Promise<boolean> {
  if (!process.stdin.isTTY) return defaultYes;
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const rl = readline.createInterface({ input, output });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const answer = await rl.question(`${question} (${hint}) `);
    if (!answer) {
      rl.close();
      return defaultYes;
    }
    if (/^y(es)?$/i.test(answer.trim())) {
      rl.close();
      return true;
    }
    if (/^n(o)?$/i.test(answer.trim())) {
      rl.close();
      return false;
    }
    console.warn('⚠️  Please answer with y or n.');
  }
  rl.close();
  return defaultYes;
}

async function promptRequiredInput(label: string, fallback: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const hint = fallback ? `${label} (${fallback})` : label;
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(`${hint}: `);
    rl.close();
    const value = (answer || fallback).trim();
    if (value) return value;
    console.warn(`⚠️  ${label} is required.`);
  }
  throw new Error(`${label} is required.`);
}

function hasSslEnabled(deploy?: Record<string, unknown>): boolean {
  if (!deploy) return false;
  const ssl = (deploy as any).ssl;
  if (!ssl) return false;
  if (typeof ssl === 'boolean') return ssl;
  if (typeof ssl !== 'object') return false;
  return (ssl as any).enabled !== false;
}

function getSslConfig(
  deploy?: Record<string, unknown>
): { email?: string; redirect?: boolean } | null {
  if (!deploy) return null;
  const ssl = (deploy as any).ssl;
  if (!ssl || typeof ssl !== 'object') return null;
  return {
    email: typeof (ssl as any).email === 'string' ? (ssl as any).email : undefined,
    redirect: typeof (ssl as any).redirect === 'boolean' ? (ssl as any).redirect : undefined,
  };
}

async function writeSslEmail(specPath: string, email: string): Promise<void> {
  const raw = await readFile(specPath, 'utf-8');
  const parsed = YAML.parse(raw) as Record<string, any>;
  parsed.deploy = parsed.deploy ?? {};
  const ssl = parsed.deploy.ssl && typeof parsed.deploy.ssl === 'object'
    ? parsed.deploy.ssl
    : {};
  ssl.email = email;
  if (typeof ssl.redirect !== 'boolean') {
    ssl.redirect = true;
  }
  parsed.deploy.ssl = ssl;
  await writeFile(specPath, YAML.stringify(parsed), 'utf-8');
}
