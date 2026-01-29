import type { AppDatabaseConfig, TableMigrationConfig } from '../types';
import { buildEventStatement, collectEvents } from './eventUtils';
import { cleanupTableArtifacts } from './tableCleanup';
import { connectSurreal } from './surrealClient';

interface EventRunnerOptions {
  dryRun?: boolean;
}

export async function runTableEvents(
  database: AppDatabaseConfig,
  tables: TableMigrationConfig[],
  options: EventRunnerOptions = {}
): Promise<void> {
  const events = collectEvents(tables);

  if (events.length === 0) {
    console.log('ℹ️  No table events defined; skipping.');
    return;
  }

  if (options.dryRun) {
    for (const event of events) {
      const statement = buildEventStatement(event);
      console.log(`[dry-run] ${statement}`);
    }
    return;
  }

  const db = await connectSurreal(database);

  try {
    const cleanupPlan = buildEventCleanupPlan(events);
    for (const tableName of cleanupPlan) {
      await cleanupTableArtifacts(db, tableName, {
        dropEvents: true,
        dryRun: false,
      });
    }

    for (const event of events) {
      const statement = buildEventStatement(event);
      console.log(`⚙️  Applying event ${event.name} on ${event.table}`);
      await db.query(statement);
    }
  } finally {
    await db.close();
  }
}

// Uses connectSurreal helper.

function buildEventCleanupPlan(events: ReturnType<typeof collectEvents>): string[] {
  const tables = new Set<string>();
  for (const event of events) {
    const tableName = event.table;
    if (tableName) {
      tables.add(tableName);
    }
  }
  return Array.from(tables.values());
}
