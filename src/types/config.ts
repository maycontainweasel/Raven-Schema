export type SchemaMode = 'schemaless' | 'schemaful';
export type DataAuthority = 'source' | 'tenant';
export type LegacyDataLocation = 'local' | 'remote';

export interface AppConfig {
  version: number;
  project: {
    name: string;
    description?: string;
  };
  graph?: GraphConfig;
  tooling?: ToolingConfig;
  importFilters?: ImportFiltersConfig;
  /**
   * Default behavior applied to DEFINE statements during imports.
   */
  onExisting?: OnExistingMode;
  environment: {
    defaultDatabase: string;
    migrationTargets?: string[];
  };
  features?: {
    schemaMode?: SchemaMode;
    autoApplyMigrations?: boolean;
    emitDocumentation?: boolean;
  };
  databases: Record<string, AppDatabaseConfig>;
  paths: AppPaths;
  trpc: TrpcConfig;
  documentation: DocumentationConfig;
  defaults: AppDefaults;
  events?: EventsConfig;
  instance?: InstanceDefaultsConfig;
  requestSchema?: RequestSchemaConfig;
  typesense?: TypesenseConfig;
  schemaKit?: SchemaKitConfig;
  databasesExport?: DatabasesExportConfig;
  surrealMcpExport?: SurrealMcpExportConfig;
  modelsExport?: ModelsExportConfig;
  ui?: UiConfig;
  layers?: LayersConfig;
  fileSync?: FileSyncConfig;
}

export interface GraphConfig {
  input?: string;
  output?: string;
  mermaidOutput?: string;
  spec?: {
    mode?: 'staging' | 'live';
    stagingDir?: string;
    liveDir?: string;
    conflictPolicy?: 'skip' | 'overwrite' | 'only-new';
    pruneStale?: boolean;
    syncOnGenerate?: boolean;
  };
}

export interface ToolingConfig {
  /**
   * Controls workspace assumptions for project setup helpers.
   * - turbo: use pnpm workspace filters when available.
   * - standalone: suggest running install commands within the app folder.
   */
  repoMode?: 'turbo' | 'standalone';
  /**
   * Project setup dependency rules.
   */
  projectSetup?: {
    /**
     * Override the default required dependencies list.
     */
    requiredDependencies?: string[];
    /**
     * Remove specific dependencies from the required list.
     */
    excludeDependencies?: string[];
    /**
     * Include @pmv2/shared in required dependencies (default: true).
     */
    includeSharedPackage?: boolean;
  };
}

export interface AppDatabaseConfig {
  active: boolean;
  url: string;
  namespace: string;
  database: string;
  username: string;
  password: string;
  allowScripting?: boolean;
}

export interface AppPaths {
  migrations: string;
  surrealOutput: string;
  docsOutput: string;
  projects: ProjectPathsConfig[];
  overrides: OverridesPathConfig;
  modules?: string;
}

export interface ProjectPathsConfig {
  name: string;
  active?: boolean;
  nuxtProjectRoot?: string;
  generated: GeneratedPathConfig;
  imports?: ProjectImportConfig;
  /**
   * Ordered list of layers. Use "none" or false to disable layer sync for this project.
   */
  layers?: string[] | 'none' | false;
}

export interface OverridesPathConfig {
  functions: string;
  specs?: string;
}

export interface AppModulesConfig {
  enabled?: string[];
}

export interface GeneratedPathConfig {
  types?: string;
  trpcRouters?: string;
  piniaStores?: string;
}

export interface ProjectImportConfig {
  schemaTypes?: string;
  /**
   * Module path that exports RequestSchema (default: @pmv2/shared)
   * This keeps generated routers decoupled from app-level aliases.
   */
  requestSchema?: string;
  /**
   * Module path that exports Typesense collections (collections.ts)
   */
  typesenseCollections?: string;
}

export interface TrpcConfig {
  httpEndpoint: string;
  generateTestPages?: boolean;
  routerNamespace?: string;
  contextImport?: string;
}

