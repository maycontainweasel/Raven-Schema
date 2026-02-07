import { mkdir, readdir, readFile } from 'fs/promises';
import path from 'path';

import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker } from './assetTracker';
import { writeGeneratedAsset } from './assetWriter';

interface IndexRef {
  table: string;
  name: string;
}

interface GenerateIndexUtilityOptions {
  projectRoot: string;
  migrationsRoot: string;
  modulesRoot?: string;
  modules?: string[];
  outputPath?: string;
  assetTracking?: AssetTrackingOptions;
}

const INDEX_DEFINE_REGEX =
  /\bDEFINE\s+INDEX(?:\s+OVERWRITE|\s+IF\s+NOT\s+EXISTS)?\s+([A-Za-z_][A-Za-z0-9_]*)\s+ON\s+TABLE\s+([A-Za-z_][A-Za-z0-9_]*)/gi;

export async function generateIndexUtilityFunctions(
  options: GenerateIndexUtilityOptions
): Promise<IndexRef[]> {
  const tracker = await createAssetTracker(options.assetTracking);
  const roots: string[] = [options.migrationsRoot];

  if (options.modulesRoot && Array.isArray(options.modules) && options.modules.length > 0) {
    for (const moduleName of options.modules) {
      if (!moduleName || typeof moduleName !== 'string') continue;
      roots.push(path.resolve(options.modulesRoot, moduleName, 'migrations'));
    }
  }

  const indexes = await collectIndexes(roots);
  const outputPath =
    options.outputPath ??
    path.resolve(
      options.projectRoot,
      'config',
      'bootstrap',
      'functions',
      'utility',
      'refreshSchemaIndexes.surql'
    );

  await mkdir(path.dirname(outputPath), { recursive: true });

  await writeGeneratedAsset({
    filePath: outputPath,
    content: buildIndexUtilityContent(indexes),
    tracker,
    meta: {
      source: 'generated',
      layer: 'functions',
      table: 'bootstrap',
    },
  });

  console.log(`🧰 Generated index utility function: ${path.relative(process.cwd(), outputPath)}`);
  return indexes;
}

async function collectIndexes(roots: string[]): Promise<IndexRef[]> {
  const dedup = new Map<string, IndexRef>();

  for (const root of roots) {
    const files = await listSurqlFiles(root);
    for (const filePath of files) {
      const source = await readFile(filePath, 'utf-8').catch(() => null);
      if (!source) continue;
      const matches = source.matchAll(INDEX_DEFINE_REGEX);
      for (const match of matches) {
        const indexName = match[1];
        const tableName = match[2];
        if (!indexName || !tableName) continue;
        const key = `${tableName.toLowerCase()}::${indexName.toLowerCase()}`;
        if (dedup.has(key)) continue;
        dedup.set(key, { table: tableName, name: indexName });
      }
    }
  }

  return Array.from(dedup.values()).sort((a, b) => {
    const tableCmp = a.table.localeCompare(b.table);
    if (tableCmp !== 0) return tableCmp;
    return a.name.localeCompare(b.name);
  });
}

async function listSurqlFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = await readdir(current, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.surql')) {
        out.push(fullPath);
      }
    }
  }

  return out;
}

function buildIndexUtilityContent(indexes: IndexRef[]): string {
  const registryEntries =
    indexes.length > 0
      ? indexes
          .map(
            (index) => `\t\t{ table: ${JSON.stringify(index.table)}, name: ${JSON.stringify(index.name)} },`
          )
          .join('\n')
      : '\t\t-- No indexes discovered during generation.';

  const rebuildStatements = indexes
    .map((index) => `\tREBUILD INDEX IF EXISTS ${index.name} ON TABLE ${index.table};`)
    .join('\n');

  const lines = [
    'DEFINE FUNCTION OVERWRITE fn::schemaIndexRegistry() {',
    '\treturn [',
    registryEntries,
    '\t];',
    '};',
    '',
    'DEFINE FUNCTION OVERWRITE fn::refreshSchemaIndexes() {',
    '\tlet $indexes = fn::schemaIndexRegistry();',
    '\tlet $indexes = if type::is_array($indexes) { $indexes } else { [] };',
    '',
    '\tUPSERT app:indexes CONTENT {',
    '\t\tupdatedAt: time::now(),',
    '\t\tindexes: $indexes',
    '\t};',
    '',
    rebuildStatements || '\t-- No index rebuild statements generated.',
    '',
    '\treturn $indexes;',
    '};',
    '',
  ];

  return lines.join('\n');
}
