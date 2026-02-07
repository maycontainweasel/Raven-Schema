import path from 'path';
import { readdir, rename, stat, unlink } from 'fs/promises';

import { generateTableFunctions } from '../lib/functionGenerator';
import { generateResourceViews } from '../lib/resourceViewGenerator';
import { generateTableIndexes } from '../lib/indexGenerator';
import { generateTableEdges } from '../lib/edgeGenerator';
import { writeTableBundles } from '../lib/tableBundleWriter';
import {
  loadAppConfig,
  loadTableMigrations,
  resolveModuleOverridesDir,
  resolveModulesConfig,
} from '../lib/configLoader';
import { normalizeCrudConfig } from '../lib/crudHelpers';
import { generateTrpcRouters } from '../lib/routerGenerator';
import type { TableMigrationConfig } from '../types';
import { removeEmptyDirs } from '../lib/fsUtils';

export interface ModuleGenerateOptions {
  projectRoot: string;
  modulesRoot: string;
  modules: string[];
}

export async function generateModules(options: ModuleGenerateOptions): Promise<void> {
  const { projectRoot, modulesRoot, modules } = options;
  const appConfig = await loadAppConfig(projectRoot).catch(() => null);
  const instanceConfig = appConfig?.instance;

  for (const mod of modules) {
    const specsDir = path.resolve(modulesRoot, mod, 'specs');
    const overridesDir = resolveModuleOverridesDir(modulesRoot, mod);
    const migrationsOut = path.resolve(modulesRoot, mod, 'migrations');

    let tables: TableMigrationConfig[] = [];
    try {
      tables = await loadTableMigrations(specsDir, instanceConfig ?? undefined, overridesDir);
    } catch (error: any) {
      console.warn(
        `ℹ️  No specs loaded for module "${mod}" (from ${specsDir}):`,
        error.message ?? error
      );
      tables = [];
    }

    if (tables.length > 0) {
      warnMissingCrudOrRouter(tables, mod);

      await generateTableFunctions({
        tables,
        outputRoot: migrationsOut,
        assetTracking: { projectRoot },
        eventFileMode: appConfig?.events?.fileMode,
      });
      await generateTableEdges({ tables, outputRoot: migrationsOut, assetTracking: { projectRoot } });
      await generateResourceViews({ tables, outputRoot: migrationsOut, assetTracking: { projectRoot } });
      await generateTableIndexes({ tables, outputRoot: migrationsOut, assetTracking: { projectRoot } });
      await writeTableBundles(tables, migrationsOut, { projectRoot });

      await flattenSingleTableDir(migrationsOut);
      await removeDuplicateBasenames(migrationsOut);
      await removeEmptyDirs(migrationsOut);

      console.log(`✅ Generated module assets for "${mod}" into ${path.relative(projectRoot, migrationsOut)}`);
    } else {
      console.log(`ℹ️  No generated assets for module "${mod}" (no specs). Static files, if any, remain untouched.`);
    }
  }

  if (appConfig?.paths?.projects?.length) {
    const baseSpecsDir = path.resolve(projectRoot, appConfig.paths.migrations);
    let baseTables: TableMigrationConfig[] = [];
    try {
      baseTables = await loadTableMigrations(baseSpecsDir, instanceConfig ?? undefined);
    } catch (error: any) {
      console.warn(
        `ℹ️  No base specs loaded for router generation (from ${baseSpecsDir}):`,
        error.message ?? error
      );
      baseTables = [];
    }

    const configuredModules = resolveModulesConfig(appConfig).enabled ?? [];
    const moduleNamesForRouters = configuredModules.length > 0 ? configuredModules : modules;
    const moduleTablesForRouters: TableMigrationConfig[] = [];

    for (const mod of moduleNamesForRouters) {
      const specsDir = path.resolve(modulesRoot, mod, 'specs');
      const overridesDir = resolveModuleOverridesDir(modulesRoot, mod);
      try {
        const tables = await loadTableMigrations(specsDir, instanceConfig ?? undefined, overridesDir);
        moduleTablesForRouters.push(...tables);
      } catch (error: any) {
        console.warn(
          `ℹ️  No module specs loaded for router generation "${mod}" (from ${specsDir}):`,
          error.message ?? error
        );
      }
    }

    const tablesByModel = new Map<string, TableMigrationConfig>();
    const mergedTables = [...baseTables, ...moduleTablesForRouters];
    for (const table of mergedTables) {
      const model = table.table?.model;
      if (!model) continue;
      if (!tablesByModel.has(model)) {
        tablesByModel.set(model, table);
      } else {
        console.warn(
          `⚠️  Duplicate table model "${model}" encountered during router generation; keeping first occurrence.`
        );
      }
    }

    const routerTables = Array.from(tablesByModel.values());
    for (const project of appConfig.paths.projects) {
      if (!project.generated?.trpcRouters) continue;
      const requestSchemaImport = project.imports?.requestSchema
        ? (project.imports.requestSchema === '@schema'
            ? '@schema/request-schema'
            : project.imports.requestSchema)
        : '@schema/request-schema';
      const typesenseCollectionsImport =
        project.imports?.typesenseCollections ??
        (appConfig.typesense?.projectOutput ? '@schema/typesense/collections' : undefined);
      const schemaImportPath =
        project.imports?.schemaTypes ??
        (project.generated?.types ? '@schema/types' : '~~/app/types/schema/generated');

      await generateTrpcRouters({
        tables: routerTables,
        outputRoot: path.resolve(projectRoot, project.generated.trpcRouters),
        contextImport: appConfig.trpc?.contextImport ?? '@server/context',
        schemaImportPath,
        requestSchemaImportPath: requestSchemaImport,
        typesenseCollectionsImportPath: typesenseCollectionsImport,
      });
    }
  }
}