export interface DocumentationConfig {
  /**
   * Legacy flat config (still supported).
   */
  enabled?: boolean;
  format?: 'markdown' | 'json';
  includeSurrealExamples?: boolean;
  /**
   * Nested config for documentation outputs.
   */
  documentation?: DocumentationOutputConfig;
  /**
   * Optional schema docs app target. When enabled, it is treated as a project
   * and receives generated client assets (types, routers, stores).
   */
  schemaApp?: SchemaAppConfig;
}

export interface DocumentationOutputConfig {
  enabled: boolean;
  format: 'markdown' | 'json';
  includeSurrealExamples?: boolean;
  locations?: string[];
}

export interface SchemaAppConfig {
  enabled?: boolean;
  /**
   * Path to the schema docs app root (relative to passmed-schema).
   */
  location?: string;
  /**
   * Optional overrides for generated paths and import aliases.
   */
  settings?: SchemaAppSettings;
  /**
   * Backward-compatible project-style config.
   */
  project?: ProjectPathsConfig;
}

export interface SchemaAppSettings {
  name?: string;
  generated?: GeneratedPathConfig;
  imports?: ProjectImportConfig;
}

export interface AppDefaults {
  schemaMode: SchemaMode;
  postRecordEnabled: boolean;
  resourceNamespace?: string;
  bundlesEnabled?: boolean;
}

export interface EventsConfig {
  /**
   * How to write event files during generation.
   * - split: one file per event (default)
   * - table: one file per table, containing all events
   */
  fileMode?: 'split' | 'table';
  /**
   * Where parent subtable bootstrap creation is handled.
   * - function: create subtables explicitly in parent create functions (default)
   * - event: create subtables via generated CREATE events
   */
  subtableCreateMode?: 'function' | 'event';
}

export interface UiConfig {
  /**
   * Directory where UI spec YAML files live (relative to passmed-schema root).
   */
  specsPath?: string;
  /**
   * Optional per-project output path for generated UI pages/components.
   * Relative to each project's Nuxt root (nuxtProjectRoot).
   */
  projectOutput?: string;
  /**
   * Default project target(s) for UI generation when CLI is run without --project.
   */
  projects?: string[];
  /**
   * Optional per-project UI generation settings. Use this to make the expected
   * delivery mode explicit for agents and for CLI helpers.
   */
  projectSettings?: Record<string, UiProjectSettingsConfig>;
}

export interface UiProjectSettingsConfig {
  enabled?: boolean;
  mode?: 'generated' | 'custom-pages';
  notes?: string;
}

export interface LayersConfig {
  /**
   * Source directory for Nuxt layers (relative to passmed-schema root).
   */
  source?: string;
  /**
   * Default layer order when a project does not specify its own.
   */
  defaults?: string[];
  /**
   * Sync behavior for layer copy operations.
   */
  sync?: 'auto' | 'force' | 'off';
  /**
   * Log layer sync results.
   */
  log?: boolean;
  /**
   * Auth layer defaults (written into layers/auth/nuxt.config.ts).
   */
  auth?: AuthLayerConfig;
}

export interface FileSyncConfig {
  /**
   * Global exclusions applied to every target app sync.
   * Paths are matched relative to the app root, for example:
   * - modules/schema-kit/runtime/server/auth/handlers.ts
   * - layers/helios-admin/app/components/admin/AdminLogo.vue
   */
  globalExclude?: FileSyncScopeExcludeConfig;
  /**
   * Per-project exclusions matched by paths.projects[].name.
   */
  projects?: FileSyncProjectExcludeConfig[];
}

export interface FileSyncScopeExcludeConfig {
  module?: string[];
  layers?: string[];
  docs?: string[];
}

export interface FileSyncProjectExcludeConfig {
  name: string;
  exclude?: FileSyncScopeExcludeConfig;
}

export interface AuthLayerConfig {
  runtimeConfig?: AuthLayerRuntimeConfig;
  publicRuntimeConfig?: AuthLayerPublicConfig;
}

export interface AuthLayerRuntimeConfig {
  sessionCookie?: string;
  sessionSecret?: string;
  cookieDomain?: string;
  sessionDuration?: number;
  refreshInterval?: number;
  appPaths?: string[];
  cookie?: AuthLayerCookieConfig;
  redirectOnFail?: string;
  redirectOnSuccess?: string;
  guard?: AuthLayerGuardConfig;
}

