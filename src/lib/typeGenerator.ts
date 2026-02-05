import { mkdir, readdir, rm, writeFile } from 'fs/promises';
import path from 'path';

import type { TableFieldEntry, TableFieldMeta, TableMigrationConfig } from '../types';

interface GenerateTypesOptions {
  tables: TableMigrationConfig[];
  outputRoot: string;
  pruneStale?: boolean;
}

const ZOD_IMPORT = `import { z } from 'zod';`;

export async function generateTableTypes(options: GenerateTypesOptions): Promise<void> {
  const { tables, outputRoot, pruneStale = true } = options;

  await mkdir(outputRoot, { recursive: true });
  const tablesDir = path.join(outputRoot, 'tables');
  await mkdir(tablesDir, { recursive: true });

  await writeCoreTypes(outputRoot);

  const indexExports: string[] = [`export * from './core';`];
  const expectedTableFiles = new Set(
    tables.map((table) => `${sanitizeFileName(table.name)}.ts`)
  );
  if (pruneStale) {
    const existing = await readdir(tablesDir).catch(() => []);
    for (const entry of existing) {
      if (!entry.endsWith('.ts')) continue;
      if (!expectedTableFiles.has(entry)) {
        await rm(path.join(tablesDir, entry), { force: true });
      }
    }
  }

  for (const table of tables) {
    const tableName = sanitizePascal(table.name);
    const fileName = `${sanitizeFileName(table.name)}.ts`;
    const model = table.table?.model ?? tableName;

    const schemaIdentifier = `Z_${tableName}`;
    const typeIdentifier = tableName;

    const normalizedFields = normalizeFields(table.fields ?? []);
    const taxonomyPayloadOmitKeys = (table.taxonomies ?? [])
      .filter((taxonomy) => taxonomy.storeOnModel === false)
      .map((taxonomy) => taxonomy.payloadField)
      .filter((field): field is string => Boolean(field));
    const filteredFields = taxonomyPayloadOmitKeys.length
      ? normalizedFields.filter((field) => !taxonomyPayloadOmitKeys.includes(field.name))
      : normalizedFields;

    const fieldLines: string[] = [];

    const idBlocks = buildIdSchemas(table, model, tableName);
    if (idBlocks?.fieldLine) {
      fieldLines.push(idBlocks.fieldLine);
    }

    for (const field of filteredFields) {
      fieldLines.push(buildFieldLine(field));
    }

    const schemaBody = `export const ${schemaIdentifier} = z.object({\n${fieldLines.join('\n')}\n});`;
    const typeBody = `export type ${typeIdentifier} = z.infer<typeof ${schemaIdentifier}>;`;

    const lines: string[] = [ZOD_IMPORT];

    const coreImports = new Set<string>();
    if (idBlocks?.schema) {
      coreImports.add('RecordID_z');
    }
    if (usesUuidField(filteredFields)) {
      coreImports.add('uuid_z');
    }
    if (coreImports.size > 0) {
      lines.push(`import { ${Array.from(coreImports).join(', ')} } from '../core';`);
    }

    lines.push('');

    if (idBlocks?.schema) {
      lines.push(idBlocks.schema, idBlocks.type, '');
    }

    lines.push(schemaBody, '', typeBody, '');

    const fileContent = lines.join('\n');

    const filePath = path.join(tablesDir, fileName);
    await writeFile(filePath, fileContent, 'utf-8');

    indexExports.push(`export * from './tables/${sanitizeFileName(table.name)}';`);
  }

  const indexContent = indexExports.join('\n') + '\n';
  await writeFile(path.join(outputRoot, 'index.ts'), indexContent, 'utf-8');
}

async function writeCoreTypes(outputRoot: string): Promise<void> {
  const corePath = path.join(outputRoot, 'core.ts');
  const content = `${ZOD_IMPORT}

export const RecordID_z = z.object({
  tb: z.string(),
  id: z.any(),
});

export const uuid_z = z.string().uuid();

export type RecordID = z.infer<typeof RecordID_z>;
`;
  await writeFile(corePath, content, 'utf-8');
}

function sanitizePascal(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'table';
}

interface NormalizedField {
  name: string;
  meta: TableFieldMeta;
  children: NormalizedField[];
}

