import path from 'path';
import os from 'os';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { readFile, stat } from 'fs/promises';
import { spawn } from 'child_process';
import YAML from 'yaml';

interface NginxConfig {
  serversPath?: string;
  certsPath?: string;
  hostsPath?: string;
  templatePath?: string;
  defaultListenPort?: number;
  defaultProxyPort?: number;
  restartCommand?: string;
  mkcertCommand?: string;
}

interface NginxSetupArgs {
  name?: string;
  port?: number;
  listenPort?: number;
  file?: string;
  apply?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  skipMkcert?: boolean;
  skipHosts?: boolean;
  skipRestart?: boolean;
  serversPath?: string;
  certsPath?: string;
  hostsPath?: string;
  templatePath?: string;
  restartCommand?: string;
  mkcertCommand?: string;
}

const DEFAULT_TEMPLATE = `# Common proxy headers
proxy_set_header Host              $host;
proxy_set_header X-Forwarded-Host  $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For   $remote_addr;

# WS upgrade (used only in dev/HMR; harmless otherwise)
map $http_upgrade $connection_upgrade { default upgrade; '' close; }

server {
    listen {LISTEN_PORT} ssl;
    http2 on;
    server_name {NAME};

    ssl_certificate     {CERTS_PATH}/{NAME}.pem;
    ssl_certificate_key {CERTS_PATH}/{NAME}-key.pem;

    location / { proxy_pass http://127.0.0.1:{PORT}; }

    location ~ ^/(?:_nuxt/)?__vitews$ {
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_pass http://127.0.0.1:{PORT};
    }

    location ~ ^/(?:_nuxt/)?__nuxt_vite_rpc$ {
      proxy_pass http://127.0.0.1:{PORT};
    }

    location ~ ^/(?:_nuxt/)?__vite_ping$ {
      proxy_pass http://127.0.0.1:{PORT};
    }

    access_log /opt/homebrew/var/log/nginx/{NAME}.access.log;
    error_log  /opt/homebrew/var/log/nginx/{NAME}.error.log;
}
`;

const DEFAULT_CONFIG: Required<Pick<
  NginxConfig,
  | 'serversPath'
  | 'certsPath'
  | 'hostsPath'
  | 'templatePath'
  | 'defaultListenPort'
  | 'defaultProxyPort'
  | 'restartCommand'
  | 'mkcertCommand'
>> = {
  serversPath: '/opt/homebrew/etc/nginx/servers',
  certsPath: path.join(os.homedir(), 'certs'),
  hostsPath: '/etc/hosts',
  templatePath: './config/nginx.template.conf',
  defaultListenPort: 4443,
  defaultProxyPort: 3000,
  restartCommand: 'nginx -t && brew services restart nginx',
  mkcertCommand: 'mkcert',
};

function resolvePathMaybeHome(targetPath: string, baseDir: string): string {
  if (!targetPath) return targetPath;
  if (targetPath.startsWith('~/')) {
    return path.join(os.homedir(), targetPath.slice(2));
  }
  return path.isAbsolute(targetPath) ? targetPath : path.resolve(baseDir, targetPath);
}

async function loadNginxConfig(projectRoot: string): Promise<NginxConfig> {
  const configPath = path.resolve(projectRoot, 'config', 'nginx.yaml');
  try {
    const raw = await readFile(configPath, 'utf-8');
    const parsed = YAML.parse(raw) as NginxConfig;
    return parsed ?? {};
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function loadTemplate(projectRoot: string, config: NginxConfig): Promise<string> {
  const templatePath = config.templatePath ?? DEFAULT_CONFIG.templatePath;
  const resolved = resolvePathMaybeHome(templatePath, projectRoot);
  try {
    return await readFile(resolved, 'utf-8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return DEFAULT_TEMPLATE;
    }
    throw error;
  }
}

function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [key, value]) => {
    const token = new RegExp(`\\{${key}\\}`, 'g');
    return acc.replace(token, String(value));
  }, template);
}

function deriveFileName(hostname: string): string {
  const trimmed = hostname.trim();
  if (!trimmed) return 'site';
  return trimmed.replace(/[^a-zA-Z0-9_.-]+/g, '-');
}

function shouldSkipHostLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || trimmed.startsWith('#');
}

function hasHostEntry(content: string, hostname: string): boolean {
  return content
    .split('\n')
    .filter((line) => !shouldSkipHostLine(line))
    .some((line) => line.split(/\s+/).includes(hostname));
}

async function runCommand(command: string, args: string[], cwd?: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'inherit', cwd });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: ${command} ${args.join(' ')} (exit ${code})`));
      }
    });
  });
}

async function runShellCommand(command: string, cwd?: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(command, { stdio: 'inherit', cwd, shell: true });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: ${command} (exit ${code})`));
      }
    });
  });
}

