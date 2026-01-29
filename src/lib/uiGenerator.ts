import path from 'path';
import { readFile, readdir, mkdir, writeFile, unlink } from 'fs/promises';
import YAML from 'yaml';
import type { AppConfig, ProjectPathsConfig } from '../types';
import { toPascalCase } from './crudHelpers';

export interface UiSpec {
  version?: number;
  kind?: string;
  name?: string;
  model?: string;
  table?: string;
  namespace?: string;
  route?: {
    base?: string;
    single?: string;
  };
  dialogs?: {
    create?: {
      template?: string;
      required?: string[];
      fields?: Array<{
        key: string;
        label?: string;
        type?: 'text' | 'number' | 'textarea' | 'select' | 'instances';
        placeholder?: string;
        rows?: number;
        required?: boolean;
        multiple?: boolean;
        autoFrom?: string;
        format?: 'slug';
        message?: string;
        options?: Array<{ label: string; value: string | number }>;
      }>;
      defaults?: Record<string, any>;
    };
  };
  overview?: {
    type?: string;
    filters?: {
      layout?: Array<any>;
    };
    meta?: {
      title?: string;
      subtitle?: string;
    };
    actions?: string[];
    table?: {
      columns?: string[];
    };
    typesense?: {
      collection?: string;
      queryBy?: string[];
      sortBy?: string;
      filters?: string[];
      pagination?: boolean;
      refreshMode?: 'clear' | 'upsert';
      sortableFields?: string[];
    };
  };
  single?: {
    layout?: string;
    store?: Record<string, any>;
    tabs?: Array<Record<string, any>>;
    targets?: Record<string, any>;
    header?: Record<string, any>;
  };
}

const UI_SPEC_EXTENSIONS = ['.yaml', '.yml'];

const toTitleCase = (value: string): string => {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)\w/g, (match) => match.toUpperCase());
};

const resolveModelKey = (spec: UiSpec): string => {
  if (spec.model) return String(spec.model);
  if (spec.table) return String(spec.table);
  if (spec.name) return String(spec.name).toLowerCase();
  return 'model';
};

