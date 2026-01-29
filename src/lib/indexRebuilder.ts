import type { Surreal } from 'surrealdb';
import type { AppDatabaseConfig } from '../types';
import { connectSurreal } from './surrealClient';

export interface IndexRef {
  table: string;
  name: string;
}

export interface RebuildIndexOptions {
  tables?: string[];
  indexNames?: string[];
  dryRun?: boolean;
  record?: boolean;
}

export async function rebuildIndexes(
  config: AppDatabaseConfig,
  options: RebuildIndexOptions
): Promise<IndexRef[]> {
  const db = await connectSurreal(config);
  try {
    const tables = options.tables && options.tables.length > 0
      ? options.tables
      : await listTables(db);
    const indexNames = options.indexNames?.map((name) => name.toLowerCase()) ?? [];

    const indexes: IndexRef[] = [];
    for (const table of tables) {
      const info = await fetchTableInfo(db, table);
      if (!info?.indexes) continue;
      for (const name of Object.keys(info.indexes)) {
        if (indexNames.length > 0 && !indexNames.includes(name.toLowerCase())) continue;
        indexes.push({ table, name });
      }
    }

    if (options.record) {
      await db.query('UPSERT app:indexes CONTENT $payload;', {
        payload: {
          updatedAt: new Date().toISOString(),
          indexes,
        },
      });
    }

    for (const index of indexes) {
      const stmt = `REBUILD INDEX IF EXISTS ${index.name} ON TABLE ${index.table};`;
      if (options.dryRun) {
        console.log(`[rebuild][dry-run] ${stmt}`);
      } else {
        console.log(`[rebuild] ${stmt}`);
        await db.query(stmt);
      }
    }

    return indexes;
  } finally {
    await db.close();
  }
}

interface TableInfoPayload {
  indexes?: Record<string, unknown>;
}

async function listTables(db: Surreal): Promise<string[]> {
  try {
    const response = await db.query('INFO FOR DB;');
    const payload = Array.isArray(response) ? response[0] : response;
    const result = (payload as any)?.result ?? payload;
    const tables = result?.tables && typeof result.tables === 'object'
      ? Object.keys(result.tables)
      : [];
    return tables;
  } catch (error) {
    console.warn('⚠️  Failed to fetch table list:', error);
    return [];
  }
}

async function fetchTableInfo(db: Surreal, tableName: string): Promise<TableInfoPayload | null> {
  try {
    const response = await db.query(`INFO FOR TABLE ${tableName};`);
    const payload = Array.isArray(response) ? response[0] : response;
    const result = (payload as any)?.result ?? payload;
    if (result && typeof result === 'object') {
      return result as TableInfoPayload;
    }
  } catch (error) {
    console.warn(`⚠️  Failed to fetch table info for ${tableName}:`, error);
  }
  return null;
}
