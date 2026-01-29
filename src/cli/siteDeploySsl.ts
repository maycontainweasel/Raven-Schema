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
  deploy?: Record<string, unknown>;
}

interface DeploySslAnswers {
  host: string;
  user: string | null;
  domain: string;
  email: string;
  redirect: boolean;
  staging: boolean;
  nginxSitesEnabled: string;
  restartCommand: string;
}

const execFileAsync = promisify(execFile);

export async function runSiteDeploySsl(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  host?: string;
  user?: string;
  domain?: string;
  email?: string;
  redirect?: boolean;
  staging?: boolean;
  yes?: boolean;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const sitesRoot = path.resolve(projectRoot, 'sites');

  const spec = await loadSiteSpec(options, sitesRoot, projectRoot);
  const slug = spec?.slug ?? toKebabCase(options.name ?? '');

  const defaults = deriveDefaults(spec, slug);
  const answers = await collectAnswers(options, defaults);

  const sshTarget = answers.user ? `${answers.user}@${answers.host}` : answers.host;
  const nginxPath = path.posix.join(answers.nginxSitesEnabled, answers.domain);

  const nginxExists = await remoteFileExists(sshTarget, nginxPath);
  if (!nginxExists) {
    throw new Error(`Nginx config not found at ${nginxPath}. Run site:deploy:setup first.`);
  }

  const certbotAvailable = await remoteCommandExists(sshTarget, 'certbot');
  if (!certbotAvailable) {
    throw new Error('certbot is not installed on the remote host.');
  }

  const certbotArgs = buildCertbotArgs(answers.domain, answers.email, answers.redirect, answers.staging);

  console.log('🔐 Requesting SSL certificate via certbot...');
  await runSsh(sshTarget, `sudo certbot ${certbotArgs}`);

  console.log('🔧 Testing nginx config...');
  await runSsh(sshTarget, 'sudo nginx -t');
  await runSsh(sshTarget, `sudo ${answers.restartCommand}`);

  console.log('✅ SSL setup complete.');
  console.log(`🌐 URL: https://${answers.domain}`);
}

function buildCertbotArgs(domain: string, email: string, redirect: boolean, staging: boolean): string {
  const args = [
    '--nginx',
    `-d ${shellEscapePath(domain)}`,
    `-m ${shellEscapePath(email)}`,
    '--agree-tos',
    '--non-interactive',
    '--no-eff-email',
  ];
  if (redirect) {
    args.push('--redirect');
  } else {
    args.push('--no-redirect');
  }
  if (staging) {
    args.push('--staging');
  }
  return args.join(' ');
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

function deriveDefaults(spec: SiteSpec | null, slug: string): DeploySslAnswers {
  const deploy = spec?.deploy ?? {};
  const ssl = (deploy as any).ssl ?? {};
  const host = (deploy as any).host ?? '';
  const user = (deploy as any).user ?? null;
  const domain = (deploy as any).domain ?? `${slug || 'site'}.mpire.live`;
  const email = ssl.email ?? '';
  const redirect = ssl.redirect ?? false;
  const staging = ssl.staging ?? false;
  const nginxSitesEnabled = (deploy as any).nginxSitesEnabled ?? '/etc/nginx/sites-enabled';
  const restartCommand = (deploy as any).restartCommand ?? 'systemctl reload nginx';
  return {
    host,
    user,
    domain,
    email,
    redirect: Boolean(redirect),
    staging: Boolean(staging),
    nginxSitesEnabled,
    restartCommand,
  };
}

async function collectAnswers(
  options: {
    host?: string;
    user?: string;
    domain?: string;
    email?: string;
    redirect?: boolean;
    staging?: boolean;
    yes?: boolean;
  },
  defaults: DeploySslAnswers
): Promise<DeploySslAnswers> {
  if (options.yes || !process.stdin.isTTY) {
    const host = options.host ?? defaults.host;
    const domain = options.domain ?? defaults.domain;
    const email = options.email ?? defaults.email;
    if (!host || !domain || !email) {
      throw new Error('host, domain, and email are required for SSL setup.');
    }
    return {
      ...defaults,
      host,
      user: options.user ?? defaults.user,
      domain,
      email,
      redirect: options.redirect ?? defaults.redirect,
      staging: options.staging ?? defaults.staging,
    };
  }

  const host = options.host ?? (await promptRequiredInput('SSH host', defaults.host));
  const user = options.user ?? ((await promptInput(`SSH user (${defaults.user ?? 'current'})`)) || defaults.user);
  const domain = options.domain ?? (await promptRequiredInput('Domain', defaults.domain));
  const email = options.email ?? (await promptRequiredInput('Email', defaults.email));
  const redirect = options.redirect ?? (await promptYesNo('Redirect HTTP to HTTPS?', defaults.redirect));
  const staging = options.staging ?? (await promptYesNo('Use Let’s Encrypt staging?', defaults.staging));

  return {
    ...defaults,
    host,
    user: user || null,
    domain,
    email,
    redirect,
    staging,
  };
}

async function remoteFileExists(target: string, remotePath: string): Promise<boolean> {
  const cmd = `test -f ${shellEscapePath(remotePath)} && echo yes || echo no`;
  const output = await runSshCapture(target, cmd);
  return output.trim() === 'yes';
}

async function remoteCommandExists(target: string, command: string): Promise<boolean> {
  const cmd = `command -v ${command} >/dev/null 2>&1 && echo yes || echo no`;
  const output = await runSshCapture(target, cmd);
  return output.trim() === 'yes';
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

function shellEscapePath(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function buildRemoteCommand(command: string): string {
  const escaped = command.replace(/(["\\$`])/g, '\\$1');
  return `bash -lc "${escaped}"`;
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