const resolveNamespace = (spec: UiSpec, modelKey: string): string => {
  if (spec.namespace) return String(spec.namespace);
  if (spec.route?.base) return spec.route.base.replace(/^\//, '');
  return modelKey;
};

const resolveRouteBase = (spec: UiSpec, namespace: string): string => {
  const base = spec.route?.base;
  if (base) {
    return base.startsWith('/') ? base : `/${base}`;
  }
  return `/${namespace}`;
};

const resolveCollectionId = (spec: UiSpec, modelKey: string): string => {
  return spec.overview?.typesense?.collection ?? modelKey;
};

const resolveRouteToken = (spec: UiSpec): string => {
  const token = spec.route?.single?.match(/<([^>]+)>/)?.[1];
  return token ?? 'id.id';
};

const resolveRouteParam = (token: string): string => {
  const cleaned = token.replace(/[^a-zA-Z0-9_]/g, '_');
  return cleaned.length ? cleaned : 'id';
};

const resolveStoreType = (spec: UiSpec, modelKey: string): string => {
  const table = spec.table ?? modelKey;
  return toPascalCase(String(table));
};

const resolveStoreName = (modelKey: string): string => {
  return `use${toPascalCase(modelKey)}AdminStore`;
};

const resolveCreateFields = (spec: UiSpec): UiSpec['dialogs']['create']['fields'] => {
  const fields = spec.dialogs?.create?.fields;
  if (Array.isArray(fields) && fields.length > 0) return fields;
  const required = spec.dialogs?.create?.required ?? [];
  return required.map((key) => ({
    key,
    label: toTitleCase(key),
    type: 'text',
    required: true,
  }));
};

const resolveRequiredFields = (spec: UiSpec, fields: any[]): string[] => {
  const explicit = spec.dialogs?.create?.required;
  if (Array.isArray(explicit) && explicit.length > 0) return explicit;
  return fields.filter((field) => field.required).map((field) => field.key);
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

type NormalizedTab = { label: string; slug: string; content: any[] };

const normalizeTab = (tab: any, index: number, pageMap: Map<string, any>): NormalizedTab => {
  if (typeof tab === 'string') {
    const slug = tab.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return { label: tab, slug, content: pageMap.get(slug) ?? [] };
  }

  if (tab && typeof tab === 'object' && !Array.isArray(tab)) {
    const keys = Object.keys(tab);
    if (!('label' in tab) && !('slug' in tab) && keys.length === 1) {
      const label = keys[0];
      const payload = (tab as any)[label];
      const slug = payload?.slug ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const content = payload?.content ?? payload?.primary ?? pageMap.get(slug) ?? [];
      return { label, slug, content: Array.isArray(content) ? content : [] };
    }
    const label = tab.label ?? tab.name ?? tab.slug ?? `Tab ${index + 1}`;
    const slug = tab.slug ?? tab.key ?? String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const content = tab.content ?? tab.primary ?? pageMap.get(slug) ?? [];
    return { label: String(label), slug, content: Array.isArray(content) ? content : [] };
  }

  return { label: `Tab ${index + 1}`, slug: `tab-${index + 1}`, content: [] };
};

const buildPageMap = (spec: UiSpec): Map<string, any> => {
  const map = new Map<string, any>();
  const rawPages = (spec as any)?.single?.pages ?? [];
  if (!Array.isArray(rawPages)) return map;

  for (const entry of rawPages) {
    if (!entry || typeof entry !== 'object') continue;
    const keys = Object.keys(entry);
    if (keys.length === 0) continue;
    const label = keys[0];
    const payload = (entry as any)[label];
    if (!payload) continue;
    const slug = payload.slug ?? label.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    map.set(slug, payload?.content ?? payload?.primary ?? payload);
  }

  return map;
};

const assertLayoutIds = (spec: UiSpec): void => {
  if (!spec.single?.tabs) return;
  const errors: string[] = [];
  const modelKey = resolveModelKey(spec);
  const tabs = spec.single?.tabs ?? [];
  const pageMap = buildPageMap(spec);

  const pushError = (path: string, message: string) => {
    errors.push(`${path}: ${message}`);
  };

  tabs.forEach((tab: any, tabIndex: number) => {
    const normalized = normalizeTab(tab, tabIndex, pageMap);
    const tabLabel = normalized.label ?? `tab-${tabIndex + 1}`;
    const content = Array.isArray(normalized.content) ? normalized.content : [];

    content.forEach((row: any, rowIndex: number) => {
      const rowPath = `tabs["${tabLabel}"].content[${rowIndex}]`;
      if (!row || typeof row !== 'object' || Array.isArray(row) || !('primary' in row)) {
        pushError(
          rowPath,
          'Row must be an object with an "id" and a "primary" array. Arrays are not allowed.'
        );
        return;
      }
      if (!isNonEmptyString(row.id)) {
        pushError(`${rowPath}.id`, 'Row id is required for overrides.');
      }
      if (!Array.isArray(row.primary)) {
        pushError(`${rowPath}.primary`, 'Row primary must be an array of columns.');
        return;
      }

      row.primary.forEach((column: any, colIndex: number) => {
        const colPath = `${rowPath}.primary[${colIndex}]`;
        if (!column || typeof column !== 'object' || Array.isArray(column) || !('widgets' in column)) {
          pushError(
            colPath,
            'Column must be an object with an "id" and a "widgets" array. Inline widgets are not allowed.'
          );
          return;
        }
        if (!isNonEmptyString(column.id)) {
          pushError(`${colPath}.id`, 'Column id is required for overrides.');
        }
        if (!Array.isArray(column.widgets)) {
          pushError(`${colPath}.widgets`, 'Column widgets must be an array.');
          return;
        }

        column.widgets.forEach((widget: any, widgetIndex: number) => {
          const widgetPath = `${colPath}.widgets[${widgetIndex}]`;
          if (!widget || typeof widget !== 'object') {
            pushError(widgetPath, 'Widget must be an object with an id.');
            return;
          }
          if (!isNonEmptyString(widget.id)) {
            pushError(`${widgetPath}.id`, 'Widget id is required for overrides.');
          }
        });
      });
    });
  });

  if (errors.length > 0) {
    throw new Error(
      [
        `UI spec "${spec.name ?? modelKey}" is missing required layout ids.`,
        'Every row, column, and widget must include an explicit "id" to enable overrides.',
        'Fix the spec and re-run generation.',
        '',
        ...errors.map((entry) => `- ${entry}`),
      ].join('\n')
    );
  }
};

const resolveTableColumns = (spec: UiSpec, fallbackFields: any[]): string[] => {
  const columns = spec.overview?.table?.columns;
  if (Array.isArray(columns) && columns.length > 0) return columns;
  return fallbackFields.map((field) => field.key);
};

type FilterLayoutField = { key: string; class?: string; label?: string };
type FilterLayoutRow = { id: string; class?: string; fields: FilterLayoutField[] };

const resolveFilterLayout = (spec: UiSpec): FilterLayoutRow[] => {
  const layout = spec.overview?.filters?.layout;
  if (!Array.isArray(layout) || layout.length === 0) {
    return [
      {
        id: 'filters-row-primary',
        class: 'flex flex-wrap items-end justify-between gap-4',
        fields: [
          {
            key: 'search',
            class: 'flex-1 min-w-[240px] max-w-xl'
          },
          {
            key: 'instances',
            class: 'min-w-[220px]'
          }
        ]
      }
    ];
  }

  const normalizeField = (entry: any): FilterLayoutField | null => {
    if (typeof entry === 'string') {
      return { key: entry };
    }
    if (entry && typeof entry === 'object') {
      const key = entry.key ?? entry.field ?? entry.name;
      if (!key) return null;
      return {
        key: String(key),
        class: entry.class ? String(entry.class) : undefined,
        label: entry.label === false ? '' : entry.label ? String(entry.label) : undefined
      };
    }
    return null;
  };

  const normalizeRow = (row: any, index: number): FilterLayoutRow | null => {
    if (Array.isArray(row)) {
      const fields = row.map(normalizeField).filter(Boolean) as FilterLayoutField[];
      if (!fields.length) return null;
      return {
        id: `filters-row-${index + 1}`,
        fields
      };
    }
    if (row && typeof row === 'object') {
      const fieldsSource = row.fields ?? row.items ?? row.columns;
      if (!fieldsSource) return null;
      const fields = (Array.isArray(fieldsSource) ? fieldsSource : [fieldsSource])
        .map(normalizeField)
        .filter(Boolean) as FilterLayoutField[];
      if (!fields.length) return null;
      return {
        id: row.id ? String(row.id) : `filters-row-${index + 1}`,
        class: row.class ? String(row.class) : undefined,
        fields
      };
    }
    return null;
  };

  return layout
    .map((row, index) => normalizeRow(row, index))
    .filter(Boolean) as FilterLayoutRow[];
};

const serializeDefaultsValue = (value: any): string => {
  if (value === '$rootInstance' || value === '<rootInstance>') {
    return 'defaultInstance';
  }
  if (Array.isArray(value)) {
    return `[${value.map(serializeDefaultsValue).join(', ')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, val]) => `${key}: ${serializeDefaultsValue(val)}`)
      .join(', ');
    return `{ ${entries} }`;
  }
  return JSON.stringify(value);
};

const serializeDefaults = (defaults?: Record<string, any>): string => {
  if (!defaults || Object.keys(defaults).length === 0) return '{}';
  return serializeDefaultsValue(defaults);
};

const buildOverviewPage = (spec: UiSpec): string => {
  const modelKey = resolveModelKey(spec);
  return `<script setup lang="ts">
const modelKey = '${modelKey}'
</script>

<template>
  <TypesenseDirectoryPage :model-key="modelKey" />
</template>`;
};

export async function loadUiSpecs(specsDir: string): Promise<UiSpec[]> {
  const entries = await readdir(specsDir, { withFileTypes: true });
  const specs: UiSpec[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!UI_SPEC_EXTENSIONS.includes(ext)) continue;

    const fullPath = path.join(specsDir, entry.name);
    const content = await readFile(fullPath, 'utf-8');
    const parsed = YAML.parse(content) as UiSpec;
    if (!parsed || parsed.kind !== 'ui') continue;
    specs.push(parsed);
  }

  return specs;
}

export async function generateUiOverviewPages(options: {
  app: AppConfig;
  projectRoot: string;
  specs: UiSpec[];
  projects: ProjectPathsConfig[];
}): Promise<void> {
  const { projectRoot, specs, projects } = options;

  for (const project of projects) {
    if (!project.nuxtProjectRoot) continue;
    const nuxtRoot = path.resolve(projectRoot, project.nuxtProjectRoot);

    for (const spec of specs) {
      const modelKey = resolveModelKey(spec);
      const namespace = resolveNamespace(spec, modelKey);
      const pageDir = path.join(nuxtRoot, 'layers', 'generated', 'app', 'pages', namespace);
      await mkdir(pageDir, { recursive: true });
      const outputPath = path.join(pageDir, 'index.vue');
      const content = buildOverviewPage(spec);
      await writeFile(outputPath, content, 'utf-8');
    }
  }
}

const buildSinglePage = (spec: UiSpec): string => {
  const modelKey = resolveModelKey(spec);
  const namespace = resolveNamespace(spec, modelKey);
  const routeToken = resolveRouteToken(spec);
  const routeParam = resolveRouteParam(routeToken);
  const routeBase = resolveRouteBase(spec, namespace);
  const resolver = spec.single?.store?.resolver ?? routeToken;
  const storeType = resolveStoreType(spec, modelKey);
  const storeName = resolveStoreName(modelKey);

  const uiSpecJson = JSON.stringify(spec, null, 2);

  return `<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { storeToRefs } from 'pinia'
import { useCRUD } from '@schema'
import type { PrimaryRow } from '@/components/management/PrimaryContainer.vue'
import { ${storeName} } from '@/stores/admin/${modelKey}'

definePageMeta({
  title: '${spec.meta?.title ?? toTitleCase(namespace)}'
})

const uiSpec = ${uiSpecJson} as const

const route = useRoute()
const router = useRouter()

const modelKey = '${modelKey}'
const routeParam = '${routeParam}'
const routeToken = '${routeToken}'
const resolverToken = '${resolver}'
const routeBase = '${routeBase}'

const pageOverrides = import.meta.glob('@/components/models/**/overrides/pages/*.vue')

const resolveOverride = (map: Record<string, unknown>, suffix: string) => {
  const match = Object.keys(map).find((key) => key.endsWith(suffix))
  if (!match) return null
  return defineAsyncComponent(map[match] as any)
}

const resolvePageOverride = (slug: string) => {
  if (!modelKey || !slug) return null
  return resolveOverride(pageOverrides, 'models/' + modelKey + '/overrides/pages/' + slug + '.vue')
}

const routeId = computed(() => {
  const value = (route.params as any)?.[routeParam]
  if (Array.isArray(value)) return String(value[0] ?? '')
  if (value !== undefined && value !== null) return String(value)
  const fallback = (route.params as any)?.id
  return fallback ? String(Array.isArray(fallback) ? fallback[0] : fallback) : ''
})

const buildPageMap = () => {
  const map = new Map<string, any>()
  const rawPages = uiSpec?.single?.pages ?? []
  for (const entry of rawPages as any[]) {
    if (!entry || typeof entry !== 'object') continue
    const keys = Object.keys(entry)
    if (keys.length === 0) continue
    const label = keys[0]
    const payload = (entry as any)[label]
    if (!payload) continue
    const slug = payload.slug ?? label.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-')
    map.set(slug, payload?.content ?? payload?.primary ?? payload)
  }
  return map
}

const tabs = computed(() => {
  const rawTabs = uiSpec?.single?.tabs ?? []
  const pageMap = buildPageMap()
  return (rawTabs as any[]).map((tab: any, index: number) => {
    if (typeof tab === 'string') {
      const slug = tab.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      return { label: tab, slug, content: pageMap.get(slug) ?? [] }
    }
    if (tab && typeof tab === 'object' && !Array.isArray(tab)) {
      const keys = Object.keys(tab)
      if (!('label' in tab) && !('slug' in tab) && keys.length === 1) {
        const label = keys[0]
        const value = (tab as any)[label]
        const slug = value?.slug ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const content = value?.content ?? value?.primary ?? pageMap.get(slug) ?? []
        return { label, slug, content }
      }
      const label = tab.label ?? tab.name ?? tab.slug ?? ('Tab ' + (index + 1))
      const slug = tab.slug ?? tab.key ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const content = tab.content ?? tab.primary ?? pageMap.get(slug) ?? []
      return { label, slug, content }
    }
    return {
      label: 'Tab ' + (index + 1),
      slug: 'tab-' + (index + 1),
      content: []
    }
  })
})

const activeTab = ref('')

watch(
  () => tabs.value,
  (next) => {
    if (!next.length) return
    if (!activeTab.value || !next.find((tab) => tab.slug === activeTab.value)) {
      activeTab.value = next[0].slug
    }
  },
  { immediate: true }
)

const activePage = computed(() => tabs.value.find((tab) => tab.slug === activeTab.value))
const activeOverride = computed(() =>
  activeTab.value ? resolvePageOverride(activeTab.value) : null
)

const adminStore = ${storeName}()
const { record, loading, error: loadError } = storeToRefs(adminStore)
const { $process } = useCRUD()
const { $notify } = useNuxtApp()

const headerConfig = uiSpec?.single?.header ?? {}
const headerLabel = headerConfig?.label ?? uiSpec?.meta?.title ?? '${toTitleCase(modelKey)}'
const statusTarget = headerConfig?.statusTarget ?? (uiSpec?.single?.targets?.postStatus ? 'postStatus' : 'postStatus')

const handleHeaderBack = () => {
  router.push(routeBase)
}

const handleHeaderRefresh = () => {
  if (!routeId.value) return
  adminStore.init(routeId.value)
}

const handleHeaderDelete = async () => {
  if (!adminStore.resolvedId.value && !routeId.value) return
  const confirmed = confirm('Delete ' + modelKey + ' ' + (adminStore.resolvedId.value ?? routeId.value) + '? This cannot be undone.')
  if (!confirmed) return
  try {
    const instanceTargets = adminStore.resolveInstanceTargets?.()
    const processOptions = instanceTargets?.length ? { instances: instanceTargets } : undefined
    await $process(modelKey + '.delete', { id: adminStore.resolvedId.value ?? routeId.value }, processOptions)
    $notify?.success?.(headerLabel + ' deleted')
    router.push(routeBase)
  } catch (error) {
    console.error('[generated-ui] Failed to delete record', error)
    $notify?.error?.('Failed to delete record')
  }
}

const handleHeaderStatusUpdate = async (status: string) => {
  await adminStore.updateGrouped(
    {
      values: { postStatus: status },
      fields: [
        {
          key: 'postStatus',
          field: 'post.status',
          path: 'post.status',
          target: statusTarget,
        },
      ],
    },
    uiSpec?.single?.targets ?? {}
  )
}

watch(
  () => routeId.value,
  (next) => {
    if (!next) return
    adminStore.init(next)
  },
  { immediate: true }
)

const lastSave = ref<any>(null)

const handleSave = async (payload: { id?: string; values: Record<string, any>; fields: any[] }) => {
  try {
    await adminStore.updateGrouped(payload, uiSpec?.single?.targets ?? {})
    lastSave.value = payload
  } catch (error) {
    console.error('[generated-ui] Failed to update record', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <ManagementHeader
      :model="modelKey"
      :model-label="headerLabel"
      :record="record"
      :route-id="routeId"
      :show-back="headerConfig?.back !== false"
      :show-instances="headerConfig?.instances !== false"
      :show-status="headerConfig?.status !== false"
      :show-refresh="headerConfig?.refresh !== false"
      :show-delete="headerConfig?.delete !== false"
      :status-options="headerConfig?.statusOptions"
      @back="handleHeaderBack"
      @refresh="handleHeaderRefresh"
      @delete="handleHeaderDelete"
      @update-status="handleHeaderStatusUpdate"
    />

    <div
      class="grid gap-6"
      :class="tabs.length > 1 ? 'tm:grid-cols-[240px_minmax(0,1fr)]' : 'tm:grid-cols-1'"
    >
      <aside class="card" v-if="tabs.length > 1">
        <div class="card-body space-y-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">Pages</h2>
          <nav class="space-y-2">
            <button
              v-for="tab in tabs"
              :key="tab.slug"
              class="btn btn-sm w-full justify-start"
              :class="tab.slug === activeTab ? 'btn-primary' : 'btn-outline'"
              @click="activeTab = tab.slug"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>
      </aside>

      <section class="space-y-6">
        <component
          v-if="activeOverride"
          :is="activeOverride"
          :model="modelKey"
          :record="record"
          :tab="activePage"
          @save="handleSave"
        />
        <PrimaryContainer
          v-else-if="activePage"
          :model="modelKey"
          :primary="activePage.content as PrimaryRow[]"
          :record="record"
          @save="handleSave"
        />
        <div v-else class="card">
          <div class="card-body">
            <p class="text-sm text-muted">
              Nothing to render yet. Add content blocks to this tab in the UI spec.
            </p>
          </div>
        </div>

        <div v-if="lastSave" class="card">
          <div class="card-body space-y-2">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">Last Save</h3>
            <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(lastSave, null, 2) }}</pre>
          </div>
        </div>

        <div v-if="loading || loadError" class="card">
          <div class="card-body space-y-2">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">Record Status</h3>
            <p v-if="loading" class="text-sm text-muted">Loading record...</p>
            <p v-else class="text-sm text-error">{{ loadError }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
`;
};

const buildAdminStoreFactory = (): string => {
  return `import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useCRUD } from '@schema'

export type AdminStoreTarget = {
  endpoint?: string
  model?: string
  payloadMap?: Record<string, string>
}

export type AdminStoreTargets = Record<string, AdminStoreTarget>

export type AdminUpdatePayload = {
  id?: string
  values: Record<string, any>
  fields?: Array<{
    field: string
    key?: string
    path?: string
    target?: string
    model?: string
  }>
}

export type AdminStoreConfig<T> = {
  modelKey: string
  resourceKey?: string
  resolver?: string
}

const buildCandidates = (raw: string) => {
  const trimmed = raw.trim()
  if (!trimmed) return []
  const candidates = new Set<string>()
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':')
    const last = parts[parts.length - 1]
    if (last) candidates.add(last)
  }
  candidates.add(trimmed)
  return Array.from(candidates)
}

const setByPath = (target: Record<string, any>, path: string, value: any) => {
  if (!path) return
  const parts = path.split('.').filter(Boolean)
  if (!parts.length) return
  let cursor = target
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value
      return
    }
    if (!cursor[part] || typeof cursor[part] !== 'object') {
      cursor[part] = {}
    }
    cursor = cursor[part]
  })
}

