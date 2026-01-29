import path from 'path';
import { mkdir, writeFile, access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { resolveRepoRoot } from '../../utils/ui-builder/paths';

const templateMap: Record<string, (name: string) => string> = {
  'directory-cell': (name: string) => `\n<script setup lang="ts">\nconst props = defineProps<{\n  value: any\n  record?: Record<string, any>\n  column?: string\n}>()\n</script>\n\n<template>\n  <span>{{ props.value ?? '—' }}</span>\n</template>\n`,
  'directory-part': (name: string) => `\n<script setup lang="ts">\nconst props = defineProps<any>()\n</script>\n\n<template>\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <p class=\"text-sm text-muted\">Override for directory ${name}.</p>\n    </div>\n  </div>\n</template>\n`,
  page: (name: string) => `\n<script setup lang="ts">\nconst props = defineProps<{\n  model: string\n  record?: Record<string, any> | null\n  tab?: any\n}>()\n\nconst emit = defineEmits(['save'])\n</script>\n\n<template>\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h3 class=\"text-lg font-semibold\">Override page: ${name}</h3>\n      <p class=\"text-sm text-muted\">Replace this content with a custom layout.</p>\n    </div>\n  </div>\n</template>\n`,
  row: (name: string) => `\n<script setup lang="ts">\nconst props = defineProps<{\n  model: string\n  row: any\n  record?: Record<string, any> | null\n}>()\n\nconst emit = defineEmits(['save'])\n</script>\n\n<template>\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h3 class=\"text-sm font-semibold\">Override row: ${name}</h3>\n      <p class=\"text-sm text-muted\">Custom row override.</p>\n    </div>\n  </div>\n</template>\n`,
  column: (name: string) => `\n<script setup lang="ts">\nconst props = defineProps<{\n  model: string\n  column: any\n  record?: Record<string, any> | null\n}>()\n\nconst emit = defineEmits(['save'])\n</script>\n\n<template>\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h3 class=\"text-sm font-semibold\">Override column: ${name}</h3>\n      <p class=\"text-sm text-muted\">Custom column override.</p>\n    </div>\n  </div>\n</template>\n`,
  card: (name: string) => `\n<script setup lang="ts">\nconst props = defineProps<{\n  model: string\n  widget: any\n  record?: Record<string, any> | null\n  contentComponent?: any\n}>()\n\nconst emit = defineEmits(['save'])\n</script>\n\n<template>\n  <div class=\"card\">\n    <div class=\"card-body\">\n      <h3 class=\"text-sm font-semibold\">Override card: ${name}</h3>\n      <p class=\"text-sm text-muted\">Custom card override.</p>\n    </div>\n  </div>\n</template>\n`,
};

const resolveOverridePath = (modelKey: string, kind: string, name: string) => {
  const repoRoot = resolveRepoRoot();
  const base = path.join(repoRoot, 'apps', 'admin', 'app', 'components', 'models', modelKey, 'overrides');

  if (kind === 'directory-cell') {
    return path.join(base, 'directory', `${name}.vue`);
  }
  if (kind === 'directory-part') {
    const file = name.startsWith('_') ? name : `_${name}`;
    return path.join(base, 'directory', `${file}.vue`);
  }
  if (kind === 'page') {
    return path.join(base, 'pages', `${name}.vue`);
  }
  if (kind === 'row') {
    return path.join(base, 'rows', `${name}.vue`);
  }
  if (kind === 'column') {
    return path.join(base, 'columns', `${name}.vue`);
  }
  if (kind === 'card') {
    return path.join(base, 'cards', `${name}.vue`);
  }
  throw new Error(`Unknown override kind: ${kind}`);
};

const fileExists = async (filePath: string) => {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const modelKey = String(body?.modelKey ?? '').trim().toLowerCase();
  const kind = String(body?.kind ?? '').trim();
  const name = String(body?.name ?? '').trim();
  const force = Boolean(body?.force ?? false);

  if (!modelKey || !kind || !name) {
    throw createError({ statusCode: 400, statusMessage: 'modelKey, kind, and name are required.' });
  }

  const templateBuilder = templateMap[kind];
  if (!templateBuilder) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported override kind: ${kind}` });
  }

  const filePath = resolveOverridePath(modelKey, kind, name);
  const exists = await fileExists(filePath);
  if (exists && !force) {
    throw createError({ statusCode: 409, statusMessage: 'Override already exists.' });
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, templateBuilder(name), 'utf-8');

  return { ok: true, filePath };
});
