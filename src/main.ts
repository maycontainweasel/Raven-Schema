#!/usr/bin/env node

import path from 'path';

import { loadConfigBundle } from './lib/configLoader';
import { MigrationRunner } from './lib/tableRunner';
import { generateTableTypes } from './lib/typeGenerator';
import { generateTrpcRouters } from './lib/routerGenerator';
import { generateTableFunctions } from './lib/functionGenerator';
import { generateResourceViews } from './lib/resourceViewGenerator';
import { generateTableIndexes } from './lib/indexGenerator';
import { writeTableBundles } from './lib/tableBundleWriter';
import { runTableEdges } from './lib/edgeRunner';
import { runTableEvents } from './lib/eventRunner';
import { runBootstrapFunctions, runBootstrapTables } from './lib/bootstrapRunner';
import { attachChildBootstrapEventsWithMode } from './lib/subtableEvents';
import { generateTableTaxonomies } from './lib/taxonomyGenerator';
import { generateTableRelations } from './lib/relationGenerator';
import { writeSchemaKitConfig, resolveSchemaKitFeatures } from './lib/schemaKitConfig';
import type { AppConfig, AppDatabaseConfig } from './types';

interface RuntimeToggles {
  runTableDefinitions: boolean;
  dryRun: boolean;
  tableDefineMode: 'OVERWRITE' | 'IF NOT EXISTS';
  applyEdges: boolean;
  generateTypes: boolean;
  generateRouters: boolean;
  generateFunctions: boolean;
  generateResourceViews: boolean;
  generateIndexes: boolean;
  importAutoFunctions: boolean;
  applyEvents: boolean;
  bootstrapFunctions: boolean;
  bootstrapTables: boolean;
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const args = new Set(rawArgs);
  const dryRun = args.has('--dry-run');
  const forceGenerateOnly = args.has('--generate');
  const forceApplyOnly = args.has('--migrate');

  const runGeneration = forceApplyOnly
    ? false
    : forceGenerateOnly
      ? true
      : !args.has('--no-generate');

  const runApply = forceGenerateOnly
    ? false
    : forceApplyOnly
      ? true
      : !args.has('--no-apply');

  const toggles: RuntimeToggles = {
    runTableDefinitions: runApply,
    dryRun,
    tableDefineMode: 'OVERWRITE',
    applyEdges: runApply,
    generateTypes: runGeneration,
    generateRouters: runGeneration,
    generateFunctions: runGeneration,
    generateResourceViews: runGeneration,
    generateIndexes: runGeneration,
    importAutoFunctions: runApply,
    applyEvents: runApply,
    bootstrapFunctions: runApply,
    bootstrapTables: runApply,
  };

  const projectRoot = path.resolve(process.cwd());
  const migrationsOutputDir = path.resolve(projectRoot, 'config/migrations');

  console.log('⚙️  Schema Tools Runner');
  console.log(`📁 Root: ${projectRoot}`);
  console.log(
    `🧩 Mode -> generation: ${runGeneration ? 'on' : 'off'}, apply: ${runApply ? 'on' : 'off'}${
      dryRun ? ' (dry-run)' : ''
    }`
  );

  const configBundle = await loadConfigBundle(projectRoot);
  const { app, tableMigrations, imports } = configBundle;
  const targetProjects = app.paths.projects ?? [];
  const databaseTargets = resolveDatabaseTargets(app, rawArgs);
  console.log(
    `🗃️  Database target(s): ${databaseTargets.map((target) => target.name).join(', ')}`
  );

  const subtableCreateMode = app.events?.subtableCreateMode ?? 'function';
  attachChildBootstrapEventsWithMode(tableMigrations, subtableCreateMode);

  console.log(`🗂️  Loaded ${tableMigrations.length} table definition(s) from ${app.paths.migrations}`);

  if (toggles.runTableDefinitions) {
    for (const target of databaseTargets) {
      console.log(`📐 Defining tables on ${formatDatabaseTarget(target)}`);
      const runner = new MigrationRunner(target.config, tableMigrations, {
        dryRun: toggles.dryRun,
        tableDefineMode: toggles.tableDefineMode,
      });
      await runner.run();
    }
  } else {
    console.log('⏭️  Skipping table definitions (toggle disabled).');
  }

