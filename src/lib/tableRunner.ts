import type { Surreal } from 'surrealdb';

import type { TableMigrationConfig, AppDatabaseConfig, SchemaMode } from '../types';
import { connectSurreal } from './surrealClient';

export interface TableRunnerOptions {
  dryRun?: boolean;
  tableDefineMode?: 'OVERWRITE' | 'IF NOT EXISTS';
}

export class MigrationRunner {
  private readonly tables: TableMigrationConfig[];
  private readonly instance: AppDatabaseConfig;
  private db: Surreal | null = null;
  private readonly options: TableRunnerOptions;

  constructor(
    instance: AppDatabaseConfig,
    tables: TableMigrationConfig[],
    options: TableRunnerOptions = {}
  ) {
    this.instance = instance;
    this.tables = tables;
    this.options = options;
  }

  async run(): Promise<void> {
    await this.ensureConnection();

    for (const table of this.tables) {
      await this.processTable(table);
    }

    await this.closeConnection();
  }

  private async ensureConnection(): Promise<void> {
    if (this.options.dryRun) {
      return;
    }

    if (this.db) {
      return;
    }

    const surreal = await connectSurreal(this.instance);
    this.db = surreal;
  }

  private async closeConnection(): Promise<void> {
    if (!this.db) {
      return;
    }

    await this.db.close();
    this.db = null;
  }

  private async processTable(table: TableMigrationConfig): Promise<void> {
    const tableName = table.table?.model;
    if (!tableName) {
      throw new Error(`Table config "${table.name}" missing table.model`);
    }
    const mode = (this.options.tableDefineMode ?? 'OVERWRITE').toUpperCase();
    const normalizedMode = mode === 'IF NOT EXISTS' ? 'IF NOT EXISTS' : 'OVERWRITE';

    const tableType = (table.table?.type ?? 'NORMAL').toUpperCase();
    const schemaMode = normalizeSchemaMode(table.table?.schemaMode);
    const permissions = table.table?.permissions
      ? table.table.permissions.toUpperCase()
      : 'FULL';

    const segments = [
      `DEFINE TABLE ${normalizedMode} ${tableName}`,
      `TYPE ${tableType}`,
      schemaMode === 'SCHEMALESS' ? 'SCHEMALESS' : 'SCHEMAFULL',
      `PERMISSIONS ${permissions}`,
    ];

    const statement = `${segments.join(' ')};`;

    if (this.options.dryRun) {
      console.log(`[dry-run] ${statement}`);
      return;
    }

    if (!this.db) {
      throw new Error('SurrealDB connection not initialized');
    }

    console.log(`Applying table definition for ${table.name} (${tableName})`);
    await this.db.query(statement);
  }
}

function normalizeSchemaMode(mode?: SchemaMode): 'SCHEMAFULL' | 'SCHEMALESS' {
  if (!mode) {
    return 'SCHEMALESS';
  }

  return mode === 'schemaful' ? 'SCHEMAFULL' : 'SCHEMALESS';
}
