import { mkdir, readdir, unlink } from 'fs/promises';
import path from 'path';

import type { TableIndexConfig, TableMigrationConfig } from '../types';
import { getTableAssetDir } from './tableAssetPaths';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker } from './assetTracker';
import { readSurqlFiles, writeGeneratedAsset } from './assetWriter';

interface GenerateIndexOptions {
  tables: TableMigrationConfig[];
  outputRoot: string;
  assetTracking?: AssetTrackingOptions;
}

interface IndexFileDefinition {
  fileName: string;
  content: string;
}

export async function generateTableIndexes(options: GenerateIndexOptions): Promise<void> {
  const { tables, outputRoot } = options;
  const tracker = await createAssetTracker(options.assetTracking);
  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tablesByModel.set(model, table);
    }
  }

  for (const table of tables) {
    if (!Array.isArray(table.indexes) || table.indexes.length === 0) {
      continue;
    }

    const indexFiles = buildIndexFiles(table);
    if (indexFiles.length === 0) {
      continue;
    }

    const tableDir = getTableAssetDir(table, tablesByModel, outputRoot);
    const previousFiles = await readSurqlFiles(tableDir);
    await mkdir(tableDir, { recursive: true });
    await clearExistingIndexes(tableDir);

    for (const indexFile of indexFiles) {
      const filePath = path.join(tableDir, indexFile.fileName);
      const prev = previousFiles.get(filePath);
      await writeGeneratedAsset({
        filePath,
        content: indexFile.content,
        tracker,
        compareContent: prev,
        meta: {
          source: 'generated',
          layer: 'indexes',
          table: table.table?.model ?? table.name,
        },
      });
      console.log(`#️⃣ Generated index: ${path.relative(process.cwd(), filePath)}`);
    }
  }
}

function buildIndexFiles(table: TableMigrationConfig): IndexFileDefinition[] {
  const tableModel = table.table?.model;
  if (!tableModel) {
    return [];
  }

  const files: IndexFileDefinition[] = [];
  for (const indexConfig of table.indexes ?? []) {
    const content = buildIndexStatement(tableModel, indexConfig);
    if (!content) {
      continue;
    }

    const fileName = buildIndexFileName(table, indexConfig);
    files.push({
      fileName,
      content: `${content}\n`,
    });
  }

  return files;
}

function buildIndexStatement(tableModel: string, index: TableIndexConfig): string | null {
  const indexName = index.name?.trim();
  if (!indexName) {
    return null;
  }

  const mode = (index.mode ?? 'OVERWRITE').toUpperCase();
  const targetTable = index.table ?? tableModel;
  const keyword = index.keyword ?? 'FIELDS';
  const fieldList = normalizeFieldList(index);
  const specialClause = buildSpecialClause(index);

  if (!index.count && fieldList.length === 0) {
    return null;
  }

  const segments: string[] = [];
  segments.push(`DEFINE INDEX ${mode} ${indexName} ON TABLE ${targetTable}`);

  if (!index.count && fieldList.length > 0) {
    segments.push(`  ${keyword.toUpperCase()} ${fieldList.join(', ')}`);
  }

  if (index.count) {
    segments.push('  COUNT');
  } else if (specialClause) {
    segments.push(`  ${specialClause}`);
  }

  if (index.comment) {
    segments.push(`  COMMENT ${JSON.stringify(index.comment)}`);
  }

  if (index.concurrently) {
    segments.push('  CONCURRENTLY');
  }

  segments[segments.length - 1] = `${segments[segments.length - 1]};`;

  return segments.join('\n');
}

function normalizeFieldList(index: TableIndexConfig): string[] {
  const sources = index.columns ?? index.fields ?? [];
  const values: string[] = [];

  for (const entry of sources) {
    if (typeof entry === 'string') {
      const value = entry.trim();
      if (value) {
        values.push(value);
      }
      continue;
    }

    if (Array.isArray(entry)) {
      const value = entry.map((part) => String(part).trim()).filter(Boolean).join(' ');
      if (value) {
        values.push(value);
      }
      continue;
    }

    if (typeof entry === 'object' && entry !== null) {
      for (const key of Object.keys(entry)) {
        if (key) {
          values.push(key);
        }
      }
    }
  }

  return values;
}

function buildSpecialClause(index: TableIndexConfig): string | null {
  if (isUniqueIndex(index)) {
    return 'UNIQUE';
  }

  if (index.fulltext) {
    const parts = [`FULLTEXT ANALYZER ${index.fulltext.analyzer}`];
    if (index.fulltext.bm25) {
      const { k1, b } = index.fulltext.bm25;
      if (k1 !== undefined || b !== undefined) {
        const params: string[] = [];
        if (k1 !== undefined) params.push(String(k1));
        if (b !== undefined) params.push(String(b));
        parts.push(params.length > 0 ? `BM25 (${params.join(', ')})` : 'BM25');
      } else {
        parts.push('BM25');
      }
    }
    if (index.fulltext.highlights) {
      parts.push('HIGHLIGHTS');
    }
    return parts.join(' ');
  }

  if (index.special) {
    return index.special;
  }

  if (index.rawClause) {
    return index.rawClause;
  }

  return null;
}

function isUniqueIndex(index: TableIndexConfig): boolean {
  if (typeof index.unique === 'boolean') {
    return index.unique;
  }
  if (typeof index.type === 'string') {
    return index.type.toLowerCase() === 'unique';
  }
  return false;
}

function buildIndexFileName(table: TableMigrationConfig, index: TableIndexConfig): string {
  const tableLabel = table.name || table.table?.model || 'Table';
  const indexLabel = index.name || 'Index';
  return `I_${toPascalCase(tableLabel)}${toPascalCase(indexLabel)}.surql`;
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

async function clearExistingIndexes(dir: string): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.startsWith('I_'))
        .map((entry) => unlink(path.join(dir, entry.name)))
    );
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}
