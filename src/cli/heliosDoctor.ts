import path from 'path';
import { readFile, stat } from 'fs/promises';
import { parse as parseYaml } from 'yaml';

export type HeliosDoctorSeverity = 'error' | 'warning' | 'info';

export type HeliosDoctorItem = {
  key: string;
  label: string;
  ok: boolean;
  severity: HeliosDoctorSeverity;
  details?: string;
  fixHint?: string;
};

export type HeliosDoctorReport = {
  projectName: string;
  appRoot: string;
  items: HeliosDoctorItem[];
  errorCount: number;
  warningCount: number;
  ready: boolean;
};

const REQUIRED_ARTIFACTS = [
  'app/helios/fragments/setup.json',
  'app/helios/fragments/type.json',
  'app/helios/fragments/colors.json',
  'app/helios/fragments/theme.json',
  'app/helios/generated/type.settings.json',
  'app/helios/generated/colors.settings.json',
  'app/helios/generated/theme.settings.json',
  'app/helios/generated/uno.generated.ts',
  'app/helios/scss/_tokens.scss',
  'app/helios/scss/_type.scss',
  'app/helios/scss/_colors.scss',
  'app/helios/scss/_semantic.scss',
  'app/helios/scss/index.scss',
] as const;

const REQUIRED_PACKAGES = [
  '@pinia/nuxt',
  'pinia',
  '@unocss/nuxt',
  '@unocss/preset-attributify',
  '@unocss/preset-icons',
  '@unocss/preset-wind4',
  '@unocss/transformer-variant-group',
  'unocss',
  'sass-embedded',
  '@iconify-json/lucide',
] as const;

const NUXT_ADDITIONS_TOKENS = [
  "'~/helios/scss/index.scss'",
  "'@unocss/nuxt'",
  "'@pinia/nuxt'",
  "configFile: './uno.config.ts'",
  'nuxtLayers: true',
] as const;

const UNO_TOKENS = [
  "app/helios/generated/uno.generated.ts",
  'heliosGenerated',
  "await import('./.nuxt/uno.config.mjs')",
  'mergeConfigs(',
] as const;

const ADMIN_MODELS_MANIFEST_PATH = 'modules/schema-kit/runtime/generated/admin-models.json';
const MODEL_FRAGMENT_DIR = 'app/helios/fragments/models';
const MODEL_GENERATED_DIR = 'app/helios/generated/models';
const MODEL_PAGES_DIR = 'app/pages';
const GENERATED_ROUTE_MARKER = '@helios-generated-model-route';

type AdminModelManifest = {
  models?: Record<string, {
    key?: string;
    table?: string;
    admin?: {
      enabled?: boolean;
    };
  }>;
};

type ModelSpecLike = {
  directory?: {
    route?: string;
    createDialog?: {
      action?: string;
    };
    listing?: {
      actions?: {
        manage?: boolean;
        delete?: boolean;
      };
    };
  };
};

async function pathExists(absPath: string): Promise<boolean> {
  const entry = await stat(absPath).catch(() => null);
  return Boolean(entry);
}

async function readTextIfExists(absPath: string): Promise<string | null> {
  try {
    return await readFile(absPath, 'utf-8');
  } catch {
    return null;
  }
}

function checkTokens(source: string | null, requiredTokens: readonly string[]) {
  if (!source) {
    return {
      ok: false,
      missing: [...requiredTokens],
    };
  }
  const missing = requiredTokens.filter((token) => !source.includes(token));
  return {
    ok: missing.length === 0,
    missing,
  };
}

function readJsonSafe<T>(source: string | null): T | null {
  if (!source) return null;
  try {
    return JSON.parse(source) as T;
  } catch {
    return null;
  }
}

function readYamlSafe<T>(source: string | null): T | null {
  if (!source) return null;
  try {
    return parseYaml(source) as T;
  } catch {
    return null;
  }
}

