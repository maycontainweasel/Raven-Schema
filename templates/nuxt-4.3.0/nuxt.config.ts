// https://nuxt.com/docs/api/configuration/nuxt-config
import generated from './nuxt.config.generated';
import runtime from './nuxt.config.runtime';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeConfig(base: unknown, override: unknown): unknown {
  if (override === undefined) return base;
  if (Array.isArray(base) || Array.isArray(override)) {
    return override;
  }
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      out[key] = mergeConfig(out[key], value);
    }
    return out;
  }
  return override;
}

const overrides = {
  nitro: {
    preset: 'node-server',
  },
};

export default defineNuxtConfig(mergeConfig(mergeConfig(generated, runtime), overrides));
