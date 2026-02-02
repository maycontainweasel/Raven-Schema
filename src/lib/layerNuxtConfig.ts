import path from 'path';
import { readFile, stat } from 'fs/promises';
import YAML from 'yaml';

export type LayerNuxtDefaults = {
  modules: string[];
  config: Record<string, unknown>;
  perLayerModules: Record<string, string[]>;
};

export async function collectLayerNuxtDefaults(
  projectRoot: string,
  layers: string[] | undefined
): Promise<LayerNuxtDefaults> {
  const orderedLayers = Array.isArray(layers)
    ? layers.map((layer) => String(layer).trim()).filter(Boolean)
    : [];
  const perLayerModules: Record<string, string[]> = {};
  let mergedConfig: Record<string, unknown> = {};
  const mergedModules: string[] = [];
  const seenModules = new Set<string>();

  for (const layer of orderedLayers) {
    const { modules, config } = await loadLayerNuxtConfig(projectRoot, layer);
    if (modules.length > 0) {
      perLayerModules[layer] = modules;
      for (const mod of modules) {
        if (!seenModules.has(mod)) {
          seenModules.add(mod);
          mergedModules.push(mod);
        }
      }
    }
    mergedConfig = mergeDefaults(mergedConfig, config);
  }

  return { modules: mergedModules, config: mergedConfig, perLayerModules };
}

export function mergeDefaults(
  current: Record<string, unknown>,
  defaults: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(defaults)) {
    if (!(key in out)) {
      out[key] = value;
      continue;
    }
    const existing = out[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      out[key] = mergeDefaults(existing as Record<string, unknown>, value as Record<string, unknown>);
    }
  }
  return out;
}

export function mergeModuleList(
  current: unknown,
  required: string[]
): string[] {
  const list = Array.isArray(current)
    ? current.filter((item) => typeof item === 'string') as string[]
    : [];
  const seen = new Set(list);
  for (const mod of required) {
    if (!seen.has(mod)) {
      list.push(mod);
      seen.add(mod);
    }
  }
  return list;
}

export function removeModuleList(
  current: unknown,
  removed: string[],
  required: string[]
): string[] {
  const list = Array.isArray(current)
    ? current.filter((item) => typeof item === 'string') as string[]
    : [];
  const removeSet = new Set(removed);
  const requiredSet = new Set(required);
  return list.filter((mod) => !removeSet.has(mod) || requiredSet.has(mod));
}

function normalizeModules(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

async function loadLayerNuxtConfig(
  projectRoot: string,
  layer: string
): Promise<{ modules: string[]; config: Record<string, unknown> }> {
  const layerDir = path.resolve(projectRoot, 'layers', layer);
  const yamlPath = path.join(layerDir, 'layer.yaml');
  const ymlPath = path.join(layerDir, 'layer.yml');
  const filePath = (await stat(yamlPath).catch(() => null))?.isFile()
    ? yamlPath
    : (await stat(ymlPath).catch(() => null))?.isFile()
      ? ymlPath
      : null;
  if (!filePath) {
    return { modules: [], config: {} };
  }

  const raw = await readFile(filePath, 'utf-8');
  const parsed = YAML.parse(raw) as Record<string, unknown> | null;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { modules: [], config: {} };
  }

  const layerModules = normalizeModules(parsed.modules);
  const nuxtConfigRaw = parsed.nuxtConfig;
  const nuxtConfig = isPlainObject(nuxtConfigRaw)
    ? { ...(nuxtConfigRaw as Record<string, unknown>) }
    : {};
  const nuxtModules = normalizeModules(nuxtConfig.modules);
  const combinedModules = mergeModuleList(layerModules, nuxtModules);
  if (combinedModules.length > 0) {
    delete nuxtConfig.modules;
  }

  return { modules: combinedModules, config: nuxtConfig };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
