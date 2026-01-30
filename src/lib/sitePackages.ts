import path from 'path';
import { readFile, stat } from 'fs/promises';
import YAML from 'yaml';

interface SiteSpec {
  name: string;
  slug: string;
  template: string;
  target: string;
  layers?: string[];
  packages?: PackageBlock;
}

export interface PackageBlock {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface LayerPackageConfig extends PackageBlock {}

export async function loadSiteSpec(
  projectRoot: string,
  name: string,
  specPath?: string
): Promise<{ specPath: string; spec: SiteSpec }> {
  const sitesRoot = path.resolve(projectRoot, 'sites');
  let resolved = specPath
    ? resolveSpecPath(specPath, projectRoot, sitesRoot)
    : path.resolve(sitesRoot, `${name}.yaml`);
  const exists = await stat(resolved).catch(() => null);
  if (!exists?.isFile()) {
    throw new Error(`Site spec not found: ${resolved}`);
  }
  const content = await readFile(resolved, 'utf-8');
  const parsed = YAML.parse(content) as Partial<SiteSpec>;
  if (!parsed?.name || !parsed.slug || !parsed.template || !parsed.target) {
    throw new Error(`Invalid site spec: ${resolved}`);
  }
  return {
    specPath: resolved,
    spec: {
      name: String(parsed.name),
      slug: String(parsed.slug),
      template: String(parsed.template),
      target: String(parsed.target),
      layers: Array.isArray(parsed.layers)
        ? parsed.layers.map((entry) => String(entry).trim()).filter(Boolean)
        : undefined,
      packages: normalizePackages(parsed.packages),
    },
  };
}

export async function loadSitePackages(
  projectRoot: string,
  spec: SiteSpec
): Promise<PackageBlock> {
  const fromSpec = normalizePackages(spec.packages);
  const sidecar = await readSidecarPackages(projectRoot, spec.slug);
  return mergePackages(fromSpec, sidecar);
}

export async function loadLayerPackages(
  projectRoot: string,
  layers: string[] | undefined
): Promise<PackageBlock[]> {
  if (!layers || layers.length === 0) return [];
  const results: PackageBlock[] = [];
  for (const layer of layers) {
    const filePath = path.resolve(projectRoot, 'layers', layer, 'packages.yaml');
    const exists = await stat(filePath).catch(() => null);
    if (!exists?.isFile()) continue;
    const raw = await readFile(filePath, 'utf-8');
    const parsed = YAML.parse(raw) as LayerPackageConfig | null;
    results.push(normalizePackages(parsed));
  }
  return results;
}

export function mergePackages(...blocks: Array<PackageBlock | null | undefined>): PackageBlock {
  const merged: PackageBlock = { dependencies: {}, devDependencies: {} };
  for (const block of blocks) {
    if (!block) continue;
    if (block.dependencies) {
      merged.dependencies = { ...(merged.dependencies ?? {}), ...block.dependencies };
    }
    if (block.devDependencies) {
      merged.devDependencies = { ...(merged.devDependencies ?? {}), ...block.devDependencies };
    }
  }
  if (merged.dependencies && Object.keys(merged.dependencies).length === 0) {
    delete merged.dependencies;
  }
  if (merged.devDependencies && Object.keys(merged.devDependencies).length === 0) {
    delete merged.devDependencies;
  }
  return merged;
}

export function normalizePackages(input: unknown): PackageBlock {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const block = input as PackageBlock;
  return {
    dependencies: normalizeMap(block.dependencies),
    devDependencies: normalizeMap(block.devDependencies),
  };
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

async function readSidecarPackages(projectRoot: string, slug: string): Promise<PackageBlock> {
  const sidecarPath = path.resolve(projectRoot, 'sites', `${slug}.packages.yaml`);
  const exists = await stat(sidecarPath).catch(() => null);
  if (!exists?.isFile()) return {};
  const raw = await readFile(sidecarPath, 'utf-8');
  const parsed = YAML.parse(raw) as PackageBlock | null;
  return normalizePackages(parsed);
}

function resolveSpecPath(specPath: string, projectRoot: string, sitesRoot: string): string {
  if (path.isAbsolute(specPath)) return specPath;
  const normalized = specPath.replace(/^[./]+/, '');
  const hasSeparator = normalized.includes(path.sep);
  if (hasSeparator) {
    return path.resolve(projectRoot, normalized);
  }
  return path.resolve(sitesRoot, normalized);
}
