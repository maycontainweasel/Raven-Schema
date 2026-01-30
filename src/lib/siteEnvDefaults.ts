import path from 'path';
import { readFile, stat } from 'fs/promises';
import YAML from 'yaml';

export async function loadLayerEnvDefaults(
  projectRoot: string,
  layers: string[] | undefined
): Promise<Record<string, unknown>> {
  if (!layers || layers.length === 0) return {};
  const merged: Record<string, unknown> = {};
  for (const layer of layers) {
    const filePath = path.resolve(projectRoot, 'layers', layer, 'env.yaml');
    const exists = await stat(filePath).catch(() => null);
    if (!exists?.isFile()) continue;
    const raw = await readFile(filePath, 'utf-8');
    const parsed = YAML.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!key) continue;
      merged[key] = value;
    }
  }
  return merged;
}

export function mergeEnvDefaults(
  current: Record<string, unknown>,
  defaults: Record<string, unknown>
): { merged: Record<string, unknown>; added: string[] } {
  const merged: Record<string, unknown> = { ...current };
  const added: string[] = [];
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in merged)) {
      merged[key] = value ?? '';
      added.push(key);
    }
  }
  return { merged, added };
}
