import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { readFile, stat } from 'fs/promises';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import YAML from 'yaml';

import { toKebabCase } from './util';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  env?: Record<string, unknown>;
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
  nginxSitesEnabled: string;
  restartCommand: string;
  overwriteNginx: boolean;
  overwriteApp: boolean;
  startPm2: boolean;
}

const execFileAsync = promisify(execFile);

const NODE_STARTER_TEMPLATE = `# Starter reverse proxy for a Node/Nuxt app.
server {
    listen 80;
    listen [::]:80;
    server_name {SERVER_NAME};

    access_log /var/log/nginx/{LOG_NAME}.access.log;
    error_log  /var/log/nginx/{LOG_NAME}.error.log;

    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://127.0.0.1:{PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
`;

export async function runSiteDeployInit(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  host?: string;
  user?: string;
  domain?: string;
  port?: number;
  appDir?: string;
  yes?: boolean;
  overwriteNginx?: boolean;
  overwriteApp?: boolean;
  startPm2?: boolean;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const sitesRoot = path.resolve(projectRoot, 'sites');

  const spec = await loadSiteSpec(options, sitesRoot, projectRoot);
  const slug = spec?.slug ?? toKebabCase(options.name ?? '');

  const defaults = deriveDefaults(spec, slug);
  let answers = await collectAnswers(options, defaults);

  const sshTarget = answers.user ? `${answers.user}@${answers.host}` : answers.host;
  const resolvedAppDir = await resolveRemoteAppDir(sshTarget, answers.appDir);
  if (resolvedAppDir && resolvedAppDir !== answers.appDir) {
    answers = { ...answers, appDir: resolvedAppDir };
  }
  const nginxFileName = answers.domain;
  const nginxPath = path.posix.join(answers.nginxSitesEnabled, nginxFileName);

  console.log(`📦 Remote app dir: ${answers.appDir}`);

  const configExists = await remoteFileExists(sshTarget, nginxPath);
  if (configExists && !answers.overwriteNginx) {
    console.log(`⚠️  Nginx config exists at ${nginxPath}. Skipping nginx write.`);
  }

  const appExists = await remoteDirExists(sshTarget, answers.appDir);
  if (appExists && !answers.overwriteApp) {
    console.log(`⚠️  App directory exists at ${answers.appDir}. Skipping app dir creation.`);
  }

  const portInUse = await remotePortInUse(sshTarget, answers.port);
  if (portInUse) {
    console.warn(`⚠️  Port ${answers.port} appears to be in use on ${answers.host}.`);
  }

  if (!options.yes) {
    const proceed = await promptYesNo('Proceed with remote setup?', true);
    if (!proceed) {
      console.log('Aborted.');
      return;
    }
  }

  const serverDir = `${answers.appDir}/output/server`;
  const serverFile = `${serverDir}/index.mjs`;
  const serverExists = await remoteFileExists(sshTarget, serverFile);

  if (!appExists || answers.overwriteApp) {
    await runSsh(
      sshTarget,
      `mkdir -p ${shellEscapePath(serverDir)}`
    );
    await writeRemoteFile(
      sshTarget,
      serverFile,
      buildPlaceholderServer()
    );
  } else if (!serverExists) {
    console.log('⚠️  Placeholder server missing. Writing output/server/index.mjs.');
    await runSsh(
      sshTarget,
      `mkdir -p ${shellEscapePath(serverDir)}`
    );
    await writeRemoteFile(
      sshTarget,
      serverFile,
      buildPlaceholderServer()
    );
  }

  const ecosystem = buildEcosystemConfig(answers, spec?.deploy);
  await writeRemoteFile(
    sshTarget,
    `${answers.appDir}/ecosystem.config.cjs`,
    ecosystem
  );

  const envConfig = await resolveEnvConfig(spec, repoRoot);
  if (envConfig) {
    await writeRemoteFile(
      sshTarget,
      `${answers.appDir}/env.config.cjs`,
      envConfig
    );
  } else {
    console.log('ℹ️  No env.config.cjs or env spec found; skipping env upload.');
  }

  if (!configExists || answers.overwriteNginx) {
    const rendered = renderNodeStarter({
      serverName: answers.domain,
      port: answers.port,
      logName: sanitizeLogName(answers.domain),
    });
    await writeRemoteFile(
      sshTarget,
      nginxPath,
      rendered,
      true
    );
  }

  console.log('🔧 Testing nginx config...');
  await runSsh(sshTarget, 'sudo nginx -t');
  await runSsh(sshTarget, `sudo ${answers.restartCommand}`);

  if (answers.startPm2) {
    const pm2Available = await remoteCommandExists(sshTarget, answers.pm2Command);
    if (!pm2Available) {
      console.warn(
        `⚠️  ${answers.pm2Command} not found on the remote host. Skipping PM2 start.`
      );
    } else {
      await runSsh(
        sshTarget,
        `cd ${shellEscapePath(answers.appDir)} && ${buildPm2Command(answers.pm2Command, 'start ecosystem.config.cjs')}`
      );
    }
  }

  console.log(`✅ Deploy init complete.`);
  console.log(`🌐 URL: http://${answers.domain}`);
}