function normalizeRoutePath(value: unknown, fallback: string) {
  const raw = String(value ?? '').trim();
  const seeded = raw.length ? raw : fallback;
  const prefixed = seeded.startsWith('/') ? seeded : `/${seeded}`;
  return prefixed.replace(/\/{2,}/g, '/').replace(/\/$/, '') || fallback;
}

function resolveGeneratedRouteFiles(appRoot: string, routePath: string) {
  const normalized = normalizeRoutePath(routePath, '/admin');
  const clean = normalized.replace(/^\//, '');
  const segments = clean.length ? clean.split('/').map((segment) => segment.trim()).filter(Boolean) : [];
  const baseDir = path.join(appRoot, MODEL_PAGES_DIR, ...segments);
  return {
    directory: path.join(baseDir, 'index.vue'),
    record: path.join(baseDir, '[rid].vue'),
  };
}

async function appendModelSpecItems(
  items: HeliosDoctorItem[],
  appRoot: string,
  projectName: string,
) {
  const manifestPath = path.join(appRoot, ADMIN_MODELS_MANIFEST_PATH);
  const manifestSource = await readTextIfExists(manifestPath);
  const manifest = readJsonSafe<AdminModelManifest>(manifestSource);

  if (!manifestSource) {
    items.push({
      key: 'models:manifest:missing',
      label: `Model manifest exists: ${ADMIN_MODELS_MANIFEST_PATH}`,
      ok: false,
      severity: 'error',
      fixHint: `Run: pnpm -C apps/schema run schema:generate`,
    });
    return;
  }

  if (!manifest || !manifest.models || typeof manifest.models !== 'object') {
    items.push({
      key: 'models:manifest:invalid',
      label: 'Model manifest is valid JSON with a models object',
      ok: false,
      severity: 'error',
      fixHint: `Re-generate schema assets: pnpm -C apps/schema run schema:refresh`,
    });
    return;
  }

  const manifestEntries = Object.entries(manifest.models)
    .map(([fallbackKey, entry]) => {
      const key = String(entry?.key || fallbackKey || '').trim().toLowerCase();
      const table = String(entry?.table || key || '').trim();
      const adminEnabled = entry?.admin?.enabled !== false;
      if (!key || !table) return null;
      return { key, table, adminEnabled };
    })
    .filter(Boolean) as Array<{ key: string; table: string; adminEnabled: boolean }>;

  const auditableModels = manifestEntries.filter((entry) => entry.adminEnabled);
  items.push({
    key: 'models:manifest:count',
    label: `Model manifest loaded (${auditableModels.length} admin model${auditableModels.length === 1 ? '' : 's'})`,
    ok: true,
    severity: 'info',
  });

  const routeOwners = new Map<string, string[]>();

  for (const model of auditableModels) {
    const fragmentPath = path.join(appRoot, MODEL_FRAGMENT_DIR, `${model.key}.ui.yaml`);
    const generatedPath = path.join(appRoot, MODEL_GENERATED_DIR, `${model.key}.ui.json`);

    const fragmentSource = await readTextIfExists(fragmentPath);
    const generatedSource = await readTextIfExists(generatedPath);
    const fragmentSpec = readYamlSafe<ModelSpecLike>(fragmentSource);
    const generatedJson = readJsonSafe<{ modelKey?: string; directoryRoute?: string; spec?: ModelSpecLike }>(generatedSource);

    const fallbackRoute = normalizeRoutePath(`/admin/${model.table}`, `/admin/${model.table}`);
    const routeFromFragment = fragmentSpec?.directory?.route;
    const routeFromGenerated = generatedJson?.directoryRoute ?? generatedJson?.spec?.directory?.route;
    const route = normalizeRoutePath(routeFromFragment ?? routeFromGenerated, fallbackRoute);
    const routeFiles = resolveGeneratedRouteFiles(appRoot, route);

    if (!routeOwners.has(route)) routeOwners.set(route, []);
    routeOwners.get(route)!.push(model.key);

    if (!fragmentSource) {
      items.push({
        key: `models:${model.key}:fragment-missing`,
        label: `Model fragment exists for "${model.key}"`,
        ok: false,
        severity: 'warning',
        details: path.relative(appRoot, fragmentPath),
        fixHint: `Open /models/${model.key} and click Commit Spec.`,
      });
    } else if (!fragmentSpec) {
      items.push({
        key: `models:${model.key}:fragment-parse`,
        label: `Model fragment YAML parses for "${model.key}"`,
        ok: false,
        severity: 'error',
        details: path.relative(appRoot, fragmentPath),
        fixHint: `Fix YAML parse issues in ${path.relative(appRoot, fragmentPath)}.`,
      });
    }

    if (!generatedSource) {
      items.push({
        key: `models:${model.key}:generated-missing`,
        label: `Generated model JSON exists for "${model.key}"`,
        ok: false,
        severity: 'warning',
        details: path.relative(appRoot, generatedPath),
        fixHint: `Open /models/${model.key} and click Commit Spec.`,
      });
    } else if (!generatedJson) {
      items.push({
        key: `models:${model.key}:generated-parse`,
        label: `Generated model JSON parses for "${model.key}"`,
        ok: false,
        severity: 'error',
        details: path.relative(appRoot, generatedPath),
        fixHint: `Re-commit model "${model.key}" to regenerate JSON output.`,
      });
    }

    if (generatedJson && String(generatedJson.modelKey || '').trim().toLowerCase() !== model.key) {
      items.push({
        key: `models:${model.key}:generated-modelkey-mismatch`,
        label: `Generated modelKey matches "${model.key}"`,
        ok: false,
        severity: 'error',
        details: `Found "${String(generatedJson.modelKey || '').trim() || '(empty)'}" in ${path.relative(appRoot, generatedPath)}`,
        fixHint: `Re-commit model "${model.key}" to regenerate the generated JSON.`,
      });
    }

    const directoryRouteSource = await readTextIfExists(routeFiles.directory);
    const recordRouteSource = await readTextIfExists(routeFiles.record);

    if (!directoryRouteSource) {
      items.push({
        key: `models:${model.key}:directory-route-missing`,
        label: `Directory route page exists for "${model.key}"`,
        ok: false,
        severity: 'warning',
        details: path.relative(appRoot, routeFiles.directory),
        fixHint: `Commit model "${model.key}" to regenerate routes.`,
      });
    } else if (!directoryRouteSource.includes(GENERATED_ROUTE_MARKER)) {
      items.push({
        key: `models:${model.key}:directory-route-unmanaged`,
        label: `Directory route page is managed for "${model.key}"`,
        ok: false,
        severity: 'warning',
        details: path.relative(appRoot, routeFiles.directory),
        fixHint: `Remove/rename unmanaged route file and re-commit model "${model.key}".`,
      });
    }

    if (!recordRouteSource) {
      items.push({
        key: `models:${model.key}:record-route-missing`,
        label: `Record route page exists for "${model.key}"`,
        ok: false,
        severity: 'warning',
        details: path.relative(appRoot, routeFiles.record),
        fixHint: `Commit model "${model.key}" to regenerate routes.`,
      });
    } else if (!recordRouteSource.includes(GENERATED_ROUTE_MARKER)) {
      items.push({
        key: `models:${model.key}:record-route-unmanaged`,
        label: `Record route page is managed for "${model.key}"`,
        ok: false,
        severity: 'warning',
        details: path.relative(appRoot, routeFiles.record),
        fixHint: `Remove/rename unmanaged route file and re-commit model "${model.key}".`,
      });
    }

    const createAction = String(
      fragmentSpec?.directory?.createDialog?.action
      ?? generatedJson?.spec?.directory?.createDialog?.action
      ?? '',
    ).trim();
    if (!createAction.includes('.')) {
      items.push({
        key: `models:${model.key}:create-action-invalid`,
        label: `Create action is valid for "${model.key}"`,
        ok: false,
        severity: 'warning',
        details: createAction ? `Found "${createAction}"` : 'Action is missing',
        fixHint: `Set create action to "${model.key}.create" in /models/${model.key}.`,
      });
    }

    const listingActions = fragmentSpec?.directory?.listing?.actions ?? generatedJson?.spec?.directory?.listing?.actions;
    if (!listingActions || typeof listingActions !== 'object') {
      items.push({
        key: `models:${model.key}:listing-actions-missing`,
        label: `Listing actions are configured for "${model.key}"`,
        ok: false,
        severity: 'warning',
        details: 'Missing directory.listing.actions (manage/delete).',
        fixHint: `Open /models/${model.key}, toggle listing actions, and commit spec.`,
      });
    }
  }

  for (const [route, owners] of routeOwners.entries()) {
    if (owners.length <= 1) continue;
    items.push({
      key: `models:route-collision:${route}`,
      label: `Directory route "${route}" is unique`,
      ok: false,
      severity: 'error',
      details: `Shared by models: ${owners.join(', ')}`,
      fixHint: 'Update conflicting directory routes in /models and re-commit specs.',
    });
  }

  const modelErrors = items.filter((item) => item.key.startsWith('models:') && !item.ok && item.severity === 'error').length;
  const modelWarnings = items.filter((item) => item.key.startsWith('models:') && !item.ok && item.severity === 'warning').length;
  items.push({
    key: 'models:summary',
    label: `Model spec audit summary: ${modelErrors} error(s), ${modelWarnings} warning(s)`,
    ok: modelErrors === 0,
    severity: modelErrors === 0 ? 'info' : 'error',
    details: `Audited ${auditableModels.length} admin model spec(s).`,
    fixHint: modelErrors > 0 ? `Run: pnpm -C apps/schema run site:helios:doctor ${projectName}` : undefined,
  });
}

export async function runHeliosDoctor(options: {
  appRoot: string;
  projectName: string;
  includeModelSpecs?: boolean;
}): Promise<HeliosDoctorReport> {
  const items: HeliosDoctorItem[] = [];
  const { appRoot, projectName } = options;
  const includeModelSpecs = options.includeModelSpecs !== false;

  for (const relPath of REQUIRED_ARTIFACTS) {
    const absPath = path.join(appRoot, relPath);
    const exists = await pathExists(absPath);
    items.push({
      key: `artifact:${relPath}`,
      label: `Artifact exists: ${relPath}`,
      ok: exists,
      severity: 'error',
      fixHint: `Run: pnpm -C apps/schema run site:helios:setup ${projectName}`,
    });
  }

  const nuxtAdditionsPath = path.join(appRoot, 'nuxt.config.additions.ts');
  const nuxtAdditionsSource = await readTextIfExists(nuxtAdditionsPath);
  const nuxtTokenCheck = checkTokens(nuxtAdditionsSource, NUXT_ADDITIONS_TOKENS);
  items.push({
    key: 'config:nuxt-additions',
    label: 'Nuxt additions contain Helios css/module/unocss bridge tokens',
    ok: nuxtTokenCheck.ok,
    severity: 'error',
    details: nuxtTokenCheck.ok ? undefined : `Missing tokens: ${nuxtTokenCheck.missing.join(', ')}`,
    fixHint: `Run: pnpm -C apps/schema run site:helios:setup ${projectName}`,
  });

  const unoConfigPath = path.join(appRoot, 'uno.config.ts');
  const unoConfigSource = await readTextIfExists(unoConfigPath);
  const unoTokenCheck = checkTokens(unoConfigSource, UNO_TOKENS);
  items.push({
    key: 'config:uno-bridge',
    label: 'Uno config contains Helios generated merge bridge',
    ok: unoTokenCheck.ok,
    severity: 'error',
    details: unoTokenCheck.ok ? undefined : `Missing tokens: ${unoTokenCheck.missing.join(', ')}`,
    fixHint: `Open /helios and click Commit, or run: pnpm -C apps/schema run site:helios:setup ${projectName}`,
  });

  const appVuePath = path.join(appRoot, 'app/app.vue');
  const appVueSource = await readTextIfExists(appVuePath);
  const hasNuxtPage = Boolean(appVueSource && appVueSource.includes('<NuxtPage'));
  items.push({
    key: 'app:shell',
    label: 'App shell includes <NuxtPage />',
    ok: hasNuxtPage,
    severity: 'warning',
    fixHint: `Run: pnpm -C apps/schema run site:helios:setup ${projectName}`,
  });

  const rootIndexPath = path.join(appRoot, 'app/pages/index.vue');
  const hasRootIndex = await pathExists(rootIndexPath);
  items.push({
    key: 'app:root-index',
    label: 'Root page exists (app/pages/index.vue)',
    ok: hasRootIndex,
    severity: 'info',
    fixHint: `Optional: run pnpm -C apps/schema run site:helios:setup ${projectName} to scaffold redirect to /helios.`,
  });

  const packageJsonPath = path.join(appRoot, 'package.json');
  const packageJsonSource = await readTextIfExists(packageJsonPath);
  const packageJson = readJsonSafe<{
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }>(packageJsonSource);
  const installed = new Set<string>([
    ...Object.keys(packageJson?.dependencies ?? {}),
    ...Object.keys(packageJson?.devDependencies ?? {}),
  ]);
  const missingPackages = REQUIRED_PACKAGES.filter((pkg) => !installed.has(pkg));
  items.push({
    key: 'deps:helios',
    label: 'Required Helios packages are installed',
    ok: missingPackages.length === 0,
    severity: 'error',
    details: missingPackages.length > 0 ? `Missing: ${missingPackages.join(', ')}` : undefined,
    fixHint: `Run: pnpm -C apps/schema run site:helios:setup ${projectName} (or install missing packages manually).`,
  });

  const layersLockPath = path.join(appRoot, 'layers.lock.json');
  const layersLockSource = await readTextIfExists(layersLockPath);
  const layersLock = readJsonSafe<{ layers?: Array<{ name?: string }> }>(layersLockSource);
  const hasHeliosLayer = Boolean(
    layersLock?.layers?.some((entry) => String(entry?.name ?? '') === 'helios'),
  );
  items.push({
    key: 'layers:helios',
    label: 'Layer lock includes helios layer',
    ok: hasHeliosLayer,
    severity: 'warning',
    fixHint: `Run: pnpm -C apps/schema run site:layers:add ${projectName} helios`,
  });

  if (includeModelSpecs) {
    await appendModelSpecItems(items, appRoot, projectName);
  }

  const errorCount = items.filter((item) => !item.ok && item.severity === 'error').length;
  const warningCount = items.filter((item) => !item.ok && item.severity === 'warning').length;

  return {
    projectName,
    appRoot,
    items,
    errorCount,
    warningCount,
    ready: errorCount === 0,
  };
}

export function printHeliosDoctorReport(report: HeliosDoctorReport, repoRoot: string) {
  const relRoot = path.relative(repoRoot, report.appRoot) || '.';
  console.log(`\n🩺 Helios doctor report for ${report.projectName} (${relRoot})`);

  for (const item of report.items) {
    const prefix = item.ok ? '✅' : (item.severity === 'error' ? '❌' : item.severity === 'warning' ? '⚠️' : 'ℹ️');
    console.log(`${prefix} ${item.label}`);
    if (!item.ok && item.details) {
      console.log(`   ↳ ${item.details}`);
    }
    if (!item.ok && item.fixHint) {
      console.log(`   ↳ Fix: ${item.fixHint}`);
    }
  }

  console.log('');
  console.log(`Errors: ${report.errorCount}`);
  console.log(`Warnings: ${report.warningCount}`);
  console.log(`Ready: ${report.ready ? 'yes' : 'no'}`);
}
