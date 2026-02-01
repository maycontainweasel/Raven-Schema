import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import type { TableMigrationConfig, TypesenseDefinition, TypesenseFieldDefinition } from '../types';

interface GenerateTypesenseOptions {
  tables: TableMigrationConfig[];
  outputRoot: string;
}

export async function generateTypesenseSchemas(
  options: GenerateTypesenseOptions
): Promise<void> {
  const { tables, outputRoot } = options;
  const targets = tables.filter((table) => table.typesense && table.typesense.schema);
  await mkdir(outputRoot, { recursive: true });
  if (targets.length === 0) {
    const bundlePath = path.join(outputRoot, 'collections.ts');
    await writeFile(bundlePath, buildCollectionsBundle([]), 'utf8');
    console.log(`ℹ️  No Typesense schemas to generate. Wrote empty bundle → ${path.relative(process.cwd(), bundlePath)}`);
    return;
  }

  const bundleEntries: Array<{ name: string; schema: Record<string, any>; meta?: Record<string, any> }> = [];

  for (const table of targets) {
    const typesense = table.typesense as TypesenseDefinition;
    const schema = buildTypesenseSchema(typesense);
    if (!schema) continue;

    const fileBase = schema.name;
    bundleEntries.push({ name: fileBase, schema, meta: typesense.meta as Record<string, any> | undefined });
  }

  if (bundleEntries.length > 0) {
    const bundlePath = path.join(outputRoot, 'collections.ts');
    await writeFile(bundlePath, buildCollectionsBundle(bundleEntries), 'utf8');
    console.log(`🧠 Generated typesense bundle: ${path.relative(process.cwd(), bundlePath)}`);
  }
}

function buildTypesenseSchema(typesense: TypesenseDefinition): Record<string, any> | null {
  const schema = typesense.schema;
  if (!schema || !schema.collection || !Array.isArray(schema.fields)) {
    return null;
  }

  const settings: Record<string, any> = normalizeTypesenseSettings(schema.settings ?? {});
  const sortableFields = new Set(
    (schema.sortableFields ?? []).map((field) => String(field))
  );
  const matchedSortable = new Set<string>();
  const facetFields = extractFacetFields(typesense.meta);

  const adjustedFields = applyFacetFields(schema.fields, facetFields);
  const fields = adjustedFields.map((field) =>
    mapTypesenseField(field, sortableFields, matchedSortable)
  );

  if (typeof settings.default_sorting_field === 'string') {
    const target = fields.find((field) => field.name === settings.default_sorting_field);
    if (target && target.type === 'string') {
      target.sort = true;
    }
  }

  if (sortableFields.size > 0) {
    const missing = Array.from(sortableFields).filter((field) => !matchedSortable.has(field));
    if (missing.length > 0) {
      console.warn(
        `⚠️  Typesense sortableFields not found in schema "${schema.collection}": ${missing.join(', ')}`
      );
    }
  } else if (typeof settings.default_sorting_field === 'string') {
    console.warn(
      `⚠️  Typesense schema "${schema.collection}" sets default_sorting_field but has no sortableFields; sorting may fail.`
    );
  }

  return {
    name: schema.collection,
    fields,
    ...settings,
  };
}

function extractFacetFields(meta: TypesenseDefinition['meta']): Set<string> {
  const filters: string[] = [];
  if (!meta || typeof meta !== 'object') return new Set();

  const metaRecord = meta as Record<string, any>;
  const direct = metaRecord.filters;
  const nested = metaRecord.settings?.filters;

  if (Array.isArray(direct)) {
    filters.push(...direct.map((field) => String(field)));
  }
  if (Array.isArray(nested)) {
    filters.push(...nested.map((field) => String(field)));
  }

  return new Set(filters.filter(Boolean));
}

function applyFacetFields(
  fields: TypesenseFieldDefinition[],
  facetFields: Set<string>,
  parentPath = ''
): TypesenseFieldDefinition[] {
  return fields.map((field) => {
    const fullName = parentPath ? `${parentPath}.${field.name}` : field.name;
    const shouldFacet = facetFields.has(field.name) || facetFields.has(fullName);
    const next: TypesenseFieldDefinition = {
      ...field,
      facet: shouldFacet ? true : field.facet,
    };

    if (Array.isArray(field.fields) && field.fields.length > 0) {
      next.fields = applyFacetFields(field.fields, facetFields, fullName);
    }

    return next;
  });
}

function normalizeTypesenseSettings(settings: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...settings };
  const mapping: Record<string, string> = {
    defaultSortingField: 'default_sorting_field',
    enableNestedFields: 'enable_nested_fields',
    enableSynonyms: 'enable_synonyms',
    enableSearchAsYouType: 'enable_search_as_you_type',
    enablePerDocumentSynonyms: 'enable_per_document_synonyms',
    enablePerDocumentSearchAsYouType: 'enable_per_document_search_as_you_type',
  };

  for (const [from, to] of Object.entries(mapping)) {
    if (out[from] !== undefined && out[to] === undefined) {
      out[to] = out[from];
      delete out[from];
    }
  }

  if (typeof out.default_sorting_field === 'string' && out.default_sorting_field.trim().toLowerCase() === 'id') {
    delete out.default_sorting_field;
  }

  return out;
}

