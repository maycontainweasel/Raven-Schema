import path from 'path';
import { readFile, stat, mkdir, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
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

interface Pm2Process {
  name?: string;
  pm2_env?: {
    name?: string;
    pm_out_log_path?: string;
    pm_err_log_path?: string;
  };
}

const execFileAsync = promisify(execFile);

export async function runSitePm2Logs(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  host?: string;
  user?: string;
  pm2Name?: string;
  lines?: number;
  out?: boolean;
  err?: boolean;
  dir?: string;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const sitesRoot = path.resolve(projectRoot, 'sites');
  const spec = await loadSiteSpec(options, sitesRoot, projectRoot);
  if (!spec) {
    throw new Error('Site spec not found. Provide a name or --spec.');
  }

  const deploy = spec.deploy ?? {};
  const host = options.host ?? (deploy as any).host;
  if (!host) {
    throw new Error('SSH host is required (set deploy.host or pass --host).');
  }
  const user = options.user ?? (deploy as any).user ?? null;
  const pm2Name = options.pm2Name ?? (deploy as any).pm2Name ?? (deploy as any).remoteName ?? spec.slug;
  const pm2Command = String((deploy as any).pm2Command ?? 'pm2');
  const sshTarget = user ? `${user}@${host}` : host;

  let jlistRaw = '';
  try {
    jlistRaw = await runSshCapture(sshTarget, buildPm2Command(pm2Command, 'jlist'));
  } catch (error) {
    throw new Error(`Failed to run pm2 jlist on ${sshTarget}.`);
  }

  let list: Pm2Process[] = [];
  try {
    const trimmed = jlistRaw.trim();
    const start = trimmed.indexOf('[');
    const end = trimmed.lastIndexOf(']');
    const jsonPayload = start >= 0 && end >= start ? trimmed.slice(start, end + 1) : trimmed;
    list = JSON.parse(jsonPayload) as Pm2Process[];
  } catch {
    throw new Error('Failed to parse pm2 jlist output. Ensure pm2 is available on the remote host.');
  }

  const proc = list.find((entry) => entry?.name === pm2Name || entry?.pm2_env?.name === pm2Name);
  if (!proc) {
    const names = list.map((entry) => entry?.name).filter(Boolean).join(', ');
    throw new Error(`PM2 process "${pm2Name}" not found. Available: ${names || 'none'}.`);
  }

  const outPath = proc.pm2_env?.pm_out_log_path ?? '';
  const errPath = proc.pm2_env?.pm_err_log_path ?? '';
  if (!outPath && !errPath) {
    throw new Error(`PM2 process "${pm2Name}" did not report log paths.`);
  }

  const wantOut = options.out === true || (!options.out && !options.err);
  const wantErr = options.err === true || (!options.out && !options.err);
  const lines = Number.isFinite(options.lines) ? Number(options.lines) : 200;
  const outputDir = resolveOutputDir(projectRoot, spec.slug, options.dir);
  await ensureLocalDir(outputDir);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  if (wantOut && outPath) {
    const content = await fetchRemoteLog(sshTarget, outPath, lines);
    const localPath = path.join(outputDir, `${stamp}-${pm2Name}-out.log`);
    await writeFile(localPath, content, 'utf-8');
    console.log(`✅ Saved out log → ${localPath}`);
  }

  if (wantErr && errPath) {
    const content = await fetchRemoteLog(sshTarget, errPath, lines);
    const localPath = path.join(outputDir, `${stamp}-${pm2Name}-error.log`);
    await writeFile(localPath, content, 'utf-8');
    console.log(`✅ Saved error log → ${localPath}`);
  }
}

async function fetchRemoteLog(target: string, logPath: string, lines: number): Promise<string> {
  const safePath = shellEscapePath(logPath);
  const cmd = lines > 0 ? `tail -n ${lines} ${safePath}` : `cat ${safePath}`;
  return runSshCapture(target, cmd);
}

function resolveOutputDir(projectRoot: string, slug: string, dir?: string): string {
  if (dir) {
    return path.isAbsolute(dir) ? dir : path.resolve(projectRoot, dir);
  }
  return path.resolve(projectRoot, '.deploy', 'logs', slug);
}

async function ensureLocalDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
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

async function runSshCapture(target: string, command: string): Promise<string> {
  const { stdout } = await execFileAsync('ssh', [target, buildRemoteCommand(command)], {
    encoding: 'utf-8',
  });
  return stdout;
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

function isPathLikeCommand(command: string): boolean {
  return /[\\/]/.test(command.trim());
}