  if (toggles.applyEdges) {
    for (const target of databaseTargets) {
      console.log(`🪢 Applying edges on ${formatDatabaseTarget(target)}`);
      await runTableEdges(target.config, tableMigrations, {
        dryRun: toggles.dryRun,
      });
    }
  } else {
    console.log('⏭️  Skipping edge definitions (toggle disabled).');
  }

  if (toggles.bootstrapFunctions) {
    for (const target of databaseTargets) {
      console.log(`📦 Importing bootstrap functions on ${formatDatabaseTarget(target)}`);
      await runBootstrapFunctions(target.config, imports.bootstrap?.functions, {
        dryRun: toggles.dryRun,
      });
    }
  } else {
    console.log('⏭️  Skipping bootstrap functions (toggle disabled).');
  }

  if (toggles.bootstrapTables) {
    for (const target of databaseTargets) {
      console.log(`🧱 Running bootstrap tables on ${formatDatabaseTarget(target)}`);
      await runBootstrapTables(target.config, imports.bootstrap?.tables, {
        dryRun: toggles.dryRun,
      });
    }
  } else {
    console.log('⏭️  Skipping bootstrap tables (toggle disabled).');
  }

  if (toggles.generateTypes) {
    let generatedCount = 0;
    for (const project of targetProjects) {
      const typesPath = project.generated?.types;
      if (!typesPath) continue;
      const typesOutputDir = path.resolve(projectRoot, typesPath);
      await generateTableTypes({
        tables: tableMigrations,
        outputRoot: typesOutputDir,
      });
      console.log(`🧾 Generated type definitions for ${project.name} in ${typesOutputDir}`);
      generatedCount += 1;
    }
    if (generatedCount === 0) {
      console.log('⚠️  No type generation targets configured (paths.projects[].generated.types).');
    }
  } else {
    console.log('⏭️  Skipping type generation (toggle disabled).');
  }

  if (toggles.generateRouters) {
    let routerCount = 0;
    for (const project of targetProjects) {
      const routersPath = project.generated?.trpcRouters;
      if (!routersPath) continue;
      const routersOutputDir = path.resolve(projectRoot, routersPath);
      const featureConfig = resolveSchemaKitFeatures(app, project);
      const includeRedisRouter = featureConfig?.redis?.enabled === true;
      await generateTrpcRouters({
        tables: tableMigrations,
        outputRoot: routersOutputDir,
        contextImport: app.trpc?.contextImport ?? '@server/context',
        schemaImportPath: project.imports?.schemaTypes ?? '~~/app/types/schema/generated',
        requestSchemaImportPath: project.imports?.requestSchema ?? '@schema/request-schema',
        includeRedisRouter,
      });
      await writeSchemaKitConfig({ projectRoot, project, app });
      console.log(`🛠️  Generated TRPC routers for ${project.name} in ${path.join(routersOutputDir, 'generated')}`);
      routerCount += 1;
    }
    if (routerCount === 0) {
      console.log('⚠️  No TRPC router targets configured (paths.projects[].generated.trpcRouters).');
    }
  } else {
    console.log('⏭️  Skipping router generation (toggle disabled).');
  }

  if (toggles.generateFunctions) {
    await generateTableFunctions({
      tables: tableMigrations,
      outputRoot: migrationsOutputDir,
      assetTracking: { projectRoot },
      subtableCreateMode,
    });
    await generateTableTaxonomies({
      tables: tableMigrations,
      outputRoot: migrationsOutputDir,
      assetTracking: { projectRoot },
    });

    await generateTableRelations({
      tables: tableMigrations,
      outputRoot: migrationsOutputDir,
      assetTracking: { projectRoot },
    });
  } else {
    console.log('⏭️  Skipping function generation (toggle disabled).');
  }