function mapTypesenseField(
  field: TypesenseFieldDefinition,
  sortableFields: Set<string>,
  matchedSortable: Set<string>,
  parentPath = ''
): Record<string, any> {
  const entry: Record<string, any> = { name: field.name, type: field.type };
  const fullName = parentPath ? `${parentPath}.${field.name}` : field.name;
  if (sortableFields.has(field.name) || sortableFields.has(fullName)) {
    entry.sort = true;
    matchedSortable.add(field.name);
    matchedSortable.add(fullName);
  }
  if (field.facet !== undefined) entry.facet = field.facet;
  if (field.optional !== undefined) entry.optional = field.optional;
  if (field.sort !== undefined) entry.sort = field.sort;
  if (Array.isArray(field.fields) && field.fields.length > 0) {
    entry.fields = field.fields.map((child) =>
      mapTypesenseField(child, sortableFields, matchedSortable, fullName)
    );
  }
  return entry;
}

function buildTypesenseTypes(schema: Record<string, any>): string {
  const interfaceName = `${toPascal(schema.name)}Document`;
  const fields: TypesenseFieldDefinition[] = Array.isArray(schema.fields) ? schema.fields : [];
  const lines = fields.map((field) => {
    const tsType = buildTypesenseTsType(field);
    const optional = field.optional ? '?' : '';
    return `  ${field.name}${optional}: ${tsType};`;
  });

  return [
    `export interface ${interfaceName} {`,
    ...lines,
    `}`,
    '',
  ].join('\n');
}

function mapTypesenseTypeToTs(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized === 'string') return 'string';
  if (normalized === 'string[]') return 'string[]';
  if (normalized === 'int32' || normalized === 'int64' || normalized === 'float') return 'number';
  if (normalized === 'bool') return 'boolean';
  if (normalized === 'object') return 'Record<string, unknown>';
  if (normalized === 'object[]') return 'Record<string, unknown>[]';
  return 'any';
}

function buildTypesenseTsType(field: TypesenseFieldDefinition): string {
  const type = field.type.toLowerCase();
  if ((type === 'object' || type === 'object[]') && Array.isArray(field.fields) && field.fields.length > 0) {
    const nested = buildInlineObjectType(field.fields);
    return type === 'object[]' ? `Array<${nested}>` : nested;
  }
  return mapTypesenseTypeToTs(field.type);
}

function buildInlineObjectType(fields: TypesenseFieldDefinition[]): string {
  const props = fields
    .map((field) => {
      const tsType = buildTypesenseTsType(field);
      const optional = field.optional ? '?' : '';
      return `${field.name}${optional}: ${tsType}`;
    })
    .join('; ');
  return `{ ${props} }`;
}

function buildCollectionsBundle(
  entries: Array<{ name: string; schema: Record<string, any>; meta?: Record<string, any> }>
): string {
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED — Typesense collections + document types');
  lines.push('');
  lines.push('export interface TypesenseField {');
  lines.push('  name: string;');
  lines.push('  type: string;');
  lines.push('  facet?: boolean;');
  lines.push('  optional?: boolean;');
  lines.push('  sort?: boolean;');
  lines.push('  fields?: TypesenseField[];');
  lines.push('}');
  lines.push('');
  lines.push('export interface TypesenseCollectionSchema {');
  lines.push('  name: string;');
  lines.push('  fields: TypesenseField[];');
  lines.push('  [key: string]: unknown;');
  lines.push('}');
  lines.push('');

  for (const entry of entries) {
    const interfaceName = `${toPascal(entry.name)}Document`;
    const fields: TypesenseFieldDefinition[] = Array.isArray(entry.schema.fields)
      ? entry.schema.fields
      : [];
    lines.push(`export interface ${interfaceName} {`);
    for (const field of fields) {
      const tsType = buildTypesenseTsType(field);
      const optional = field.optional ? '?' : '';
      lines.push(`  ${field.name}${optional}: ${tsType};`);
    }
    lines.push('}');
    lines.push('');
  }

  lines.push('export const collections: Record<string, TypesenseCollectionSchema> = {');
  for (const entry of entries) {
    const schemaLiteral = JSON.stringify(entry.schema, null, 2);
    const indented = schemaLiteral
      .split('\n')
      .map((line, index) => (index === 0 ? line : `  ${line}`))
      .join('\n');
    lines.push(`  ${entry.name}: ${indented},`);
  }
  lines.push('};');
  lines.push('');
  lines.push('export const collectionsMeta: Record<string, Record<string, unknown>> = {');
  for (const entry of entries) {
    const meta = entry.meta ?? {};
    const metaLiteral = JSON.stringify(meta, null, 2)
      .split('\n')
      .map((line, index) => (index === 0 ? line : `  ${line}`))
      .join('\n');
    lines.push(`  ${entry.name}: ${metaLiteral},`);
  }
  lines.push('};');
  lines.push('');
  lines.push('export const collectionList = Object.values(collections);');
  lines.push('');

  return lines.join('\n');
}

function toPascal(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}