const getByPath = (target: Record<string, any> | undefined, path: string) => {
  if (!target || !path) return undefined
  const parts = path.split('.').filter(Boolean)
  let cursor: any = target
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = cursor[part]
  }
  return cursor
}

const resolveFieldKey = (field: { key?: string; field: string }) => field.key ?? field.field

export const createAdminRecordStore = <T>(config: AdminStoreConfig<T>) =>
  defineStore(\`admin-\${config.modelKey}\`, () => {
    const { $api, $notify } = useNuxtApp()
    const { resolveRecordSubId, $process } = useCRUD()

    const record = ref<T | null>(null)
    const loading = ref(false)
    const error = ref('')
    const initialized = ref(false)
    const lastRequestedId = ref('')

    const resolvedId = computed(
      () => resolveRecordSubId(record.value as any) ?? lastRequestedId.value ?? ''
    )

    const fetchResource = async (id: string) => {
      const apiModel = config.modelKey ? ($api as any)[config.modelKey] : null
      const resource = apiModel?.resource?.query
        ? (payload: any) => apiModel.resource.query(payload)
        : null
      if (!resource) {
        throw new Error(\`Resource endpoint missing for \${config.modelKey}\`)
      }
      const result = await resource({ data: { id, key: config.resourceKey ?? 'Admin' } })
      return Array.isArray(result) ? result[0] : result
    }

    const init = async (id: string) => {
      if (!id || !config.modelKey) {
        record.value = null
        return
      }
      lastRequestedId.value = id
      loading.value = true
      error.value = ''
      try {
        let recordData: any = null
        const candidates = buildCandidates(id)
        for (const candidate of candidates) {
          recordData = await fetchResource(candidate)
          if (recordData) break
        }
        record.value = recordData ?? null
        if (!record.value) {
          error.value = 'Record not found'
        }
      } catch (err) {
        console.error('[admin-store] Failed to load record', err)
        error.value = 'Failed to load record'
        $notify?.error?.('Failed to load record')
      } finally {
        loading.value = false
        initialized.value = true
      }
    }

    const resolveEndpoint = (targetKey: string, targets?: AdminStoreTargets) => {
      const target = targets?.[targetKey]
      if (target?.endpoint) return target.endpoint
      const model = target?.model ?? config.modelKey
      return \`\${model}.update\`
    }

    const buildPayload = (
      values: Record<string, any>,
      fields: Array<{ field: string; key?: string; path?: string }>
    ) => {
      const payload: Record<string, any> = {}
      fields.forEach((field) => {
        const key = resolveFieldKey(field)
        const value = values[key]
        const path = field.path ?? field.field
        if (path && path.includes('.')) {
          setByPath(payload, path, value)
        } else {
          payload[path] = value
        }
      })
      return payload
    }

    const mapPayload = (
      mapping: Record<string, string>,
      basePayload: Record<string, any>,
      values: Record<string, any>
    ) => {
      const resolved: Record<string, any> = {}
      Object.entries(mapping).forEach(([key, token]) => {
        if (token === '$id') {
          resolved[key] = resolvedId.value
          return
        }
        if (token === '$recordId' || token === '$rid') {
          resolved[key] = (record.value as any)?.id ?? resolvedId.value
          return
        }
        if (token === '$payload') {
          resolved[key] = basePayload
          return
        }
        if (token === '$values') {
          resolved[key] = values
          return
        }
        if (token.startsWith('$field:')) {
          const path = token.slice('$field:'.length)
          resolved[key] = getByPath(basePayload, path) ?? values[path]
          return
        }
        resolved[key] = token
      })
      return resolved
    }

    const updateGrouped = async (payload: AdminUpdatePayload, targets?: AdminStoreTargets) => {
      if (!resolvedId.value) return null
      try {
        const fields = payload.fields ?? []
        const groups: Record<string, { values: Record<string, any>; fields: any[] }> = {}

        if (fields.length) {
          fields.forEach((field) => {
            const key = resolveFieldKey(field)
            const targetKey = field.target ?? field.model ?? 'base'
            if (!groups[targetKey]) groups[targetKey] = { values: {}, fields: [] }
            groups[targetKey].values[key] = payload.values[key]
            groups[targetKey].fields.push(field)
          })
        } else {
          groups.base = { values: payload.values, fields: [] }
        }

        let updatedRecord: any = null

        for (const [targetKey, group] of Object.entries(groups)) {
          const targetConfig = targets?.[targetKey]
          const endpoint = resolveEndpoint(targetKey, targets)
          const builtPayload = group.fields.length
            ? buildPayload(group.values, group.fields)
            : group.values
          const requestPayload = targetConfig?.payloadMap
            ? mapPayload(targetConfig.payloadMap, builtPayload, group.values)
            : { id: resolvedId.value, payload: builtPayload }

          const result = await $process(endpoint, requestPayload as any)

          if (result && targetKey === 'base') {
            updatedRecord = result
            record.value = result
          } else if (result && record.value) {
            const next = { ...(record.value as any) }
            Object.entries(builtPayload).forEach(([key, value]) => {
              if (key.includes('.')) {
                setByPath(next, key, value)
              } else {
                next[key] = value
              }
            })
            record.value = next as any
          }
        }

        if (updatedRecord) {
          $notify?.success?.('Record updated')
        }

        return updatedRecord
      } catch (err) {
        console.error('[admin-store] Failed to update record', err)
        $notify?.error?.('Failed to update record')
        return null
      }
    }

    return {
      record,
      loading,
      error,
      initialized,
      resolvedId,
      init,
      updateGrouped
    }
  })
`;
};

