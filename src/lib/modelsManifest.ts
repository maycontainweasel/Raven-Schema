import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import type { AppConfig, TableMigrationConfig } from '../types';

interface GenerateModelsManifestOptions {
  app: AppConfig;
  tables: TableMigrationConfig[];
  projectRoot: string;
  outputPath?: string;
}

export async function generateModelsManifest(
  options: GenerateModelsManifestOptions
): Promise<void> {
  const { app, tables, projectRoot, outputPath: overrideOutput } = options;
  const cfg = app.modelsExport ?? {};

  const defaultOutput = path.resolve(projectRoot, 'config/generated/models.ts');
  const outputPath =
    overrideOutput ??
    (cfg.output
      ? path.isAbsolute(cfg.output)
        ? cfg.output
        : path.resolve(projectRoot, cfg.output)
      : defaultOutput);

  const content = buildModelsFile(tables);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, 'utf-8');

  console.log(`🧩 Generated models manifest: ${path.relative(projectRoot, outputPath)}`);
}

function buildModelsFile(tables: TableMigrationConfig[]): string {
  const entries = tables
    .filter((table) => table.tableType !== 'subsingle' && table.tableType !== 'submany')
    .filter((table) => table.router && table.table?.model)
    .map((table) => {
      const key = toCamel(String(table.name ?? table.table.model));
      const admin = (table as any).admin ?? {};
      const data = admin.data ?? 'local';
      const slugPolicy = admin.slugPolicy;
      return { key, table: table.table.model, data, slugPolicy };
    });

  const body = entries
    .map((entry) => {
      const props = [
        `table: ${JSON.stringify(entry.table)}`,
        `data: ${JSON.stringify(entry.data)}`,
        ...(entry.slugPolicy ? [`slugPolicy: ${JSON.stringify(entry.slugPolicy)}`] : []),
      ];
      return `  ${JSON.stringify(entry.key)}: { ${props.join(', ')} }`;
    })
    .join(',\n');

  return [
    `// AUTO-GENERATED — models manifest for admin UI`,
    `export type ModelEntry = {`,
    `  table: string;`,
    `  data: 'local' | 'remote';`,
    `  slugPolicy?: string;`,
    `};`,
    ``,
    `export const models = {`,
    body || '  // no models configured',
    `} as const;`,
    ``,
    `export type ModelKey = keyof typeof models;`,
    ``,
  ].join('\n');
}

function toCamel(value: string): string {
  const pascal = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : '';
}