export interface AuthLayerPublicConfig {
  sessionCookie?: string;
  cookieDomain?: string;
}

export interface AuthLayerCookieConfig {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  maxAge?: number;
  legacyCookieNames?: string[];
}

export interface AuthLayerGuardConfig {
  enabled?: boolean;
  refresh?: boolean;
  /**
   * Paths/patterns that should be protected by default. Use '*' to protect all.
   * Supports simple prefix matches with a trailing '*', e.g. '/dashboard*'.
   */
  protect?: string[] | string;
  ignorePaths?: string[];
  redirectOnFail?: string;
  redirectOnSuccess?: string;
  redirectOnLogout?: string;
  /**
   * Enable the built-in auth test page (/auth-test). When enabled, the route is auto-ignored.
   */
  testPageEnabled?: boolean;
  /**
   * Map internal redirect tokens to absolute URLs (e.g. "/public" -> "https://...").
   */
  redirectAliases?: Record<string, string>;
}

export interface InstanceDefaultsConfig {
  active?: boolean;
  /**
   * Source database key used as the authority anchor for source-owned models.
   * Must match a key in app.databases.
   */
  source?: string;
  /**
   * Tenant database key list.
   * - "auto": all databases except instance.source.
   * - string[]: explicit tenant keys.
   */
  tenants?: 'auto' | string[];
  fields?: Record<string, TableFieldMeta>;
}

export interface RequestSchemaConfig {
  /**
   * Output path for the generated request schema file.
   * Relative paths are resolved from the passmed-schema project root.
   */
  output?: string;
  /**
   * Per-project output path for the generated request schema file.
   * Relative to each project's Nuxt root (nuxtProjectRoot).
   */
  projectOutput?: string;
  /**
   * Explicit instance codes to include. If omitted, uses database keys.
   */
  instances?: string[];
  /**
   * Include inactive databases when deriving instance codes.
   */
  includeInactive?: boolean;
}

export interface TypesenseConfig {
  enabled?: boolean;
  /**
   * Output directory for generated Typesense collection schemas.
   */
  output?: string | string[];
  /**
   * Per-project output directory for Typesense collection schemas.
   * Relative to each project's Nuxt root (nuxtProjectRoot).
   */
  projectOutput?: string;
  /**
   * Minimum collection name length (default: 3).
   */
  collectionMinLength?: number;
  /**
   * Default Typesense settings applied when a graph entry does not provide overrides.
   */
  settings?: Record<string, unknown>;
}

export interface SchemaKitConfig {
  /**
   * Log schema-kit module updates during generation (default: true).
   */
  logModuleUpdates?: boolean;
  /**
   * Validation settings for schema-kit runtime requirements.
   */
  validation?: {
    /**
     * When true (default), missing requirements will throw and stop app startup.
     */
    strict?: boolean;
  };
  /**
   * Default feature toggles for schema-kit runtime.
   */
  features?: SchemaKitFeatures;
  /**
   * Controls how schema-kit is distributed to target apps.
   */
  module?: {
    /**
     * copy: copy module files into each target app (default).
     * shared: point apps to a single shared module path.
     */
    mode?: 'copy' | 'shared';
    /**
     * Source path for copy mode (relative to passmed-schema root).
     * Defaults to "module".
     */
    source?: string;
    /**
     * Shared module path for shared mode (relative to passmed-schema root).
     * e.g. "packages/schema-kit" or "apps/tools/passmed-schema/module".
     */
    sharedPath?: string;
    /**
     * Sync policy for copy mode.
     * auto: copy only when hash changes (default).
     * force: delete + copy every time.
     * off: never copy during generate (manual sync only).
     */
    sync?: 'auto' | 'force' | 'off';
  };
  /**
   * Per-project feature overrides by project name.
   */
  projects?: SchemaKitProjectConfig[];
}

export interface SchemaKitProjectConfig {
  name: string;
  features?: SchemaKitFeatures;
}