const buildAdminStore = (spec: UiSpec): string => {
  const modelKey = resolveModelKey(spec);
  const storeType = resolveStoreType(spec, modelKey);
  const storeName = resolveStoreName(modelKey);
  const resourceKey = spec.single?.store?.resourceKey ?? 'Admin';
  const resolver = spec.single?.store?.resolver ?? resolveRouteToken(spec);

  return `import type { ${storeType} } from '@schema/types'
import { createAdminRecordStore } from './_factory'

export const ${storeName} = createAdminRecordStore<${storeType}>({
  modelKey: '${modelKey}',
  resourceKey: '${resourceKey}',
  resolver: '${resolver}'
})
`;
};

export async function generateUiAdminStores(options: {
  app: AppConfig;
  projectRoot: string;
  specs: UiSpec[];
  projects: ProjectPathsConfig[];
}): Promise<void> {
  const { projectRoot, specs, projects } = options;

  for (const project of projects) {
    if (!project.nuxtProjectRoot) continue;
    const nuxtRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
    const storeDir = path.join(nuxtRoot, 'app', 'stores', 'admin');
    await mkdir(storeDir, { recursive: true });
    const factoryPath = path.join(storeDir, '_factory.ts');
    await writeFile(factoryPath, buildAdminStoreFactory(), 'utf-8');

    for (const spec of specs) {
      if (!spec.single) continue;
      const modelKey = resolveModelKey(spec);
      const outputPath = path.join(storeDir, `${modelKey}.ts`);
      await writeFile(outputPath, buildAdminStore(spec), 'utf-8');
    }
  }
}

