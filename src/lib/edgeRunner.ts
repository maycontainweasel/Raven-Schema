import type {
  AppDatabaseConfig,
  EdgeDefinition,
  TableEdgesConfig,
  TableMigrationConfig,
} from '../types';
import { connectSurreal } from './surrealClient';

interface EdgeRunnerOptions {
  dryRun?: boolean;
}

export interface NormalizedEdge {
  table: string;
  inModel: string;
  outModel: string;
  unique: boolean;
  allowAnyIn: boolean;
  allowAnyOut: boolean;
}

export async function runTableEdges(
  database: AppDatabaseConfig,
  tables: TableMigrationConfig[],
  options: EdgeRunnerOptions = {}
): Promise<void> {
  const edges = collectEdges(tables);

  if (edges.length === 0) {
    console.log('ℹ️  No edge definitions found; skipping.');
    return;
  }

  if (options.dryRun) {
    for (const edge of edges) {
      const statements = buildEdgeStatements(edge);
      for (const stmt of statements) {
        console.log(`[dry-run] ${stmt}`);
      }
    }
    return;
  }

  const db = await connectSurreal(database);
  try {
    for (const edge of edges) {
      const statements = buildEdgeStatements(edge);
      console.log(`🔗 Applying edge ${edge.table} in=${edge.inModel} out=${edge.outModel}`);
      for (const stmt of statements) {
        await db.query(stmt);
      }
    }
  } finally {
    await db.close();
  }
}

export function collectEdges(tables: TableMigrationConfig[]): NormalizedEdge[] {
  const map = new Map<string, NormalizedEdge>();

  for (const table of tables) {
    if (!table.edges) continue;
    const parentModel = table.table?.model ?? sanitizeIdentifier(table.name);
    const edgesConfig = table.edges as TableEdgesConfig;

  if (edgesConfig.has) {
    for (const edge of edgesConfig.has) {
      const normalized = normalizeHasEdge(edge, parentModel);
      if (normalized) {
        map.set(edgeKey(normalized), normalized);
      }
    }
  }

    if (edgesConfig.belongs) {
      for (const edge of edgesConfig.belongs) {
        const normalized = normalizeBelongsEdge(edge, parentModel);
        if (normalized) {
          map.set(edgeKey(normalized), normalized);
        }
      }
    }
  }

  return Array.from(map.values());
}

function normalizeHasEdge(edge: EdgeDefinition, parentModel: string): NormalizedEdge | null {
  const outModel = normalizeModel(edge.out);
  if (!outModel) {
    console.warn('⚠️  Skipping has-edge without `out` value.');
    return null;
  }

  const inModel = normalizeModel(edge.in) ?? parentModel;
  const tableName = edge.table ?? defaultEdgeTable(inModel, outModel);
  const unique = resolveUnique(edge);
  const allowAnyOut = isAnyModel(outModel);

  return {
    table: tableName,
    inModel,
    outModel,
    allowAnyIn: isAnyModel(inModel),
    allowAnyOut,
    unique,
  };
}

function normalizeBelongsEdge(edge: EdgeDefinition, parentModel: string): NormalizedEdge | null {
  const inModel = normalizeModel(edge.in);
  if (!inModel) {
    console.warn('⚠️  Skipping belongs-edge without `in` value.');
    return null;
  }

  const outModel = normalizeModel(edge.out) ?? parentModel;
  const tableName = edge.table ?? defaultEdgeTable(inModel, outModel);
  const unique = resolveUnique(edge);
  const allowAnyIn = isAnyModel(inModel);

  return {
    table: tableName,
    inModel,
    outModel,
    allowAnyIn,
    allowAnyOut: isAnyModel(outModel),
    unique,
  };
}

function edgeKey(edge: NormalizedEdge): string {
  return `${sanitizeIdentifier(edge.table)}:${edge.inModel}:${edge.outModel}`;
}

function resolveUnique(edge: EdgeDefinition): boolean {
  if (typeof edge.unique === 'boolean') {
    return edge.unique;
  }
  if (edge.index) {
    return edge.index.toLowerCase() !== 'nonunique';
  }
  return true;
}

export function buildEdgeStatements(edge: NormalizedEdge): string[] {
  const statements: string[] = [];

  const parts: string[] = [`DEFINE TABLE OVERWRITE ${edge.table} SCHEMAFULL TYPE RELATION`];
  if (!edge.allowAnyIn) parts.push(`IN ${edge.inModel}`);
  if (!edge.allowAnyOut) parts.push(`OUT ${edge.outModel}`);
  statements.push(parts.join(' ') + ';');

  if (!edge.allowAnyIn) {
    statements.push(`DEFINE FIELD OVERWRITE in ON TABLE ${edge.table} TYPE record<${edge.inModel}>;`);
  } else {
    statements.push(`DEFINE FIELD OVERWRITE in ON TABLE ${edge.table};`);
  }
  if (!edge.allowAnyOut) {
    statements.push(`DEFINE FIELD OVERWRITE out ON TABLE ${edge.table} TYPE record<${edge.outModel}>;`);
  } else {
    statements.push(`DEFINE FIELD OVERWRITE out ON TABLE ${edge.table};`);
  }

  if (edge.unique) {
    statements.push(
      `DEFINE INDEX OVERWRITE ${edge.table}_unique ON TABLE ${edge.table} FIELDS in, out UNIQUE;`
    );
  }

  return statements;
}

function defaultEdgeTable(inModel: string, outModel: string): string {
  return `rel_${sanitizeIdentifier(inModel)}_${sanitizeIdentifier(outModel)}`;
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized.length > 0 ? sanitized : 'relation';
}

function isAnyModel(value: string): boolean {
  const v = value.toLowerCase();
  return v === 'any' || v === 'record';
}

function normalizeModel(value: string | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

// Uses connectSurreal helper.
