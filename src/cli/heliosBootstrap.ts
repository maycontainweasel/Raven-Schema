import path from 'path';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';

export interface HeliosAppScaffoldResult {
  appShellCreated: boolean;
  appShellUpdated: boolean;
  rootRedirectCreated: boolean;
  baselineFilesCreated: string[];
}

const APP_SHELL_TEMPLATE = `<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
`;

const ROOT_REDIRECT_TEMPLATE = `<script setup lang="ts">
await navigateTo('/helios', { redirectCode: 302 });
</script>
`;

const HELIOS_BASELINE_FILES: Array<{ path: string; content: string }> = [
  {
    path: 'app/helios/fragments/setup.json',
    content: JSON.stringify(
      {
        attributify: true,
        icons: true,
        iconCollection: 'lucide',
        variantGroup: true,
      },
      null,
      2
    ),
  },
  {
    path: 'app/helios/fragments/type.json',
    content: JSON.stringify(
      {
        version: 2,
        config: {
          baseFontPx: 16,
          typeRatio: 1.2,
          gridRatio: 1.4,
          spaceRatio: 1.25,
          minStep: -2,
          maxStep: 6,
          step: 0.25,
          brandColor: '#2858ff',
        },
      },
      null,
      2
    ),
  },
  {
    path: 'app/helios/fragments/colors.json',
    content: JSON.stringify(
      {
        version: 1,
        palettes: [],
      },
      null,
      2
    ),
  },
  {
    path: 'app/helios/fragments/theme.json',
    content: JSON.stringify(
      {
        activeThemeId: 'default',
        themes: [
          {
            id: 'default',
            label: 'Default',
            enabled: true,
            tokens: {
              bg: {
                canvas: '#ffffff',
                surface: 'palette:slate:50',
                surfaceAlt: 'palette:slate:100',
                primary: 'palette:blue:600',
                secondary: 'palette:indigo:600',
                success: 'palette:green:600',
                warning: 'palette:amber:500',
                danger: 'palette:red:600',
              },
              text: {
                primary: 'palette:slate:900',
                secondary: 'palette:slate:700',
                muted: 'palette:slate:500',
                inverse: '#ffffff',
                onPrimary: '#ffffff',
                onSurface: 'palette:slate:900',
              },
              border: {
                default: 'palette:slate:200',
                muted: 'palette:slate:100',
                strong: 'palette:slate:300',
                primary: 'palette:blue:600',
              },
            },
          },
        ],
      },
      null,
      2
    ),
  },
  {
    path: 'app/helios/generated/type.settings.json',
    content: JSON.stringify(
      {
        version: 2,
        savedAt: new Date().toISOString(),
        config: {
          baseFontPx: 16,
          typeRatio: 1.2,
          gridRatio: 1.4,
          spaceRatio: 1.25,
          minStep: -2,
          maxStep: 6,
          step: 0.25,
          brandColor: '#2858ff',
        },
      },
      null,
      2
    ),
  },
  {
    path: 'app/helios/generated/colors.settings.json',
    content: JSON.stringify(
      {
        version: 1,
        savedAt: new Date().toISOString(),
        palettes: [],
      },
      null,
      2
    ),
  },
  {
    path: 'app/helios/generated/theme.settings.json',
    content: JSON.stringify(
      {
        version: 1,
        savedAt: new Date().toISOString(),
        activeThemeId: 'default',
        themes: [],
      },
      null,
      2
    ),
  },
  {
    path: 'app/helios/generated/uno.generated.ts',
    content: [
      "import { defineConfig } from 'unocss'",
      '',
      'export default defineConfig({',
      '  theme: {',
      '    colors: {',
      "      heliosbrand: '#2858ff',",
      "      brand: 'var(--ds-brand, #2858ff)',",
      "      ink: 'var(--ds-text, #0f172a)',",
      '    },',
      '  },',
      '})',
      '',
    ].join('\n'),
  },
  {
    path: 'app/helios/scss/_tokens.scss',
    content: ':root {\n  --bf: 16;\n  --tr: 1.2;\n  --gr: 1.4;\n  --sr: 1.25;\n  --ds-brand: #2858ff;\n}\n',
  },
  {
    path: 'app/helios/scss/_type.scss',
    content: 'p, li { font-size: var(--fs-0, 1rem); line-height: var(--lh-0, 1.4rem); }\n',
  },
  {
    path: 'app/helios/scss/_colors.scss',
    content: ':root {}\n',
  },
  {
    path: 'app/helios/scss/_semantic.scss',
    content: ':root {}\n',
  },
  {
    path: 'app/helios/scss/index.scss',
    content: '@use "tokens";\n@use "type";\n@use "colors";\n@use "semantic";\n',
  },
];

export async function ensureHeliosAppScaffold(appRoot: string): Promise<HeliosAppScaffoldResult> {
  const appDir = path.join(appRoot, 'app');
  const appVuePath = path.join(appDir, 'app.vue');
  const indexRoutePath = path.join(appDir, 'pages/index.vue');

  await mkdir(appDir, { recursive: true });

  const appShell = await ensureAppShell(appVuePath);
  const rootRedirectCreated = await ensureRootRedirect(indexRoutePath);
  const baselineFilesCreated = await ensureHeliosBaselineFiles(appRoot);

  return {
    appShellCreated: appShell.created,
    appShellUpdated: appShell.updated,
    rootRedirectCreated,
    baselineFilesCreated,
  };
}

async function ensureAppShell(filePath: string): Promise<{ created: boolean; updated: boolean }> {
  const existing = await stat(filePath).catch(() => null);
  if (!existing?.isFile()) {
    await writeFile(filePath, APP_SHELL_TEMPLATE, 'utf-8');
    return { created: true, updated: false };
  }

  const current = await readFile(filePath, 'utf-8');
  if (current.includes('<NuxtPage')) {
    return { created: false, updated: false };
  }
  if (current.includes('NuxtWelcome')) {
    await writeFile(filePath, APP_SHELL_TEMPLATE, 'utf-8');
    return { created: false, updated: true };
  }

  return { created: false, updated: false };
}

async function ensureRootRedirect(filePath: string): Promise<boolean> {
  const existing = await stat(filePath).catch(() => null);
  if (existing?.isFile()) return false;

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, ROOT_REDIRECT_TEMPLATE, 'utf-8');
  return true;
}

async function ensureHeliosBaselineFiles(appRoot: string): Promise<string[]> {
  const created: string[] = [];
  for (const entry of HELIOS_BASELINE_FILES) {
    const absPath = path.join(appRoot, entry.path);
    const existing = await stat(absPath).catch(() => null);
    if (existing?.isFile()) continue;
    await mkdir(path.dirname(absPath), { recursive: true });
    await writeFile(absPath, entry.content, 'utf-8');
    created.push(entry.path);
  }
  return created;
}
