// https://nuxt.com/docs/api/configuration/nuxt-config
import generated from './nuxt.config.generated';
import runtime from './nuxt.config.runtime';
import additions from './nuxt.config.additions';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeConfig(base: unknown, override: unknown, path: string[] = []): unknown {
  if (override === undefined) return base;
  if (Array.isArray(base) || Array.isArray(override)) {
    const baseArr = Array.isArray(base) ? base : [];
    const overrideArr = Array.isArray(override) ? override : [];
    if (shouldConcatArray(path)) {
      const merged = [...baseArr, ...overrideArr];
      if (merged.every((item) => typeof item === 'string')) {
        return Array.from(new Set(merged));
      }
      return merged;
    }
    return overrideArr;
  }
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      out[key] = mergeConfig(out[key], value, [...path, key]);
    }
    return out;
  }
  return override;
}

function shouldConcatArray(path: string[]): boolean {
  const joined = path.join('.');
  return joined === 'modules' || joined === 'css' || joined === 'build.transpile';
}

const overrides = {
  nitro: {
    preset: 'node-server',
  },
};

export default defineNuxtConfig(
  mergeConfig(mergeConfig(mergeConfig(generated, runtime), additions), overrides)
);
