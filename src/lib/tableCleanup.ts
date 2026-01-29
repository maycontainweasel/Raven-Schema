import type { Surreal } from 'surrealdb';

export interface TableCleanupOptions {
  dropEvents?: boolean;
  dropIndexes?: boolean;
  dropViews?: boolean;
  dryRun?: boolean;
  excludeEvents?: string[];
  excludeIndexes?: string[];
  excludeViews?: string[];
  includeEvents?: string[] | '*';
  includeIndexes?: string[] | '*';
  includeViews?: string[] | '*';
}

interface TableInfoPayload {
  events?: Record<string, unknown>;
  indexes?: Record<string, unknown>;
  tables?: Record<string, unknown>;
}

/**
 * Remove existing events / indexes / view tables for a given table before re‑applying
 * generated assets. This keeps the database aligned to the current schema files.
 */
export async function cleanupTableArtifacts(
  db: Surreal,
  tableName: string,
  options: TableCleanupOptions
): Promise<void> {
  const needsCleanup = options.dropEvents || options.dropIndexes || options.dropViews;
  if (!needsCleanup) return;

  const info = await fetchTableInfo(db, tableName);
  if (!info) {
    console.warn(`⚠️  Could not read INFO FOR TABLE ${tableName}; skipping cleanup.`);
    return;
  }

  const statements: string[] = [];

  const excludeEvents = new Set((options.excludeEvents ?? []).map((name) => name.toLowerCase()));
  const excludeIndexes = new Set((options.excludeIndexes ?? []).map((name) => name.toLowerCase()));
  const excludeViews = new Set((options.excludeViews ?? []).map((name) => name.toLowerCase()));
  const includeEvents = options.includeEvents === '*'
    ? null
    : options.includeEvents && options.includeEvents.length > 0
      ? new Set(options.includeEvents.map((name) => name.toLowerCase()))
      : null;
  const includeIndexes = options.includeIndexes === '*'
    ? null
    : options.includeIndexes && options.includeIndexes.length > 0
      ? new Set(options.includeIndexes.map((name) => name.toLowerCase()))
      : null;
  const includeViews = options.includeViews === '*'
    ? null
    : options.includeViews && options.includeViews.length > 0
      ? new Set(options.includeViews.map((name) => name.toLowerCase()))
      : null;

  if (options.dropEvents && info.events) {
    for (const eventName of Object.keys(info.events)) {
      if (includeEvents && !includeEvents.has(eventName.toLowerCase())) continue;
      if (excludeEvents.has(eventName.toLowerCase())) continue;
      statements.push(`REMOVE EVENT IF EXISTS ${eventName} ON TABLE ${tableName};`);
    }
  }

  if (options.dropIndexes && info.indexes) {
    for (const indexName of Object.keys(info.indexes)) {
      if (includeIndexes && !includeIndexes.has(indexName.toLowerCase())) continue;
      if (excludeIndexes.has(indexName.toLowerCase())) continue;
      statements.push(`REMOVE INDEX IF EXISTS ${indexName} ON TABLE ${tableName};`);
    }
  }

  if (options.dropViews && info.tables) {
    for (const viewName of Object.keys(info.tables)) {
      if (includeViews && !includeViews.has(viewName.toLowerCase())) continue;
      if (excludeViews.has(viewName.toLowerCase())) continue;
      statements.push(`REMOVE TABLE IF EXISTS ${viewName};`);
    }
  }

  if (statements.length === 0) return;

  if (options.dryRun) {
    for (const stmt of statements) {
      console.log(`[cleanup][dry-run] ${stmt}`);
    }
    return;
  }

  for (const stmt of statements) {
    console.log(`[cleanup] ${stmt}`);
    await db.query(stmt);
  }
}

async function fetchTableInfo(db: Surreal, tableName: string): Promise<TableInfoPayload | null> {
  try {
    // Surreal 1.3.x does not accept quoted identifiers here; pass raw.
    const response = await db.query(`INFO FOR TABLE ${tableName};`);
    // Surreal returns an array of query results; pull the first result payload.
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

function quoteIdent(value: string): string {
  const escaped = value.replace(/"/g, '\\"');
  return `"${escaped}"`;
}
