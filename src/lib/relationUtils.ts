import type { TableMigrationConfig, TableRelationConfig } from '../types';
import { toPascalCase } from './crudHelpers';

export type NormalizedRelation = {
  edge: string;
  leftModel: string;
  rightModel: string;
  leftLabel: string;
  rightLabel: string;
  sourceModel: string;
  cardinality: 'one' | 'many';
  storeOnModel: boolean;
  payloadField: string;
  linkOnCreate: boolean;
  required: boolean;
  requiredOnHook: boolean;
  processor: 'functions' | 'events' | 'none';
  hookModel: string;
  functionsEnabled: boolean;
  functions: {
    attach: string;
    detach: string;
    getLeft: string;
    getRight: string;
  };
};

type RelationDefaults = {
  cardinality: 'one' | 'many';
  storeOnModel: boolean;
  linkOnCreate: boolean;
  processor: 'functions' | 'events' | 'none';
  functionsEnabled: boolean;
};

const DEFAULTS: RelationDefaults = {
  cardinality: 'many',
  storeOnModel: true,
  linkOnCreate: true,
  processor: 'functions',
  functionsEnabled: true,
};

export function collectRelations(tables: TableMigrationConfig[]): NormalizedRelation[] {
  const tableByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tableByModel.set(model, table);
    }
  }

  const relations: NormalizedRelation[] = [];
  const seen = new Map<string, NormalizedRelation>();
  const groupedByRelation = new Map<string, NormalizedRelation[]>();

  for (const table of tables) {
    const sourceModel = table.table?.model ?? table.name ?? 'unknown';
    const rels = table.relations ?? [];
    if (rels.length === 0) continue;
    for (const relation of rels) {
      const normalized = normalizeRelation(relation, tableByModel, sourceModel);
      if (!normalized) continue;

      const key = relationKey(normalized, sourceModel);
      const existing = seen.get(key);
      if (existing) {
        if (!relationsEquivalent(existing, normalized)) {
          console.warn(
            `⚠️  Relation conflict for ${key}. Keeping first definition.\n` +
              `    existing: ${formatRelation(existing)}\n` +
              `    new:      ${formatRelation(normalized)}`
          );
        }
        continue;
      }
      seen.set(key, normalized);
      relations.push(normalized);

      const relationKeyBase = `${normalized.edge}:${normalized.leftModel}:${normalized.rightModel}`;
      const grouped = groupedByRelation.get(relationKeyBase) ?? [];
      grouped.push(normalized);
      groupedByRelation.set(relationKeyBase, grouped);
    }
  }

  return relations;
}

function normalizeRelation(
  relation: TableRelationConfig,
  tableByModel: Map<string, TableMigrationConfig>,
  sourceModel: string
): NormalizedRelation | null {
  if (!relation.edge || !relation.left || !relation.right) return null;
  const leftModel = relation.left.trim();
  const rightModel = relation.right.trim();

  const leftLabel = resolveLabel(leftModel, tableByModel);
  const rightLabel = resolveLabel(rightModel, tableByModel);

  const cardinality = relation.cardinality ?? DEFAULTS.cardinality;
  const storeOnModel = relation.storeOnModel ?? DEFAULTS.storeOnModel;
  const linkOnCreate =
    typeof relation.linkOnCreate === 'boolean' ? relation.linkOnCreate : DEFAULTS.linkOnCreate;
  const processor = relation.processor ?? DEFAULTS.processor;
  const functionsEnabled =
    typeof relation.functions === 'boolean' ? relation.functions : DEFAULTS.functionsEnabled;

  const hookModel = resolveHookModel(relation.hook, leftModel, rightModel, sourceModel);
  const payloadField =
    relation.payloadField ??
    (cardinality === 'one' ? toCamel(leftLabel) : pluralize(toCamel(leftLabel)));

  const prefixRightLeft = `${rightLabel}${leftLabel}`;
  const prefixLeftRight = `${leftLabel}${rightLabel}`;

  const functions = {
    attach: relation.functions?.attach ?? `attach${prefixRightLeft}`,
    detach: relation.functions?.detach ?? `detach${prefixRightLeft}`,
    getLeft: relation.functions?.getLeft ?? `get${pluralize(prefixRightLeft)}`,
    getRight: relation.functions?.getRight ?? `get${pluralize(prefixLeftRight)}`,
  };

  return {
    edge: relation.edge.trim(),
    leftModel,
    rightModel,
    leftLabel,
    rightLabel,
    sourceModel,
    cardinality,
    storeOnModel,
    payloadField,
    linkOnCreate,
    required: relation.required ?? false,
    requiredOnHook: relation.requiredOnHook ?? false,
    processor,
    hookModel,
    functionsEnabled,
    functions,
  };
}

function resolveLabel(model: string, tableByModel: Map<string, TableMigrationConfig>): string {
  const table = tableByModel.get(model);
  const raw = table?.name || model;
  return toPascalCase(raw);
}

function resolveHookModel(
  hook: TableRelationConfig['hook'],
  leftModel: string,
  rightModel: string,
  sourceModel: string
): string {
  if (!hook) return sourceModel;
  if (hook === 'left') return leftModel;
  if (hook === 'right') return rightModel;
  return hook;
}

function relationKey(rel: NormalizedRelation, sourceModel: string): string {
  return `${rel.edge}:${rel.leftModel}:${rel.rightModel}:${sourceModel}`;
}

function relationsEquivalent(a: NormalizedRelation, b: NormalizedRelation): boolean {
  return (
    a.cardinality === b.cardinality &&
    a.storeOnModel === b.storeOnModel &&
    a.payloadField === b.payloadField &&
    a.linkOnCreate === b.linkOnCreate &&
    a.required === b.required &&
    a.requiredOnHook === b.requiredOnHook &&
    a.processor === b.processor &&
    a.hookModel === b.hookModel
  );
}

function formatRelation(rel: NormalizedRelation): string {
  return [
    `${rel.leftModel}->${rel.edge}->${rel.rightModel}`,
    `source=${rel.sourceModel}`,
    `cardinality=${rel.cardinality}`,
    `storeOnModel=${rel.storeOnModel}`,
    `payloadField=${rel.payloadField}`,
    `linkOnCreate=${rel.linkOnCreate}`,
    `required=${rel.required}`,
    `requiredOnHook=${rel.requiredOnHook}`,
    `processor=${rel.processor}`,
    `hook=${rel.hookModel}`,
  ].join(', ');
}

function pluralize(value: string): string {
  if (!value) return value;
  if (value.endsWith('s')) return value;
  if (/[sxz]$/i.test(value) || /(ch|sh)$/i.test(value)) {
    return `${value}es`;
  }
  if (/[^aeiou]y$/i.test(value)) {
    return `${value.slice(0, -1)}ies`;
  }
  return `${value}s`;
}

function toCamel(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