export async function generateUiSinglePages(options: {
  app: AppConfig;
  projectRoot: string;
  specs: UiSpec[];
  projects: ProjectPathsConfig[];
}): Promise<void> {
  const { projectRoot, specs, projects } = options;

  for (const project of projects) {
    if (!project.nuxtProjectRoot) continue;
    const nuxtRoot = path.resolve(projectRoot, project.nuxtProjectRoot);

    for (const spec of specs) {
      if (!spec.single) continue;
      assertLayoutIds(spec);
      const modelKey = resolveModelKey(spec);
      const namespace = resolveNamespace(spec, modelKey);
      const routeToken = resolveRouteToken(spec);
      const routeParam = resolveRouteParam(routeToken);
      const pageDir = path.join(nuxtRoot, 'layers', 'generated', 'app', 'pages', namespace);
      await mkdir(pageDir, { recursive: true });
      try {
        const entries = await readdir(pageDir);
        const expected = `[${routeParam}].vue`;
        const stale = entries.filter((name) =>
          name.startsWith('[') && name.endsWith('].vue') && name !== expected
        );
        for (const name of stale) {
          await unlink(path.join(pageDir, name));
        }
      } catch {
        // Ignore cleanup errors to keep generation resilient.
      }
      const outputPath = path.join(pageDir, `[${routeParam}].vue`);
      const content = buildSinglePage(spec);
      await writeFile(outputPath, content, 'utf-8');
    }
  }
}

