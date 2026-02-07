import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import YAML from 'yaml';

import type {
  AppConfig,
  AppDatabaseConfig,
  AppPaths,
  ImportsConfig,
  OverridesPathConfig,
  ProjectPathsConfig,
  AppModulesConfig,
  TableMigrationConfig,
  InstanceDefaultsConfig,
  GeneratedPathConfig,
} from '../types';

export interface LoadedConfig {
  app: AppConfig;
  defaultDatabase: AppDatabaseConfig;
  tableMigrations: TableMigrationConfig[];
  imports: ImportsConfig;
}

const APP_CONFIG_FILENAME = 'app.config.yaml';
const IMPORTS_CONFIG_FILENAME = 'imports.config.yaml';

export async function loadAppConfig(rootDir = process.cwd()): Promise<AppConfig> {
  const configPath = path.resolve(rootDir, 'config', APP_CONFIG_FILENAME);
  const fileContent = await readFile(configPath, 'utf-8');
  const parsed = YAML.parse(fileContent) as AppConfig;

  if (!parsed) {
    throw new Error(`Failed to parse ${APP_CONFIG_FILENAME}`);
  }

  if (!parsed.environment?.defaultDatabase) {
    throw new Error('App config missing environment.defaultDatabase');
  }

  if (!parsed.databases?.[parsed.environment.defaultDatabase]) {
    throw new Error(
      `App config missing database definition for ${parsed.environment.defaultDatabase}`
    );
  }

  const migrationTargets = parsed.environment.migrationTargets;
  if (migrationTargets) {
    if (!Array.isArray(migrationTargets)) {
      throw new Error('environment.migrationTargets must be an array of database names');
    }
    const missingTargets = migrationTargets.filter(
      (name) => !parsed.databases?.[name]
    );
    if (missingTargets.length > 0) {
      throw new Error(
        `environment.migrationTargets references undefined databases: ${missingTargets.join(', ')}`
      );
    }
  }

  parsed.paths = normalizeAppPaths(parsed);

  return parsed;
}

export async function loadTableMigrations(
  migrationsDir: string,
  instanceConfig?: InstanceDefaultsConfig,
  overridesDir?: string
): Promise<TableMigrationConfig[]> {
  const tableFiles = await findTableMigrationFiles(migrationsDir);
  const migrations: TableMigrationConfig[] = [];

  for (const filePath of tableFiles) {
    const fileContent = await readFile(filePath, 'utf-8');
    const normalizedContent = normalizeFieldTagSpacing(fileContent);
    const parsed = YAML.parse(normalizedContent) as TableMigrationConfig;

    if (!parsed?.table?.model) {
      throw new Error(`Table migration at ${filePath} missing "table.model" property`);
    }

    if (overridesDir) {
      const relative = path.relative(migrationsDir, filePath);
      const overridePath = path.resolve(overridesDir, relative);
      try {
        const overrideContent = await readFile(overridePath, 'utf-8');
        const overrideParsed = YAML.parse(overrideContent) as TableMigrationConfig;
        if (overrideParsed) {
          const merged = mergeSpecOverrides(parsed, overrideParsed) as TableMigrationConfig;
          Object.assign(parsed, merged);
        }
      } catch (error: any) {
        if (error?.code !== 'ENOENT') {
          throw error;
        }
      }
    }

    applyInstanceDefaults(parsed, instanceConfig);
    normalizeTableType(parsed);
    applySubmanyDefaults(parsed);
    parsed.__filePath = filePath;
    migrations.push(parsed);
  }

  return migrations;
}

export function resolveModuleOverridesDir(
  modulesRoot: string,
  moduleName: string
): string | undefined {
  const dir = path.resolve(modulesRoot, moduleName, 'specs_overrides');
  return existsSync(dir) ? dir : undefined;
}

function normalizeFieldTagSpacing(input: string): string {
  return input.replace(/<\s*([a-zA-Z0-9_]+)\s*:\s*([a-zA-Z0-9_.]+)\s*>/g, (_, key, value) => {
    return `<${String(key).trim()}:${String(value).trim()}>`;
  });
}