function normalizeFields(rawFields: TableFieldEntry[]): NormalizedField[] {
  return rawFields.flatMap((entry) =>
    Object.entries(entry)
      .filter(([name]) => !isCommentField(name))
      .filter(([, meta]) => !(meta as TableFieldMeta)?.transient)
      .map(([name, meta]) => normalizeField(name, meta as TableFieldMeta))
  );
}

function usesUuidField(fields: NormalizedField[]): boolean {
  return fields.some((field) => {
    const rawType = field.meta?.type;
    const hasUuid = typeof rawType === 'string' && rawType.toLowerCase().startsWith('uuid');
    if (hasUuid) return true;
    return field.children.length > 0 && usesUuidField(field.children);
  });
}

function normalizeField(name: string, meta: TableFieldMeta): NormalizedField {
  const children: NormalizedField[] = [];
  if (meta && typeof (meta as any).fields === 'object' && (meta as any).fields !== null) {
    for (const [childName, childMeta] of Object.entries((meta as any).fields)) {
      if (isCommentField(childName)) {
        continue;
      }
      children.push(normalizeField(childName, childMeta as TableFieldMeta));
    }
  }
  return { name, meta, children };
}

function isCommentField(name: string): boolean {
  return name.trim().startsWith('#');
}

function buildFieldLine(field: NormalizedField): string {
  const { name, meta } = field;
  const base = buildZodSchema(field, 1);
  const isRequired = meta.required === true;
  const final = isRequired ? base : `${base}.optional()`;
  return `  ${name}: ${final},`;
}

function buildZodSchema(field: NormalizedField, depth: number): string {
  const rawType = field.meta.type;
  if (!rawType) {
    return 'z.any()';
  }

  const enumValues = resolveEnumValues(rawType, field.meta.options);
  if (enumValues && enumValues.length > 0) {
    return `z.enum([${enumValues.map((value) => JSON.stringify(value)).join(', ')}])`;
  }

  const lower = rawType.toLowerCase();
  if (lower === 'array') {
    if (field.meta.items) {
      const itemField: NormalizedField = {
        name: 'item',
        meta: field.meta.items,
        children: [],
      };
      if (field.meta.items.fields) {
        itemField.children = Object.entries(field.meta.items.fields)
          .filter(([name]) => !isCommentField(name))
          .map(([name, meta]) => normalizeField(name, meta as TableFieldMeta));
      }
      const itemSchema = buildZodSchema(itemField, depth + 1);
      return `z.array(${itemSchema})`;
    }
    return 'z.array(z.any())';
  }

  if (rawType.toLowerCase() === 'object' && field.children.length > 0) {
    const indent = '  '.repeat(depth);
    const childLines = field.children.map((child) => {
      const schema = buildZodSchema(child, depth + 1);
      const required = child.meta.required === true;
      const final = required ? schema : `${schema}.optional()`;
      return `${indent}${child.name}: ${final},`;
    });
    return `z.object({\n${childLines.join('\n')}\n${'  '.repeat(depth - 1)}})`;
  }

  const unionParts = rawType.split('|').map((part) => part.trim()).filter(Boolean);
  if (unionParts.length > 1) {
    const expressions = unionParts.map((part) => buildSingleType(part, field));
    return `z.union([${expressions.join(', ')}])`;
  }

  return buildSingleType(unionParts[0] ?? rawType, field);
}

function buildZodExpression(rawType: string): string {
  if (!rawType) return 'z.any()';
  const unionParts = rawType.split('|').map((part) => part.trim()).filter(Boolean);
  if (unionParts.length > 1) {
    const expressions = unionParts.map((part) => buildSingleType(part, { name: '', meta: { type: part }, children: [] }));
    return `z.union([${expressions.join(', ')}])`;
  }
  return buildSingleType(unionParts[0] ?? rawType, { name: '', meta: { type: rawType }, children: [] });
}