export async function generateUiRouteConfig(options: {
  projectRoot: string;
  specs: UiSpec[];
  projects: ProjectPathsConfig[];
}): Promise<void> {
  const { projectRoot, specs, projects } = options;

  const routes = specs.map((spec) => {
    const modelKey = resolveModelKey(spec);
    const namespace = resolveNamespace(spec, modelKey);
    const pathBase = resolveRouteBase(spec, namespace);
    const routeToken = resolveRouteToken(spec);
    const routeParam = resolveRouteParam(routeToken);
    const singleRaw = spec.route?.single;
    const singlePath = singleRaw ? singleRaw.replace(/<[^>]+>/, `:${routeParam}`) : undefined;
    return {
      namespace,
      path: pathBase,
      singlePath,
      param: routeParam,
    };
  });

  const fileContents = `export interface GeneratedUiRoute {\n  namespace: string;\n  path: string;\n  singlePath?: string;\n  param?: string;\n}\n\nexport const generatedUiRoutes: GeneratedUiRoute[] = ${JSON.stringify(routes, null, 2)}\n`;

  for (const project of projects) {
    if (!project.nuxtProjectRoot) continue;
    const nuxtRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
    const outputPath = path.join(nuxtRoot, 'app', 'config', 'ui.generated.ts');
    await writeFile(outputPath, fileContents, 'utf-8');
  }
}