export interface SchemaKitFeatures {
  typesense?: boolean;
  trpcClient?: boolean;
  sentry?: SchemaKitSentryFeature | boolean;
  redis?: SchemaKitRedisFeature | boolean;
  surrealdb?: SchemaKitSurrealFeature | boolean;
  trpcServer?: boolean;
  auth?: SchemaKitAuthFeature | boolean;
}

export interface SchemaKitSentryFeature {
  enabled?: boolean;
  client?: boolean;
  server?: boolean;
  sourceMaps?: boolean;
}

export interface SchemaKitRedisFeature {
  enabled?: boolean;
}

export interface SchemaKitSurrealFeature {
  enabled?: boolean;
  reconnectOnAuthLoss?: boolean;
  retryFailedRequestsAfterReconnect?: boolean;
}

export interface SchemaKitAuthFeature {
  enabled?: boolean;
}

export interface DatabasesExportConfig {
  /**
   * Output path for generated databases config.
   * Relative paths are resolved from the passmed-schema project root.
   */
  output?: string;
  /**
   * Per-project output path for generated databases config.
   * Relative to each project's Nuxt root (nuxtProjectRoot).
   */
  projectOutput?: string;
}

export interface SurrealMcpExportConfig {
  /**
   * Output path for generated Surreal MCP docker compose file.
   * Relative paths are resolved from the repository root.
   */
  output?: string;
  /**
   * Repo-local Codex config output that receives the MCP server entry.
   * Relative paths are resolved from the repository root.
   */
  codexConfigOutput?: string;
  /**
   * Database key from app.config.yaml -> databases.* to proxy through MCP.
   * Defaults to environment.defaultDatabase when omitted.
   */
  database?: string;
  /**
   * Local MCP proxy port.
   */
  port?: number;
  /**
   * MCP server key written into .codex/config.toml.
   * Defaults to surreal<port>.
   */
  serverName?: string;
  /**
   * Docker compose service name.
   * Defaults to surrealmcp.
   */
  serviceName?: string;
  /**
   * Docker container name.
   * Defaults to <serviceName>_<port>.
   */
  containerName?: string;
  /**
   * Host alias used inside Docker when the SurrealDB URL points at localhost.
   * Defaults to host.docker.internal.
   */
  dockerHost?: string;
  /**
   * Whether the generated MCP server is enabled in .codex/config.toml.
   * Defaults to true.
   */
  enabled?: boolean;
  /**
   * Approval mode for connect_endpoint in the generated Codex config.
   * Defaults to approve.
   */
  approvalMode?: string;
}

export interface ModelsExportConfig {
  /**
   * Output path for generated models manifest.
   * Relative paths are resolved from the passmed-schema project root.
   */
  output?: string;
  /**
   * Per-project output path for generated models manifest.
   * Relative to each project's Nuxt root (nuxtProjectRoot).
   */
  projectOutput?: string;
}

export interface TableMigrationConfig {
  version: number;
  kind: 'table';
  name: string;
  description?: string;
  primary?: boolean;
  tableType?: 'primary' | 'subsingle' | 'submany';
  /**
   * When true, auto-injects the standard instances array field and enables
   * instance-aware create function validation.
   */
  instance?: boolean;
  tags?: string[];
  table: TableConfig;
  structure?: string | TableStructureConfig;
  id?: TableIdConfig;
  fields?: TableFieldEntry[];
  edges?: TableEdgesConfig;
  post?: PostRecordConfig | false;
  delete?: DeleteCascadeConfig | boolean;
  refreshViews?: boolean;
  resources?: ResourceDefinition[];
  views?: ResourceDefinition[];
  typesense?: TypesenseDefinition;
  router?: TableRouterDefinition;
  crud?: CrudDefinition;
  indexes?: TableIndexConfig[];
  events?: TableEventDefinition[];
  subTables?: SubTableConfig[];
  taxonomies?: TableTaxonomyConfig[];
  relations?: TableRelationConfig[];
  admin?: TableAdminConfig;
  modelSettings?: TableModelSettingsConfig;
  bundle?: boolean;
  __filePath?: string;
}

