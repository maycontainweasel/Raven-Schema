#!/usr/bin/env node
import { readFile } from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

import {
  auditTables,
  buildSpec,
  parseFile,
  type AuditIssue,
  type SubTableStub,
  type TableAst,
} from './mpdg-to-spec';

type ValidationLevel = 'error' | 'warning';

type ValidationIssue = {
  level: ValidationLevel;
  category: 'audit' | 'authority' | 'views' | 'typesense' | 'relations';
  table: string;
  message: string;
  hint?: string;
};

type AppConfig = {
  graph?: {
    input?: string;
  };
  instance?: {
    active?: boolean;
  };
};

function flagBool(name: string): boolean {
  return process.argv.includes(name);
}

function flagVal(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function toTablePath(table: TableAst, parentPath?: string): string {
  return parentPath ? `${parentPath}.${table.model}` : table.model;
}

function toSubTableAst(sub: SubTableStub, parent: TableAst): TableAst {
  return {
    label: sub.label,
    model: sub.model,
    description: sub.description,
    fields: sub.fields,
    caps: sub.caps ?? {},
    edges: sub.edges ?? [],
    subTables: sub.subTables ?? [],
    parentModel: parent.model,
    tableType: sub.tableType,
  };
}

function collectAllModels(tables: TableAst[]): Set<string> {
  const models = new Set<string>();
  const visit = (table: TableAst) => {
    models.add(table.model);
    for (const sub of table.subTables ?? []) {
      visit(toSubTableAst(sub, table));
    }
  };
  for (const table of tables) visit(table);
  return models;
}

function pushAuditIssues(target: ValidationIssue[], issues: AuditIssue[], category: ValidationIssue['category']) {
  for (const issue of issues) {
    target.push({
      level: issue.level,
      category,
      table: issue.table ?? 'graph',
      message: issue.message,
      ...(issue.hint ? { hint: issue.hint } : {}),
    });
  }
}

function collectViewKeys(view: any): Set<string> {
  const keys = new Set<string>();

  for (const entry of view?.fields ?? []) {
    if (typeof entry === 'string') {
      keys.add(entry);
      continue;
    }
    if (entry && typeof entry === 'object') {
      for (const key of Object.keys(entry)) keys.add(key);
    }
  }

  for (const entry of view?.as ?? []) {
    if (typeof entry === 'string') {
      const key = entry.split(':')[0]?.trim();
      if (key) keys.add(key);
      continue;
    }
    if (entry && typeof entry === 'object') {
      for (const key of Object.keys(entry)) keys.add(key);
    }
  }

  return keys;
}

function validateViewDefinitions(spec: any, tablePath: string, issues: ValidationIssue[]) {
  const views = Array.isArray(spec?.views) ? spec.views : [];
  if (views.length === 0) return;

  const seen = new Set<string>();
  for (const view of views) {
    const name = String(view?.name ?? '').trim();
    if (!name) {
      issues.push({
        level: 'error',
        category: 'views',
        table: tablePath,
        message: 'A generated view is missing a name.',
      });
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      issues.push({
        level: 'error',
        category: 'views',
        table: tablePath,
        message: `Duplicate generated view/resource name "${name}".`,
        hint: 'Resource selectors must be unique per model.',
      });
      continue;
    }
    seen.add(key);
  }
}

function validateTypesenseSpec(spec: any, tablePath: string, issues: ValidationIssue[]) {
  const typesense = spec?.typesense;
  if (!typesense) return;

  const schemaFields = Array.isArray(typesense?.schema?.fields) ? typesense.schema.fields : [];
  const schemaFieldNames = new Set<string>(
    schemaFields.map((field: any) => String(field?.name ?? '').trim()).filter(Boolean)
  );
  const documentKeys = collectViewKeys(typesense.view);

  if (schemaFields.length === 0) {
    issues.push({
      level: 'error',
      category: 'typesense',
      table: tablePath,
      message: 'Typesense is enabled but no schema fields were generated.',
    });
    return;
  }

  for (const field of schemaFieldNames) {
    if (!documentKeys.has(field)) {
      issues.push({
        level: 'error',
        category: 'typesense',
        table: tablePath,
        message: `Typesense schema field "${field}" is not returned by the generated Typesense view/function.`,
        hint: 'Keep the Typesense collection schema and the Typesense document shape in lock-step.',
      });
    }
  }

  const sortableFields = Array.isArray(typesense?.schema?.sortableFields)
    ? typesense.schema.sortableFields
    : [];
  for (const field of sortableFields) {
    const name = String(field ?? '').trim();
    if (name && !schemaFieldNames.has(name)) {
      issues.push({
        level: 'error',
        category: 'typesense',
        table: tablePath,
        message: `sortableFields references "${name}" but that field is not in the Typesense schema.`,
      });
    }
  }

  const defaultSortingField = typesense?.schema?.settings?.default_sorting_field;
  if (defaultSortingField && !schemaFieldNames.has(String(defaultSortingField))) {
    issues.push({
      level: 'error',
      category: 'typesense',
      table: tablePath,
      message: `default_sorting_field references "${defaultSortingField}" but that field is not in the Typesense schema.`,
    });
  }

  const queryBy = Array.isArray(typesense?.meta?.settings?.queryBy) ? typesense.meta.settings.queryBy : [];
  for (const field of queryBy) {
    const name = String(field ?? '').trim();
    if (name && !schemaFieldNames.has(name)) {
      issues.push({
        level: 'warning',
        category: 'typesense',
        table: tablePath,
        message: `queryBy references "${name}" but that field is not in the Typesense schema.`,
      });
    }
  }

  const filterFields = Array.isArray(typesense?.meta?.settings?.filters) ? typesense.meta.settings.filters : [];
  for (const field of filterFields) {
    const name = String(field ?? '').trim();
    if (name && !schemaFieldNames.has(name)) {
      issues.push({
        level: 'warning',
        category: 'typesense',
        table: tablePath,
        message: `filters references "${name}" but that field is not in the Typesense schema.`,
      });
    }
  }

  const metaFields = typesense?.meta?.fields && typeof typesense.meta.fields === 'object'
    ? Object.keys(typesense.meta.fields)
    : [];
  for (const field of metaFields) {
    if (!schemaFieldNames.has(field)) {
      issues.push({
        level: 'warning',
        category: 'typesense',
        table: tablePath,
        message: `Typesense meta defines field metadata for "${field}" but the schema does not include it.`,
      });
    }
  }
}

function validateRelations(spec: any, tablePath: string, knownModels: Set<string>, issues: ValidationIssue[]) {
  const relations = Array.isArray(spec?.relations) ? spec.relations : [];
  if (relations.length === 0) return;

  const payloadFields = new Set<string>();
  for (const relation of relations) {
    const edge = String(relation?.edge ?? '').trim();
    const left = String(relation?.left ?? '').trim();
    const right = String(relation?.right ?? '').trim();
    const payloadField = String(relation?.payloadField ?? '').trim();

    if (edge && payloadFields.has(payloadField)) {
      issues.push({
        level: 'warning',
        category: 'relations',
        table: tablePath,
        message: `Multiple relations reuse the payload field "${payloadField}".`,
        hint: 'Distinct relation payload fields are easier for agents and generators to reason about.',
      });
    }
    if (payloadField) payloadFields.add(payloadField);

    if (left && !knownModels.has(left)) {
      issues.push({
        level: 'warning',
        category: 'relations',
        table: tablePath,
        message: `Relation edge "${edge}" references missing model "${left}".`,
        hint: 'This may be a missing stanza or an auxiliary/generated model. Confirm the target intentionally exists.',
      });
    }
    if (right && !knownModels.has(right)) {
      issues.push({
        level: 'warning',
        category: 'relations',
        table: tablePath,
        message: `Relation edge "${edge}" references missing model "${right}".`,
        hint: 'This may be a missing stanza or an auxiliary/generated model. Confirm the target intentionally exists.',
      });
    }
  }
}

function validateAuthority(spec: any, tablePath: string, instancesActive: boolean, issues: ValidationIssue[]) {
  if (!instancesActive) return;
  if (spec?.table?.tableType && String(spec.table.tableType).toUpperCase() === 'RELATION') return;

  const authority = spec?.admin?.authority;
  if (!authority) {
    issues.push({
      level: 'warning',
      category: 'authority',
      table: tablePath,
      message: 'Model authority is implicit while instance mode is active.',
      hint: 'Declare authority explicitly in the stanza model settings block.',
    });
  }
}

function validateTable(
  table: TableAst,
  options: {
    instancesActive: boolean;
    knownModels: Set<string>;
    parentPath?: string;
    issues: ValidationIssue[];
  }
) {
  const tablePath = toTablePath(table, options.parentPath);

  let spec: any;
  try {
    spec = buildSpec(table);
  } catch (error: any) {
    options.issues.push({
      level: 'error',
      category: 'audit',
      table: tablePath,
      message: `Spec generation failed: ${error?.message ?? String(error)}`,
    });
    return;
  }

  validateAuthority(spec, tablePath, options.instancesActive, options.issues);
  validateViewDefinitions(spec, tablePath, options.issues);
  validateTypesenseSpec(spec, tablePath, options.issues);
  validateRelations(spec, tablePath, options.knownModels, options.issues);

  for (const sub of table.subTables ?? []) {
    validateTable(toSubTableAst(sub, table), {
      ...options,
      parentPath: tablePath,
    });
  }
}

function formatIssue(issue: ValidationIssue): string {
  const scope = issue.table ? `[${issue.table}]` : '[graph]';
  return `${issue.level.toUpperCase()} ${issue.category} ${scope} ${issue.message}`;
}

async function loadAppConfig(root: string): Promise<AppConfig> {
  const appConfigPath = path.join(root, 'config', 'app.config.yaml');
  const raw = await readFile(appConfigPath, 'utf8');
  return (YAML.parse(raw) ?? {}) as AppConfig;
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const strict = flagBool('--strict');
  const inputOverride = flagVal('--input');
  const appConfig = await loadAppConfig(cwd);
  const inputPath = path.resolve(cwd, inputOverride ?? appConfig.graph?.input ?? 'config/graph.mpdg');
  const raw = await readFile(inputPath, 'utf8');
  const tables = parseFile(raw);
  const knownModels = collectAllModels(tables);

  const issues: ValidationIssue[] = [];
  const audit = auditTables(tables);
  pushAuditIssues(issues, audit.errors, 'audit');
  pushAuditIssues(issues, audit.warnings, 'audit');

  for (const table of tables) {
    validateTable(table, {
      instancesActive: Boolean(appConfig.instance?.active),
      knownModels,
      issues,
    });
  }

  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');

  console.log(`🧪 graph:validate input=${path.relative(cwd, inputPath)}`);
  if (issues.length === 0) {
    console.log('✅ No MPDG validation issues detected.');
    return;
  }

  for (const issue of issues) {
    const stream = issue.level === 'error' ? console.error : console.warn;
    stream(formatIssue(issue));
    if (issue.hint) {
      stream(`  ↳ ${issue.hint}`);
    }
  }

  console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s)`);

  if (errors.length > 0 || (strict && warnings.length > 0)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