const buildManagementTestPage = (spec: UiSpec): string => {
  const specJson = JSON.stringify(spec, null, 2);

  return `<script setup lang="ts">
import { useCRUD } from '@schema'
import type { PrimaryRow } from '~/components/management/PrimaryContainer.vue'

definePageMeta({
  title: 'UI Test'
})

const uiSpec = ${specJson} as any

const tabs = computed(() => {
  const rawTabs = uiSpec?.single?.tabs ?? []
  return rawTabs.map((tab: any, index: number) => ({
    label: tab?.label ?? tab?.name ?? tab?.slug ?? ('Tab ' + (index + 1)),
    slug: tab?.slug ?? tab?.key ?? tab?.label ?? ('tab-' + (index + 1)),
    content: tab?.content ?? tab?.primary ?? []
  }))
})

const activeTab = ref('')

watch(
  () => tabs.value,
  (next) => {
    if (!next.length) return
    if (!activeTab.value || !next.find((tab) => tab.slug === activeTab.value)) {
      activeTab.value = next[0].slug
    }
  },
  { immediate: true }
)

const activePage = computed(() => tabs.value.find((tab) => tab.slug === activeTab.value))

const route = useRoute()
const { $api, $notify } = useNuxtApp()
const { $process, resolveRecordSubId } = useCRUD()

const modelKey = computed(() => String(route.query.model ?? uiSpec?.model ?? 'question'))
const routeId = computed(() => String(route.query.id ?? ''))

const loading = ref(false)
const loadError = ref('')
const record = ref<any>(null)

const resolvedId = computed(() => resolveRecordSubId(record.value) ?? routeId.value)

const loadRecord = async () => {
  if (!routeId.value || !modelKey.value) {
    record.value = null
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const apiModel = modelKey.value ? ($api as any)[modelKey.value] : null
    const resource = apiModel?.resource?.query
      ? (payload: any) => apiModel.resource.query(payload)
      : null

    if (!resource) {
      loadError.value = 'Resource endpoint missing for ' + modelKey.value
      return
    }

    const buildCandidates = (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) return []
      const candidates = new Set<string>()
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':')
        const last = parts[parts.length - 1]
        if (last) candidates.add(last)
      }
      candidates.add(trimmed)
      return Array.from(candidates)
    }

    const fetchResource = async (id: string) => {
      const result = await resource({ data: { id, key: 'Admin' } })
      return Array.isArray(result) ? result[0] : result
    }

    let recordData: any = null
    const candidates = buildCandidates(routeId.value)
    for (const candidate of candidates) {
      recordData = await fetchResource(candidate)
      if (recordData) break
    }

    record.value = recordData ?? null

    if (!record.value) {
      loadError.value = 'Record not found'
    }
  } catch (error) {
    console.error('[ui-test] Failed to load record', error)
    loadError.value = 'Failed to load record'
    $notify?.error?.('Failed to load record')
  } finally {
    loading.value = false
  }
}

watch(
  () => [routeId.value, modelKey.value],
  () => {
    loadRecord()
  },
  { immediate: true }
)

const lastSave = ref<{ id?: string; values: Record<string, any>; fields: any[] } | null>(null)

const handleSave = async (payload: { id?: string; values: Record<string, any>; fields: any[] }) => {
  lastSave.value = payload

  if (!resolvedId.value) {
    $notify?.error?.('Missing record id')
    return
  }

  try {
    const baseModel = modelKey.value
    const groups: Record<string, Record<string, any>> = {}

    if (Array.isArray(payload.fields) && payload.fields.length) {
      payload.fields.forEach((field) => {
        const model = field.model ?? baseModel
        if (!(field.field in payload.values)) return
        if (!groups[model]) groups[model] = {}
        groups[model][field.field] = payload.values[field.field]
      })
    } else {
      groups[baseModel] = payload.values
    }

    let updatedRecord: any = null

    for (const [model, values] of Object.entries(groups)) {
      if (model !== baseModel) {
        console.info('[ui-test] skipping non-base model update', model, values)
        continue
      }
      updatedRecord = await $process(model + '.update', {
        id: resolvedId.value,
        payload: values
      })
    }

    if (updatedRecord) {
      record.value = updatedRecord
      $notify?.success?.('Record updated')
    }
  } catch (error) {
    console.error('[ui-test] Failed to update record', error)
    $notify?.error?.('Failed to update record')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">UI Test</h1>
      <p class="text-sm text-muted">Generated management layout from spec.</p>
    </div>

    <div
      class="grid gap-6"
      :class="tabs.length > 1 ? 'tm:grid-cols-[240px_minmax(0,1fr)]' : 'tm:grid-cols-1'"
    >
      <aside class="card" v-if="tabs.length > 1">
        <div class="card-body space-y-3">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-muted">Pages</h2>
          <nav class="space-y-2">
            <button
              v-for="tab in tabs"
              :key="tab.slug"
              class="btn btn-sm w-full justify-start"
              :class="tab.slug === activeTab ? 'btn-primary' : 'btn-outline'"
              @click="activeTab = tab.slug"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>
      </aside>

      <section class="space-y-6">
        <PrimaryContainer
          v-if="activePage"
          :model="modelKey"
          :primary="activePage.content as PrimaryRow[]"
          :record="record"
          @save="handleSave"
        />
        <div v-else class="card">
          <div class="card-body">
            <p class="text-sm text-muted">
              Nothing to render yet. Add content blocks to this tab in the UI spec.
            </p>
          </div>
        </div>

        <div v-if="lastSave" class="card">
          <div class="card-body space-y-2">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">Last Save</h3>
            <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(lastSave, null, 2) }}</pre>
          </div>
        </div>

        <div v-if="loading || loadError" class="card">
          <div class="card-body space-y-2">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted">Record Status</h3>
            <p v-if="loading" class="text-sm text-muted">Loading record...</p>
            <p v-else class="text-sm text-error">{{ loadError }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
`;
};