export interface TableAdminConfig {
  /**
   * Slug policy for admin UI routing (e.g. "key", "qid", "email").
   */
  slugPolicy?: string;
  /**
   * Authority mode used by admin/runtime processing.
   */
  authority?: DataAuthority;
  /**
   * @deprecated Legacy alias. Prefer authority.
   */
  data?: DataAuthority | LegacyDataLocation;
  /**
   * Enable/disable model exposure in admin tooling.
   */
  enabled?: boolean;
}

export interface TableModelSettingsConfig {
  /**
   * Preferred schema mode used to define this table.
   */
  schemaType?: 'schemaless' | 'schemafull' | 'schemaful';
  /**
   * Model authority mode for app consumers.
   */
  authority?: DataAuthority;
  /**
   * @deprecated Legacy alias. Prefer authority.
   */
  dataLocation?: DataAuthority | LegacyDataLocation;
  /**
   * Bootstrap-specific table options.
   */
  bootstrap?: {
    /**
     * When false, bootstrap table ensure/create should be skipped.
     */
    ensureTable?: boolean;
    /**
     * Optional custom permissions metadata consumed by runtime tooling.
     */
    permissions?: Record<string, unknown>;
  };
  /**
   * Admin model toggles.
   */
  admin?: {
    enabled?: boolean;
  };
  /**
   * Typesense model toggles.
   */
  typesense?: {
    enabled?: boolean;
  };
  /**
   * Forward-compatible custom settings passthrough.
   */
  [key: string]: unknown;
}

export interface TypesenseDefinition {
  view: ResourceDefinition;
  schema: TypesenseSchemaDefinition;
  meta?: Record<string, unknown>;
}

export interface TypesenseSchemaDefinition {
  collection: string;
  fields: TypesenseFieldDefinition[];
  settings?: Record<string, unknown>;
  sortableFields?: string[];
}

export interface TypesenseFieldDefinition {
  name: string;
  type: string;
  facet?: boolean;
  optional?: boolean;
  sort?: boolean;
  fields?: TypesenseFieldDefinition[];
}

export interface TableTaxonomyConfig {
  key: string;
  hierarchical?: boolean;
  cardinality?: 'one' | 'many';
  storeOnModel?: boolean;
  /**
   * Override the record->term edge name.
   * Alias for `edges.recordToTerm`.
   */
  edgeName?: string;
  /**
   * Override the taxonomy->term edge name.
   * Alias for `edges.taxonomyToTerms`.
   */
  taxonomyEdgeName?: string;
  /**
   * When true (default), attach operations auto-create missing terms.
   * Set false to require terms to exist before attach.
   */
  createOnAttach?: boolean;
  payloadField?: string;
  payloadAlias?: string;
  payloadAliases?: string[];
  required?: boolean;
  processor?: 'functions' | 'events' | 'none';
  /**
   * Generate taxonomy-specific wrapper functions (attachXTerm, getXTerms, etc).
   * Defaults to false (generic taxonomy utility functions are used instead).
   */
  generateNamedFunctions?: boolean;
  hooks?: {
    postAttach?: string[];
    postDetach?: string[];
  };
  labels?: {
    singular?: string;
    plural?: string;
  };
  slug?: string;
  permalink?: string;
  scope?: {
    model?: string;
    label?: string;
  };
  taxonomy?: {
    model?: string;
    id?: string;
    fields?: Array<Record<string, any> | string>;
  };
  term?: {
    model?: string;
    id?: string;
    fields?: Array<Record<string, any> | string>;
  };
  edges?: {
    taxonomyToTerms?: string;
    recordToTerm?: string;
  };
  /**
   * Legacy compatibility:
   * - `false` disables taxonomy-specific wrappers (same as generateNamedFunctions=false)
   * - object customizes generated function names when wrappers are enabled
   */
  functions?:
    | boolean
    | {
        createTaxonomy?: string;
        addTerm?: string;
        removeTerm?: string;
        attachTerm?: string;
        detachTerm?: string;
        getModelTerms?: string;
        getTableTerms?: string;
      };
}

