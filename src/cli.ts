#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { rm, stat } from 'fs/promises';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { spawn } from 'child_process';

import { scaffoldTable } from './cli/tableScaffold';
import { runNginxSetup } from './cli/nginxSetup';
import { runNginxConfig } from './cli/nginxConfig';
import { loadAppConfig, loadConfigBundle, loadTableMigrations, resolveModuleOverridesDir } from './lib/configLoader';
import { generateTableFunctions } from './lib/functionGenerator';
import { generateTableIndexes } from './lib/indexGenerator';
import { generateResourceViews } from './lib/resourceViewGenerator';
import { generateTableEdges } from './lib/edgeGenerator';
import { writeTableBundles } from './lib/tableBundleWriter';
import { attachChildBootstrapEvents } from './lib/subtableEvents';
import { generateTableTaxonomies } from './lib/taxonomyGenerator';
import { generateTableRelations } from './lib/relationGenerator';
import { generateRequestSchema } from './lib/requestSchemaGenerator';
import { generateDatabasesExport } from './lib/databasesExport';
import { generateModelsManifest } from './lib/modelsManifest';
import { generateTableTypes } from './lib/typeGenerator';
import { generateTrpcRouters } from './lib/routerGenerator';
import { generateTypesenseSchemas } from './lib/typesenseGenerator';
import { generateDocsManifest } from './lib/docsManifest';
import {
  loadUiSpecs,
  generateUiOverviewPages,
  generateUiAdminStores,
  generateUiSinglePages,
  generateUiRouteConfig,
  generateUiSpecsExport,
  generateUiManagementTestPage,
} from './lib/uiGenerator';
import { loadUiAppSpec, generateAdminNav } from './lib/uiAppGenerator';
import { generateCreateDialogOverrides, generateLayoutOverrides } from './lib/uiOverrideGenerator';
import { scaffoldControllerOverrides } from './lib/controllerScaffold';
import { generateControllers } from './lib/controllerGenerator';
import { generateControllerDocs } from './lib/controllerDocGenerator';
import { clearModuleGeneratedAssets } from './lib/moduleCleaner';
import { scaffoldContextOverrides } from './lib/contextScaffold';
import { importSurqlAssets } from './lib/surqlImporter';
import { importModules } from './lib/modulesImporter';
import { resolveModulesConfig } from './lib/configLoader';
import { runBootstrapFunctions } from './lib/bootstrapRunner';
import { rebuildIndexes } from './lib/indexRebuilder';
import { generateModules } from './cli/moduleGenerate';
import { importSeeds } from './lib/seedImporter';
import { writeSchemaKitConfig, resolveSchemaKitFeatures } from './lib/schemaKitConfig';
import { ensureSchemaKitModule } from './lib/schemaKitModule';
import { syncProjectLayers } from './lib/layerSync';
import { writeAuthLayerConfig } from './lib/layerConfigWriter';
import {
  checkProjectSetup,
  buildInstallHint,
  applyProjectSetupFixes,
  applyEnvFileFixes,
  ensureRedisCompose,
  ensureTypesenseCompose,
} from './lib/projectSetup';
import {
  diffAssets,
  fetchRemoteAssets,
  fetchRemoteAssetsWithRaw,
  isIgnoredAssetKey,
  loadLocalManifest,
} from './lib/assetDiff';
import { DEFAULT_ASSET_RECORD_ID } from './lib/assetTracker';
import { connectSurreal } from './lib/surrealClient';
import { normalizeCrudConfig } from './lib/crudHelpers';
import { normalizeOnExisting } from './lib/onExisting';
import { buildTableFileNameCandidates, matchesTableKey, toKebabCase, toPascalCase } from './cli/util';
import YAML from 'yaml';
import { readFile, writeFile, readdir, rm, mkdir } from 'fs/promises';
import type { TableMigrationConfig } from './types';
import type { AppConfig, AppDatabaseConfig, ProjectPathsConfig } from './types';

