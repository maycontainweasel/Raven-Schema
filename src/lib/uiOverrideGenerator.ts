import path from 'path';
import { mkdir, stat, writeFile } from 'fs/promises';
import type { ProjectPathsConfig } from '../types';

type OverrideOptions = {
  projectRoot: string;
  projects: ProjectPathsConfig[];
  model: string;
  force?: boolean;
};

type LayoutOverrideLayer = 'page' | 'row' | 'column' | 'card';

type LayoutOverrideOptions = OverrideOptions & {
  layer: LayoutOverrideLayer;
  name: string;
};

const CREATE_DIALOG_TEMPLATE = (modelKey: string) => `<script setup lang="ts">
import CreateDialogDefault from '../../CreateDialogDefault.vue'

const props = withDefaults(
  defineProps<{
    model: string
    open: boolean
    form: Record<string, any>
    title: string
    subtitle?: string
    fields: Array<{
      key: string
      label: string
      type?: 'text' | 'number' | 'textarea' | 'select' | 'instances'
      placeholder?: string
      rows?: number
      multiple?: boolean
      autoFrom?: string
      format?: 'slug'
      message?: string
      options?: Array<{ label: string; value: string | number }>
    }>
    loading?: boolean
    submitLabel?: string
    cancelLabel?: string
  }>(),
  {
    loading: false,
    submitLabel: 'Create',
    cancelLabel: 'Cancel'
  }
)

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'update:form', value: Record<string, any>): void
  (event: 'submit'): void
  (event: 'cancel'): void
}>()
</script>

<template>
  <div class="space-y-3">
    <p class="text-xs text-muted">
      Custom create dialog override for <strong>${modelKey}</strong>.
      Replace this wrapper with your own layout or keep CreateDialogDefault below.
    </p>
    <CreateDialogDefault
      :model="props.model"
      :open="props.open"
      :form="props.form"
      :title="props.title"
      :subtitle="props.subtitle"
      :fields="props.fields"
      :loading="props.loading"
      :submit-label="props.submitLabel"
      :cancel-label="props.cancelLabel"
      @update:open="(value) => emit('update:open', value)"
      @update:form="(value) => emit('update:form', value)"
      @submit="() => emit('submit')"
      @cancel="() => emit('cancel')"
    />
  </div>
</template>
`;

const PAGE_OVERRIDE_TEMPLATE = (modelKey: string, name: string) => `<script setup lang="ts">
const props = defineProps<{
  model: string
  record?: Record<string, any> | null
  tab?: Record<string, any>
}>()

const emit = defineEmits<{
  (event: 'save', payload: { id?: string; values: Record<string, any>; fields: any[] }): void
}>()
</script>

<template>
  <div class="card">
    <div class="card-body space-y-2">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">
        Page Override: ${name}
      </h3>
      <p class="text-sm text-muted">
        Custom page override for <strong>${modelKey}</strong>. Replace this content with your own layout.
      </p>
      <button class="btn btn-sm btn-primary" type="button" @click="emit('save', { values: {}, fields: [] })">
        Emit Save (placeholder)
      </button>
    </div>
  </div>
</template>
`;

const ROW_OVERRIDE_TEMPLATE = (modelKey: string, name: string) => `<script setup lang="ts">
const props = defineProps<{
  model: string
  row?: Record<string, any>
  record?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (event: 'save', payload: { id?: string; values: Record<string, any>; fields: any[] }): void
}>()
</script>

<template>
  <div class="card">
    <div class="card-body space-y-2">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">
        Row Override: ${name}
      </h3>
      <p class="text-sm text-muted">
        Custom row override for <strong>${modelKey}</strong>.
      </p>
      <button class="btn btn-sm btn-primary" type="button" @click="emit('save', { values: {}, fields: [] })">
        Emit Save (placeholder)
      </button>
    </div>
  </div>
</template>
`;