function buildSingleType(typeSegment: string, field: NormalizedField): string {
  const lower = typeSegment.toLowerCase();

  const literal = parseStringLiteral(typeSegment);
  if (literal !== null) {
    return `z.literal(${JSON.stringify(literal)})`;
  }

  if (lower === 'string') return 'z.string()';
  if (lower === 'uuid' || lower.startsWith('uuid<')) return 'uuid_z';
  if (lower === 'bool' || lower === 'boolean') return 'z.boolean()';
  if (lower === 'int' || lower === 'integer') return 'z.number().int()';
  if (lower === 'number' || lower === 'float' || lower === 'decimal') return 'z.number()';
  if (lower === 'datetime') return 'z.string()';
  if (lower === 'any') return 'z.any()';

  if (lower.startsWith('array<') && lower.endsWith('>')) {
    const inner = typeSegment.slice(typeSegment.indexOf('<') + 1, -1);
    return `z.array(${buildZodExpression(inner)})`;
  }

  if (lower.startsWith('tuple<') && lower.endsWith('>')) {
    const inner = typeSegment.slice(typeSegment.indexOf('<') + 1, -1);
    const parts = inner.split(',').map((part) => part.trim()).filter(Boolean);
    return `z.tuple([${parts.map((part) => buildZodExpression(part)).join(', ')}])`;
  }

  if (lower.startsWith('record<')) {
    return 'z.string()';
  }

  if (/[a-z0-9]+id$/i.test(typeSegment)) {
    return `${typeSegment}_z`;
  }

  return 'z.string()';
}

function resolveEnumValues(
  rawType: string,
  options?: Record<string, unknown>
): string[] | null {
  const trimmed = rawType.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'enum' && options) {
    const values = options.values;
    if (Array.isArray(values)) {
      return values.map((value) => String(value));
    }
    if (typeof values === 'string') {
      return splitEnumValues(values);
    }
  }

  if (lower.startsWith('enum<') && trimmed.endsWith('>')) {
    const inner = trimmed.slice(trimmed.indexOf('<') + 1, -1);
    return splitEnumValues(inner);
  }

  return null;
}

function splitEnumValues(raw: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let quoteChar: '"' | "'" | null = null;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i] as string;
    const prev = i > 0 ? raw[i - 1] : '';

    if ((ch === '"' || ch === "'") && prev !== '\\') {
      if (inString && quoteChar === ch) {
        inString = false;
        quoteChar = null;
      } else if (!inString) {
        inString = true;
        quoteChar = ch as '"' | "'";
      }
      current += ch;
      continue;
    }

    if (!inString && (ch === '|' || ch === ',')) {
      const value = normalizeEnumToken(current);
      if (value !== null) values.push(value);
      current = '';
      continue;
    }

    current += ch;
  }

  const finalValue = normalizeEnumToken(current);
  if (finalValue !== null) values.push(finalValue);

  return values;
}

function normalizeEnumToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const literal = parseStringLiteral(trimmed);
  if (literal !== null) return literal;
  return trimmed;
}

function parseStringLiteral(value: string): string | null {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return null;
}

interface IdSchemaParts {
  schema: string;
  type: string;
  fieldLine: string;
  imports?: string[];
}

function buildIdSchemas(
  table: TableMigrationConfig,
  model: string,
  tableName: string
): IdSchemaParts | null {
  const idConfig = table.id;
  if (!idConfig) {
    return null;
  }

  const exportType = idConfig.exportType ?? (idConfig as any).exportIDType ?? false;
  if (!exportType) {
    return {
      schema: '',
      type: '',
      fieldLine: `  id: z.any().optional(),`,
    };
  }

  const nameTemplate = idConfig.exportName ?? `${tableName}ID`;
  const exportName = resolveExportName(nameTemplate, table.name, model);
  const schemaConst = `${exportName}_z`;
  const subIdName = `${exportName}SubId`;
  const subIdSchemaConst = `${subIdName}_z`;
  const innerType = buildZodExpression(idConfig.type ?? 'string');

  const schema = `export const ${subIdSchemaConst} = ${innerType};

export const ${schemaConst} = RecordID_z.extend({
  tb: z.literal('${model}'),
  id: ${subIdSchemaConst},
});`;

  const typeAlias = `export type ${subIdName} = z.infer<typeof ${subIdSchemaConst}>;
export type ${exportName} = z.infer<typeof ${schemaConst}>;`;

  return {
    schema,
    type: typeAlias,
    fieldLine: `  id: ${schemaConst}.optional(),`,
    imports: [`import { RecordID_z } from '../core';`],
  };
}

function resolveExportName(template: string, tableName: string, model: string): string {
  const namePascal = sanitizePascal(tableName);
  return template
    .replace(/__NAME__/g, namePascal)
    .replace(/__MODEL__/g, model)
    .replace(/\W+/g, '')
    || `${namePascal}ID`;
}