const argv = yargs(hideBin(process.argv))
  .scriptName('schema-tools')
  .command(
    'nginx:setup',
    'Create/update an Nginx server config, mkcert certs, hosts entry, and restart nginx',
    (yargsBuilder: any) =>
      yargsBuilder
        .option('name', {
          alias: 'n',
          type: 'string',
          describe: 'Server name / hostname (e.g. public.lucky.dev)',
        })
        .option('file', {
          alias: 'f',
          type: 'string',
          describe: 'Config filename (defaults derived from name)',
        })
        .option('port', {
          alias: 'p',
          type: 'number',
          describe: 'Proxy port for the app (Nuxt dev/prod port)',
        })
        .option('listen-port', {
          type: 'number',
          describe: 'Listen port for SSL (default from config)',
        })
        .option('apply', {
          type: 'boolean',
          describe: 'Apply changes (write config, mkcert, hosts, restart)',
        })
        .option('yes', {
          type: 'boolean',
          describe: 'Skip confirmation prompt when --apply is set',
        })
        .option('dry-run', {
          type: 'boolean',
          describe: 'Preview only; no changes',
        })
        .option('skip-mkcert', {
          type: 'boolean',
          describe: 'Skip mkcert generation',
        })
        .option('skip-hosts', {
          type: 'boolean',
          describe: 'Skip /etc/hosts update',
        })
        .option('skip-restart', {
          type: 'boolean',
          describe: 'Skip nginx restart',
        })
        .option('servers-path', {
          type: 'string',
          describe: 'Override nginx servers directory',
        })
        .option('certs-path', {
          type: 'string',
          describe: 'Override certs directory',
        })
        .option('hosts-path', {
          type: 'string',
          describe: 'Override hosts file path',
        })
        .option('template-path', {
          type: 'string',
          describe: 'Override nginx template path',
        })
        .option('restart-command', {
          type: 'string',
          describe: 'Override nginx restart command (no sudo prefix)',
        })
        .option('mkcert-command', {
          type: 'string',
          describe: 'Override mkcert command',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      await runNginxSetup(args, projectRoot);
    }
  )
  .command(
    'nginx:config',
    'Create nginx.yaml/template if missing and open in Sublime',
    (yargsBuilder: any) =>
      yargsBuilder.option('open', {
        type: 'boolean',
        default: true,
        describe: 'Open the config file in Sublime (subl)',
      }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      await runNginxConfig(projectRoot, args.open !== false);
    }
  )
  .command(
    'controller:scaffold <name>',
    'Create a controller override scaffold in target project(s)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Controller name (e.g. user)',
          type: 'string',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to target',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const projectNames = String(args.project || args.p || '')
        .split(',')
        .map((name: string) => name.trim())
        .filter(Boolean);
      const projects = bundle.app.paths.projects || [];

      await scaffoldControllerOverrides({
        projectRoot,
        projects,
        controller: String(args.name || ''),
        targets: projectNames,
      });
    }
  )
  .command(
    'context:scaffold',
    'Create a TRPC context override scaffold in target project(s)',
    (yargsBuilder: any) =>
      yargsBuilder.option('project', {
        alias: 'p',
        type: 'string',
        describe: 'Comma-separated list of project names to target',
      }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const projectNames = String(args.project || args.p || '')
        .split(',')
        .map((name: string) => name.trim())
        .filter(Boolean);
      const projects = bundle.app.paths.projects || [];

      await scaffoldContextOverrides({
        projectRoot,
        projects,
        targets: projectNames,
      });
    }
  )
  .command(
    'project:clean [name]',
    'Remove generated assets from target project(s) and reset _app.ts',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Optional project name to clean',
          type: 'string',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to clean (overrides positional)',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const nameFilter = parseList(args.project ?? args.name);
      const targetProjects = nameFilter
        ? bundle.app.paths.projects.filter((proj) => nameFilter.has(proj.name))
        : bundle.app.paths.projects;

      const DEFAULT_APP_ROUTER = `import { t } from '@schema/server/trpc/context'
import { generatedRouters } from './generated'

export const appRouter = t.router({
  ...generatedRouters,
})

export type AppRouter = typeof appRouter
`;

      for (const project of targetProjects) {
        if (!project.nuxtProjectRoot) continue;
        const appRoot = path.resolve(projectRoot, project.nuxtProjectRoot);

        if (project.generated?.trpcRouters) {
          const trpcRoot = path.resolve(projectRoot, project.generated.trpcRouters);
          await rm(path.join(trpcRoot, 'generated'), { recursive: true, force: true });
          await mkdir(path.join(trpcRoot, 'generated'), { recursive: true });
          await writeFile(path.join(trpcRoot, '_app.ts'), DEFAULT_APP_ROUTER, 'utf-8');
        }

        if (project.generated?.types) {
          await rm(path.resolve(projectRoot, project.generated.types), { recursive: true, force: true });
        }

        if (project.generated?.piniaStores) {
          await rm(path.resolve(projectRoot, project.generated.piniaStores), { recursive: true, force: true });
        }

        if (bundle.app.requestSchema?.projectOutput) {
          await rm(path.resolve(appRoot, bundle.app.requestSchema.projectOutput), { force: true });
        }

        if (bundle.app.typesense?.projectOutput) {
          await rm(path.resolve(appRoot, bundle.app.typesense.projectOutput), { recursive: true, force: true });
        }

        if (bundle.app.databasesExport?.projectOutput) {
          await rm(path.resolve(appRoot, bundle.app.databasesExport.projectOutput), { force: true });
        }

        if (bundle.app.modelsExport?.projectOutput) {
          await rm(path.resolve(appRoot, bundle.app.modelsExport.projectOutput), { force: true });
        }

        console.log(`🧹 Cleaned generated assets for ${project.name}`);
      }
    }
  )
  .command(
    'request-schema:generate',
    'Generate RequestSchema helper (instance-aware request input)',
    () => {},
    async () => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      await generateRequestSchema({ app: bundle.app, projectRoot });
    }
  )
  .command(
    'databases:generate',
    'Generate databases config export (server-side instance map)',
    () => {},
    async () => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      await generateDatabasesExport({ app: bundle.app, projectRoot });
    }
  )
  .command(
    'models:generate',
    'Generate models manifest (admin model metadata)',
    () => {},
    async () => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      await generateModelsManifest({ app: bundle.app, tables: bundle.tableMigrations, projectRoot });
    }
  )
  .command(
    'ui:generate [name]',
    'Generate admin UI pages from ui specs',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Optional ui spec filter (model/namespace/name)',
          type: 'string',
        })
        .option('spec', {
          alias: 's',
          type: 'string',
          describe: 'Comma-separated list of spec names/models to generate',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to generate into',
        })
        .option('sync-graph', {
          type: 'boolean',
          describe: 'Sync graph.mpdg to specs before generation',
        })
        .option('no-sync-graph', {
          type: 'boolean',
          default: false,
          describe: 'Skip syncing graph.mpdg before generation',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const appConfig = await loadAppConfig(projectRoot);
      await syncGraphSpecsIfNeeded({ projectRoot, appConfig, args });
      const bundle = await loadConfigBundle(projectRoot);
      const specsPath = bundle.app.ui?.specsPath ?? './config/ui';
      const resolvedSpecsPath = path.resolve(projectRoot, specsPath);
      const specs = await loadUiSpecs(resolvedSpecsPath);
      const appSpec = await loadUiAppSpec(resolvedSpecsPath);

      const specFilter = parseList(args.spec ?? args.name);
      const projectFilter = parseList(args.project) ?? (bundle.app.ui?.projects ? new Set(bundle.app.ui.projects) : null);

      const filteredSpecs = specFilter
        ? specs.filter((spec) => {
            const candidates = [
              spec.model,
              spec.table,
              spec.namespace,
              spec.name?.toLowerCase(),
            ]
              .filter(Boolean)
              .map((value) => String(value).toLowerCase());
            return Array.from(specFilter).some((value) =>
              candidates.includes(String(value).toLowerCase())
            );
          })
        : specs;

      const targetProjects = projectFilter
        ? bundle.app.paths.projects.filter((project) =>
            projectFilter.has(project.name)
          )
        : bundle.app.paths.projects;

      if (filteredSpecs.length === 0) {
        console.log('⚠️  No UI specs matched the filter.');
      } else {
        await generateUiOverviewPages({
          app: bundle.app,
          projectRoot,
          specs: filteredSpecs,
          projects: targetProjects,
        });
        await generateUiSinglePages({
          app: bundle.app,
          projectRoot,
          specs: filteredSpecs,
          projects: targetProjects,
        });
        await generateUiAdminStores({
          app: bundle.app,
          projectRoot,
          specs: filteredSpecs,
          projects: targetProjects,
        });
      }

      if (specs.length > 0) {
        await generateUiRouteConfig({
          projectRoot,
          specs,
          projects: targetProjects,
        });
      }

      if (specs.length > 0) {
        await generateUiManagementTestPage({
          projectRoot,
          specs,
          projects: targetProjects,
        });
      }

      if (specs.length > 0) {
        await generateUiSpecsExport({
          projectRoot,
          specs,
          projects: targetProjects,
        });
      }

      if (appSpec) {
        await generateAdminNav({
          spec: appSpec,
          projectRoot,
          projects: targetProjects,
        });
      }

      if (filteredSpecs.length > 0) {
        console.log(`🧩 Generated UI overview pages for ${filteredSpecs.length} spec(s).`);
      }
      if (specs.length > 0) {
        console.log('🧭 Generated UI route config.');
      }
      if (specs.length > 0) {
        console.log('🧭 Generated UI test page.');
      }
      if (specs.length > 0) {
        console.log('🧭 Generated UI specs export.');
      }
      if (appSpec) {
        console.log('🧭 Generated admin navigation config.');
      }
    }
  )
  .command(
    'ui:override:create <model>',
    'Scaffold admin UI overrides (create dialog)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('model', {
          describe: 'Model key to create override for (e.g. exam, question)',
          type: 'string',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to generate into',
        })
        .option('force', {
          alias: 'f',
          type: 'boolean',
          default: false,
          describe: 'Overwrite existing override files',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const projectFilter = parseList(args.project) ?? (bundle.app.ui?.projects ? new Set(bundle.app.ui.projects) : null);
      const targetProjects = projectFilter
        ? bundle.app.paths.projects.filter((project) => projectFilter.has(project.name))
        : bundle.app.paths.projects;

      await generateCreateDialogOverrides({
        projectRoot,
        projects: targetProjects,
        model: String(args.model),
        force: Boolean(args.force),
      });
    }
  )
  .command(
    'ui:override:layer <model> <layer> <name>',
    'Scaffold admin UI overrides for a specific layout layer',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('model', {
          describe: 'Model key to create override for (e.g. exam, question)',
          type: 'string',
        })
        .positional('layer', {
          describe: 'Override layer: page | row | column | card',
          type: 'string',
          choices: ['page', 'row', 'column', 'card'],
        })
        .positional('name', {
          describe: 'Override name (tab slug / row id / column id / card id)',
          type: 'string',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to generate into',
        })
        .option('force', {
          alias: 'f',
          type: 'boolean',
          default: false,
          describe: 'Overwrite existing override files',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const projectFilter = parseList(args.project) ?? (bundle.app.ui?.projects ? new Set(bundle.app.ui.projects) : null);
      const targetProjects = projectFilter
        ? bundle.app.paths.projects.filter((project) => projectFilter.has(project.name))
        : bundle.app.paths.projects;

      await generateLayoutOverrides({
        projectRoot,
        projects: targetProjects,
        model: String(args.model),
        layer: String(args.layer) as any,
        name: String(args.name),
        force: Boolean(args.force),
      });
    }
  )
  .command(
    'table:create <name>',
    'Scaffold a new table migration (and optional branch tables)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Primary table key (e.g. user, course)',
          type: 'string',
        })
        .option('branches', {
          alias: 'b',
          type: 'string',
          describe: 'Comma-separated list of branch table keys (e.g. profile,settings,state)',
        })
        .option('force', {
          alias: 'f',
          type: 'boolean',
          default: false,
          describe: 'Overwrite existing files if they already exist',
        }),
    async (args: any) => {
      const branches = args.branches
        ? args.branches.split(',').map((branch: string) => branch.trim()).filter(Boolean)
        : [];

      const rootDir = path.resolve(__dirname, '..');

      await scaffoldTable({
        rootDir,
        tableKey: String(args.name),
        branches,
        force: Boolean(args.force),
      });
    }
  )
  .command(
    'functions:generate [name]',
    'Generate CRUD SURQL functions for all tables or a specific table',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Optional table name to target (e.g. user)',
          type: 'string',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);

      let tables = bundle.tableMigrations;
      const tableFilter = bundle.app.importFilters?.tables;
      const tableExclude = bundle.app.importFilters?.tablesExclude;
      if (!args.name) {
        tables = applyTableFilters(tables, tableFilter, tableExclude);
      }
      if (args.name) {
        tables = tables.filter((table) => matchesTableKey(table.name, String(args.name)));
        if (tables.length === 0) {
          console.error(`No table migration found for key "${String(args.name)}"`);
          return;
        }
      }

      attachChildBootstrapEvents(tables);

      const outputRoot = path.resolve(projectRoot, 'config/migrations');
      await generateTableFunctions({
        tables,
        outputRoot,
        assetTracking: { projectRoot },
        eventFileMode: bundle.app.events?.fileMode,
      });
      await generateTableTaxonomies({ tables, outputRoot, assetTracking: { projectRoot } });
    }
  )
  .command(
    'generate [name]',
    'Generate assets (types, routers, functions, views, indexes) for all or a specific table',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Optional table name to target (e.g. user)',
          type: 'string',
        })
        .option('name', {
          alias: 't',
          describe: 'Table name to target (alias for positional)',
          type: 'string',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to emit client assets for',
        })
        .option('ensure-module', {
          type: 'boolean',
          default: true,
          describe: 'Ensure schema kit module is present in target project(s)',
        })
        .option('skip-module', {
          alias: ['no-module'],
          type: 'boolean',
          default: false,
          describe: 'Skip installing the schema kit module in target project(s)',
        })
        .option('module-sync', {
          type: 'string',
          choices: ['auto', 'force', 'off'],
          describe: 'Override schema kit module sync mode for this run',
        })
        .option('sync-layers', {
          type: 'boolean',
          default: true,
          describe: 'Sync Nuxt layers into target project(s)',
        })
        .option('layers-sync', {
          type: 'string',
          choices: ['auto', 'force', 'off'],
          describe: 'Override Nuxt layer sync mode for this run',
        })
        .option('clear-module', {
          type: 'boolean',
          default: true,
          describe: 'Clear generated schema-kit module assets before generation',
        })
        .option('sync-graph', {
          type: 'boolean',
          describe: 'Sync graph.mpdg to specs before generation',
        })
        .option('no-sync-graph', {
          type: 'boolean',
          default: false,
          describe: 'Skip syncing graph.mpdg before generation',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const appConfig = await loadAppConfig(projectRoot);
      await syncGraphSpecsIfNeeded({ projectRoot, appConfig, args });
      const bundle = await loadConfigBundle(projectRoot);
      const targetName = args.name || args.t || (args._ && args._[1]);

      const baseTables = bundle.tableMigrations;
      const moduleTables = await loadModuleTablesForGeneration(projectRoot, bundle.app);
      let tables = mergeTableLists(baseTables, moduleTables);
      let migrationTables = baseTables;
      if (targetName) {
        tables = tables.filter((table) => matchesTableKey(table.name, String(targetName)));
        migrationTables = migrationTables.filter((table) =>
          matchesTableKey(table.name, String(targetName))
        );
        if (tables.length === 0) {
          console.error(`No table migration found for key "${String(targetName)}"`);
          return;
        }
      }
      warnMissingCrudOrRouter(tables);
      attachChildBootstrapEvents(tables);

      const projectFilter = parseList(args.project);
      const targetProjects = projectFilter
        ? bundle.app.paths.projects.filter((proj) => projectFilter.has(proj.name))
        : bundle.app.paths.projects;

      const projectRootDir = path.resolve(projectRoot);
      const migrationsOutputDir = path.resolve(projectRootDir, 'config/migrations');
      const logModuleUpdates = bundle.app.schemaKit?.logModuleUpdates !== false;
      const schemaKitConfig = bundle.app.schemaKit?.module ?? {};
      const moduleMode = schemaKitConfig.mode ?? 'copy';
      const moduleSync = schemaKitConfig.sync ?? 'auto';
      const moduleSyncOverride = args['module-sync'] as 'auto' | 'force' | 'off' | undefined;
      const moduleSource = schemaKitConfig.source ?? 'module';
      const sharedModulePath = schemaKitConfig.sharedPath;
      const layerSyncMode =
        (args['layers-sync'] as 'auto' | 'force' | 'off' | undefined) ??
        bundle.app.layers?.sync ??
        'auto';
      const syncLayersEnabled = args['sync-layers'] !== false;
      if (syncLayersEnabled) {
        await writeAuthLayerConfig({ projectRoot: projectRootDir, app: bundle.app });
      }
      if (args['clear-module'] !== false) {
        await clearModuleGeneratedAssets({
          moduleRoot: path.resolve(projectRootDir, moduleSource),
          runtime: true,
          docs: true,
        });
        console.log('🧹 Cleared schema-kit module generated assets.');
      }
      await generateControllerDocs({
        tables,
        outputRoot: path.resolve(projectRootDir, moduleSource, 'docs', 'controllers'),
      });
      await generateControllers({
        tables,
        moduleRoot: path.resolve(projectRootDir, moduleSource),
      });
      const moduleGeneratedRoot = path.resolve(
        projectRootDir,
        moduleSource,
        'src',
        'runtime',
        'generated'
      );
      await generateRequestSchema({
        app: bundle.app,
        projectRoot: projectRootDir,
        outputPath: path.join(moduleGeneratedRoot, 'request-schema.ts'),
      });
      await generateDatabasesExport({
        app: bundle.app,
        projectRoot: projectRootDir,
        outputPath: path.join(moduleGeneratedRoot, 'databases.ts'),
      });
      await generateModelsManifest({
        app: bundle.app,
        tables,
        projectRoot: projectRootDir,
        outputPath: path.join(moduleGeneratedRoot, 'models.ts'),
      });
      if (bundle.app.typesense?.enabled !== false) {
        await generateTypesenseSchemas({
          tables,
          outputRoot: path.join(moduleGeneratedRoot, 'typesense'),
        });
      }

      let typesGenerated = 0;
      for (const project of targetProjects) {
        if (project.generated?.types) {
          const pruneStaleTypes = bundle.app.graph?.spec?.pruneStale !== false;
          await generateTableTypes({
            tables,
            outputRoot: path.resolve(projectRootDir, project.generated.types),
            pruneStale: pruneStaleTypes,
          });
          typesGenerated += 1;
        }
      }
      if (typesGenerated === 0) {
        console.log('ℹ️  No type generation targets configured.');
      }

      let routersGenerated = 0;
      for (const project of targetProjects) {
        if (project.generated?.trpcRouters) {
          const featureConfig = resolveSchemaKitFeatures(bundle.app, project);
          const includeRedisRouter = featureConfig?.redis?.enabled === true;
          const requestSchemaImport = project.imports?.requestSchema
            ? (project.imports.requestSchema === '@schema'
                ? '@schema/request-schema'
                : project.imports.requestSchema)
            : '@schema/request-schema';
          const typesenseCollectionsImport =
            project.imports?.typesenseCollections ??
            (bundle.app.typesense?.projectOutput ? '@schema/typesense/collections' : undefined);
          const schemaImportPath =
            project.imports?.schemaTypes ??
            (project.generated?.types ? '@schema/types' : '~~/app/types/schema/generated');
          await generateTrpcRouters({
            tables,
            outputRoot: path.resolve(projectRootDir, project.generated.trpcRouters),
            contextImport: bundle.app.trpc?.contextImport ?? '@server/context',
            schemaImportPath,
            requestSchemaImportPath: requestSchemaImport,
            typesenseCollectionsImportPath: typesenseCollectionsImport,
            includeRedisRouter,
          });
          routersGenerated += 1;
        }

        await writeSchemaKitConfig({ projectRoot: projectRootDir, project, app: bundle.app });
        if (args['ensure-module'] && !args['skip-module']) {
          await ensureSchemaKitModule({
            projectRoot: projectRootDir,
            project,
            moduleSourceRoot: path.resolve(projectRootDir, moduleSource),
            log: logModuleUpdates,
            mode: moduleMode,
            sync: moduleSyncOverride ?? moduleSync,
            sharedModulePath,
          });
        }
        if (syncLayersEnabled) {
          await syncProjectLayers({
            projectRoot: projectRootDir,
            app: bundle.app,
            project,
            mode: layerSyncMode,
          });
        }

        let schemaKitAssetsGenerated = false;

        if (bundle.app.requestSchema?.projectOutput && project.nuxtProjectRoot) {
          const requestSchemaOutput = path.resolve(
            projectRootDir,
            project.nuxtProjectRoot,
            bundle.app.requestSchema.projectOutput
          );
          await generateRequestSchema({
            app: bundle.app,
            projectRoot: projectRootDir,
            outputPath: requestSchemaOutput,
          });
          schemaKitAssetsGenerated = true;
        }

        if (bundle.app.databasesExport?.projectOutput && project.nuxtProjectRoot) {
          const dbOutput = path.resolve(
            projectRootDir,
            project.nuxtProjectRoot,
            bundle.app.databasesExport.projectOutput
          );
          await generateDatabasesExport({
            app: bundle.app,
            projectRoot: projectRootDir,
            outputPath: dbOutput,
          });
          schemaKitAssetsGenerated = true;
        }

        if (bundle.app.modelsExport?.projectOutput && project.nuxtProjectRoot) {
          const modelsOutput = path.resolve(
            projectRootDir,
            project.nuxtProjectRoot,
            bundle.app.modelsExport.projectOutput
          );
          await generateModelsManifest({
            app: bundle.app,
            tables,
            projectRoot: projectRootDir,
            outputPath: modelsOutput,
          });
          schemaKitAssetsGenerated = true;
        }

        if (bundle.app.typesense?.enabled !== false && bundle.app.typesense?.projectOutput && project.nuxtProjectRoot) {
          const typesenseOutput = path.resolve(
            projectRootDir,
            project.nuxtProjectRoot,
            bundle.app.typesense.projectOutput
          );
          await generateTypesenseSchemas({
            tables,
            outputRoot: typesenseOutput,
          });
          schemaKitAssetsGenerated = true;
        }
        if (schemaKitAssetsGenerated && project.nuxtProjectRoot) {
          const generatedRoot = path.resolve(
            projectRootDir,
            project.nuxtProjectRoot,
            'modules/schema-kit/runtime/generated'
          );
          console.log(
            `🧩 schema-kit generated assets → ${path.relative(projectRootDir, generatedRoot)}`
          );
        }
        await maybeGenerateRouterManifest(projectRootDir, project);
        await maybeGenerateRouterCharter(projectRootDir, project);
      }
      if (routersGenerated === 0) {
        console.log('ℹ️  No TRPC router targets configured.');
      }

      await generateTableFunctions({
        tables: migrationTables,
        outputRoot: migrationsOutputDir,
        assetTracking: { projectRoot },
        eventFileMode: bundle.app.events?.fileMode,
      });

      await generateTableEdges({
        tables: migrationTables,
        outputRoot: migrationsOutputDir,
        assetTracking: { projectRoot },
      });

      await generateTableTaxonomies({
        tables: migrationTables,
        outputRoot: migrationsOutputDir,
        assetTracking: { projectRoot },
      });

      await generateTableRelations({
        tables: migrationTables,
        outputRoot: migrationsOutputDir,
        assetTracking: { projectRoot },
      });

      await generateResourceViews({
        tables: migrationTables,
        outputRoot: migrationsOutputDir,
        assetTracking: { projectRoot },
      });

      if (bundle.app.typesense?.enabled !== false) {
        const rawOutput = bundle.app.typesense?.output ?? 'config/typesense';
        const outputs = Array.isArray(rawOutput) ? rawOutput : [rawOutput];
        for (const output of outputs) {
          const typesenseOutput = path.resolve(projectRootDir, output);
          await generateTypesenseSchemas({
            tables,
            outputRoot: typesenseOutput,
          });
        }
      }

      await generateTableIndexes({
        tables: migrationTables,
        outputRoot: migrationsOutputDir,
        assetTracking: { projectRoot },
      });

      await generateDocsManifest({
        app: bundle.app,
        tables,
        projectRoot: projectRootDir,
      });

      const bundlesEnabled = bundle.app.defaults?.bundlesEnabled !== false;
      if (bundlesEnabled) {
        const bundleTables = migrationTables.filter((table) => (table as any).bundle !== false);
        await writeTableBundles(bundleTables, migrationsOutputDir, { projectRoot });
      }
      console.log('✅ Generation complete.');
    }
  )
  .command(
    'schema-kit:clear',
    'Clear generated schema-kit module assets',
    (yargsBuilder: any) =>
      yargsBuilder
        .option('runtime', {
          type: 'boolean',
          default: true,
          describe: 'Clear generated runtime assets (controllers/generated/index)',
        })
        .option('docs', {
          type: 'boolean',
          default: true,
          describe: 'Clear generated controller docs',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const appConfig = await loadAppConfig(projectRoot);
      const moduleSource = appConfig.schemaKit?.module?.source ?? 'module';
      await clearModuleGeneratedAssets({
        moduleRoot: path.resolve(projectRoot, moduleSource),
        runtime: args.runtime !== false,
        docs: args.docs !== false,
      });
      console.log('🧹 Cleared schema-kit module generated assets.');
    }
  )
  .command(
    'refresh',
    'Force graph/spec sync, generate, module sync, and full database import',
    (yargsBuilder: any) =>
      yargsBuilder
        .option('database', {
          alias: ['d', 'db'],
          type: 'string',
          describe: 'Database name from app.config.yaml (comma-separated for multiple)',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to target',
        })
        .option('modules', {
          alias: 'm',
          type: 'string',
          describe: 'Comma-separated module names to generate/import',
        })
        .option('seed', {
          type: 'boolean',
          default: true,
          describe: 'Import seed file matching the database key (default: true)',
        })
        .option('with-schema-functions', {
          type: 'boolean',
          describe: 'Import generated schema functions before seeds (default: true when --seed is enabled)',
        })
        .option('module-sync', {
          type: 'string',
          choices: ['auto', 'force', 'off'],
          default: 'force',
          describe: 'Override schema kit module sync mode for this run',
        })
        .option('on-existing', {
          type: 'string',
          choices: ['overwrite', 'if-not-exists', 'none'],
          describe: 'How to handle existing DEFINE targets when importing',
        })
        .option('skip-graph', {
          type: 'boolean',
          default: false,
          describe: 'Skip graph.mpdg -> specs sync step',
        })
        .option('skip-modules', {
          type: 'boolean',
          default: false,
          describe: 'Skip module generation step',
        })
        .option('skip-bootstrap', {
          type: 'boolean',
          default: false,
          describe: 'Skip bootstrap import step',
        })
        .option('skip-import', {
          type: 'boolean',
          default: false,
          describe: 'Skip main import step',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const appConfig = await loadAppConfig(projectRoot);
      const graphSpec = appConfig.graph?.spec ?? {};
      const mode = String(graphSpec.mode ?? 'staging');
      const prune = graphSpec.pruneStale !== false;

      if (!args['skip-graph']) {
        const mpdgArgs = [
          'exec',
          'tsx',
          'scripts/mpdg-to-spec.ts',
          '--mode',
          mode,
          '--conflict',
          'overwrite',
          prune ? '--prune' : '--no-prune',
        ];
        await runChildProcess('pnpm', mpdgArgs, projectRoot);
      }

      const moduleSync = String(args['module-sync'] ?? 'force');

      const generateArgs = [
        'exec',
        'tsx',
        'src/cli.ts',
        'generate',
        '--no-sync-graph',
        '--module-sync',
        moduleSync,
      ];
      if (args.project) {
        generateArgs.push('--project', String(args.project));
      }
      await runChildProcess('pnpm', generateArgs, projectRoot);

      if (!args['skip-modules']) {
        const moduleArgs = ['exec', 'tsx', 'src/cli.ts', 'generate:modules'];
        if (args.modules) {
          moduleArgs.push('--modules', String(args.modules));
        }
        await runChildProcess('pnpm', moduleArgs, projectRoot);
      }

      const syncArgs = ['exec', 'tsx', 'src/cli.ts', 'schema-kit:sync', '--module-sync', moduleSync];
      if (args.project) {
        syncArgs.push('--project', String(args.project));
      }
      await runChildProcess('pnpm', syncArgs, projectRoot);

      const onExisting = resolveOnExistingFlag(args['on-existing'], appConfig.onExisting);
      const onExistingCli =
        onExisting === 'IF NOT EXISTS'
          ? 'if-not-exists'
          : onExisting === 'NONE'
            ? 'none'
            : 'overwrite';

      if (!args['skip-bootstrap']) {
        const bootstrapArgs = [
          'exec',
          'tsx',
          'src/cli.ts',
          'bootstrap',
          '--force',
          '--on-existing',
          onExistingCli,
        ];
        if (args.database) {
          bootstrapArgs.push('--database', String(args.database));
        }
        if (args.modules) {
          bootstrapArgs.push('--modules', String(args.modules));
        }
        if (args.seed === false) {
          bootstrapArgs.push('--seed', 'false');
        }
        await runChildProcess('pnpm', bootstrapArgs, projectRoot);
      }

      if (!args['skip-import']) {
        const importArgs = [
          'exec',
          'tsx',
          'src/cli.ts',
          'import',
          '--force',
          '--on-existing',
          onExistingCli,
        ];
        if (args.database) {
          importArgs.push('--database', String(args.database));
        }
        await runChildProcess('pnpm', importArgs, projectRoot);
      }

      console.log('✅ Refresh complete.');
    }
  )
  .command(
    'schema-kit:sync [project]',
    'Sync schema-kit module into Nuxt target project(s)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('project', {
          describe: 'Optional project name to target (e.g. schema-docs)',
          type: 'string',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to sync',
        })
        .option('module-sync', {
          type: 'string',
          choices: ['auto', 'force', 'off'],
          describe: 'Override schema kit module sync mode for this run',
        })
        .option('log', {
          type: 'boolean',
          default: true,
          describe: 'Log module sync status',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const schemaKitConfig = bundle.app.schemaKit?.module ?? {};
      const moduleMode = schemaKitConfig.mode ?? 'copy';
      const moduleSync = schemaKitConfig.sync ?? 'auto';
      const moduleSource = schemaKitConfig.source ?? 'module';
      const sharedModulePath = schemaKitConfig.sharedPath;
      const projectNames = String(args.project || args.p || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

      const projects = bundle.app.paths.projects || [];
      const targets = projectNames.length
        ? projects.filter((project) => projectNames.includes(project.name))
        : projects;

      if (targets.length === 0) {
        console.warn('⚠️  No matching projects found to sync schema-kit.');
        return;
      }

      for (const project of targets) {
        await writeSchemaKitConfig({ projectRoot, project, app: bundle.app });
        await ensureSchemaKitModule({
          projectRoot,
          project,
          moduleSourceRoot: path.resolve(projectRoot, moduleSource),
          log: args.log !== false,
          mode: moduleMode,
          sync: (args['module-sync'] as 'auto' | 'force' | 'off' | undefined) ?? moduleSync,
          sharedModulePath,
        });
      }
    }
  )
  .command(
    'layers:sync [project]',
    'Sync Nuxt layers into target project(s)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('project', {
          describe: 'Optional project name to target (e.g. pmv2-admin)',
          type: 'string',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to sync',
        })
        .option('layers-sync', {
          type: 'string',
          choices: ['auto', 'force', 'off'],
          describe: 'Override layer sync mode for this run',
        })
        .option('log', {
          type: 'boolean',
          default: true,
          describe: 'Log layer sync status',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const projectNames = String(args.project || args.p || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean);

      const projects = bundle.app.paths.projects || [];
      const targets = projectNames.length
        ? projects.filter((project) => projectNames.includes(project.name))
        : projects;

      if (targets.length === 0) {
        console.warn('⚠️  No matching projects found to sync layers.');
        return;
      }

      const mode =
        (args['layers-sync'] as 'auto' | 'force' | 'off' | undefined) ??
        bundle.app.layers?.sync ??
        'auto';

      await writeAuthLayerConfig({ projectRoot, app: bundle.app });

      for (const project of targets) {
        await syncProjectLayers({
          projectRoot,
          app: bundle.app,
          project,
          mode,
          log: args.log !== false,
        });
      }
    }
  )
  .command(
    'assets:diff',
    'Compare local schema-assets manifest to remote schemaAssets record',
    (yargsBuilder: any) =>
      yargsBuilder
        .option('database', {
          alias: ['d', 'db'],
          type: 'string',
          describe: 'Database name from app.config.yaml (comma-separated for multiple)',
        })
        .option('show-identical', {
          type: 'boolean',
          default: false,
          describe: 'Include unchanged assets in output',
        })
        .option('show-remote', {
          type: 'boolean',
          default: false,
          describe: 'Print the raw schemaAssets record returned by the server',
        })
        .option('show-removed', {
          type: 'boolean',
          default: true,
          describe: 'Include assets that exist remotely but not locally',
        })
        .option('rehash-local', {
          type: 'boolean',
          default: true,
          describe: 'Rehash local files from disk instead of relying on schema-assets.json',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const targetDatabases = resolveDatabaseTargets(bundle.app, parseList(args.database));

      const { manifest } = await loadLocalManifest({ projectRoot });

      for (const target of targetDatabases) {
        const header = `🧭 Asset diff for ${target.name} (${target.config.namespace}/${target.config.database})`;
        let remoteAssets = await fetchRemoteAssets(target.config);
        if (args['show-remote']) {
          const debug = await fetchRemoteAssetsWithRaw(target.config);
          console.log('📥 Remote schemaAssets query result:');
          console.log(JSON.stringify(debug.result, null, 2));
          console.log('📥 Remote schemaAssets query payload:');
          console.log(JSON.stringify(debug.query, null, 2));
          console.log('📥 Remote schemaAssets row:');
          console.log(JSON.stringify(debug.row, null, 2));
          console.log('📥 Remote schemaAssets parsed entries:');
          console.log(JSON.stringify(debug.assets, null, 2));
          remoteAssets = debug.assets;
        }
        const diff = await diffAssets(manifest, remoteAssets, {
          projectRoot,
          rehashLocal: args['rehash-local'],
        });

        const needsImport = diff.changed.length + diff.missingRemote.length;
        if (diff.changed.length > 0) {
          console.log('Changed assets:');
          for (const entry of diff.changed) {
            console.log(`- ${entry.key}`);
          }
        }

        if (diff.missingRemote.length > 0) {
          console.log('Missing on target:');
          for (const entry of diff.missingRemote) {
            console.log(`- ${entry.key}`);
          }
        }

        if (args['show-removed'] && diff.removedLocal.length > 0) {
          console.log(`🗑️  ${diff.removedLocal.length} assets exist remotely but not locally:`);
          for (const entry of diff.removedLocal) {
            console.log(`- ${entry.key}`);
          }
        }

        if (args['show-identical'] && diff.identical.length > 0) {
          console.log(`✅ ${diff.identical.length} assets are identical.`);
        }

        console.log(header);
        if (needsImport === 0) {
          console.log('✅ No asset changes detected.');
        } else {
          console.log(`🟡 ${needsImport} assets require import.`);
          if (diff.changed.length > 0) {
            console.log(`🟠 ${diff.changed.length} assets differ (hash mismatch).`);
          }
          if (diff.missingRemote.length > 0) {
            console.log(`🟣 ${diff.missingRemote.length} assets missing on target.`);
          }
        }
      }
    }
  )
  .command(
    'assets:sync',
    'Replace the remote schemaAssets record with the local manifest',
    (yargsBuilder: any) =>
      yargsBuilder
        .option('database', {
          alias: ['d', 'db'],
          type: 'string',
          describe: 'Database name from app.config.yaml (comma-separated for multiple)',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const targetDatabases = resolveDatabaseTargets(bundle.app, parseList(args.database));
      const { manifest } = await loadLocalManifest({ projectRoot });

      const entries = Object.entries(manifest.assets ?? {}).filter(([key]) => !isIgnoredAssetKey(key));
      const entriesLiteral = entries
        .map(([key, entry]) => `${JSON.stringify(key)}: ${JSON.stringify(entry)}`)
        .join(', ');

      for (const target of targetDatabases) {
        console.log(`🧾 Syncing schemaAssets to ${target.name} (${target.config.namespace}/${target.config.database})`);
        const db = await connectSurreal(target.config);

        try {
          const query = `UPDATE ${DEFAULT_ASSET_RECORD_ID} CONTENT { ${entriesLiteral}, lastImportAt: time::now() };`;
          await db.query(query);
        } finally {
          await db.close();
        }
      }
    }
  )
  .command(
    'module:ensure',
    'Ensure schema kit module is present and registered in target project(s)',
    (yargsBuilder: any) =>
      yargsBuilder.option('project', {
        alias: 'p',
        type: 'string',
        describe: 'Comma-separated list of project names to ensure module for',
      }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const projectFilter = parseList(args.project);
      const targetProjects = projectFilter
        ? bundle.app.paths.projects.filter((proj) => projectFilter.has(proj.name))
        : bundle.app.paths.projects;
      const logModuleUpdates = bundle.app.schemaKit?.logModuleUpdates !== false;
      const schemaKitConfig = bundle.app.schemaKit?.module ?? {};
      const moduleMode = schemaKitConfig.mode ?? 'copy';
      const moduleSync = schemaKitConfig.sync ?? 'auto';
      const moduleSource = schemaKitConfig.source ?? 'module';
      const sharedModulePath = schemaKitConfig.sharedPath;

      for (const project of targetProjects) {
        await ensureSchemaKitModule({
          projectRoot,
          project,
          moduleSourceRoot: path.resolve(projectRoot, moduleSource),
          log: logModuleUpdates,
          mode: moduleMode,
          sync: moduleSync,
          sharedModulePath,
        });
      }
    }
  )
  .command(
    'project:fix [name]',
    'Re-run project setup checks and apply fixes for target project(s)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Optional project name to check',
          type: 'string',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to fix',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const positional = args.name || (args._ && args._[1]);
      const projectFilter = parseList(args.project ?? positional);
      const targetProjects = projectFilter
        ? bundle.app.paths.projects.filter((proj) => projectFilter.has(proj.name))
        : bundle.app.paths.projects;

      for (const project of targetProjects) {
        const featureConfig = resolveSchemaKitFeatures(bundle.app, project);
        const wantsSurreal = featureConfig?.surrealdb?.enabled !== false;
        const wantsTypesense = featureConfig?.typesense ?? bundle.app.typesense?.enabled !== false;
        const wantsSentry = featureConfig?.sentry?.enabled === true;
        const wantsRedis = featureConfig?.redis?.enabled === true;

        const report = await checkProjectSetup({
          projectRoot,
          app: bundle.app,
          project,
        });
        if (!report) continue;

        console.log(`🔧 Project fix: ${project.name}`);
        if (report.missingDeps.length > 0) {
          console.log('⚠️  Missing dependencies:');
          for (const dep of report.missingDeps) {
            console.log(`- ${dep}`);
          }
          const hint = await buildInstallHint(report, projectRoot, bundle.app.tooling?.repoMode);
          if (hint) {
            console.log('💡 Suggested install command:');
            console.log(hint);
          }
        }

        if (report.missingFiles.length > 0) {
          console.log('⚠️  Missing required files:');
          for (const file of report.missingFiles) {
            console.log(`- ${file}`);
          }
          const created = await applyProjectSetupFixes(report);
          if (created.length > 0) {
            console.log('✅ Created scaffold files:');
            for (const file of created) {
              console.log(`- ${file}`);
            }
          }
        }

        const configPath = await findNuxtConfig(report.appRoot);
        if (!configPath) {
          console.log('⚠️  nuxt.config not found; unable to add runtimeConfig blocks.');
        } else {
          const configContent = await readFile(configPath, 'utf-8');
          let updated = configContent;
          if (wantsSurreal) updated = ensureRuntimeConfigSurrealdb(updated);
          if (wantsTypesense) updated = ensureRuntimeConfigTypesense(updated);
          if (wantsSentry) updated = ensureRuntimeConfigSentry(updated);
          if (wantsRedis) updated = ensureRuntimeConfigRedis(updated);
          if (updated !== configContent) {
            await writeFile(configPath, updated, 'utf-8');
            const added: string[] = [];
            if (wantsSurreal) added.push('surrealdb');
            if (wantsTypesense) added.push('typesense');
            if (wantsSentry) added.push('sentry');
            if (wantsRedis) added.push('redis');
            console.log(`✅ Added runtimeConfig blocks (${added.join('/')}).`);
          }
        }

        const appRouterPath = path.join(report.appRoot, 'server', 'trpc', 'routers', '_app.ts');
        const apiRouterPath = path.join(report.appRoot, 'server', 'trpc', 'routers', 'api.ts');
        const appRouterContent = await readFile(appRouterPath, 'utf-8').catch(() => null);
        if (appRouterContent) {
          const updated = ensureAppRouterDbOnly(appRouterContent);
          if (updated !== appRouterContent) {
            await writeFile(appRouterPath, updated, 'utf-8');
            console.log('✅ Updated app router to include api/db routers.');
          }
        }
        const apiRouterContent = await readFile(apiRouterPath, 'utf-8').catch(() => null);
        if (apiRouterContent) {
          const updated = ensureApiRouterExport(apiRouterContent);
          if (updated !== apiRouterContent) {
            await writeFile(apiRouterPath, updated, 'utf-8');
            console.log('✅ Updated api router to export dbRouter/apiRouter.');
          }
        }

        if (report.missingEnvFiles.length > 0) {
          console.log('⚠️  Missing env files:');
          for (const file of report.missingEnvFiles) {
            console.log(`- ${file}`);
          }
          const created = await applyEnvFileFixes(report, {
            sections: {
              surrealdb: wantsSurreal,
              typesense: wantsTypesense,
              sentry: wantsSentry,
              redis: wantsRedis,
            },
          });
          if (created.length > 0) {
            console.log('✅ Created env files:');
            for (const file of created) {
              console.log(`- ${file}`);
            }
          }
        }

        if (wantsRedis) {
          const composeFile = await ensureRedisCompose(report.appRoot);
          if (composeFile) {
            console.log(`🐳 Created ${composeFile} for local Redis.`);
          }
        }
        if (wantsTypesense) {
          const composeFile = await ensureTypesenseCompose(report.appRoot);
          if (composeFile) {
            console.log(`🐳 Created ${composeFile} for local Typesense.`);
          }
        }

        const cacheDirs = ['.nuxt', '.output'];
        const removedCaches: string[] = [];
        for (const dir of cacheDirs) {
          const fullPath = path.join(report.appRoot, dir);
          const exists = await stat(fullPath).catch(() => null);
          if (exists) {
            await rm(fullPath, { recursive: true, force: true });
            removedCaches.push(dir);
          }
        }
        if (removedCaches.length > 0) {
          console.log('🧹 Cleared build caches:');
          for (const dir of removedCaches) {
            console.log(`- ${dir}`);
          }
        }

        if (report.notes.length > 0) {
          console.log('ℹ️  Notes:');
          for (const note of report.notes) {
            console.log(`- ${note}`);
          }
        }
      }
    }
  )
  .command(
    'project:setup [name]',
    'Check required dependencies and setup steps for target project(s)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Optional project name to check',
          type: 'string',
        })
        .option('project', {
          alias: 'p',
          type: 'string',
          describe: 'Comma-separated list of project names to check',
        })
        .option('fix', {
          type: 'boolean',
          default: false,
          describe: 'Create missing server scaffolds where possible',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const positional = args.name || (args._ && args._[1]);
      const projectFilter = parseList(args.project ?? positional);
      const targetProjects = projectFilter
        ? bundle.app.paths.projects.filter((proj) => projectFilter.has(proj.name))
        : bundle.app.paths.projects;

      for (const project of targetProjects) {
        const featureConfig = resolveSchemaKitFeatures(bundle.app, project);
        const wantsSurreal = featureConfig?.surrealdb?.enabled !== false;
        const wantsTypesense = featureConfig?.typesense ?? bundle.app.typesense?.enabled !== false;
        const wantsSentry = featureConfig?.sentry?.enabled === true;
        const wantsRedis = featureConfig?.redis?.enabled === true;

        const report = await checkProjectSetup({
          projectRoot,
          app: bundle.app,
          project,
        });
        if (!report) continue;

        console.log(`🔧 Project setup check: ${project.name}`);
        if (report.missingDeps.length === 0) {
          console.log('✅ Required dependencies installed.');
        } else {
          console.log('⚠️  Missing dependencies:');
          for (const dep of report.missingDeps) {
            console.log(`- ${dep}`);
          }
          const hint = await buildInstallHint(report, projectRoot, bundle.app.tooling?.repoMode);
          if (hint) {
            console.log('💡 Suggested install command:');
            console.log(hint);
          }
        }

        if (report.missingFiles.length > 0) {
          console.log('⚠️  Missing required files:');
          for (const file of report.missingFiles) {
            console.log(`- ${file}`);
          }
          const shouldFix = args.fix || await promptToContinue('Create missing TRPC/Surreal scaffolds now?');
          if (shouldFix) {
            const created = await applyProjectSetupFixes(report);
            if (created.length > 0) {
              console.log('✅ Created scaffold files:');
              for (const file of created) {
                console.log(`- ${file}`);
              }
            }
          }
        }

        if (report.missingConfig.length > 0) {
          const relevantMissing = report.missingConfig.filter((marker) => {
            if (marker === 'surrealdb') return wantsSurreal;
            if (marker === 'typesense') return wantsTypesense;
            if (marker === 'sentry') return wantsSentry;
            if (marker === 'redis') return wantsRedis;
            return true;
          });
          if (relevantMissing.length > 0) {
            console.log('⚠️  Missing nuxt.config markers:');
          }
          for (const marker of relevantMissing) {
            console.log(`- ${marker}`);
          }
        }
        const missingRuntime = report.missingConfig.filter((marker) => {
          if (marker === 'surrealdb') return wantsSurreal;
          if (marker === 'typesense') return wantsTypesense;
          if (marker === 'sentry') return wantsSentry;
          if (marker === 'redis') return wantsRedis;
          return true;
        });
        const shouldAddRuntime = args.fix || (missingRuntime.length > 0
          ? await promptToContinue('Add runtimeConfig blocks now?')
          : false);
        if (shouldAddRuntime) {
          const configPath = await findNuxtConfig(report.appRoot);
          if (!configPath) {
            console.log('⚠️  nuxt.config not found; unable to add runtimeConfig blocks.');
          } else {
            const configContent = await readFile(configPath, 'utf-8');
            let updated = configContent;
            if (wantsSurreal) updated = ensureRuntimeConfigSurrealdb(updated);
            if (wantsTypesense) updated = ensureRuntimeConfigTypesense(updated);
            if (wantsSentry) updated = ensureRuntimeConfigSentry(updated);
            if (wantsRedis) updated = ensureRuntimeConfigRedis(updated);
            if (updated !== configContent) {
              await writeFile(configPath, updated, 'utf-8');
              const added: string[] = [];
              if (wantsSurreal) added.push('surrealdb');
              if (wantsTypesense) added.push('typesense');
              if (wantsSentry) added.push('sentry');
              if (wantsRedis) added.push('redis');
              console.log(`✅ Added runtimeConfig blocks (${added.join('/')}).`);
            }
          }
        }

        const appRouterPath = path.join(report.appRoot, 'server', 'trpc', 'routers', '_app.ts');
        const apiRouterPath = path.join(report.appRoot, 'server', 'trpc', 'routers', 'api.ts');
        const appRouterContent = await readFile(appRouterPath, 'utf-8').catch(() => null);
        if (appRouterContent) {
          const updated = ensureAppRouterDbOnly(appRouterContent);
          if (updated !== appRouterContent) {
            await writeFile(appRouterPath, updated, 'utf-8');
            console.log('✅ Updated app router to include db router.');
          }
        }
        const apiRouterContent = await readFile(apiRouterPath, 'utf-8').catch(() => null);
        if (apiRouterContent) {
          const updated = ensureApiRouterExport(apiRouterContent);
          if (updated !== apiRouterContent) {
            await writeFile(apiRouterPath, updated, 'utf-8');
            console.log('✅ Updated api router to export dbRouter.');
          }
        }

        if (report.missingEnvFiles.length > 0) {
          console.log('⚠️  Missing env files:');
          for (const file of report.missingEnvFiles) {
            console.log(`- ${file}`);
          }
          const shouldFixEnv = args.fix || await promptToContinue('Create .env/.env.staging now?');
          if (shouldFixEnv) {
            let values: {
              url?: string;
              user?: string;
              pass?: string;
              namespace?: string;
              database?: string;
              typesenseHost?: string;
              typesenseApiKey?: string;
              typesensePort?: string;
              typesenseEnableCors?: string;
            } | undefined;
            if (process.stdin.isTTY) {
              const hasCreds = await promptToContinue('Do you know the SurrealDB credentials to fill now?');
              if (hasCreds) {
                values = {
                  url: await promptInput('NUXT_SURREALDB_URL'),
                  user: await promptInput('NUXT_SURREALDB_USER'),
                  pass: await promptInput('NUXT_SURREALDB_PASS'),
                  namespace: await promptInput('NUXT_SURREALDB_NAMESPACE'),
                  database: await promptInput('NUXT_SURREALDB_DATABASE'),
                };
              }
              const hasTypesense = await promptToContinue('Do you know the Typesense credentials to fill now?');
              if (hasTypesense) {
                values = values ?? {};
                values.typesenseHost = await promptInput('NUXT_TYPESENSE_HOST');
                values.typesenseApiKey = await promptInput('NUXT_TYPESENSE_API_KEY');
                values.typesensePort = await promptInput('NUXT_TYPESENSE_PORT');
                values.typesenseEnableCors = await promptInput('NUXT_TYPESENSE_ENABLE_CORS');
              }
            }
            const created = await applyEnvFileFixes(report, {
              values,
              sections: {
                surrealdb: wantsSurreal,
                typesense: wantsTypesense,
                sentry: wantsSentry,
                redis: wantsRedis,
              },
            });
            if (created.length > 0) {
              console.log('✅ Created env files:');
              for (const file of created) {
                console.log(`- ${file}`);
              }
            }
          }
        }

        if (wantsRedis) {
          const composeFile = await ensureRedisCompose(report.appRoot);
          if (composeFile) {
            console.log(`🐳 Created ${composeFile} for local Redis.`);
          }
        }
        if (wantsTypesense) {
          const composeFile = await ensureTypesenseCompose(report.appRoot);
          if (composeFile) {
            console.log(`🐳 Created ${composeFile} for local Typesense.`);
          }
        }

        if (report.notes.length > 0) {
          console.log('ℹ️  Notes:');
          for (const note of report.notes) {
            console.log(`- ${note}`);
          }
        }
      }
    }
  )
  .command(
    'import:functions [name]',
    'Import generated (or overridden) SURQL functions into the target database(s)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Optional table name to target (e.g. user)',
          type: 'string',
        })
        .option('database', {
          alias: ['d', 'db'],
          type: 'string',
          describe: 'Database name from app.config.yaml (comma-separated for multiple)',
        })
        .option('dry-run', {
          type: 'boolean',
          default: false,
          describe: 'Print statements without applying them',
        })
        .option('on-existing', {
          type: 'string',
          choices: ['overwrite', 'if-not-exists', 'none'],
          describe: 'How to handle existing DEFINE targets when importing',
        })
        .option('only-changed', {
          type: 'boolean',
          describe: 'Only import assets that differ from the target database',
        })
        .option('force', {
          alias: ['all'],
          type: 'boolean',
          default: false,
          describe: 'Import all assets, ignoring only-changed settings',
        })
        .option('rebuild-indexes', {
          type: 'boolean',
          default: true,
          describe: 'Rebuild indexes after import (use --no-rebuild-indexes to skip)',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const onExisting = resolveOnExistingFlag(args['on-existing'], bundle.app.onExisting);
      const onlyChanged = resolveOnlyChanged(args['only-changed'], args.force, bundle.app.importFilters?.onlyChanged);
      const importSchemaFunctions =
        typeof args['with-schema-functions'] === 'boolean'
          ? args['with-schema-functions']
          : args.seed !== false;
      const fileFilters = bundle.app.importFilters?.files;
      const cleanupFilters = bundle.app.importFilters?.cleanup;

      let tables = bundle.tableMigrations;
      const tableFilter = bundle.app.importFilters?.tables;
      const tableExclude = bundle.app.importFilters?.tablesExclude;
      if (!args.name) {
        tables = applyTableFilters(tables, tableFilter, tableExclude);
      }
      if (args.name) {
        tables = tables.filter((table) => matchesTableKey(table.name, String(args.name)));
        if (tables.length === 0) {
          console.error(`No table migration found for key "${String(args.name)}"`);
          return;
        }
      }
      if (tables.length === 0) {
        console.log('ℹ️  No tables selected; nothing to import.');
        return;
      }

      const targetDatabases = resolveDatabaseTargets(bundle.app, parseList(args.database));
      const migrationsRoot = path.resolve(projectRoot, 'config', 'migrations');
      const overridesRoot = path.resolve(projectRoot, bundle.app.paths.overrides.functions);
      const overrides = { functions: overridesRoot };

      const successes: string[] = [];
      const failures: Array<{ name: string; error: unknown }> = [];
      let aborted = false;

      for (const target of targetDatabases) {
        try {
          console.log(`🎯 Target database: ${target.name} (${target.config.namespace}/${target.config.database})`);
          await importSurqlAssets(
            target.config,
            tables,
            {
              migrationsRoot,
              overrides,
              layers: ['functions'],
              fileFilters,
              cleanupFilters,
              dryRun: Boolean(args['dry-run']),
              onExisting,
              assetTracking: { projectRoot },
              onlyChanged,
            }
          );
          successes.push(target.name);
        } catch (error: any) {
          failures.push({ name: target.name, error });
          console.error(`❌ Failed importing functions for ${target.name}:`, error?.message ?? error);
          const proceed = await promptToContinue('Continue with next database?');
          if (!proceed) {
            aborted = true;
            break;
          }
        }
      }

      printImportSummary('Function import', successes, failures, aborted);
    }
  )
  .command(
    'import [name]',
    'Import generated SURQL assets (functions, events, views, indexes) into the target database(s)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Optional table name to target (e.g. user)',
          type: 'string',
        })
        .option('database', {
          alias: ['d', 'db'],
          type: 'string',
          describe: 'Database name from app.config.yaml (comma-separated for multiple)',
        })
        .option('layers', {
          alias: 'l',
          type: 'string',
          describe: 'Comma-separated list of layers to import (functions,events,views,indexes); default all',
        })
        .option('dry-run', {
          type: 'boolean',
          default: false,
          describe: 'Print statements without applying them',
        })
        .option('on-existing', {
          type: 'string',
          choices: ['overwrite', 'if-not-exists', 'none'],
          describe: 'How to handle existing DEFINE targets when importing',
        })
        .option('only-changed', {
          type: 'boolean',
          describe: 'Only import assets that differ from the target database',
        })
        .option('force', {
          alias: ['all'],
          type: 'boolean',
          default: false,
          describe: 'Import all assets, ignoring only-changed settings',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const onExisting = resolveOnExistingFlag(args['on-existing'], bundle.app.onExisting);
      const onlyChanged = resolveOnlyChanged(args['only-changed'], args.force, bundle.app.importFilters?.onlyChanged);
      const fileFilters = bundle.app.importFilters?.files;
      const cleanupFilters = bundle.app.importFilters?.cleanup;

      let tables = bundle.tableMigrations;
      const tableFilter = bundle.app.importFilters?.tables;
      const tableExclude = bundle.app.importFilters?.tablesExclude;
      if (!args.name) {
        tables = applyTableFilters(tables, tableFilter, tableExclude);
      }
      if (args.name) {
        tables = tables.filter((table) => matchesTableKey(table.name, String(args.name)));
        if (tables.length === 0) {
          console.error(`No table migration found for key "${String(args.name)}"`);
          return;
        }
      }

      if (tables.length === 0) {
        console.log('ℹ️  No tables selected; nothing to import.');
        return;
      }

      const targetDatabases = resolveDatabaseTargets(bundle.app, parseList(args.database));
      const migrationsRoot = path.resolve(projectRoot, 'config', 'migrations');
      const overridesRoot = path.resolve(projectRoot, bundle.app.paths.overrides.functions);
      const overrides = { functions: overridesRoot };
      const layers = resolveLayers(args.layers, bundle.app.importFilters?.layers);

      const successes: string[] = [];
      const failures: Array<{ name: string; error: unknown }> = [];
      let aborted = false;

      for (const target of targetDatabases) {
        try {
          console.log(`🎯 Target database: ${target.name} (${target.config.namespace}/${target.config.database})`);
          const options = {
            migrationsRoot,
            overrides,
            dryRun: Boolean(args['dry-run']),
            onExisting,
            fileFilters,
            cleanupFilters,
            assetTracking: { projectRoot },
            onlyChanged,
            ...(layers ? { layers } : {}),
          };
          await importSurqlAssets(target.config, tables, options);
          if (args['rebuild-indexes'] !== false) {
            const rebuilt = await rebuildIndexes(target.config, {
              dryRun: Boolean(args['dry-run']),
              record: false,
            });
            console.log(`✅ Rebuilt ${rebuilt.length} index(es) for ${target.name}.`);
          }
          successes.push(target.name);
        } catch (error: any) {
          failures.push({ name: target.name, error });
          console.error(`❌ Failed importing assets for ${target.name}:`, error?.message ?? error);
          const proceed = await promptToContinue('Continue with next database?');
          if (!proceed) {
            aborted = true;
            break;
          }
        }
      }

      printImportSummary('Import', successes, failures, aborted);
    }
  )
  .command(
    'generate:modules',
    'Generate SURQL assets (functions/events/views/indexes/bundles) for enabled or specified modules',
    (yargsBuilder: any) =>
      yargsBuilder
        .option('modules', {
          alias: 'm',
          type: 'string',
          describe: 'Comma-separated module names to generate (overrides config.modules)',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const cliModules = parseList(args.modules);
      const filterModules = bundle.app.importFilters?.bootstrap?.modules;
      const excludeModules = bundle.app.importFilters?.bootstrap?.modulesExclude;
      const configModules = resolveModulesConfig(bundle.app).enabled ?? [];
      let modules = cliModules
        ? Array.from(cliModules.values())
        : filterModules && filterModules.length > 0
          ? filterModules
          : configModules;
      modules = applyStringFilters(modules, undefined, excludeModules);

      if (modules.length === 0) {
        console.log('ℹ️  No modules selected; nothing to generate.');
        return;
      }

      const modulesRoot = bundle.app.paths.modules
        ? path.resolve(projectRoot, bundle.app.paths.modules)
        : path.resolve(projectRoot, 'config/bootstrap/modules');

      await generateModules({
        projectRoot,
        modulesRoot,
        modules,
      });
      console.log('✅ Module generation complete.');
    }
  )
  .command(
    'bootstrap',
    'Import bootstrap assets and enabled modules into the target database(s)',
    (yargsBuilder: any) =>
      yargsBuilder
        .option('database', {
          alias: ['d', 'db'],
          type: 'string',
          describe: 'Database name from app.config.yaml (comma-separated for multiple)',
        })
        .option('modules', {
          alias: 'm',
          type: 'string',
          describe: 'Comma-separated module names to import (overrides config.modules)',
        })
        .option('seed', {
          type: 'boolean',
          default: true,
          describe: 'Import seed file matching the database key (default: true)',
        })
        .option('with-schema-functions', {
          type: 'boolean',
          describe: 'Import generated schema functions before seeds (default: true when --seed is enabled)',
        })
        .option('dry-run', {
          type: 'boolean',
          default: false,
          describe: 'Print statements without applying them',
        })
        .option('on-existing', {
          type: 'string',
          choices: ['overwrite', 'if-not-exists', 'none'],
          describe: 'How to handle existing DEFINE targets when importing',
        })
        .option('only-changed', {
          type: 'boolean',
          describe: 'Only import assets that differ from the target database',
        })
        .option('rebuild-indexes', {
          type: 'boolean',
          default: true,
          describe: 'Rebuild indexes after import (use --no-rebuild-indexes to skip)',
        })
        .option('force', {
          type: 'boolean',
          default: false,
          describe: 'Import all assets, ignoring only-changed settings',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const targetDatabases = resolveDatabaseTargets(bundle.app, parseList(args.database));
      const onExisting = resolveOnExistingFlag(args['on-existing'], bundle.app.onExisting);
      const onlyChanged = resolveOnlyChanged(args['only-changed'], args.force, bundle.app.importFilters?.onlyChanged);
      const importSchemaFunctions =
        typeof args['with-schema-functions'] === 'boolean'
          ? args['with-schema-functions']
          : args.seed !== false;

      const cliModules = parseList(args.modules);
      const configModules = resolveModulesConfig(bundle.app).enabled ?? [];
      let modules = cliModules ? Array.from(cliModules.values()) : configModules;
      const excludeModules = bundle.app.importFilters?.bootstrap?.modulesExclude;
      modules = applyStringFilters(modules, undefined, excludeModules);

      const modulesRoot = bundle.app.paths.modules
        ? path.resolve(projectRoot, bundle.app.paths.modules)
        : path.resolve(projectRoot, 'config/modules');
      const schemaFunctionTables = applyTableFilters(
        bundle.tableMigrations,
        bundle.app.importFilters?.tables,
        bundle.app.importFilters?.tablesExclude
      );
      const schemaFunctionsRoot = path.resolve(projectRoot, 'config', 'migrations');
      const schemaOverridesRoot = path.resolve(projectRoot, bundle.app.paths.overrides.functions);
      const schemaOverrides = { functions: schemaOverridesRoot };
      const schemaFileFilters = bundle.app.importFilters?.files;
      const schemaCleanupFilters = bundle.app.importFilters?.cleanup;

      const successes: string[] = [];
      const failures: Array<{ name: string; error: unknown }> = [];
      let aborted = false;

      for (const target of targetDatabases) {
        try {
          console.log(`🎯 Target database: ${target.name} (${target.config.namespace}/${target.config.database})`);

          // Bootstrap functions directory (all .surql in config/bootstrap/functions)
          await runBootstrapFunctions(
            target.config,
            bundle.app.importFilters?.bootstrap?.functions && bundle.app.importFilters.bootstrap.functions.length > 0
              ? {
                  files: bundle.app.importFilters.bootstrap.functions,
                  exclude: bundle.app.importFilters?.bootstrap?.functionsExclude,
                }
              : {
                  directories: ['.'],
                  exclude: bundle.app.importFilters?.bootstrap?.functionsExclude,
                },
            { dryRun: Boolean(args['dry-run']), onExisting, assetTracking: { projectRoot, trackSeeds: false }, onlyChanged },
            path.resolve(projectRoot, 'config', 'bootstrap', 'functions')
          );

          // Modules
          await importModules(target.config, {
            modulesRoot,
            modules,
            dryRun: Boolean(args['dry-run']),
            onExisting,
            assetTracking: { projectRoot, trackSeeds: false },
            onlyChanged,
          });

          if (importSchemaFunctions) {
            if (schemaFunctionTables.length === 0) {
              console.log('ℹ️  No schema functions selected; skipping pre-seed import.');
            } else {
              await importSurqlAssets(target.config, schemaFunctionTables, {
                migrationsRoot: schemaFunctionsRoot,
                overrides: schemaOverrides,
                layers: ['functions'],
                fileFilters: schemaFileFilters,
                cleanupFilters: schemaCleanupFilters,
                dryRun: Boolean(args['dry-run']),
                onExisting,
                assetTracking: { projectRoot, trackSeeds: false },
                onlyChanged,
              });
            }
          }

          if (args.seed !== false) {
            const seedsRoot = path.resolve(projectRoot, 'config', 'bootstrap', 'seed');
            const seedFilter = bundle.app.importFilters?.bootstrap?.seeds;
            const seedExclude = bundle.app.importFilters?.bootstrap?.seedsExclude;
            if (seedExclude && seedExclude.includes(target.name)) {
              console.log(`ℹ️  Seed import skipped for "${target.name}" (excluded).`);
            } else if (seedFilter && seedFilter.length > 0 && !seedFilter.includes(target.name)) {
              console.log(`ℹ️  Seed import skipped for "${target.name}" (filtered).`);
            } else {
              await importSeeds(target.config, {
                seedsRoot,
                databaseKey: target.name,
                dryRun: Boolean(args['dry-run']),
                onExisting,
                assetTracking: { projectRoot, trackSeeds: false },
                onlyChanged,
              });
            }
          }

          if (args['rebuild-indexes'] !== false) {
            const rebuilt = await rebuildIndexes(target.config, {
              dryRun: Boolean(args['dry-run']),
              record: false,
            });
            console.log(`✅ Rebuilt ${rebuilt.length} index(es) for ${target.name}.`);
          }

          successes.push(target.name);
        } catch (error: any) {
          failures.push({ name: target.name, error });
          console.error(`❌ Failed bootstrap for ${target.name}:`, error?.message ?? error);
          const proceed = await promptToContinue('Continue with next database?');
          if (!proceed) {
            aborted = true;
            break;
          }
        }
      }

      printImportSummary('Bootstrap', successes, failures, aborted);
    }
  )
  .command(
    'bootstrap:seed',
    'Import only the seed file matching the database key (no other bootstrap steps)',
    (yargsBuilder: any) =>
      yargsBuilder
        .option('database', {
          alias: ['d', 'db'],
          type: 'string',
          describe: 'Database name from app.config.yaml (comma-separated for multiple)',
        })
        .option('dry-run', {
          type: 'boolean',
          default: false,
          describe: 'Print statements without applying them',
        })
        .option('on-existing', {
          type: 'string',
          choices: ['overwrite', 'if-not-exists', 'none'],
          describe: 'How to handle existing DEFINE targets when importing',
        })
        .option('only-changed', {
          type: 'boolean',
          describe: 'Only import assets that differ from the target database',
        })
        .option('force', {
          type: 'boolean',
          default: false,
          describe: 'Import all assets, ignoring only-changed settings',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const targetDatabases = resolveDatabaseTargets(bundle.app, parseList(args.database));
      const seedsRoot = path.resolve(projectRoot, 'config', 'bootstrap', 'seed');
      const onExisting = resolveOnExistingFlag(args['on-existing'], bundle.app.onExisting);
      const onlyChanged = resolveOnlyChanged(args['only-changed'], args.force, bundle.app.importFilters?.onlyChanged);

      const successes: string[] = [];
      const failures: Array<{ name: string; error: unknown }> = [];
      let aborted = false;

      for (const target of targetDatabases) {
        try {
          console.log(`🎯 Target database: ${target.name} (${target.config.namespace}/${target.config.database})`);
          await importSeeds(target.config, {
            seedsRoot,
            databaseKey: target.name,
            dryRun: Boolean(args['dry-run']),
            onExisting,
            assetTracking: { projectRoot },
            onlyChanged,
          });
          successes.push(target.name);
        } catch (error: any) {
          failures.push({ name: target.name, error });
          console.error(`❌ Failed seed import for ${target.name}:`, error?.message ?? error);
          const proceed = await promptToContinue('Continue with next database?');
          if (!proceed) {
            aborted = true;
            break;
          }
        }
      }

      printImportSummary('Seed import', successes, failures, aborted);
    }
  )
  .command(
    'indexes:rebuild [name]',
    'Rebuild indexes for the target database(s)',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Index name to rebuild (comma-separated for multiple)',
          type: 'string',
        })
        .option('index', {
          alias: 'i',
          type: 'string',
          describe: 'Index name to rebuild (comma-separated)',
        })
        .option('table', {
          alias: 't',
          type: 'string',
          describe: 'Table name to scope rebuild (comma-separated)',
        })
        .option('database', {
          alias: ['d', 'db'],
          type: 'string',
          describe: 'Database name from app.config.yaml (comma-separated for multiple)',
        })
        .option('record', {
          type: 'boolean',
          default: true,
          describe: 'Store rebuilt index list in app:indexes',
        })
        .option('dry-run', {
          type: 'boolean',
          default: false,
          describe: 'Print statements without applying them',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const bundle = await loadConfigBundle(projectRoot);
      const targetDatabases = resolveDatabaseTargets(bundle.app, parseList(args.database));
      const indexNames = parseList(args.name || args.index);
      const tables = parseList(args.table);

      const successes: string[] = [];
      const failures: Array<{ name: string; error: unknown }> = [];
      let aborted = false;

      for (const target of targetDatabases) {
        try {
          console.log(`🎯 Target database: ${target.name} (${target.config.namespace}/${target.config.database})`);
          const rebuilt = await rebuildIndexes(target.config, {
            tables: tables ? Array.from(tables.values()) : undefined,
            indexNames: indexNames ? Array.from(indexNames.values()) : undefined,
            dryRun: Boolean(args['dry-run']),
            record: args.record !== false,
          });
          console.log(`✅ Rebuilt ${rebuilt.length} index(es) for ${target.name}.`);
          successes.push(target.name);
        } catch (error: any) {
          failures.push({ name: target.name, error });
          console.error(`❌ Failed index rebuild for ${target.name}:`, error?.message ?? error);
          const proceed = await promptToContinue('Continue with next database?');
          if (!proceed) {
            aborted = true;
            break;
          }
        }
      }

      printImportSummary('Index rebuild', successes, failures, aborted);
    }
  )
  .command(
    'trpc:scaffold <name>',
    'Scaffold a TRPC block for a table migration',
    (yargsBuilder: any) =>
      yargsBuilder
        .positional('name', {
          describe: 'Table key (e.g. user or user/settings)',
          type: 'string',
        })
        .option('force', {
          alias: 'f',
          type: 'boolean',
          default: false,
          describe: 'Overwrite existing trpc block if present',
        }),
    async (args: any) => {
      const projectRoot = path.resolve(__dirname, '..');
      const migrationsRoot = path.resolve(projectRoot, 'config', 'migrations');
      const target = String(args.name);

      const { filePath, tableConfig, reference } = await loadMigrationFile(migrationsRoot, target);

      const hasRouterBlock = !!tableConfig.router || !!(tableConfig as any).trpc;
      const hasCrudBlock = !!tableConfig.crud;

      if ((hasRouterBlock || hasCrudBlock) && !args.force) {
        console.warn(`⚠️  File already contains router/crud data: ${path.relative(projectRoot, filePath)} (use --force to overwrite)`);
        return;
      }

      const { routerBlock, crudBlock } = buildRouterTemplate(tableConfig, reference);
      tableConfig.router = routerBlock;
      tableConfig.crud = crudBlock;
      const doc = YAML.parseDocument(await readFile(filePath, 'utf-8'));
      doc.set('router', routerBlock as any);
      doc.set('crud', crudBlock as any);
      if (doc.has('trpc')) {
        doc.delete('trpc');
      }

      await writeFile(filePath, doc.toString(), 'utf-8');
      console.log(`🧩 Updated router/crud configuration in ${path.relative(projectRoot, filePath)}`);
    }
  )
  .demandCommand(1)
  .help()
  .strict()
  .parse();

export default argv;

async function promptToContinue(message: string): Promise<boolean> {
  if (!process.stdin.isTTY) {
    return true;
  }
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${message} [Y/n] `);
  rl.close();
  const normalized = answer.trim().toLowerCase();
  return normalized === '' || normalized === 'y' || normalized === 'yes';
}

async function promptInput(label: string): Promise<string> {
  if (!process.stdin.isTTY) return '';
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${label}: `);
  rl.close();
  return answer.trim();
}

const execFileAsync = promisify(execFile);

async function maybeGenerateRouterManifest(projectRootDir: string, project: ProjectPathsConfig) {
  const nuxtRoot = project.nuxtProjectRoot?.trim();
  if (!nuxtRoot) return;
  const isSchemaDocs =
    project.name === 'schema-docs' ||
    nuxtRoot.endsWith('schema-docs') ||
    nuxtRoot.split(path.sep).includes('schema-docs');
  if (!isSchemaDocs) return;

  const scriptPath = path.resolve(projectRootDir, nuxtRoot, 'scripts', 'generate-router-manifest.cjs');
  const s = await stat(scriptPath).catch(() => null);
  if (!s?.isFile()) return;
  try {
    await execFileAsync(process.execPath, [scriptPath], { cwd: path.dirname(scriptPath) });
    console.log(`🧾 Updated router manifest for ${project.name}`);
  } catch (error: any) {
    console.warn(`⚠️  Unable to update router manifest for ${project.name}:`, error?.message ?? error);
  }
}

async function maybeGenerateRouterCharter(projectRootDir: string, project: ProjectPathsConfig) {
  const nuxtRoot = project.nuxtProjectRoot?.trim();
  if (!nuxtRoot) return;
  const isSchemaDocs =
    project.name === 'schema-docs' ||
    nuxtRoot.endsWith('schema-docs') ||
    nuxtRoot.split(path.sep).includes('schema-docs');
  if (!isSchemaDocs) return;

  const scriptPath = path.resolve(projectRootDir, nuxtRoot, 'scripts', 'generate-router-charter.cjs');
  const s = await stat(scriptPath).catch(() => null);
  if (!s?.isFile()) return;
  try {
    await execFileAsync(process.execPath, [scriptPath], { cwd: path.dirname(scriptPath) });
    console.log(`📘 Updated router charter for ${project.name}`);
  } catch (error: any) {
    console.warn(`⚠️  Unable to update router charter for ${project.name}:`, error?.message ?? error);
  }
}

async function findNuxtConfig(root: string): Promise<string | null> {
  const candidates = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'];
  for (const name of candidates) {
    const fullPath = path.join(root, name);
    try {
      await readFile(fullPath, 'utf-8');
      return fullPath;
    } catch {
      // ignore
    }
  }
  return null;
}

function ensureRuntimeConfigRoot(source: string): string {
  if (source.includes('runtimeConfig:')) return source;
  const configIndex = source.indexOf('defineNuxtConfig(');
  if (configIndex === -1) return source;
  const braceStart = source.indexOf('{', configIndex);
  if (braceStart === -1) return source;
  const insert = `\n  runtimeConfig: {\n    public: {},\n  },`;
  return `${source.slice(0, braceStart + 1)}${insert}${source.slice(braceStart + 1)}`;
}

function ensureRuntimeConfigPublicBlock(source: string): string {
  const runtimeIndex = source.indexOf('runtimeConfig:');
  if (runtimeIndex === -1) return source;
  const runtimeBrace = source.indexOf('{', runtimeIndex);
  if (runtimeBrace === -1) return source;
  if (source.slice(runtimeIndex).includes('public:')) return source;
  const insert = `\n    public: {},`;
  return `${source.slice(0, runtimeBrace + 1)}${insert}${source.slice(runtimeBrace + 1)}`;
}

function ensureRuntimeConfigSurrealdb(source: string): string {
  let updated = ensureRuntimeConfigRoot(source);
  if (updated.includes('surrealdb')) return updated;
  const runtimeIndex = updated.indexOf('runtimeConfig:');
  if (runtimeIndex === -1) return updated;

  const braceStart = updated.indexOf('{', runtimeIndex);
  if (braceStart === -1) return updated;

  const insert = `\n    surrealdb: {\n      url: '',\n      namespace: '',\n      database: '',\n      user: '',\n      pass: '',\n    },`;
  return `${updated.slice(0, braceStart + 1)}${insert}${updated.slice(braceStart + 1)}`;
}

function ensureRuntimeConfigTypesense(source: string): string {
  let updated = ensureRuntimeConfigRoot(source);
  updated = ensureRuntimeConfigPublicBlock(updated);

  const runtimeIndex = updated.indexOf('runtimeConfig:');
  if (runtimeIndex === -1) return updated;

  if (!updated.includes('typesense:')) {
    const baseBrace = updated.indexOf('{', runtimeIndex);
    if (baseBrace !== -1) {
      const baseInsert = `\n    typesense: {\n      host: '',\n      apiKey: '',\n      port: '',\n      enableCors: '',\n    },`;
      updated = `${updated.slice(0, baseBrace + 1)}${baseInsert}${updated.slice(baseBrace + 1)}`;
    }
  }

  const publicIndex = updated.indexOf('public:', runtimeIndex);
  if (publicIndex === -1) return updated;
  const publicBrace = updated.indexOf('{', publicIndex);
  if (publicBrace === -1) return updated;

  if (!updated.slice(publicIndex).includes('typesense:')) {
    const publicInsert = `\n      typesense: {\n        host: '',\n        apiKey: '',\n        port: '',\n        enableCors: '',\n      },`;
    updated = `${updated.slice(0, publicBrace + 1)}${publicInsert}${updated.slice(publicBrace + 1)}`;
  }

  return updated;
}

function ensureRuntimeConfigSentry(source: string): string {
  let updated = ensureRuntimeConfigRoot(source);
  updated = ensureRuntimeConfigPublicBlock(updated);

  const runtimeIndex = updated.indexOf('runtimeConfig:');
  if (runtimeIndex === -1) return updated;

  if (!updated.includes('sentry:')) {
    const baseBrace = updated.indexOf('{', runtimeIndex);
    if (baseBrace !== -1) {
      const baseInsert = `\n    sentry: {\n      dsn: '',\n      env: '',\n    },`;
      updated = `${updated.slice(0, baseBrace + 1)}${baseInsert}${updated.slice(baseBrace + 1)}`;
    }
  }

  const publicIndex = updated.indexOf('public:', runtimeIndex);
  if (publicIndex === -1) return updated;
  const publicBrace = updated.indexOf('{', publicIndex);
  if (publicBrace === -1) return updated;

  if (!updated.slice(publicIndex).includes('sentry:')) {
    const publicInsert = `\n      sentry: {\n        dsn: '',\n        env: '',\n      },`;
    updated = `${updated.slice(0, publicBrace + 1)}${publicInsert}${updated.slice(publicBrace + 1)}`;
  }

  return updated;
}

function ensureRuntimeConfigRedis(source: string): string {
  let updated = ensureRuntimeConfigRoot(source);
  const runtimeIndex = updated.indexOf('runtimeConfig:');
  if (runtimeIndex === -1) return updated;

  if (updated.includes('redis:')) return updated;

  const braceStart = updated.indexOf('{', runtimeIndex);
  if (braceStart === -1) return updated;

  const insert = `\n    redis: {\n      host: '',\n      port: 6379,\n      password: '',\n      fileLoggingEnabled: false,\n    },`;
  return `${updated.slice(0, braceStart + 1)}${insert}${updated.slice(braceStart + 1)}`;
}

function ensureApiRouterExport(source: string): string {
  let updated = source;
  if (!updated.includes('const dbRouter')) return updated;

  if (!updated.includes('apiRouter')) {
    updated = `${updated.trimEnd()}\n\nexport const apiRouter = t.router({\n  db: dbRouter,\n})\n`;
  }

  if (!updated.includes('export const dbRouter')) {
    updated = `${updated.trimEnd()}\n\nexport { dbRouter };\n`;
  }

  return updated;
}

function ensureAppRouterDbOnly(source: string): string {
  let updated = source;

  if (!updated.match(/from\s+['"]\.\/api['"]/)) {
    const importLines = updated.match(/^import .*$/gm) ?? [];
    const insertPoint = importLines.length
      ? updated.lastIndexOf(importLines[importLines.length - 1]) + importLines[importLines.length - 1].length
      : 0;
    const insert = `\nimport { apiRouter, dbRouter } from './api'\n`;
    updated = `${updated.slice(0, insertPoint)}${insert}${updated.slice(insertPoint)}`;
  }

  updated = updated.replace(
    /import\s+\{\s*[^}]*\}\s+from\s+['"]\.\/api['"]\s*;?/g,
    `import { apiRouter, dbRouter } from './api'\n`
  );

  if (!updated.includes('db: dbRouter')) {
    if (updated.includes('...generatedRouters')) {
      updated = updated.replace(
        /(\.\.\.generatedRouters[^\n]*\n)/,
        `$1  db: dbRouter,\n`
      );
    } else {
      updated = updated.replace(
        /export const appRouter = t\.router\(\{\n/,
        `export const appRouter = t.router({\n  db: dbRouter,\n`
      );
    }
  }

  if (!updated.includes('api: apiRouter')) {
    if (updated.includes('db: dbRouter')) {
      updated = updated.replace(/db:\s*dbRouter,\n/, `db: dbRouter,\n  api: apiRouter,\n`);
    } else if (updated.includes('...generatedRouters')) {
      updated = updated.replace(
        /(\.\.\.generatedRouters[^\n]*\n)/,
        `$1  api: apiRouter,\n`
      );
    } else {
      updated = updated.replace(
        /export const appRouter = t\.router\(\{\n/,
        `export const appRouter = t.router({\n  api: apiRouter,\n`
      );
    }
  }

  return updated;
}

function printImportSummary(
  label: string,
  successes: string[],
  failures: Array<{ name: string; error: unknown }>,
  aborted: boolean
): void {
  const successList = successes.length > 0 ? successes.join(', ') : 'none';
  const failureList = failures.length > 0 ? failures.map((f) => f.name).join(', ') : 'none';
  console.log(`✅ ${label} summary: success=${successList}; failed=${failureList}${aborted ? '; aborted' : ''}.`);
}

async function loadMigrationFile(migrationsRoot: string, target: string) {
  const normalizedTarget = target
    .replace(/\\/g, '/')
    .replace(/\.(?:table|primary|st|st\.many)\.yaml$/i, '')
    .trim();
  const fileBase = normalizedTarget.replace(/\/+/, '/').replace(/\//g, '.');
  const fileNames = buildTableFileNameCandidates(fileBase);
  const filePath = await findMigrationFile(migrationsRoot, fileNames);
  if (!filePath) {
    throw new Error(
      `Unable to locate migration file for "${target}" (expected one of ${fileNames.join(', ')})`
    );
  }

  const fileContent = await readFile(filePath, 'utf-8');
  const tableConfig = YAML.parse(fileContent) as TableMigrationConfig;
  if (!tableConfig) {
    throw new Error(`Failed to parse migration file: ${filePath}`);
  }

  return { filePath, tableConfig, reference: fileBase };
}

async function findMigrationFile(dir: string, fileNames: string[]): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const result = await findMigrationFile(fullPath, fileNames);
      if (result) return result;
    } else if (entry.isFile() && fileNames.includes(entry.name)) {
      return fullPath;
    }
  }

  return null;
}

function buildRouterTemplate(table: TableMigrationConfig, reference: string) {
  const slugSource = reference.replace(/\./g, ' ');
  const routerName = table.router?.name ?? toKebabCase(slugSource || (table.name ?? 'router'));
  const pascalRef = toPascalCase(slugSource || (table.name ?? routerName));
  const resourceFunction = `${pascalRef}Default`;

  const requiredFields = getRequiredFieldNames(table);
  const createOptions: Record<string, unknown> = {};
  const idSource = table.id?.structure ?? table.id?.source;
  if (idSource) {
    createOptions.idSource = idSource;
  }
  if (requiredFields.length > 0) {
    createOptions.validations = { required: requiredFields };
  }

  const crudBlock = {
    create: {
      enabled: true,
      name: 'create__NAME__',
      params: [
        { name: 'payload', type: 'object' },
      ],
      options: createOptions,
    },
    update: {
      enabled: true,
      name: 'update__NAME__',
      params: [
        { name: 'rid', type: 'record' },
        { name: 'payload', type: 'object' },
      ],
      options: {
        validations: {
          required: ['rid'],
        },
      },
    },
    delete: {
      enabled: true,
      name: 'delete__NAME__',
      params: [
        { name: 'rid', type: 'record' },
      ],
      options: {
        validations: {
          required: ['rid'],
        },
      },
    },
  };

  const routerBlock = {
    name: routerName,
    endpoints: [
      {
        resource: {
          default: {
            target: 'view',
            value: resourceFunction,
          },
        },
      },
      { create: { target: 'crud', value: 'create' } },
      { update: { target: 'crud', value: 'update' } },
      { delete: { target: 'crud', value: 'delete' } },
    ],
  };

  return { routerBlock, crudBlock };
}

function getRequiredFieldNames(table: TableMigrationConfig): string[] {
  const names = new Set<string>();
  for (const entry of table.fields ?? []) {
    const [fieldName, meta] = Object.entries(entry)[0] ?? [];
    if (!fieldName) continue;
    if (meta && typeof meta === 'object' && (meta as any).required) {
      names.add(fieldName);
    }
  }
  return Array.from(names);
}

function parseList(value?: string): Set<string> | null {
  if (!value) return null;
  const parts = String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? new Set(parts) : null;
}

function applyTableFilters(
  tables: TableMigrationConfig[],
  include?: string[],
  exclude?: string[]
): TableMigrationConfig[] {
  let result = tables;
  if (include && include.length > 0) {
    result = result.filter((table) => include.some((key) => matchesTableKey(table.name, key)));
  }
  if (exclude && exclude.length > 0) {
    result = result.filter((table) => !exclude.some((key) => matchesTableKey(table.name, key)));
  }
  return result;
}

function applyStringFilters(
  values: string[],
  include?: string[],
  exclude?: string[]
): string[] {
  let result = values;
  if (include && include.length > 0) {
    const includeSet = new Set(include.map((v) => v.toLowerCase()));
    result = result.filter((value) => includeSet.has(value.toLowerCase()));
  }
  if (exclude && exclude.length > 0) {
    const excludeSet = new Set(exclude.map((v) => v.toLowerCase()));
    result = result.filter((value) => !excludeSet.has(value.toLowerCase()));
  }
  return result;
}

function parseLayers(value?: string): ('functions' | 'events' | 'views' | 'indexes' | 'edges')[] | undefined {
  if (!value) return undefined;
  const parts = String(value)
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const allowed = new Set(['functions', 'events', 'views', 'indexes', 'edges']);
  const layers = parts.filter((p) => allowed.has(p)) as Array<
    'functions' | 'events' | 'views' | 'indexes' | 'edges'
  >;
  return layers.length > 0 ? layers : undefined;
}

function resolveLayers(
  cliValue: string | undefined,
  config?: { include?: string[]; exclude?: string[] }
): ('functions' | 'events' | 'views' | 'indexes' | 'edges')[] | undefined {
  const cliLayers = parseLayers(cliValue);
  if (cliLayers && cliLayers.length > 0) return cliLayers;

  if (!config) return undefined;
  const include = config.include?.map((v) => v.toLowerCase()) ?? [];
  const exclude = config.exclude?.map((v) => v.toLowerCase()) ?? [];
  const allowed = new Set(['functions', 'events', 'views', 'indexes', 'edges']);

  let layers = include.length > 0
    ? include.filter((layer) => allowed.has(layer))
    : Array.from(allowed.values());

  if (exclude.length > 0) {
    const excludeSet = new Set(exclude);
    layers = layers.filter((layer) => !excludeSet.has(layer));
  }

  return layers.length > 0 ? (layers as Array<'functions' | 'events' | 'views' | 'indexes' | 'edges'>) : undefined;
}

function resolveOnExistingFlag(raw: any, fallback?: string) {
  return normalizeOnExisting(raw ?? fallback);
}

function resolveOnlyChanged(raw: any, force: any, fallback?: boolean): boolean {
  if (force) return false;
  if (raw === undefined || raw === null) return Boolean(fallback);
  return Boolean(raw);
}

async function loadModuleTablesForGeneration(
  projectRoot: string,
  appConfig: AppConfig
): Promise<TableMigrationConfig[]> {
  const filterModules = appConfig.importFilters?.bootstrap?.modules;
  const excludeModules = appConfig.importFilters?.bootstrap?.modulesExclude;
  const configModules = resolveModulesConfig(appConfig).enabled ?? [];
  let modules = filterModules && filterModules.length > 0 ? filterModules : configModules;
  modules = applyStringFilters(modules, undefined, excludeModules);

  if (!modules || modules.length === 0) {
    return [];
  }

  const modulesRoot = appConfig.paths.modules
    ? path.resolve(projectRoot, appConfig.paths.modules)
    : path.resolve(projectRoot, 'config/bootstrap/modules');
  const instanceConfig = appConfig.instance;
  const tables: TableMigrationConfig[] = [];

  for (const mod of modules) {
    const specsDir = path.resolve(modulesRoot, mod, 'specs');
    const overridesDir = resolveModuleOverridesDir(modulesRoot, mod);
    try {
      const loaded = await loadTableMigrations(specsDir, instanceConfig ?? undefined, overridesDir);
      tables.push(...loaded);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        console.warn(`⚠️  Failed loading module specs for "${mod}":`, error?.message ?? error);
      }
    }
  }

  return tables;
}

function mergeTableLists(
  baseTables: TableMigrationConfig[],
  moduleTables: TableMigrationConfig[]
): TableMigrationConfig[] {
  const byModel = new Map<string, TableMigrationConfig>();
  for (const table of baseTables) {
    const model = table.table?.model ?? '';
    if (!model) continue;
    if (!byModel.has(model)) {
      byModel.set(model, table);
    }
  }
  for (const table of moduleTables) {
    const model = table.table?.model ?? '';
    if (!model) continue;
    if (!byModel.has(model)) {
      byModel.set(model, table);
    }
  }
  return Array.from(byModel.values());
}

async function syncGraphSpecsIfNeeded(options: {
  projectRoot: string;
  appConfig: AppConfig;
  args: any;
}): Promise<void> {
  const { projectRoot, appConfig, args } = options;
  const graph = appConfig.graph;
  const specCfg = graph?.spec;
  if (!graph?.input || !specCfg) return;

  if (args['no-sync-graph']) return;
  const syncFlag = args['sync-graph'];
  const syncOnGenerate = specCfg.syncOnGenerate !== false;
  if (!syncOnGenerate && syncFlag !== true) return;

  const mode = String(specCfg.mode ?? 'staging');
  const conflict = String(specCfg.conflictPolicy ?? 'overwrite');
  const prune = specCfg.pruneStale !== false;
  const cmdArgs = [
    'exec',
    'tsx',
    'scripts/mpdg-to-spec.ts',
    '--mode',
    mode,
    '--conflict',
    conflict,
    prune ? '--prune' : '--no-prune',
  ];

  await runChildProcess('pnpm', cmdArgs, projectRoot);
}

function runChildProcess(cmd: string, cmdArgs: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

function warnMissingCrudOrRouter(tables: TableMigrationConfig[]): void {
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
  console.warn(`⚠️  No CRUD/router defined for: ${list}. Generation may emit only partial assets.`);
}

interface DatabaseTarget {
  name: string;
  config: AppDatabaseConfig;
}

function resolveDatabaseTargets(app: AppConfig, explicit?: Set<string> | null): DatabaseTarget[] {
  const names = explicit
    ? Array.from(explicit.values())
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

  if (names.length === 0) {
    throw new Error('No database targets configured. Check environment.defaultDatabase or migrationTargets.');
  }

  const targets: DatabaseTarget[] = [];

  for (const name of names) {
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