function applyInstanceDefaults(
  table: TableMigrationConfig,
  instanceConfig?: InstanceDefaultsConfig
): void {
  if (!(table as any).instance) return;
  if (instanceConfig?.active === false) {
    (table as any).instance = false;
    return;
  }
  const tableModel = table.table?.model ?? table.name;
  if (tableModel === 'instance') return;

  const fields = (table.fields = table.fields ?? []);
  const defaults = resolveInstanceFieldDefaults(instanceConfig);
  if (!defaults) {
    return;
  }

  for (const [fieldName, meta] of Object.entries(defaults)) {
    if (meta.default !== undefined && meta.required !== undefined) {
      delete meta.required;
    }
    const entry = fields.find((item) => Object.prototype.hasOwnProperty.call(item, fieldName)) as any;
    if (entry && entry[fieldName]) {
      const fieldMeta = entry[fieldName] as TableFieldMeta;
      if (fieldMeta.default === undefined && meta.default !== undefined) {
        fieldMeta.default = meta.default;
      }
      if (fieldMeta.required === undefined && meta.required !== undefined) {
        fieldMeta.required = meta.required;
      }
      if (fieldMeta.default !== undefined && fieldMeta.required !== undefined) {
        delete (fieldMeta as any).required;
      }
      if (!fieldMeta.type && meta.type) {
        fieldMeta.type = meta.type;
      }
      if (!fieldMeta.items && meta.items) {
        fieldMeta.items = meta.items;
      }
      continue;
    }

    fields.push({ [fieldName]: meta });
  }
}

function applySubmanyDefaults(table: TableMigrationConfig): void {
  if (table.tableType !== 'submany') return;
  const fields = (table.fields = table.fields ?? []);
  const hasOrder = fields.some((item) => Object.prototype.hasOwnProperty.call(item, 'order'));
  if (hasOrder) return;
  fields.push({
    order: {
      type: 'number',
      required: false,
      default: 0,
    },
  });
}

function normalizeTableType(table: TableMigrationConfig): void {
  if (!table.tableType) {
    const isParentStructure =
      typeof table.structure === 'object' &&
      (table.structure as { type?: string }).type === 'parent';
    if (table.primary === false || isParentStructure) {
      table.tableType = 'subsingle';
    } else {
      table.tableType = 'primary';
    }
  }

  if (table.tableType === 'primary') {
    if (table.primary === undefined) {
      table.primary = true;
    }
    return;
  }

  table.primary = false;
}

function resolveInstanceFieldDefaults(
  instanceConfig?: InstanceDefaultsConfig
): Record<string, TableFieldMeta> | null {
  if (instanceConfig?.active === false) return null;

  if (instanceConfig?.fields && Object.keys(instanceConfig.fields).length > 0) {
    return instanceConfig.fields;
  }

  return {
    instances: {
      type: 'array',
      items: {
        type: 'string',
      },
      required: true,
      default: 'fn::defaultInstance({ returnArray: true })',
    },
  };
}

async function findTableMigrationFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return findTableMigrationFiles(fullPath);
      }
      if (
        entry.isFile() &&
        /\.(table|primary|st|st\.many)\.yaml$/i.test(entry.name)
      ) {
        return [fullPath];
      }
      return [];
    })
  );

  return files.flat();
}

export async function loadConfigBundle(rootDir = process.cwd()): Promise<LoadedConfig> {
  const appConfig = await loadAppConfig(rootDir);

  const migrationsPath = path.resolve(rootDir, appConfig.paths.migrations);
  const overridesPath =
    appConfig.paths.overrides?.specs
      ? path.resolve(rootDir, appConfig.paths.overrides.specs)
      : undefined;
  const tableMigrations = await loadTableMigrations(
    migrationsPath,
    appConfig.instance,
    overridesPath
  );

  const defaultDatabase = appConfig.databases[appConfig.environment.defaultDatabase];
  if (!defaultDatabase) {
    throw new Error(
      `Database "${appConfig.environment.defaultDatabase}" is not defined in app.config.yaml`
    );
  }

  const importsConfig = await loadImportsConfig(rootDir);

  return {
    app: appConfig,
    defaultDatabase,
    tableMigrations,
    imports: importsConfig,
  };
}