export interface TableRelationConfig {
  edge: string;
  left: string;
  right: string;
  cardinality?: 'one' | 'many';
  storeOnModel?: boolean;
  payloadField?: string;
  linkOnCreate?: boolean;
  required?: boolean;
  requiredOnHook?: boolean;
  processor?: 'functions' | 'events' | 'none';
  hook?: 'left' | 'right' | string;
  /**
   * Generate relation-specific wrapper functions (attachX, detachX, getX).
   * Defaults to false (generic edge utilities are used instead).
   */
  generateNamedFunctions?: boolean;
  /**
   * Legacy compatibility:
   * - boolean toggles wrapper generation
   * - object customizes generated names when wrappers are enabled
   */
  functions?:
    | boolean
    | {
        attach?: string;
        detach?: string;
        getLeft?: string;
        getRight?: string;
      };
}

export interface TableConfig {
  model: string;
  type: 'NORMAL' | 'RELATION' | string;
  drop?: boolean;
  schemaMode?: SchemaMode;
  permissions?: string;
}

export type RawFieldDefinition = Record<string, string>;
export type TableFieldEntry = Record<string, TableFieldMeta>;

export interface TableFieldMeta {
  type: string;
  required?: boolean;
  nullable?: boolean;
  default?: unknown;
  items?: TableFieldMeta;
  options?: Record<string, unknown>;
  assign?: boolean;
  /**
   * When true, the field is stripped from incoming payloads (computed/server-only).
   */
  ignorePayload?: boolean;
  /**
   * Transient fields are accepted in inputs but not stored.
   */
  transient?: boolean;
  /**
   * Nested object fields (for type: object). Keys are child field names, values are their metadata.
   */
  fields?: Record<string, TableFieldMeta>;
  description?: string;
}

export interface TableEdgesConfig {
  has?: EdgeDefinition[];
  belongs?: EdgeDefinition[];
}

export interface EdgeDefinition {
  table?: string;
  in?: string;
  out?: string;
  index?: 'unique' | 'nonunique' | string;
  unique?: boolean;
  permissions?: string;
  description?: string;
}

export interface PostRecordConfig {
  enabled: boolean;
  onCreate?: PostEventHookConfig;
  onDelete?: PostEventHookConfig;
  create?: {
    fields?: Record<string, unknown>;
  };
}

export interface PostEventHookConfig {
  enabled?: boolean;
  payload?: string;
  fields?: Record<string, string>;
}

export interface DeleteCascadeConfig {
  enabled?: boolean;
  subTables?: DeleteCascadeSubTablesConfig | boolean;
  edges?: DeleteCascadeEdgesConfig | boolean;
}

export interface DeleteCascadeSubTablesConfig {
  enabled?: boolean;
  onlyAutoCreated?: boolean;
}

export interface DeleteCascadeEdgesConfig {
  enabled?: boolean;
  has?: DeleteCascadeEdgeDirection | boolean;
  belongs?: DeleteCascadeEdgeDirection | boolean;
}

export interface DeleteCascadeEdgeDirection {
  enabled?: boolean;
  deleteTargets?: boolean;
  targetType?: 'single' | 'array';
}

export type ResourceFieldEntry =
  | string
  | Record<string, string | string[] | number | boolean>;

export interface ResourceDefinition {
  name: string;
  namespace?: string;
  description?: string;
  mode?: 'OVERWRITE' | 'IF NOT EXISTS';
  type?: 'NORMAL' | 'RELATION' | string;
  permissions?: string;
  returnId?: 'record' | 'view';
  from?: string;
  function?: string;
  functionMode?: 'generate' | 'reference';
  fields?: ResourceFieldEntry[];
  select?: ResourceFieldEntry[];
  as?: ResourceFieldEntry[];
  fetch?: string[];
  options?: Record<string, unknown>;
  sides?: unknown[];
}

export interface TableRouterDefinition {
  name: string;
  parent?: string;
  endpoints?: RouterEndpoint[];
  embedInParent?: boolean;
}

export type RouterEndpoint = ResourceRouterEndpoint | OperationRouterEndpoint;

export interface ResourceRouterEndpoint {
  resource: Record<string, RouterResourceMapping>;
}

export interface RouterResourceMapping {
  target?: string;
  value?: string;
  function?: string;
}

export interface OperationRouterEndpoint {
  [operation: string]: RouterOperationConfig;
}