function renderNodeStarter(options: {
  serverName: string;
  port: number;
  logName: string;
}): string {
  return NODE_STARTER_TEMPLATE
    .replace(/\{SERVER_NAME\}/g, options.serverName)
    .replace(/\{PORT\}/g, String(options.port))
    .replace(/\{LOG_NAME\}/g, options.logName);
}

function buildPlaceholderServer(): string {
  return `import http from 'http'

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '0.0.0.0'

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('working')
})

server.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(\`Server running on \${host}:\${port}\`)
})
`;
}

function buildEcosystemConfig(answers: DeployAnswers, deploy?: Record<string, unknown>): string {
  const deployEcosystem = deploy && (deploy as any).ecosystem;
  if (deployEcosystem && typeof deployEcosystem === 'object') {
    return `module.exports = ${JSON.stringify(deployEcosystem, null, 2)};\n`;
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
    env: parsed.env as Record<string, unknown> | undefined,
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

function deriveDefaults(spec: SiteSpec | null, slug: string): DeployAnswers {
  const deploy = spec?.deploy ?? {};
  const host = (deploy as any).host ?? '';
  const user = (deploy as any).user ?? null;
  const domain = (deploy as any).domain ?? '';
  const port = Number((deploy as any).port ?? 4041);
  const appDir = normalizeRemotePath((deploy as any).appDir ?? `~/${slug || 'site'}`);
  const pm2Name = (deploy as any).pm2Name ?? (slug || 'site');
  const pm2Command = (deploy as any).pm2Command ?? 'pm2';
  const nginxSitesEnabled = (deploy as any).nginxSitesEnabled ?? '/etc/nginx/sites-enabled';
  const restartCommand = (deploy as any).restartCommand ?? 'systemctl reload nginx';
  const overwriteNginx = Boolean((deploy as any).overwriteNginx ?? false);
  const overwriteApp = Boolean((deploy as any).overwriteApp ?? false);
  const startPm2 = (deploy as any).startPm2 ?? true;
  return {
    host,
    user,
    domain,
    port: Number.isFinite(port) && port > 0 ? port : 4041,
    appDir,
    pm2Name,
    pm2Command,
    nginxSitesEnabled,
    restartCommand,
    overwriteNginx,
    overwriteApp,
    startPm2,
  };
}

async function collectAnswers(
  options: {
    host?: string;
    user?: string;
    domain?: string;
    port?: number;
    appDir?: string;
    yes?: boolean;
    overwriteNginx?: boolean;
    overwriteApp?: boolean;
    startPm2?: boolean;
  },
  defaults: DeployAnswers
): Promise<DeployAnswers> {
  if (options.yes) {
    const host = options.host ?? defaults.host;
    const domain = options.domain ?? defaults.domain;
    if (!host || !domain) {
      throw new Error('Both host and domain are required in non-interactive mode.');
    }
    const appDir = options.appDir
      ? normalizeRemotePath(options.appDir)
      : defaults.appDir;
    return {
      ...defaults,
      host,
      user: options.user ?? defaults.user,
      domain,
      port: options.port ?? defaults.port,
      appDir,
      overwriteNginx: options.overwriteNginx ?? defaults.overwriteNginx,
      overwriteApp: options.overwriteApp ?? defaults.overwriteApp,
      startPm2: options.startPm2 ?? defaults.startPm2,
    };
  }
  if (!process.stdin.isTTY) {
    const host = options.host ?? defaults.host;
    const domain = options.domain ?? defaults.domain;
    if (!host || !domain) {
      throw new Error('Both host and domain are required in non-interactive mode.');
    }
    const appDir = options.appDir
      ? normalizeRemotePath(options.appDir)
      : defaults.appDir;
    return {
      ...defaults,
      host,
      user: options.user ?? defaults.user,
      domain,
      port: options.port ?? defaults.port,
      appDir,
      overwriteNginx: options.overwriteNginx ?? defaults.overwriteNginx,
      overwriteApp: options.overwriteApp ?? defaults.overwriteApp,
      startPm2: options.startPm2 ?? defaults.startPm2,
    };
  }

  const host =
    options.host ?? (await promptRequiredInput('SSH host', defaults.host));
  const user =
    options.user ??
    ((await promptInput(`SSH user (${defaults.user ?? 'current'})`)) || defaults.user);
  const domain =
    options.domain ?? (await promptRequiredInput('Domain', defaults.domain));
  const port = options.port ?? (await promptNumber(`Upstream port (${defaults.port})`, defaults.port));
  const appDirInput = await promptInput(`App dir (${defaults.appDir})`);
  const appDir =
    options.appDir ??
    (appDirInput
      ? normalizeRemotePath(appDirInput)
      : normalizeRemotePath(defaults.appDir));
  const overwriteNginx = options.overwriteNginx ?? await promptYesNo('Overwrite nginx config if it exists?', false);
  const overwriteApp = options.overwriteApp ?? await promptYesNo('Overwrite app folder if it exists?', false);
  const startPm2 = options.startPm2 ?? await promptYesNo('Start PM2 with ecosystem.config.cjs?', true);

  return {
    ...defaults,
    host,
    user: user || null,
    domain,
    port,
    appDir,
    overwriteNginx,
    overwriteApp,
    startPm2,
  };
}

async function remoteFileExists(target: string, remotePath: string): Promise<boolean> {
  const cmd = `test -f ${shellEscapePath(remotePath)} && echo yes || echo no`;
  const output = await runSshCapture(target, cmd);
  return output.trim() === 'yes';
}

async function remoteDirExists(target: string, remotePath: string): Promise<boolean> {
  const cmd = `test -d ${shellEscapePath(remotePath)} && echo yes || echo no`;
  const output = await runSshCapture(target, cmd);
  return output.trim() === 'yes';
}

async function remotePortInUse(target: string, port: number): Promise<boolean> {
  const cmd = `ss -ltn | awk '{print $4}' | grep -q ':${port}$' && echo yes || echo no`;
  const output = await runSshCapture(target, cmd);
  return output.trim() === 'yes';
}

async function remoteCommandExists(target: string, command: string): Promise<boolean> {
  const cmd = buildCommandExistsCheck(command);
  const output = await runSshCapture(target, cmd);
  return output.trim() === 'yes';
}

function sanitizeLogName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.-]+/g, '-');
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

