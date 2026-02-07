import type {
  DeleteCascadeConfig,
  DeleteCascadeEdgeDirection,
  DeleteCascadeEdgesConfig,
  DeleteCascadeSubTablesConfig,
  PostEventHookConfig,
  PostRecordConfig,
  SubTableConfig,
  TableEventDefinition,
  TableMigrationConfig,
} from '../types';
import {
  isOperationEnabled,
  normalizeCrudConfig,
  resolveCrudFunctionName,
  isSubTable,
  getParentModelValue,
} from './crudHelpers';

export interface NormalizedEvent extends TableEventDefinition {
  table: string;
  name: string;
  sourceTable: TableMigrationConfig;
}

export function collectEvents(tables: TableMigrationConfig[]): NormalizedEvent[] {
  const events: NormalizedEvent[] = [];
  const tablesByModel = new Map<string, TableMigrationConfig>();
  const tablesByName = new Map<string, TableMigrationConfig>();

  for (const table of tables) {
    if (table.table?.model) {
      tablesByModel.set(table.table.model, table);
    }
    if (table.name) {
      tablesByName.set(table.name.toLowerCase(), table);
    }
  }

  for (const table of tables) {
    const tableModel = table.table?.model || sanitizeTableName(table.name);
    const tablePascal = toPascalCase(table.name || tableModel);
    const existingNames = new Set<string>();

    for (const raw of table.events ?? []) {
      const name = buildEventName(raw.name, tablePascal);
      events.push({
        ...raw,
        name,
        table: raw.table ?? tableModel,
        sourceTable: table,
      });
      existingNames.add(name.toLowerCase());
    }

    const postEvents = buildPostEvents(table, tableModel, tablePascal, existingNames);
    events.push(...postEvents);

    const instanceEvents = buildInstanceEvents(table, tableModel, tablePascal, existingNames);
    events.push(...instanceEvents);

    // refreshViews is now handled via CRUD hooks; skip event generation to avoid duplication.

    const deleteEvents = buildDeleteCascadeEvents(
      table,
      tableModel,
      tablePascal,
      existingNames,
      tablesByModel,
      tablesByName
    );
    events.push(...deleteEvents);
  }

  return events;
}

function buildInstanceEvents(
  table: TableMigrationConfig,
  tableModel: string,
  tablePascal: string,
  existingNames: Set<string>
): NormalizedEvent[] {
  if (!(table as any).instance) return [];
  const events: NormalizedEvent[] = [];

  const createName = buildEventName('InstancesCreate', tablePascal);
  if (!existingNames.has(createName.toLowerCase())) {
    events.push({
      name: createName,
      table: tableModel,
      sourceTable: table,
      onExisting: 'OVERWRITE',
      on: ['CREATE'],
      query: buildInstanceCreateQuery(createName),
    });
    existingNames.add(createName.toLowerCase());
  }

  const updateName = buildEventName('InstancesUpdate', tablePascal);
  if (!existingNames.has(updateName.toLowerCase())) {
    events.push({
      name: updateName,
      table: tableModel,
      sourceTable: table,
      onExisting: 'OVERWRITE',
      on: ['UPDATE'],
      query: buildInstanceUpdateQuery(updateName),
    });
    existingNames.add(updateName.toLowerCase());
  }

  const deleteName = buildEventName('InstancesDelete', tablePascal);
  if (!existingNames.has(deleteName.toLowerCase())) {
    events.push({
      name: deleteName,
      table: tableModel,
      sourceTable: table,
      onExisting: 'OVERWRITE',
      on: ['DELETE'],
      query: buildInstanceDeleteQuery(deleteName),
    });
    existingNames.add(deleteName.toLowerCase());
  }

  return events;
}

function buildInstanceCreateQuery(eventName: string): string {
  return `
if (type::is_array($after.instances) and array::len($after.instances) > 0) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "${eventName} | invalid record id"; };
  for $instanceCode in $after.instances {
    let $instanceID = type::record("instance", $instanceCode);
    if !fn::RIDExists($instanceID) { throw "${eventName} | invalid instance id"; };
    fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
  };
};`.trim();
}

function buildInstanceUpdateQuery(eventName: string): string {
  return `
if ($after.instances != $before.instances) {
  let $RID = $after.id;
  if !type::is_record($RID) { throw "${eventName} | invalid record id"; };
  fn::clearEdgesForRecord($RID, "Instances");

  if (type::is_array($after.instances) and array::len($after.instances) > 0) {
    for $instanceCode in $after.instances {
      let $instanceID = type::record("instance", $instanceCode);
      if !fn::RIDExists($instanceID) { throw "${eventName} | invalid instance id"; };
      fn::createEdge($RID, "Instances", $instanceID, { boundId: true, overwrite: false, skipExists: true });
    };
  };
};`.trim();
}