export async function generateUiManagementTestPage(options: {
  projectRoot: string;
  specs: UiSpec[];
  projects: ProjectPathsConfig[];
}): Promise<void> {
  const { projectRoot, specs, projects } = options;
  const testSpec = specs.find((spec) => {
    const name = String(spec.name ?? '').toLowerCase();
    const namespace = String(spec.namespace ?? '').toLowerCase();
    const base = String(spec.route?.base ?? '').toLowerCase();
    return name === 'test' || namespace === 'ui-test' || base === '/ui-test';
  });

  if (!testSpec?.single) return;

  assertLayoutIds(testSpec);
  const content = buildManagementTestPage(testSpec);

  for (const project of projects) {
    if (!project.nuxtProjectRoot) continue;
    const nuxtRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
    const outputPath = path.join(nuxtRoot, 'layers', 'generated', 'app', 'pages', 'ui-test', 'index.vue');
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, 'utf-8');
  }
}

export async function generateUiSpecsExport(options: {
  projectRoot: string;
  specs: UiSpec[];
  projects: ProjectPathsConfig[];
}): Promise<void> {
  const { projectRoot, specs, projects } = options;

  const fileContents = `export const generatedUiSpecs = ${JSON.stringify(specs, null, 2)} as const\n`;

  for (const project of projects) {
    if (!project.nuxtProjectRoot) continue;
    const nuxtRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
    const outputPath = path.join(nuxtRoot, 'app', 'config', 'ui-specs.generated.ts');
    await writeFile(outputPath, fileContents, 'utf-8');
  }
}
