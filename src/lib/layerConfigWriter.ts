import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import type { AppConfig, AuthLayerConfig } from '../types';

const defaultAuthLayer: Required<AuthLayerConfig> = {
  runtimeConfig: {
    sessionCookie: 'sid',
    sessionSecret: '',
    cookieDomain: '',
    sessionDuration: 7 * 24 * 60 * 60,
    refreshInterval: 12 * 60 * 1000,
    appPaths: ['/', '/dashboard/', '/dashboard'],
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
      legacyCookieNames: [
        'token',
        'sessionId',
        'refreshToken',
        'surreal_access',
        'surreal_refresh',
      ],
    },
    redirectOnFail: '/login',
    redirectOnSuccess: '/dashboard',
    guard: {
      enabled: true,
      refresh: true,
      protect: ['*'],
      ignorePaths: ['/login', '/register'],
      redirectOnFail: '/login',
      redirectOnSuccess: '/dashboard',
      redirectOnLogout: '/',
      testPageEnabled: false,
      redirectAliases: {},
    },
  },
  publicRuntimeConfig: {
    sessionCookie: 'sid',
    cookieDomain: '',
  },
};

const normalizeAuthLayer = (config?: AuthLayerConfig): AuthLayerConfig => {
  const runtime = config?.runtimeConfig ?? {};
  const cookie = runtime.cookie ?? {};
  const guard = runtime.guard ?? {};
  const normalizedRuntime = {
    ...defaultAuthLayer.runtimeConfig,
    ...runtime,
    cookie: {
      ...defaultAuthLayer.runtimeConfig.cookie,
      ...cookie,
    },
    guard: {
      ...(defaultAuthLayer.runtimeConfig.guard ?? {}),
      ...guard,
    },
  };
  const publicRuntime = {
    ...defaultAuthLayer.publicRuntimeConfig,
    ...(config?.publicRuntimeConfig ?? {}),
  };
  return {
    runtimeConfig: normalizedRuntime,
    publicRuntimeConfig: publicRuntime,
  };
};

const renderAuthLayerConfig = (config: AuthLayerConfig): string => {
  const runtime = config.runtimeConfig ?? defaultAuthLayer.runtimeConfig;
  const publicRuntime = config.publicRuntimeConfig ?? defaultAuthLayer.publicRuntimeConfig;
  const payload = {
    runtimeConfig: {
      sessionSecret: runtime.sessionSecret ?? '',
      cookieDomain: runtime.cookieDomain ?? '',
      sessionCookie: runtime.sessionCookie ?? '',
      auth: runtime,
      public: {
        sessionCookie: publicRuntime.sessionCookie ?? runtime.sessionCookie ?? '',
        cookieDomain: publicRuntime.cookieDomain ?? runtime.cookieDomain ?? '',
        auth: publicRuntime,
      },
    },
  };

  return `export default defineNuxtConfig(${JSON.stringify(payload, null, 2)})\n`;
};

export async function writeAuthLayerConfig(options: {
  projectRoot: string;
  app: AppConfig;
}): Promise<void> {
  const { projectRoot, app } = options;
  const layersConfig = app.layers;
  if (!layersConfig) return;

  const sourceRoot = path.resolve(projectRoot, layersConfig.source ?? 'layers');
  const authLayerRoot = path.join(sourceRoot, 'auth');
  await mkdir(authLayerRoot, { recursive: true });

  const normalized = normalizeAuthLayer(layersConfig.auth);
  const outputPath = path.join(authLayerRoot, 'nuxt.config.ts');
  const content = renderAuthLayerConfig(normalized);
  await writeFile(outputPath, content, 'utf-8');
}