export async function loadImportsConfig(rootDir = process.cwd()): Promise<ImportsConfig> {
  const configPath = path.resolve(rootDir, 'config', IMPORTS_CONFIG_FILENAME);

  try {
    const fileContent = await readFile(configPath, 'utf-8');
    const parsed = YAML.parse(fileContent) as ImportsConfig;
    return parsed ?? {};
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function normalizeAppPaths(config: AppConfig): AppPaths {
  const rawPaths: any = config.paths;
  if (!rawPaths) {
    throw new Error('App config missing "paths" section');
  }

  const basePaths: Pick<AppPaths, 'migrations' | 'surrealOutput' | 'docsOutput'> = {
    migrations: rawPaths.migrations,
    surrealOutput: rawPaths.surrealOutput,
    docsOutput: rawPaths.docsOutput,
  };

  if (!basePaths.migrations || !basePaths.surrealOutput || !basePaths.docsOutput) {
    throw new Error('paths.migrations, paths.surrealOutput, and paths.docsOutput are required');
  }

  const projectsSource: any[] = Array.isArray(rawPaths.projects) ? rawPaths.projects : [];
  const schemaAppProject = resolveSchemaAppProject(config);
  if (schemaAppProject) {
    const exists = projectsSource.some((project) => {
      const nameMatch =
        typeof project?.name === 'string' && project.name.trim() === schemaAppProject.name;
      const rootMatch =
        typeof project?.nuxtProjectRoot === 'string' &&
        project.nuxtProjectRoot.trim() === schemaAppProject.nuxtProjectRoot;
      return nameMatch || rootMatch;
    });
    if (!exists) {
      projectsSource.push(schemaAppProject);
    }
  }

  const projects =
    projectsSource && projectsSource.length > 0
      ? projectsSource
      : [
          {
            name: config.project?.name ?? 'default',
            nuxtProjectRoot: rawPaths.nuxtProjectRoot,
            generated: rawPaths.generated ?? {},
          },
        ];

  const normalizedProjects = projects
    .map((project, index) => normalizeProjectPaths(project, index, config.project?.name))
    .filter(Boolean)
    .filter((project: ProjectPathsConfig) => project.active !== false) as ProjectPathsConfig[];

  if (normalizedProjects.length === 0) {
    throw new Error('At least one project path must be defined under paths.projects');
  }

  return {
    ...basePaths,
    projects: normalizedProjects,
    overrides: normalizeOverridesPaths(rawPaths.overrides),
    modules: typeof rawPaths.modules === 'string' && rawPaths.modules.trim().length > 0
      ? rawPaths.modules
      : './config/bootstrap/modules',
  };
}

function resolveSchemaAppProject(config: AppConfig): ProjectPathsConfig | null {
  const docConfig: any = (config as any).documentation;
  const schemaApp: any = docConfig?.schemaApp;
  if (!schemaApp || schemaApp.enabled === false) {
    return null;
  }

  const location =
    typeof schemaApp.location === 'string' && schemaApp.location.trim().length > 0
      ? schemaApp.location.trim()
      : '';

  const settings = schemaApp.settings ?? {};
  const project = schemaApp.project ?? {};

  const nameSource =
    typeof settings.name === 'string' && settings.name.trim().length > 0
      ? settings.name.trim()
      : typeof project.name === 'string' && project.name.trim().length > 0
        ? project.name.trim()
        : 'schema-docs';

  const nuxtProjectRootSource =
    typeof project.nuxtProjectRoot === 'string' && project.nuxtProjectRoot.trim().length > 0
      ? project.nuxtProjectRoot.trim()
      : location;

  if (!nuxtProjectRootSource) {
    return null;
  }

  const generatedDefaults: GeneratedPathConfig = location
    ? {
        types: `${location}/app/types/schema/generated`,
        trpcRouters: `${location}/server/trpc/routers`,
        piniaStores: `${location}/app/stores/generated`,
      }
    : {};

  return {
    name: nameSource,
    nuxtProjectRoot: nuxtProjectRootSource,
    generated: {
      ...generatedDefaults,
      ...(project.generated ?? {}),
      ...(settings.generated ?? {}),
    },
    imports: {
      ...(project.imports ?? {}),
      ...(settings.imports ?? {}),
    },
  };
}

function normalizeProjectPaths(
  project: any,
  index: number,
  fallbackName?: string
): ProjectPathsConfig | null {
  if (!project) {
    return null;
  }

  const nameSource = typeof project.name === 'string' ? project.name.trim() : '';
  const name =
    nameSource.length > 0
      ? nameSource
      : `${fallbackName ?? 'project'}${index > 0 ? `-${index + 1}` : ''}`;

  const nuxtProjectRoot =
    typeof project.nuxtProjectRoot === 'string' && project.nuxtProjectRoot.trim().length > 0
      ? project.nuxtProjectRoot
      : undefined;

  const generated = project.generated ?? {};
  const defaultGenerated = nuxtProjectRoot
    ? {
        types: `${nuxtProjectRoot}/app/types/schema/generated`,
        trpcRouters: `${nuxtProjectRoot}/server/trpc/routers`,
        piniaStores: `${nuxtProjectRoot}/app/stores/generated`,
      }
    : {};
  let layers: ProjectPathsConfig['layers'];
  if (project.layers === false || project.layers === 'none') {
    layers = 'none';
  } else if (Array.isArray(project.layers) && project.layers.length > 0) {
    layers = project.layers.map((entry: any) => String(entry).trim()).filter(Boolean);
  } else {
    layers = undefined;
  }

  return {
    name,
    nuxtProjectRoot,
    generated: {
      types:
        typeof generated.types === 'string' && generated.types.trim().length > 0
          ? generated.types
          : defaultGenerated.types,
      trpcRouters:
        typeof generated.trpcRouters === 'string' && generated.trpcRouters.trim().length > 0
          ? generated.trpcRouters
          : defaultGenerated.trpcRouters,
      piniaStores:
        typeof generated.piniaStores === 'string' && generated.piniaStores.trim().length > 0
          ? generated.piniaStores
          : defaultGenerated.piniaStores,
    },
    imports: {
      schemaTypes:
        typeof project.imports?.schemaTypes === 'string' &&
        project.imports.schemaTypes.trim().length > 0
          ? project.imports.schemaTypes
          : undefined,
      requestSchema:
        typeof project.imports?.requestSchema === 'string' &&
        project.imports.requestSchema.trim().length > 0
          ? project.imports.requestSchema
          : undefined,
      typesenseCollections:
        typeof project.imports?.typesenseCollections === 'string' &&
        project.imports.typesenseCollections.trim().length > 0
          ? project.imports.typesenseCollections
          : undefined,
    },
    ...(layers ? { layers } : {}),
  };
}

function normalizeOverridesPaths(rawOverrides: any): OverridesPathConfig {
  if (!rawOverrides) {
    return {
      functions: './config/overrides/functions',
      specs: './config/overrides/specs',
    };
  }

  const functionsPath =
    typeof rawOverrides.functions === 'string' && rawOverrides.functions.trim().length > 0
      ? rawOverrides.functions
      : './config/overrides/functions';

  const specsPath =
    typeof rawOverrides.specs === 'string' && rawOverrides.specs.trim().length > 0
      ? rawOverrides.specs
      : './config/overrides/specs';

  return { functions: functionsPath, specs: specsPath };
}

function mergeSpecOverrides(base: any, override: any): any {
  if (override === undefined) return base;
  if (base === undefined) return override;
  if (Array.isArray(base) && Array.isArray(override)) {
    return override;
  }
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, any> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      out[key] = mergeSpecOverrides(base[key], value);
    }
    return out;
  }
  return override;
}

function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

export function resolveModulesConfig(app: AppConfig): AppModulesConfig {
  const rawModules = (app as any).modules;
  const resolved: string[] = [];
  const seen = new Set<string>();

  if (Array.isArray(rawModules)) {
    for (const entry of rawModules as unknown[]) {
      if (typeof entry === 'string') {
        const name = entry.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        resolved.push(name);
        continue;
      }

      if (entry && typeof entry === 'object') {
        const nameRaw =
          typeof (entry as any).name === 'string'
            ? (entry as any).name
            : typeof (entry as any).module === 'string'
              ? (entry as any).module
              : '';
        const name = String(nameRaw).trim();
        if (!name) continue;
        const active = (entry as any).active !== false && (entry as any).enabled !== false;
        const key = name.toLowerCase();
        if (!active) {
          seen.add(key);
          continue;
        }
        if (seen.has(key)) continue;
        seen.add(key);
        resolved.push(name);
      }
    }
  }

  const enabled = app.instance?.active === false
    ? resolved.filter((name) => name.toLowerCase() !== 'instance')
    : resolved;

  return {
    enabled,
  };
}
