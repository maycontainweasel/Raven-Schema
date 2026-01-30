import path from 'path';
import { readFile, writeFile, stat } from 'fs/promises';
import YAML from 'yaml';
import { spawn } from 'child_process';

import { toKebabCase } from './util';
import { loadSiteSpec } from '../lib/sitePackages';
import { runSitePkgSync } from './sitePkgSync';

interface PackageBlock {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export async function runSitePkgAdd(options: {
  projectRoot: string;
  name?: string;
  specPath?: string;
  appPath?: string;
  packages: string[];
  dev?: boolean;
  noInstall?: boolean;
}): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');
  const slug = options.name ? toKebabCase(options.name) : '';

  const { spec, specPath } = await loadSiteSpec(projectRoot, slug, options.specPath);
  const appRoot = options.appPath
    ? (path.isAbsolute(options.appPath) ? options.appPath : path.resolve(repoRoot, options.appPath))
    : (path.isAbsolute(spec.target) ? spec.target : path.resolve(repoRoot, spec.target));

  const pkgBlock = await readSitePackagesBlock(specPath, spec);
  const bucket = options.dev ? 'devDependencies' : 'dependencies';
  pkgBlock[bucket] = pkgBlock[bucket] ?? {};

  for (const entry of options.packages) {
    if (!entry) continue;
    const { name, version } = parsePackage(entry);
    if (!name) continue;
    pkgBlock[bucket]![name] = version ? `^${version}` : 'latest';
  }

  await writeSitePackagesBlock(specPath, pkgBlock);
  await runSitePkgSync({ projectRoot, name: slug, appPath: appRoot });

  if (!options.noInstall) {
    await runLocalCommand(
      `pnpm -C ${shellEscapePath(repoRoot)} --filter ${slug} install`,
      repoRoot
    );
  }

  console.log(`✅ Packages added to ${slug}`);
}

function parsePackage(value: string): { name: string; version?: string } {
  if (value.startsWith('@')) {
    const match = value.match(/^(@[^@]+\/[^@]+)(?:@(.+))?$/);
    if (!match) return { name: value };
    return { name: match[1], version: match[2] };
  }
  const idx = value.lastIndexOf('@');
  if (idx > 0) {
    return { name: value.slice(0, idx), version: value.slice(idx + 1) };
  }
  return { name: value };
}

async function readSitePackagesBlock(specPath: string, spec: any): Promise<PackageBlock> {
  const raw = await readFile(specPath, 'utf-8');
  const parsed = YAML.parse(raw) as any;
  const packages = parsed?.packages ?? {};
  return {
    dependencies: normalizeMap(packages.dependencies),
    devDependencies: normalizeMap(packages.devDependencies),
  };
}

async function writeSitePackagesBlock(specPath: string, block: PackageBlock): Promise<void> {
  const raw = await readFile(specPath, 'utf-8');
  const parsed = YAML.parse(raw) as any;
  parsed.packages = {
    ...(parsed.packages ?? {}),
    dependencies: block.dependencies ?? parsed.packages?.dependencies,
    devDependencies: block.devDependencies ?? parsed.packages?.devDependencies,
  };
  await writeFile(specPath, YAML.stringify(parsed), 'utf-8');
}

function normalizeMap(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (!key) continue;
    out[key] = String(val);
  }
  return out;
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

function shellEscapePath(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}
