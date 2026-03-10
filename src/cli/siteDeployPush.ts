import path from 'path';
import { readFile, stat, writeFile, mkdir } from 'fs/promises';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import YAML from 'yaml';

import { toKebabCase } from './util';
import { runSiteEnvYamlSync } from './siteEnvYamlSync';
import { resolveDeployTarget } from './deployTarget';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  deploy?: Record<string, unknown>;
  deployTarget?: string;
}

interface DeployPushAnswers {
  host: string;
  user: string | null;
  appDir: string;
  remoteBase?: string;
  remoteRoot?: string;
  remoteName: string;
  pm2Name: string;
  pm2Command: string;
  port: number;
  rsyncDelete: boolean;
  buildCommand: string;
}

interface DeployPushContext {
  spec: SiteSpec;
  slug: string;
  appRoot: string;
  answers: DeployPushAnswers;
  resolvedAnswers: DeployPushAnswers;
  sshTarget: string;
}

const execFileAsync = promisify(execFile);

export async function runSiteDeployPush(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  target?: string;
  host?: string;
  user?: string;
  appDir?: string;
  remoteBase?: string;
  remoteRoot?: string;
  remotePath?: string;
  port?: number;
  pm2Name?: string;
  pm2Command?: string;
  buildCommand?: string;
  rsyncDelete?: boolean;
  noBuild?: boolean;
  noEnvSync?: boolean;
  noSync?: boolean;
  noPm2?: boolean;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const sitesRoot = path.resolve(projectRoot, 'sites');

  const spec = await loadSiteSpec(options, sitesRoot, projectRoot);
  if (!spec) {
    throw new Error('Site spec not found. Provide a name or --spec.');
  }

  const slug = spec.slug;
  const appRoot = path.isAbsolute(spec.target)
    ? spec.target
    : path.resolve(repoRoot, spec.target);
  const defaults = deriveDefaults(spec, slug);
  const answers = resolveAnswers(options, defaults);
  const sshTarget = answers.user ? `${answers.user}@${answers.host}` : answers.host;
  const resolvedAppDir = await resolveRemoteAppDir(sshTarget, answers.appDir);
  const resolvedAnswers = resolvedAppDir && resolvedAppDir !== answers.appDir
    ? { ...answers, appDir: resolvedAppDir }
    : answers;

  const context: DeployPushContext = {
    spec,
    slug,
    appRoot,
    answers,
    resolvedAnswers,
    sshTarget,
  };

  console.log('📡 Push deploy target:');
  if (context.spec.deployTarget) {
    console.log(`   target: ${context.spec.deployTarget}`);
  }
  console.log(`   ssh: ${context.sshTarget}`);
  console.log(`   appDir: ${context.resolvedAnswers.appDir}`);
  console.log(`   pm2: ${context.resolvedAnswers.pm2Command} (${context.resolvedAnswers.pm2Name})`);
  console.log(`   port: ${context.resolvedAnswers.port}`);

  await assertSafeRemotePath(context.sshTarget, context.resolvedAnswers.appDir);

  await runPushStep(context, projectRoot, {
    noEnvSync: options.noEnvSync,
    noBuild: options.noBuild,
    noSync: options.noSync,
    noPm2: options.noPm2,
  });
}

async function runPushStep(
  context: DeployPushContext,
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
  if (!options.noSync) {
    const outputExists = await stat(outputDir).catch(() => null);
    if (!outputExists?.isDirectory()) {
      throw new Error(`Build output not found: ${outputDir}`);
    }
  }

  if (!options.noSync) {
    await runSsh(sshTarget, `mkdir -p ${shellEscapePath(`${resolvedAnswers.appDir}/output`)}`);
  }
  await runSsh(sshTarget, `mkdir -p ${shellEscapePath(`${resolvedAnswers.appDir}/app/helios`)}`);
  await runSsh(
    sshTarget,
    `mkdir -p ${shellEscapePath(`${resolvedAnswers.appDir}/modules/schema-kit/runtime/generated`)}`
  );

  if (!options.noSync) {
    console.log('🚚 Syncing .output → output ...');
    await runRsync(
      `${outputDir}${path.sep}`,
      `${sshTarget}:${resolvedAnswers.appDir}/output/`,
      resolvedAnswers.rsyncDelete
    );

    await syncRuntimeAssetDir(
      appRoot,
      sshTarget,
      resolvedAnswers.appDir,
      'app/helios/fragments',
      { del: false }
    );
    await syncRuntimeAssetDir(
      appRoot,
      sshTarget,
      resolvedAnswers.appDir,
      'app/helios/generated',
      { del: false }
    );
    await syncRuntimeAssetDir(
      appRoot,
      sshTarget,
      resolvedAnswers.appDir,
      'modules/schema-kit/runtime/generated',
      { del: false }
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
      console.warn(`⚠️  ${resolvedAnswers.pm2Command} not found on remote host. Skipping PM2 start.`);
    } else {
      await runSsh(
        sshTarget,
        `cd ${shellEscapePath(resolvedAnswers.appDir)} && ${buildPm2Command(resolvedAnswers.pm2Command, 'startOrReload ecosystem.config.cjs --update-env')}`
      );
    }
  }

  console.log('✅ Push deploy complete.');
}

