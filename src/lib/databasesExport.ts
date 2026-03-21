import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import type { AppConfig, AppDatabaseConfig } from '../types';

interface GenerateDatabasesExportOptions {
  app: AppConfig;
  projectRoot: string;
  outputPath?: string;
}

export async function generateDatabasesExport(
  options: GenerateDatabasesExportOptions
): Promise<void> {
  const { app, projectRoot, outputPath: overrideOutput } = options;
  const cfg = app.databasesExport ?? {};

  const defaultOutput = path.resolve(projectRoot, 'config/generated/databases.ts');
  const outputPath =
    overrideOutput ??
    (cfg.output
      ? path.isAbsolute(cfg.output)
        ? cfg.output
        : path.resolve(projectRoot, cfg.output)
      : defaultOutput);

  const content = buildDatabasesFile(app);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, 'utf-8');

  console.log(`🧩 Generated databases config: ${path.relative(projectRoot, outputPath)}`);
}

function buildDatabasesFile(app: AppConfig): string {
  const entries = Object.entries(app.databases ?? {});
  const instancesEnabled = app.instance?.active !== false;
  const dbLiteral = entries
    .map(([key, db]) => `  ${JSON.stringify(key)}: ${serializeDb(db)}`)
    .join(',\n');

  const hasDefault = entries.some(([key, db]) => key === app.environment?.defaultDatabase && db.active);
  const activeFallback = entries.find(([, db]) => db.active)?.[0] ?? null;
  const configuredSourceRaw = String(app.instance?.source ?? '').trim();
  const hasConfiguredSource = configuredSourceRaw.length > 0;
  const configuredSourceExists = entries.some(([key]) => key === configuredSourceRaw);
  const configuredSourceIsActive = entries.some(([key, db]) => key === configuredSourceRaw && db.active);

  if (hasConfiguredSource && !configuredSourceExists) {
    throw new Error(
      `instance.source references undefined database "${configuredSourceRaw}".`,
    );
  }

  const resolvedSource =
    (hasConfiguredSource
      ? (configuredSourceIsActive ? configuredSourceRaw : null)
      : null) ??
    (hasDefault ? app.environment?.defaultDatabase : activeFallback) ??
    entries[0]?.[0] ??
    null;

  const allDatabaseKeys = entries.map(([key]) => key);
  const tenantsSetting = app.instance?.tenants;
  const tenantKeys =
    !instancesEnabled
      ? []
      : tenantsSetting === 'auto' || typeof tenantsSetting === 'undefined'
      ? allDatabaseKeys.filter((key) => key !== resolvedSource)
      : Array.isArray(tenantsSetting)
        ? Array.from(
            new Set(
              tenantsSetting
                .map((key) => String(key ?? '').trim())
                .filter((key) =>
                  key.length > 0 &&
                  key !== resolvedSource &&
                  allDatabaseKeys.includes(key),
                ),
            ),
          )
        : [];

  if (
    Array.isArray(tenantsSetting) &&
    tenantKeys.length !== tenantsSetting.filter((value) => String(value ?? '').trim().length > 0).length
  ) {
    const unknown = tenantsSetting
      .map((value) => String(value ?? '').trim())
      .filter((key) => key.length > 0 && !allDatabaseKeys.includes(key));
    if (unknown.length > 0) {
      throw new Error(`instance.tenants contains undefined database keys: ${unknown.join(', ')}`);
    }
  }

  const hasResolvedSource = Boolean(resolvedSource);
  const tenantLiteral = tenantKeys.map((key) => JSON.stringify(key)).join(', ');

  return [
    `// AUTO-GENERATED — database credentials`,
    `export type DbInstanceConfig = {`,
    `  url: string;`,
    `  namespace: string;`,
    `  database: string;`,
    `  username: string;`,
    `  password: string;`,
    `  active: boolean;`,
    `  allowScripting?: boolean;`,
    `};`,
    ``,
    `export const dbInstances = {`,
    dbLiteral || '  // no databases configured',
    `} as const;`,
    ``,
    `export type DbInstanceKey = keyof typeof dbInstances;`,
    ``,
    `export const instancesEnabled = ${instancesEnabled ? 'true' : 'false'} as const;`,
    ``,
    hasResolvedSource
      ? `export const sourceDbInstance: DbInstanceKey = ${JSON.stringify(resolvedSource)} as DbInstanceKey;`
      : `export const sourceDbInstance: DbInstanceKey | null = null;`,
    `export const tenantDbInstances: DbInstanceKey[] = [${tenantLiteral}] as DbInstanceKey[];`,
    `export const instanceTopology = {`,
    `  enabled: instancesEnabled,`,
    `  source: sourceDbInstance,`,
    `  tenants: tenantDbInstances,`,
    `} as const;`,
    ``,
    hasResolvedSource
      ? `export const defaultDbInstance: DbInstanceKey = sourceDbInstance as DbInstanceKey;`
      : `export const defaultDbInstance: DbInstanceKey | null = null;`,
    ``,
  ].join('\n');
}

function serializeDb(db: AppDatabaseConfig): string {
  const obj = {
    url: db.url,
    namespace: db.namespace,
    database: db.database,
    username: db.username,
    password: db.password,
    active: db.active,
    ...(db.allowScripting !== undefined ? { allowScripting: db.allowScripting } : {}),
  };
  return JSON.stringify(obj, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join('\n');
}