function buildInstanceDeleteQuery(eventName: string): string {
  return `
let $RID = $before.id;
if !type::is_record($RID) { throw "${eventName} | invalid record id"; };
fn::clearEdgesForRecord($RID, "Instances");`.trim();
}

function buildRefreshViewsEvents(
  table: TableMigrationConfig,
  tableModel: string,
  tablePascal: string,
  existingNames: Set<string>
): NormalizedEvent[] {
  if (!(table as any).refreshViews) return [];

  const events: NormalizedEvent[] = [];
  const isSub = isSubTable(table);
  const parentModel = getParentModelValue(table);

  const name = buildEventName(`${isSub ? 'RefreshViewsST' : 'RefreshViews'}`, tablePascal);
  if (existingNames.has(name.toLowerCase())) {
    return events;
  }

  const lines: string[] = [];
  lines.push(
    `if ($after.__refresh_marker) {`,
    `  return;`,
    `};`,
    ``,
    `let $RID = fn::ridParam("${tableModel}", $after.id);`,
    `if (type::is_record($RID) && record::exists($RID)) {`,
    `  // --- Refresh Record views`,
    `  update $RID merge {`,
    `    "touch": 1`,
    `  };`,
    `  update $RID unset touch;`,
    ``,
    `  let $PID = fn::PID($RID);`,
    `  if (type::is_record($PID) && record::exists($PID)) {`,
    `    update $PID merge {`,
    `      "touch": 1`,
    `    };`,
    `    update $PID unset touch;`,
    `  }`,
    `  // --- End Refresh Record views`
  );

  if (isSub && parentModel) {
    lines.push(
      ``,
      `  let $parentId = type::record("${parentModel}", $RID);`,
      `  if (type::is_record($parentId) && record::exists($parentId)) {`,
      `    update $parentId merge {`,
      `      "touch": 1`,
      `    };`,
      `    update $parentId unset touch;`,
      `  }`
    );
  }

  lines.push(`};`);

  events.push({
    name,
    table: tableModel,
    sourceTable: table,
    onExisting: 'OVERWRITE',
    on: ['UPDATE'],
    query: lines.join('\n'),
  });
  existingNames.add(name.toLowerCase());

  return events;
}

export function buildEventStatement(event: NormalizedEvent): string {
  const clauses: string[] = ['DEFINE EVENT'];
  const onExisting = event.onExisting ?? 'OVERWRITE';
  if (onExisting === 'IF NOT EXISTS') {
    clauses.push('IF NOT EXISTS');
  } else {
    clauses.push('OVERWRITE');
  }

  clauses.push(event.name);
  clauses.push('ON TABLE');
  clauses.push(event.table);

  const condition = buildCondition(event);
  if (condition) {
    clauses.push('WHEN');
    clauses.push(condition);
  }

  const queryBody = normalizeQueryBody(event.query);
  clauses.push('THEN');
  clauses.push(queryBody);

  if (event.comment && event.comment.trim().length > 0) {
    clauses.push('COMMENT');
    clauses.push(JSON.stringify(event.comment.trim()));
  }

  return `${clauses.join(' ')};`;
}

export function formatEventForFile(event: NormalizedEvent): string {
  const statement = buildEventStatement(event);
  return statement.endsWith(';') ? statement : `${statement};`;
}

function buildCondition(event: NormalizedEvent): string | null {
  if (typeof event.when === 'string' && event.when.trim().length > 0) {
    return event.when.trim();
  }

  const triggersSource = Array.isArray(event.on)
    ? event.on
    : typeof event.on === 'string'
      ? [event.on]
      : [];

  const triggers = triggersSource.filter((item) => typeof item === 'string' && item.trim().length > 0);

  if (triggers.length === 0) {
    return null;
  }

  return triggers.map((item) => `$event = "${item}"`).join(' OR ');
}

function normalizeQueryBody(query?: string): string {
  const body = typeof query === 'string' ? query.trim() : '';
  if (body.length === 0) {
    return '{}';
  }

  const trimmed = body.endsWith(';') ? body.slice(0, -1).trimEnd() : body;
  const hasWrapper = trimmed.startsWith('(') || trimmed.startsWith('{');

  if (hasWrapper) {
    return trimmed;
  }

  return `{ ${trimmed} }`;
}

function sanitizeTableName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

