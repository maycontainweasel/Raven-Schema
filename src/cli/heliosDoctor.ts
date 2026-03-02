import path from 'path';
import { readFile, stat } from 'fs/promises';

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

export async function runHeliosDoctor(options: {
  appRoot: string;
  projectName: string;
}): Promise<HeliosDoctorReport> {
  const items: HeliosDoctorItem[] = [];
  const { appRoot, projectName } = options;

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