async function writeFileWithSudo(targetPath: string, contents: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('sudo', ['tee', targetPath], { stdio: ['pipe', 'inherit', 'inherit'] });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to write ${targetPath} (exit ${code})`));
      }
    });
    proc.stdin.write(contents);
    proc.stdin.end();
  });
}

async function prompt(question: string, fallback?: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  const suffix = fallback ? ` (${fallback})` : '';
  const answer = await rl.question(`${question}${suffix}: `);
  rl.close();
  const trimmed = answer.trim();
  return trimmed.length > 0 ? trimmed : fallback ?? '';
}

export async function runNginxSetup(args: NginxSetupArgs, projectRoot: string): Promise<void> {
  const config = { ...DEFAULT_CONFIG, ...(await loadNginxConfig(projectRoot)) };

  const hostname = (args.name ?? '').trim().length > 0 ? String(args.name) : await prompt('Server name');
  if (!hostname) {
    throw new Error('Server name is required.');
  }

  const defaultFile = deriveFileName(hostname);
  const fileName =
    (args.file ?? '').trim().length > 0 ? String(args.file) : await prompt('Config filename', defaultFile);
  const configFileName = fileName.endsWith('.conf') ? fileName : `${fileName}.conf`;

  const defaultProxyPort = config.defaultProxyPort ?? DEFAULT_CONFIG.defaultProxyPort;
  const portRaw = args.port ?? (await prompt('Proxy port (Nuxt)', String(defaultProxyPort)));
  const proxyPort = Number(portRaw);
  if (!Number.isFinite(proxyPort) || proxyPort <= 0) {
    throw new Error(`Invalid proxy port: ${portRaw}`);
  }

  const defaultListenPort = config.defaultListenPort ?? DEFAULT_CONFIG.defaultListenPort;
  const listenRaw = args.listenPort ?? (await prompt('Listen port (SSL)', String(defaultListenPort)));
  const listenPort = Number(listenRaw);
  if (!Number.isFinite(listenPort) || listenPort <= 0) {
    throw new Error(`Invalid listen port: ${listenRaw}`);
  }

  const serversPath = resolvePathMaybeHome(args.serversPath ?? config.serversPath, projectRoot);
  const certsPath = resolvePathMaybeHome(args.certsPath ?? config.certsPath, projectRoot);
  const hostsPath = resolvePathMaybeHome(args.hostsPath ?? config.hostsPath, projectRoot);
  const templatePath = resolvePathMaybeHome(args.templatePath ?? config.templatePath, projectRoot);
  const restartCommand = args.restartCommand ?? config.restartCommand ?? DEFAULT_CONFIG.restartCommand;
  const mkcertCommand = args.mkcertCommand ?? config.mkcertCommand ?? DEFAULT_CONFIG.mkcertCommand;

  try {
    await stat(serversPath);
  } catch (error) {
    console.warn(`⚠️  Nginx servers path not found: ${serversPath}`);
  }

  const template = await loadTemplate(projectRoot, { templatePath });
  const rendered = renderTemplate(template, {
    NAME: hostname,
    PORT: proxyPort,
    LISTEN_PORT: listenPort,
    CERTS_PATH: certsPath,
  });

  const configPath = path.resolve(serversPath, configFileName);

  console.log('\nNginx config preview:\n');
  console.log(`Target file: ${configPath}`);
  console.log(rendered);

  const apply = args.apply && !args.dryRun;
  if (!apply) {
    console.log('\nDry run only. To apply, re-run with --apply.');
    return;
  }

  if (!args.yes) {
    const confirm = await prompt('Apply these changes now? (y/N)', 'n');
    if (!/^y(es)?$/i.test(confirm)) {
      console.log('Aborted.');
      return;
    }
  }

  console.log(`\nWriting nginx config to ${configPath} (sudo required)...`);
  await writeFileWithSudo(configPath, rendered);

  if (!args.skipMkcert) {
    console.log(`\nGenerating cert via ${mkcertCommand} in ${certsPath}...`);
    await runCommand(mkcertCommand, [hostname], certsPath);
  }

  if (!args.skipHosts) {
    console.log(`\nChecking hosts file at ${hostsPath}...`);
    const hostsContent = await readFile(hostsPath, 'utf-8');
    if (hasHostEntry(hostsContent, hostname)) {
      console.log(`Hosts entry already exists for ${hostname}.`);
    } else {
      const updated = `${hostsContent.trimEnd()}\n127.0.0.1 ${hostname}\n`;
      console.log(`Adding hosts entry for ${hostname} (sudo required)...`);
      await writeFileWithSudo(hostsPath, updated);
    }
  }

  if (!args.skipRestart) {
    console.log(`\nRestarting nginx with: ${restartCommand} (sudo required)...`);
    await runShellCommand(`sudo ${restartCommand}`);
  }

  console.log('\n✅ Nginx setup complete.');
}