const COLUMN_OVERRIDE_TEMPLATE = (modelKey: string, name: string) => `<script setup lang="ts">
const props = defineProps<{
  model: string
  column?: Record<string, any>
  record?: Record<string, any> | null
}>()

const emit = defineEmits<{
  (event: 'save', payload: { id?: string; values: Record<string, any>; fields: any[] }): void
}>()
</script>

<template>
  <div class="card">
    <div class="card-body space-y-2">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">
        Column Override: ${name}
      </h3>
      <p class="text-sm text-muted">
        Custom column override for <strong>${modelKey}</strong>.
      </p>
      <button class="btn btn-sm btn-primary" type="button" @click="emit('save', { values: {}, fields: [] })">
        Emit Save (placeholder)
      </button>
    </div>
  </div>
</template>
`;

const CARD_OVERRIDE_TEMPLATE = (modelKey: string, name: string) => `<script setup lang="ts">
import FieldsCard from '@/components/management/FieldsCard.vue'

const props = defineProps<{
  model: string
  widget: Record<string, any>
  record?: Record<string, any> | null
  contentComponent?: any
}>()

const emit = defineEmits<{
  (event: 'save', payload: { id?: string; values: Record<string, any>; fields: any[] }): void
}>()
</script>

<template>
  <div class="space-y-2">
    <p class="text-xs text-muted">
      Card override for <strong>${modelKey}</strong> (${name}). Replace or keep FieldsCard below.
    </p>
    <FieldsCard
      :model="props.model"
      :widget="props.widget"
      :record="props.record"
      :content-component="props.contentComponent"
      @save="emit('save', $event)"
    />
  </div>
</template>
`;

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function generateCreateDialogOverrides(options: OverrideOptions): Promise<void> {
  const { projectRoot, projects, model, force } = options;
  const modelKey = model.toLowerCase();

  for (const project of projects) {
    if (!project.nuxtProjectRoot) continue;
    const nuxtRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
    const overrideDir = path.join(nuxtRoot, 'app', 'components', 'admin', 'overrides', modelKey);
    const overridePath = path.join(overrideDir, 'CreateDialog.vue');

    if (!force && (await fileExists(overridePath))) {
      console.log(`⚠️  Override already exists: ${overridePath}`);
      continue;
    }

    await mkdir(overrideDir, { recursive: true });
    await writeFile(overridePath, CREATE_DIALOG_TEMPLATE(modelKey), 'utf-8');
    console.log(`🧩 Created create-dialog override: ${overridePath}`);
  }
}

export async function generateLayoutOverrides(options: LayoutOverrideOptions): Promise<void> {
  const { projectRoot, projects, model, layer, name, force } = options;
  const modelKey = model.toLowerCase();

  const layerConfig: Record<
    LayoutOverrideLayer,
    { folder: string; template: (modelKey: string, name: string) => string }
  > = {
    page: { folder: 'pages', template: PAGE_OVERRIDE_TEMPLATE },
    row: { folder: 'rows', template: ROW_OVERRIDE_TEMPLATE },
    column: { folder: 'columns', template: COLUMN_OVERRIDE_TEMPLATE },
    card: { folder: 'cards', template: CARD_OVERRIDE_TEMPLATE },
  };

  const config = layerConfig[layer];
  if (!config) {
    throw new Error(`Unknown override layer: ${layer}`);
  }

  for (const project of projects) {
    if (!project.nuxtProjectRoot) continue;
    const nuxtRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
    const overrideDir = path.join(
      nuxtRoot,
      'app',
      'components',
      'models',
      modelKey,
      'overrides',
      config.folder
    );
    const overridePath = path.join(overrideDir, `${name}.vue`);

    if (!force && (await fileExists(overridePath))) {
      console.log(`⚠️  Override already exists: ${overridePath}`);
      continue;
    }

    await mkdir(overrideDir, { recursive: true });
    await writeFile(overridePath, config.template(modelKey, name), 'utf-8');
    console.log(`🧩 Created ${layer} override: ${overridePath}`);
  }
}