export interface RouterOperationConfig {
  target: string;
  value: string;
}

export interface CrudDefinition {
  create?: CrudOperationDefinition;
  update?: CrudOperationDefinition;
  delete?: CrudOperationDefinition;
}

export interface CrudOperationDefinition {
  enabled?: boolean;
  name?: string;
  params?: CrudOperationParam[];
  options?: CrudOperationOptions;
  hooks?: CrudOperationHooks;
}

export interface CrudOperationParam {
  name: string;
  type?: string;
}

export interface CrudOperationOptions {
  idSource?: string | string[];
  validations?: CrudOperationValidation;
  upsert?: boolean;
  allowMissing?: boolean;
  cleanup?: string[];
  subTables?: Array<{ name: string; model: string }>;
  return?: 'record' | 'id';
  hooks?: CrudOperationHooks;
}

export interface CrudOperationValidation {
  required?: string[];
}

export interface CrudOperationHooks {
  preValidate?: string[];
  postValidate?: string[];
  preProcess?: string[];
  postProcess?: string[];
}

export interface SubTableConfig {
  name: string;
  model: string;
  options?: SubTableOptionsConfig;
  autoCreate?: boolean;
  tableType?: 'subsingle' | 'submany';
}

export interface SubTableOptionsConfig {
  createInput?: string | SubTableCreateInputConfig;
  [key: string]: unknown;
}

export interface SubTableCreateInputConfig {
  field: string;
  many?: boolean;
  required?: boolean;
}

export type OnExistingMode = 'OVERWRITE' | 'IF NOT EXISTS' | 'NONE';

export interface TableIdConfig {
  type: string;
  structure?: string | string[];
  source?: string | string[];
  exportName?: string;
  exportType?: boolean;
  exportZodName?: string;
}

export interface TableIndexConfig {
  name: string;
  mode?: 'OVERWRITE' | 'IF NOT EXISTS';
  table?: string;
  type?: string;
  keyword?: 'FIELDS' | 'COLUMNS';
  fields?: Array<string | string[] | RawFieldDefinition>;
  columns?: Array<string | string[] | RawFieldDefinition>;
  comment?: string;
  concurrently?: boolean;
  unique?: boolean;
  count?: boolean;
  fulltext?: {
    analyzer: string;
    bm25?: {
      k1?: number;
      b?: number;
    };
    highlights?: boolean;
  };
  special?: string;
  rawClause?: string;
}

export interface TableStructureConfig {
  type: 'parent';
  parentModel: string;
  idSource?: string;
}

export interface TableEventDefinition {
  name: string;
  table?: string;
  on?: string[];
  when?: string;
  onExisting?: OnExistingMode;
  description?: string;
  query?: string;
  comment?: string;
}

export interface ImportGroupConfig {
  functions?: BootstrapFunctionImports;
  tables?: BootstrapTableImports;
}

export interface ImportsConfig {
  bootstrap?: ImportGroupConfig;
  auto?: ImportGroupConfig;
}

export interface ImportFiltersConfig {
  tables?: string[];
  tablesExclude?: string[];
  onlyChanged?: boolean;
  layers?: {
    include?: string[];
    exclude?: string[];
  };
  files?: {
    include?: Partial<Record<'functions' | 'events' | 'views' | 'indexes' | 'edges', string[]>>;
    exclude?: Partial<Record<'functions' | 'events' | 'views' | 'indexes' | 'edges', string[]>>;
  };
  cleanup?: {
    views?: CleanupLayerFilter;
    events?: CleanupLayerFilter;
    indexes?: CleanupLayerFilter;
  };
  bootstrap?: {
    functions?: string[];
    functionsExclude?: string[];
    modules?: string[];
    modulesExclude?: string[];
    seeds?: string[];
    seedsExclude?: string[];
  };
}

export interface CleanupLayerFilter {
  include?: '*' | string[];
  exclude?: string[];
}

export interface BootstrapFunctionImports {
  defaultOnExisting?: OnExistingMode;
  directories?: string[];
  files?: string[];
  exclude?: string[];
}

export interface BootstrapTableImports {
  directories?: string[];
  files?: string[];
}