  if (toggles.generateResourceViews) {
    await generateResourceViews({
      tables: tableMigrations,
      outputRoot: migrationsOutputDir,
      assetTracking: { projectRoot },
    });
    console.log(`📄 Generated views in ${migrationsOutputDir}`);
  } else {
    console.log('⏭️  Skipping view generation (toggle disabled).');
  }

  if (toggles.generateIndexes) {
    await generateTableIndexes({
      tables: tableMigrations,
      outputRoot: migrationsOutputDir,
      assetTracking: { projectRoot },
    });
    console.log(`#️⃣ Generated indexes in ${migrationsOutputDir}`);
  } else {
    console.log('⏭️  Skipping index generation (toggle disabled).');
  }

  if (runGeneration) {
    await writeTableBundles(tableMigrations, migrationsOutputDir, { projectRoot });
  } else {
    console.log('⏭️  Skipping bundle generation (generation disabled).');
  }

  if (toggles.importAutoFunctions) {
    if (imports.auto?.functions) {
      for (const target of databaseTargets) {
        console.log(`🔁 Importing auto functions on ${formatDatabaseTarget(target)}`);
        await runBootstrapFunctions(
          target.config,
          imports.auto.functions,
          {
            dryRun: toggles.dryRun,
          },
          path.resolve(projectRoot, 'config')
        );
      }
    } else {
      console.log('ℹ️  No auto function imports configured; skipping.');
    }
  } else {
    console.log('⏭️  Skipping auto function imports (toggle disabled).');
  }

  if (toggles.applyEvents) {
    for (const target of databaseTargets) {
      console.log(`🎛️  Applying table events on ${formatDatabaseTarget(target)}`);
      await runTableEvents(target.config, tableMigrations, {
        dryRun: toggles.dryRun,
      });
    }
  } else {
    console.log('⏭️  Skipping event definitions (toggle disabled).');
  }

  console.log('✅ Schema tooling execution complete.');
}

main().catch((error) => {
  console.error('❌ Schema tooling failed:', error);
  process.exitCode = 1;
});

interface DatabaseTarget {
  name: string;
  config: AppDatabaseConfig;
}

function resolveDatabaseTargets(app: AppConfig, rawArgs: string[]): DatabaseTarget[] {
  const explicitTarget =
    extractFlagValue(rawArgs, '--database') ?? extractFlagValue(rawArgs, '--db');

  const databaseNames = explicitTarget
    ? [explicitTarget]
    : Array.from(
        new Set(
          [
            ...(Array.isArray(app.environment.migrationTargets)
              ? app.environment.migrationTargets
              : []),
            ...Object.entries(app.databases)
              .filter(([, cfg]) => cfg && cfg.active !== false)
              .map(([key]) => key),
            app.environment.defaultDatabase,
          ].filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        )
      );

  if (databaseNames.length === 0) {
    throw new Error('No database targets configured. Check environment.defaultDatabase or migrationTargets.');
  }

  const targets: DatabaseTarget[] = [];
  for (const name of databaseNames) {
    const config = app.databases[name];
    if (!config) {
      throw new Error(`Database "${name}" is not defined in app.config.yaml`);
    }
    if (config.active === false) {
      console.warn(`⚠️  Database "${name}" is inactive (active: false); skipping.`);
      continue;
    }
    targets.push({ name, config });
  }

  if (targets.length === 0) {
    throw new Error('No active database targets available. Set active: true in app.config.yaml or choose a different database.');
  }

  return targets;
}

function extractFlagValue(args: string[], ...flags: string[]): string | null {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg) {
      continue;
    }
    for (const flag of flags) {
      if (arg === flag) {
        const value = args[i + 1];
        if (!value || value.startsWith('--')) {
          throw new Error(`Flag ${flag} requires a value`);
        }
        return value;
      }
      if (arg.startsWith(`${flag}=`)) {
        const value = arg.slice(flag.length + 1);
        if (!value) {
          throw new Error(`Flag ${flag} requires a value`);
        }
        return value;
      }
    }
  }
  return null;
}

function formatDatabaseTarget(target: DatabaseTarget): string {
  return `${target.name} (${target.config.namespace}/${target.config.database})`;
}
