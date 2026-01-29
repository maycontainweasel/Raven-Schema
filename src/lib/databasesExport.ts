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
  const dbLiteral = entries
    .map(([key, db]) => `  ${JSON.stringify(key)}: ${serializeDb(db)}`)
    .join(',\n');

  const activeRoots = entries.filter(([, db]) => db.root === true && db.active);
  if (activeRoots.length > 1) {
    const names = activeRoots.map(([key]) => key).join(', ');
    throw new Error(`Multiple root databases are active: ${names}. Only one root: true is allowed.`);
  }
  const rootKey = activeRoots.length === 1 ? activeRoots[0][0] : null;
  const defaultKey = JSON.stringify(app.environment?.defaultDatabase ?? '');
  const hasDefault = entries.some(([key, db]) => key === app.environment?.defaultDatabase && db.active);
  const activeFallback = entries.find(([, db]) => db.active)?.[0] ?? null;
  const resolvedDefault = rootKey ?? (hasDefault ? app.environment?.defaultDatabase : activeFallback);
  const hasResolvedDefault = Boolean(resolvedDefault);

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
    hasResolvedDefault
      ? `export const defaultDbInstance: DbInstanceKey = ${JSON.stringify(resolvedDefault)} as DbInstanceKey;`
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
    ...(db.root !== undefined ? { root: db.root } : {}),
    ...(db.allowScripting !== undefined ? { allowScripting: db.allowScripting } : {}),
  };
  return JSON.stringify(obj, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join('\n');
}