async function flattenSingleTableDir(root: string): Promise<void> {
  let entries: string[] = [];
  try {
    entries = await readdir(root);
  } catch {
    return;
  }

  if (entries.length !== 1) return;
  const only = entries[0];
  if (!only) return;
  const onlyPath = path.join(root, only);
  const s = await stat(onlyPath).catch(() => null);
  if (!s || !s.isDirectory()) return;

  const inner = await readdir(onlyPath).catch(() => []);
  for (const entry of inner) {
    const from = path.join(onlyPath, entry);
    const dest = path.join(root, entry);
    await rename(from, dest).catch(() => undefined);
  }
  // best-effort cleanup; ignore failures
  try {
    await readdir(onlyPath);
  } catch {
    /* ignore */
  }
}

async function removeDuplicateBasenames(root: string): Promise<void> {
  const files = await listAllSurqlFiles(root);
  const groups = new Map<string, string[]>();
  for (const file of files) {
    const base = path.basename(file).toLowerCase();
    if (base.startsWith('z_')) continue; // keep bundles intact
    const list = groups.get(base) ?? [];
    list.push(file);
    groups.set(base, list);
  }

  for (const list of groups.values()) {
    if (list.length <= 1) continue;
    const sorted = list.slice().sort((a, b) => {
      const depthA = a.split(path.sep).length;
      const depthB = b.split(path.sep).length;
      return depthB - depthA; // prefer deeper paths
    });
    const [, ...remove] = sorted;
    for (const file of remove) {
      await unlink(file).catch(() => undefined);
    }
  }
}

async function listAllSurqlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (current: string) => {
    let entries: any[] = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.surql')) {
        out.push(full);
      }
    }
  };
  await walk(dir);
  return out;
}

function warnMissingCrudOrRouter(tables: TableMigrationConfig[], mod: string): void {
  const missing = tables.filter(
    (table) =>
      (table as any).crud !== false &&
      (table as any).router !== false &&
      !normalizeCrudConfig(table) &&
      !table.router &&
      !(table as any).trpc
  );
  if (missing.length === 0) return;
  const list = missing.map((t) => t.name || t.table?.model || 'table').join(', ');
  console.warn(`⚠️  Module "${mod}": No CRUD/router defined for: ${list}. Generation may emit only partial assets.`);
}
