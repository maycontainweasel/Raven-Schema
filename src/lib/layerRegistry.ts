import path from 'path';
import { mkdir, readFile, stat, writeFile, readdir } from 'fs/promises';
import YAML from 'yaml';

export interface LayerMeta {
  name: string;
  version: string;
  description?: string;
  tags?: string[];
}

export async function readLayerMeta(
  projectRoot: string,
  layerName: string,
  options?: { autoCreate?: boolean }
): Promise<LayerMeta> {
  const layerDir = path.resolve(projectRoot, 'layers', layerName);
  const metaPath = await resolveLayerMetaPath(layerDir);
  const exists = metaPath ? await stat(metaPath).catch(() => null) : null;
  if (exists?.isFile()) {
    const raw = await readFile(metaPath, 'utf-8');
    const parsed = YAML.parse(raw) as Partial<LayerMeta> | null;
    if (parsed && typeof parsed === 'object') {
      return {
        name: String(parsed.name ?? layerName),
        version: String(parsed.version ?? '0.0.0'),
        description: parsed.description ? String(parsed.description) : undefined,
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((tag) => String(tag)) : undefined,
      };
    }
  }

  const fallback: LayerMeta = {
    name: layerName,
    version: '0.0.0',
  };

  if (options?.autoCreate) {
    const targetPath = path.join(layerDir, 'layer.yaml');
    await mkdir(layerDir, { recursive: true });
    await writeFile(targetPath, YAML.stringify(fallback), 'utf-8');
  }

  return fallback;
}

export async function listLayerMetas(
  projectRoot: string,
  options?: { autoCreate?: boolean }
): Promise<LayerMeta[]> {
  const layersRoot = path.resolve(projectRoot, 'layers');
  const entries = await readdir(layersRoot, { withFileTypes: true }).catch(() => []);
  const metas: LayerMeta[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    metas.push(await readLayerMeta(projectRoot, name, options));
  }
  return metas;
}

async function resolveLayerMetaPath(layerDir: string): Promise<string | null> {
  const yamlPath = path.join(layerDir, 'layer.yaml');
  const ymlPath = path.join(layerDir, 'layer.yml');
  const yamlStat = await stat(yamlPath).catch(() => null);
  if (yamlStat?.isFile()) return yamlPath;
  const ymlStat = await stat(ymlPath).catch(() => null);
  if (ymlStat?.isFile()) return ymlPath;
  return null;
}