async function runSshCapture(target: string, command: string): Promise<string> {
  const { stdout } = await execFileAsync('ssh', [target, buildRemoteCommand(command)], {
    encoding: 'utf-8',
  });
  return stdout;
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

async function writeRemoteFile(
  target: string,
  remotePath: string,
  contents: string,
  sudo = false
): Promise<void> {
  const cmd = sudo
    ? `sudo tee ${shellEscapePath(remotePath)} >/dev/null`
    : `cat > ${shellEscapePath(remotePath)}`;
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('ssh', ['-t', target, buildRemoteCommand(cmd)], {
      stdio: ['pipe', 'inherit', 'inherit'],
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ssh exited with ${code}`));
    });
    proc.stdin.write(contents);
    proc.stdin.end();
  });
}

function shellEscapePath(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function buildRemoteCommand(command: string): string {
  const escaped = command.replace(/(["\\$`])/g, '\\$1');
  return `bash -lc "${escaped}"`;
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

function isPathLikeCommand(command: string): boolean {
  const trimmed = command.trim();
  return trimmed.includes('/') || trimmed.startsWith('.');
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

async function resolveEnvConfig(spec: SiteSpec | null, repoRoot: string): Promise<string | null> {
  if (spec?.target) {
    const appPath = path.isAbsolute(spec.target)
      ? spec.target
      : path.resolve(repoRoot, spec.target);
    const envConfigPath = path.join(appPath, 'env.config.cjs');
    const exists = await stat(envConfigPath).catch(() => null);
    if (exists?.isFile()) {
      return await readFile(envConfigPath, 'utf-8');
    }
  }
  if (spec?.env && Object.keys(spec.env).length > 0) {
    const env = buildEnvConfig(spec.env);
    return `module.exports = ${JSON.stringify(env, null, 2)};\n`;
  }
  return null;
}

function buildEnvConfig(envSpec: Record<string, unknown>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(envSpec)) {
    const normalized = normalizeEnvValue(value);
    const selected = normalized.staging ?? normalized.local;
    if (selected !== undefined) {
      output[key] = String(selected);
    }
  }
  return output;
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

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const local = record.local !== undefined ? String(record.local) : undefined;
    const staging = record.staging !== undefined ? String(record.staging) : local;
    return { local, staging };
  }

  return {};
}

function looksLocal(value: string): boolean {
  return value.includes('localhost') || value.includes('127.0.0.1');
}

async function promptInput(label: string): Promise<string> {
  if (!process.stdin.isTTY) return '';
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${label}: `);
  rl.close();
  return answer.trim();
}

async function promptRequiredInput(label: string, fallback: string): Promise<string> {
  let value = '';
  for (let i = 0; i < 3; i += 1) {
    const promptLabel = fallback ? `${label} (${fallback})` : label;
    const raw = await promptInput(promptLabel);
    value = raw || fallback;
    if (value) return value;
    console.warn(`⚠️  ${label} is required.`);
  }
  throw new Error(`${label} is required.`);
}

async function promptYesNo(question: string, defaultYes: boolean): Promise<boolean> {
  if (!process.stdin.isTTY) return defaultYes;
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await promptInput(`${question} (${hint})`);
  if (!answer) return defaultYes;
  return /^y(es)?$/i.test(answer.trim());
}

async function promptNumber(label: string, fallback: number): Promise<number> {
  const raw = await promptInput(label);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid number: ${raw}`);
  }
  return parsed;
}
