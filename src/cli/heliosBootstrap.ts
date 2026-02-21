import path from 'path';
import { mkdir, readFile, stat, writeFile } from 'fs/promises';

export interface HeliosAppScaffoldResult {
  appShellCreated: boolean;
  appShellUpdated: boolean;
  rootRedirectCreated: boolean;
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

export async function ensureHeliosAppScaffold(appRoot: string): Promise<HeliosAppScaffoldResult> {
  const appDir = path.join(appRoot, 'app');
  const appVuePath = path.join(appDir, 'app.vue');
  const indexRoutePath = path.join(appDir, 'pages/index.vue');

  await mkdir(appDir, { recursive: true });

  const appShell = await ensureAppShell(appVuePath);
  const rootRedirectCreated = await ensureRootRedirect(indexRoutePath);

  return {
    appShellCreated: appShell.created,
    appShellUpdated: appShell.updated,
    rootRedirectCreated,
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