function deriveDefaults(spec: SiteSpec, slug: string): DeployPushAnswers {
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
  const appDirValue = (deploy as any).appDir;
  const appDirFallback = parsedRemotePath.appDir
    ?? (remoteRoot && remoteRoot.trim()
      ? `${remoteRoot.replace(/\/+$/, '')}/${remoteName || slug}`
      : `~/${remoteName || slug}`);
  const appDir = normalizeRemotePath(
    typeof appDirValue === 'string' && appDirValue.trim() ? appDirValue : appDirFallback
  );
  const host = (deploy as any).host ?? '';
  const user = (deploy as any).user ?? null;
  const pm2Name = String((deploy as any).pm2Name ?? remoteName);
  const pm2Command = String((deploy as any).pm2Command ?? 'pm2');
  const port = Number((deploy as any).port ?? 3123);
  const rsyncDelete = (deploy as any).rsyncDelete ?? true;
  const buildCommand = String((deploy as any).buildCommand ?? 'pnpm run build');

  return {
    host,
    user,
    appDir,
    remoteBase,
    remoteRoot,
    remoteName,
    pm2Name,
    pm2Command,
    port: Number.isFinite(port) && port > 0 ? port : 3123,
    rsyncDelete: Boolean(rsyncDelete),
    buildCommand,
  };
}

function resolveAnswers(options: {
  host?: string;
  user?: string;
  appDir?: string;
  remoteBase?: string;
  remoteRoot?: string;
  remotePath?: string;
  port?: number;
  pm2Name?: string;
  pm2Command?: string;
  rsyncDelete?: boolean;
  buildCommand?: string;
}, defaults: DeployPushAnswers): DeployPushAnswers {
  const host = options.host ?? defaults.host;
  if (!host) {
    throw new Error('host is required for push deploy.');
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
    appDir,
    remoteBase,
    remoteRoot,
    remoteName,
    pm2Name: options.pm2Name ?? defaults.pm2Name,
    pm2Command: options.pm2Command ?? defaults.pm2Command,
    port: options.port ?? defaults.port,
    rsyncDelete: options.rsyncDelete ?? defaults.rsyncDelete,
    buildCommand: options.buildCommand ?? defaults.buildCommand,
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

async function loadSiteSpec(
  options: { name?: string; specPath?: string; target?: string },
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
  const resolvedDeploy = resolveDeployTarget(
    parsed.deploy as Record<string, unknown> | undefined,
    options.target
  );
  return {
    name: String(parsed.name),
    slug: String(parsed.slug),
    template: String(parsed.template),
    target: String(parsed.target),
    deploy: resolvedDeploy.deploy,
    deployTarget: resolvedDeploy.selectedTarget,
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

async function runPushRsync(source: string, dest: string, del: boolean): Promise<void> {
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

async function runRsync(source: string, dest: string, del: boolean): Promise<void> {
  await runPushRsync(source, dest, del);
}

async function syncRuntimeAssetDir(
  appRoot: string,
  sshTarget: string,
  remoteAppDir: string,
  relativePath: string,
  options?: { del?: boolean }
): Promise<void> {
  const localDir = path.join(appRoot, relativePath);
  const exists = await stat(localDir).catch(() => null);
  if (!exists?.isDirectory()) {
    console.log(`ℹ️  ${relativePath} not found; skipping runtime asset sync.`);
    return;
  }

  console.log(`📦 Syncing ${relativePath} ...`);
  await runRsync(
    `${localDir}${path.sep}`,
    `${sshTarget}:${remoteAppDir}/${relativePath}/`,
    Boolean(options?.del)
  );
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

async function assertSafeRemotePath(target: string, appDir: string): Promise<void> {
  const trimmed = appDir.trim();
  if (!trimmed) {
    throw new Error('Remote app directory is empty; refusing push deploy.');
  }
  const unsafeRoots = new Set(['/', '/root', '/home']);
  if (unsafeRoots.has(trimmed)) {
    throw new Error(`Refusing to use remote path "${trimmed}". Set deploy.appDir to a subdirectory.`);
  }
  const home = await resolveRemoteHome(target);
  if (home && trimmed === home) {
    throw new Error(
      `Refusing to use remote path "${trimmed}" (user home). Set deploy.appDir to a subdirectory like "${home}/<app>".`
    );
  }
}

async function writeLocalEcosystemConfig(
  filePath: string,
  answers: DeployPushAnswers,
  deploy?: Record<string, unknown>
): Promise<void> {
  const body = buildEcosystemConfig(answers, deploy);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body, 'utf-8');
}

function buildEcosystemConfig(
  answers: DeployPushAnswers,
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

  return [
    'module.exports = (() => {',
    '  let fileEnv = {};',
    '  try {',
    '    fileEnv = require(\'./env.config.cjs\');',
    '  } catch {',
    '    fileEnv = {};',
    '  }',
    '',
    '  return {',
    '    apps: [',
    '      {',
    `        name: ${JSON.stringify(answers.pm2Name)},`,
    '        exec_mode: \'fork\',',
    `        cwd: ${JSON.stringify(answers.appDir)},`,
    '        script: \'output/server/index.mjs\',',
    '        node_args: \'\',',
    '        env: {',
    '          ...fileEnv,',
    `          ...${JSON.stringify(mergedEnv, null, 10)},`,
    '        },',
    '      },',
    '    ],',
    '  };',
    '})();',
    '',
  ].join('\n');
}