function buildEventName(name: string | undefined, tableNamePascal: string): string {
  const suffix = name ? toPascalCase(name) : 'Event';
  if (suffix.startsWith(tableNamePascal)) {
    return suffix;
  }
  return `${tableNamePascal}${suffix}`;
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function buildPostEvents(
  table: TableMigrationConfig,
  tableModel: string,
  tablePascal: string,
  existingNames: Set<string>
): NormalizedEvent[] {
  const postConfig = normalizePostConfig(table.post);
  if (!postConfig) {
    return [];
  }

  const events: NormalizedEvent[] = [];

  const createName = buildEventName('PostCreate', tablePascal);
  if (!existingNames.has(createName.toLowerCase())) {
    events.push({
      name: createName,
      table: tableModel,
      sourceTable: table,
      onExisting: 'OVERWRITE',
      on: ['CREATE'],
      query: buildPostModuleCreateQuery(table, postConfig, createName),
    });
    existingNames.add(createName.toLowerCase());
  }

  const updateName = buildEventName('PostUpdate', tablePascal);
  if (!existingNames.has(updateName.toLowerCase())) {
    events.push({
      name: updateName,
      table: tableModel,
      sourceTable: table,
      onExisting: 'OVERWRITE',
      on: ['UPDATE'],
      query: buildPostModuleUpdateQuery(updateName),
    });
    existingNames.add(updateName.toLowerCase());
  }

  const deleteName = buildEventName('PostDelete', tablePascal);
  if (!existingNames.has(deleteName.toLowerCase())) {
    events.push({
      name: deleteName,
      table: tableModel,
      sourceTable: table,
      onExisting: 'OVERWRITE',
      on: ['DELETE'],
      query: buildPostModuleDeleteQuery(deleteName),
    });
    existingNames.add(deleteName.toLowerCase());
  }

  return events;
}

function buildDeleteCascadeEvents(
  table: TableMigrationConfig,
  tableModel: string,
  tablePascal: string,
  existingNames: Set<string>,
  tablesByModel: Map<string, TableMigrationConfig>,
  tablesByName: Map<string, TableMigrationConfig>
): NormalizedEvent[] {
  const deleteConfig = normalizeDeleteCascadeConfig(table);
  if (!deleteConfig) {
    return [];
  }

  const statements: string[] = [];
  statements.push(
    ...buildSubTableDeleteStatements(table, deleteConfig.subTables, tablesByModel, tablesByName)
  );
  statements.push(...buildEdgeDeleteStatements(table, deleteConfig.edges));

  if (statements.length === 0) {
    return [];
  }

  const deleteName = buildEventName('Delete', tablePascal);
  if (existingNames.has(deleteName.toLowerCase())) {
    return [];
  }

  const queryLines = [
    '{',
    '  let $id = $before.id;',
    '  if !$id {',
    '    return null;',
    '  };',
    '',
    ...statements,
    '}',
  ];

  return [
    {
      name: deleteName,
      table: tableModel,
      sourceTable: table,
      onExisting: 'OVERWRITE',
      on: ['DELETE'],
      query: queryLines.join('\n'),
    },
  ];
}

function buildSubTableDeleteStatements(
  table: TableMigrationConfig,
  config: NormalizedDeleteSubTablesConfig,
  tablesByModel: Map<string, TableMigrationConfig>,
  tablesByName: Map<string, TableMigrationConfig>
): string[] {
  if (!config.enabled) {
    return [];
  }

  const entries = table.subTables ?? [];
  if (entries.length === 0) {
    return [];
  }

  const lines: string[] = [];

  for (const entry of entries) {
    if (config.onlyAutoCreated && entry.autoCreate === false) {
      continue;
    }

    const childTable = resolveSubTableConfig(entry, tablesByModel, tablesByName);
    if (!childTable?.table?.model) {
      continue;
    }

    const childModel = childTable.table.model;
    const relationTable = toPascalCase(entry.name || childTable.name || childModel);
    const entryType = entry.tableType ?? childTable.tableType;

    if (entryType === 'submany') {
      lines.push(`  fn::deleteEdgeFromIn($id, '${relationTable}', true);`);
      continue;
    }

    const crud = normalizeCrudConfig(childTable);
    const deleteOperation = crud?.delete;
    const childRid = `type::record('${childModel}', record::id($id))`;

    if (isOperationEnabled(deleteOperation)) {
      const functionName = resolveCrudFunctionName('delete', deleteOperation, childTable, tablesByModel);
      lines.push(`  fn::${functionName}(${childRid});`);
    } else {
      lines.push(`  delete only ${childRid};`);
    }

    lines.push(`  fn::deleteEdgeFromIn($id, '${relationTable}', false);`);
  }

  return lines;
}

function resolveSubTableConfig(
  entry: SubTableConfig,
  tablesByModel: Map<string, TableMigrationConfig>,
  tablesByName: Map<string, TableMigrationConfig>
): TableMigrationConfig | undefined {
  if (entry.model && tablesByModel.has(entry.model)) {
    return tablesByModel.get(entry.model);
  }

  if (entry.name) {
    return tablesByName.get(entry.name.toLowerCase());
  }

  return undefined;
}

function buildEdgeDeleteStatements(
  table: TableMigrationConfig,
  config: NormalizedDeleteEdgesConfig
): string[] {
  if (!config.enabled) {
    return [];
  }

  const lines: string[] = [];

  if (config.has.enabled) {
    for (const edge of table.edges?.has ?? []) {
      if (!edge.table) continue;
      lines.push(buildEdgeDeleteCall('in', edge.table, config.has));
    }
  }

  if (config.belongs.enabled) {
    for (const edge of table.edges?.belongs ?? []) {
      if (!edge.table) continue;
      lines.push(buildEdgeDeleteCall('out', edge.table, config.belongs));
    }
  }

  return lines;
}

function buildEdgeDeleteCall(
  direction: 'in' | 'out',
  relationTable: string,
  config: NormalizedDeleteEdgeDirectionConfig
): string {
  const fnName = direction === 'in' ? 'fn::deleteEdgeFromIn' : 'fn::deleteEdgeFromOut';
  const args = [`$id`, `'${relationTable}'`, config.deleteTargets ? 'true' : 'false'];
  if (config.targetType === 'array') {
    args.push('"array"');
  }
  return `  ${fnName}(${args.join(', ')});`;
}

function normalizePostConfig(postConfig: TableMigrationConfig['post']): PostRecordConfig | null {
  if (postConfig === false || postConfig === undefined || postConfig === null) {
    return null;
  }

  if (typeof postConfig === 'boolean') {
    return postConfig ? { enabled: true } : null;
  }

  if (postConfig.enabled === false) {
    return null;
  }

  return postConfig;
}

function isPostHookEnabled(hook?: PostEventHookConfig): boolean {
  if (!hook) {
    return true;
  }
  return hook.enabled !== false;
}

function buildPostModuleCreateQuery(
  table: TableMigrationConfig,
  postConfig: PostRecordConfig,
  eventName: string
): string {
  const payloadLines = resolvePostCreatePayload(table, postConfig);

  return `
let $RID = $after.id;
if !type::is_record($RID) { throw "${eventName} | invalid record id"; };

fn::createPost({
${payloadLines.join('\n')}
});
let $PID = fn::PID($RID);
fn::createEdge($PID, "Post", $RID, { boundId: true, overwrite: false, skipExists: true });

if($after.status == 'publish') {
  fn::updatePost($PID, {
    "publishedAt": time::now()
  });
} else {
  fn::updatePost($PID, {
    "publishedAt": null
  });
}`.trim();
}

function buildPostModuleUpdateQuery(eventName: string): string {
  return `
let $RID = $after.id;
if !type::is_record($RID) { throw "${eventName} | invalid record id"; };
let $PID = fn::PID($RID);

if($after.status == "publish" and $before.status != "publish") {
  let $time = time::now();
  fn::updatePost($PID, {
    "updatedAt": $time,
    "publishedAt": $time
  });
} else if $after.status != "publish" {
  fn::updatePost($PID, {
    "updatedAt": time::now(),
    "publishedAt": null
  });
}`.trim();
}

function buildPostModuleDeleteQuery(eventName: string): string {
  return `
let $RID = $before.id;
if !type::is_record($RID) { throw "${eventName} | invalid record id"; };
let $PID = fn::PID($RID);
fn::deleteEdge($PID, "Post", $RID, { boundId: true });
fn::deletePost($PID);`.trim();
}

function resolvePostCreatePayload(
  table: TableMigrationConfig,
  postConfig: PostRecordConfig
): string[] {
  const lines: string[] = [];

  // Always include record id
  lines.push('  id: $RID,');

  const custom = postConfig.create?.fields;

  if (custom && typeof custom === 'object' && Object.keys(custom).length > 0) {
    for (const [key, raw] of Object.entries(custom)) {
      lines.push(`  ${key}: ${normalizePostFieldValue(raw)},`);
    }
  } else {
    lines.push('  title: record::id($RID),');
  }

  // Ensure trailing comma is removed from last line
  if (lines.length > 0 && lines[lines.length - 1]) {
    lines[lines.length - 1] = (lines[lines.length - 1] as string).replace(/,+\s*$/, '');
  }

  return lines;
}

function normalizePostFieldValue(value: unknown): string {
  if (typeof value === 'string') {
    // Replace <field> tokens with $after.field
    const replaced = value.replace(/<([\\w.]+)>/g, (_m, p1) => `$after.${p1}`);
    // Replace $field tokens with $after.field (avoid existing $after/$before/$this).
    const withDollar = replaced.replace(
      /\$(?!after\b|before\b|this\b)([A-Za-z_][\w]*)/g,
      (_m, p1) => `$after.${p1}`
    );
    // Return as-is (caller can supply literal or expression). No auto-quoting.
    return withDollar;
  }
  if (value === null) return 'null';
  if (value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return 'null';
}

function resolvePostPayload(hook?: PostEventHookConfig): string | undefined {
  if (!hook) {
    return undefined;
  }

  if (typeof hook.payload === 'string') {
    const trimmed = hook.payload.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  if (hook.fields && typeof hook.fields === 'object') {
    const entries = Object.entries(hook.fields).filter(
      ([key, value]) =>
        typeof key === 'string' &&
        key.trim().length > 0 &&
        typeof value === 'string' &&
        value.trim().length > 0
    );

    if (entries.length === 0) {
      return undefined;
    }

    const lines = entries.map(([key, value], index) => {
      const suffix = index < entries.length - 1 ? ',' : '';
      return `  ${key}: ${value}${suffix}`;
    });

    return `{\n${lines.join('\n')}\n}`;
  }

  return undefined;
}

function normalizeDeleteCascadeConfig(
  table: TableMigrationConfig
): NormalizedDeleteCascadeConfig | null {
  const raw = table.delete as DeleteCascadeConfig | boolean | undefined;
  if (raw === false) {
    return null;
  }

  const config: DeleteCascadeConfig =
    raw === true || typeof raw === 'undefined' ? {} : raw;

  if (config.enabled === false) {
    return null;
  }

  return {
    subTables: normalizeDeleteSubTablesConfig(config.subTables),
    edges: normalizeDeleteEdgesConfig(config.edges),
  };
}

function normalizeDeleteSubTablesConfig(
  config?: DeleteCascadeSubTablesConfig | boolean
): NormalizedDeleteSubTablesConfig {
  if (config === false) {
    return { enabled: false, onlyAutoCreated: false };
  }

  if (config === true || typeof config === 'undefined') {
    return { enabled: true, onlyAutoCreated: false };
  }

  return {
    enabled: config.enabled !== false,
    onlyAutoCreated: config.onlyAutoCreated === true,
  };
}

function normalizeDeleteEdgesConfig(
  config?: DeleteCascadeEdgesConfig | boolean
): NormalizedDeleteEdgesConfig {
  if (config === false) {
    const disabledDirection = normalizeDeleteEdgeDirection(false);
    return {
      enabled: false,
      has: { ...disabledDirection },
      belongs: { ...disabledDirection },
    };
  }

  const base: DeleteCascadeEdgesConfig =
    config === true || typeof config === 'undefined' ? {} : config;

  const has = normalizeDeleteEdgeDirection(base.has);
  const belongs = normalizeDeleteEdgeDirection(base.belongs);
  const enabled = base.enabled !== false;

  if (!enabled) {
    return {
      enabled: false,
      has: { ...has, enabled: false },
      belongs: { ...belongs, enabled: false },
    };
  }

  return {
    enabled: true,
    has,
    belongs,
  };
}

function normalizeDeleteEdgeDirection(
  config?: DeleteCascadeEdgeDirection | boolean
): NormalizedDeleteEdgeDirectionConfig {
  if (config === false) {
    return { enabled: false, deleteTargets: false, targetType: 'single' };
  }

  if (config === true || typeof config === 'undefined') {
    return { enabled: true, deleteTargets: false, targetType: 'single' };
  }

  return {
    enabled: config.enabled !== false,
    deleteTargets: config.deleteTargets === true,
    targetType: config.targetType === 'array' ? 'array' : 'single',
  };
}

interface NormalizedDeleteCascadeConfig {
  subTables: NormalizedDeleteSubTablesConfig;
  edges: NormalizedDeleteEdgesConfig;
}

interface NormalizedDeleteSubTablesConfig {
  enabled: boolean;
  onlyAutoCreated: boolean;
}

interface NormalizedDeleteEdgesConfig {
  enabled: boolean;
  has: NormalizedDeleteEdgeDirectionConfig;
  belongs: NormalizedDeleteEdgeDirectionConfig;
}

interface NormalizedDeleteEdgeDirectionConfig {
  enabled: boolean;
  deleteTargets: boolean;
  targetType: 'single' | 'array';
}
