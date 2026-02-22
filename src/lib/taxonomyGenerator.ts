import { mkdir } from 'fs/promises';
import path from 'path';

import type { TableMigrationConfig, TableTaxonomyConfig } from '../types';
import { getTableAssetDir } from './tableAssetPaths';
import { buildEdgeStatements, type NormalizedEdge } from './edgeRunner';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker } from './assetTracker';
import { writeGeneratedAsset } from './assetWriter';

interface GenerateTaxonomyOptions {
  tables: TableMigrationConfig[];
  outputRoot: string;
  assetTracking?: AssetTrackingOptions;
}

export async function generateTableTaxonomies(
  options: GenerateTaxonomyOptions
): Promise<void> {
  const { tables, outputRoot } = options;
  const tracker = await createAssetTracker(options.assetTracking);
  const initTaxonomyFns = new Set<string>();

  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tablesByModel.set(model, table);
    }
  }

  for (const table of tables) {
    const taxonomies = table.taxonomies ?? [];
    if (taxonomies.length === 0) continue;

    const tableModel = table.table?.model ?? sanitizeCamel(table.name);
    const tableLabel = toPascalCase(table.name || tableModel);

    const edgeStatements: string[] = [];
    const functionBlocks: string[] = [];
    const tableStatements: string[] = [];
    const definedTables = new Set<string>();

    for (const taxonomy of taxonomies) {
      const cfg = normalizeTaxonomyConfig(taxonomy, tableModel, tableLabel);

      initTaxonomyFns.add(cfg.functions.createTaxonomy);
      edgeStatements.push(...buildTaxonomyEdges(cfg));
      functionBlocks.push(buildCreateTaxonomyFunction(cfg));
      if (cfg.generateNamedFunctions) {
        functionBlocks.push(buildAddTermFunction(cfg));
        functionBlocks.push(buildRemoveTermFunction(cfg));
        functionBlocks.push(buildAttachTermFunction(cfg));
        functionBlocks.push(buildDetachTermFunction(cfg));
        functionBlocks.push(buildGetModelTermsFunction(cfg));
        functionBlocks.push(buildGetTableTermsFunction(cfg));
      }

      for (const model of [cfg.taxonomyModel, cfg.termModel]) {
        if (!model || definedTables.has(model)) continue;
        definedTables.add(model);
        tableStatements.push(
          `DEFINE TABLE OVERWRITE ${model} TYPE NORMAL SCHEMALESS PERMISSIONS FULL;`,
          ''
        );
      }
    }

    const dir = getTableAssetDir(table, tablesByModel, outputRoot);
    await mkdir(dir, { recursive: true });

    if (edgeStatements.length > 0) {
      const edgePath = path.join(dir, `L_${tableModel}TaxonomyEdges.surql`);
      await writeGeneratedAsset({
        filePath: edgePath,
        content: edgeStatements.join('\n'),
        tracker,
        meta: {
          source: 'generated',
          layer: 'edges',
          table: tableModel,
        },
      });
      console.log(`🧬 Generated taxonomy edges: ${path.relative(process.cwd(), edgePath)}`);
    }

    if (functionBlocks.length > 0) {
      const fnPath = path.join(dir, `F_${tableModel}Taxonomies.surql`);
      await writeGeneratedAsset({
        filePath: fnPath,
        content: functionBlocks.join('\n\n'),
        tracker,
        meta: {
          source: 'generated',
          layer: 'functions',
          table: tableModel,
        },
      });
      console.log(`🧬 Generated taxonomy functions: ${path.relative(process.cwd(), fnPath)}`);
    }

    if (tableStatements.length > 0) {
      const tablePath = path.join(dir, `T_${tableModel}TaxonomyTables.surql`);
      await writeGeneratedAsset({
        filePath: tablePath,
        content: tableStatements.join('\n'),
        tracker,
        meta: {
          source: 'generated',
          layer: 'tables',
          table: tableModel,
        },
      });
      console.log(`🧬 Generated taxonomy tables: ${path.relative(process.cwd(), tablePath)}`);
    }
  }

  {
    const projectRoot = options.assetTracking?.projectRoot ?? process.cwd();
    const initPath = path.resolve(
      projectRoot,
      'config',
      'bootstrap',
      'functions',
      'utility',
      'initTaxonomies.surql'
    );
    await mkdir(path.dirname(initPath), { recursive: true });
    const initLines = [
      'DEFINE FUNCTION OVERWRITE fn::initTaxonomies() {',
      '',
      ...Array.from(initTaxonomyFns)
        .sort()
        .map((fnName) => `\tfn::${fnName}({});`),
      '',
      '\treturn true;',
      '',
      '};',
    ];
    await writeGeneratedAsset({
      filePath: initPath,
      content: initLines.join('\n'),
      tracker,
      meta: {
        source: 'generated',
        layer: 'functions',
        table: 'bootstrap',
      },
    });
    console.log(`🧬 Generated taxonomy init function: ${path.relative(process.cwd(), initPath)}`);
  }
}

interface NormalizedTaxonomy {
  key: string;
  tableModel: string;
  tableLabel: string;
  labels: {
    singular: string;
    plural: string;
  };
  taxonomyModel: string;
  termModel: string;
  taxonomyId: string;
  termId: string;
  hierarchical: boolean;
  cardinality: 'one' | 'many';
  storeOnModel: boolean;
  createOnAttach: boolean;
  generateNamedFunctions: boolean;
  payloadField: string;
  payloadAliases: string[];
  required: boolean;
  processor: 'functions' | 'events' | 'none';
  hooks: {
    postAttach: string[];
    postDetach: string[];
  };
  taxonomyDefaults: Record<string, unknown>;
  termDefaults: Record<string, unknown>;
  edges: {
    taxonomyToTerms: string;
    recordToTerm: string;
  };
  functions: {
    createTaxonomy: string;
    addTerm: string;
    removeTerm: string;
    attachTerm: string;
    detachTerm: string;
    getModelTerms: string;
    getTableTerms: string;
  };
}

function normalizeTaxonomyConfig(
  taxonomy: TableTaxonomyConfig,
  tableModel: string,
  tableLabel: string
): NormalizedTaxonomy {
  const key = taxonomy.key;
  const labelSingular = taxonomy.labels?.singular ?? toPascalCase(key);
  const labelPlural = taxonomy.labels?.plural ?? `${labelSingular}s`;
  const permalink = taxonomy.permalink ?? taxonomy.slug ?? key.toLowerCase();
  const hierarchical = taxonomy.hierarchical ?? false;
  const cardinalityRaw = String(taxonomy.cardinality ?? 'many').toLowerCase();
  const cardinality = cardinalityRaw === 'one' || cardinalityRaw === 'single' ? 'one' : 'many';
  const storeOnModel = typeof taxonomy.storeOnModel === 'boolean' ? taxonomy.storeOnModel : true;
  const createOnAttach =
    typeof taxonomy.createOnAttach === 'boolean' ? taxonomy.createOnAttach : true;
  const functionOverrides =
    taxonomy.functions && typeof taxonomy.functions === 'object' ? taxonomy.functions : undefined;
  const generateNamedFunctions =
    typeof taxonomy.generateNamedFunctions === 'boolean'
      ? taxonomy.generateNamedFunctions
      : typeof taxonomy.functions === 'boolean'
        ? taxonomy.functions
        : Boolean(functionOverrides);
  const required = typeof taxonomy.required === 'boolean' ? taxonomy.required : false;
  const processorRaw = String(taxonomy.processor ?? 'functions').toLowerCase();
  const processor =
    processorRaw === 'events' || processorRaw === 'none' ? processorRaw : 'functions';

  const taxonomyModel = taxonomy.taxonomy?.model ?? 'tax';
  const termModel =
    taxonomy.term?.model ?? buildDefaultTermModel(tableModel, key);

  const taxonomyId =
    taxonomy.taxonomy?.id ?? `stringID<${tableModel}, ${key}>`;
  const termId = normalizeTermId(
    taxonomy.term?.id ?? `<field:key>`,
    tableModel,
    key
  );

  const taxonomyDefaults = {
    key,
    label: labelSingular,
    labelPlural,
    permalink,
    description: '',
    hierarchical,
    ...extractFieldDefaults(taxonomy.taxonomy?.fields ?? []),
  };

  const termDefaults = {
    key: '',
    label: '',
    permalink: '',
    description: '',
    ...(hierarchical ? { parent: '' } : {}),
    ...extractFieldDefaults(taxonomy.term?.fields ?? []),
  };

  const prefix = `${tableLabel}${toPascalCase(key)}`;
  const payloadField =
    taxonomy.payloadField ??
    (cardinality === 'one' ? key : `${key}s`);
  const payloadAliases = normalizePayloadAliases(
    taxonomy.payloadAliases,
    taxonomy.payloadAlias,
    payloadField
  );
  const functions = {
    createTaxonomy:
      functionOverrides?.createTaxonomy ?? `create${prefix}Taxonomy`,
    addTerm: functionOverrides?.addTerm ?? `add${prefix}Term`,
    removeTerm: functionOverrides?.removeTerm ?? `remove${prefix}Term`,
    attachTerm: functionOverrides?.attachTerm ?? `attach${prefix}Term`,
    detachTerm: functionOverrides?.detachTerm ?? `detach${prefix}Term`,
    getModelTerms: functionOverrides?.getModelTerms ?? `get${prefix}Terms`,
    getTableTerms: functionOverrides?.getTableTerms ?? `get${prefix}s`,
  };

  const edges = {
    taxonomyToTerms:
      taxonomy.edges?.taxonomyToTerms ?? `${tableLabel}${toPascalCase(key)}Terms`,
    recordToTerm:
      taxonomy.edges?.recordToTerm ?? `${tableLabel}${toPascalCase(key)}s`,
  };

  return {
    key,
    tableModel,
    tableLabel,
    labels: {
      singular: labelSingular,
      plural: labelPlural,
    },
    taxonomyModel,
    termModel,
    taxonomyId,
    termId,
    hierarchical,
    cardinality,
    storeOnModel,
    createOnAttach,
    generateNamedFunctions,
    payloadField,
    payloadAliases,
    required,
    processor,
    hooks: {
      postAttach: taxonomy.hooks?.postAttach ?? [],
      postDetach: taxonomy.hooks?.postDetach ?? [],
    },
    taxonomyDefaults,
    termDefaults,
    edges,
    functions,
  };
}

function buildTaxonomyEdges(cfg: NormalizedTaxonomy): string[] {
  const edges: NormalizedEdge[] = [
    {
      table: cfg.edges.taxonomyToTerms,
      inModel: cfg.taxonomyModel,
      outModel: cfg.termModel,
      unique: true,
      allowAnyIn: false,
      allowAnyOut: false,
    },
    {
      table: cfg.edges.recordToTerm,
      inModel: cfg.tableModel,
      outModel: cfg.termModel,
      unique: true,
      allowAnyIn: false,
      allowAnyOut: false,
    },
  ];

  return edges.flatMap((edge) => [...buildEdgeStatements(edge), '']);
}

function buildCreateTaxonomyFunction(cfg: NormalizedTaxonomy): string {
  const defaults = buildDefaultData(cfg.taxonomyDefaults, '\t\t');
  const taxonomyRid = buildRecordIdExpression(cfg.taxonomyModel, cfg.taxonomyId, '$payload');
  const registryLines = buildTaxonomyRegistryLines(cfg);

  return [
    `DEFINE FUNCTION OVERWRITE fn::${cfg.functions.createTaxonomy}($payload: option<object>) {`,
    '',
    `\tlet $payloadInput = if type::is_object($payload) {`,
    `\t\t$payload`,
    `\t} else {`,
    `\t\t{}`,
    `\t};`,
    '',
    `\tlet $defaultData = {`,
    defaults,
    `\t};`,
    '',
    `\tlet $payload = fn::objectAssign($defaultData, $payloadInput);`,
    '',
    `\tif !$payload.permalink || $payload.permalink == "" {`,
    `\t\tlet $payload = fn::objectAssign($payload, { permalink: string::slug($payload.key) });`,
    `\t} else {`,
    `\t\tlet $payload = fn::objectAssign($payload, { permalink: string::slug($payload.permalink) });`,
    `\t};`,
    '',
    `\tlet $RID = ${taxonomyRid};`,
    `\tlet $record = upsert $RID merge $payload;`,
    `\tlet $record = if type::is_array($record) { array::first($record) } else { $record };`,
    ...registryLines,
    `\treturn $record;`,
    '',
    `};`,
  ].join('\n');
}

function buildTaxonomyRegistryLines(cfg: NormalizedTaxonomy): string[] {
  const aliasList =
    cfg.payloadAliases.length > 0
      ? `[${cfg.payloadAliases.map((alias) => `"${alias}"`).join(', ')}]`
      : '[]';
  const taxonomyDefaults = serializeSurrealLiteral(cfg.taxonomyDefaults);
  const termDefaults = serializeSurrealLiteral(cfg.termDefaults);
  const registryPayload = [
    `\tlet $registryPayload = {`,
    `\t\tkey: "${cfg.key}",`,
    `\t\tlabels: { singular: "${cfg.labels.singular}", plural: "${cfg.labels.plural}" },`,
    `\t\tmodel: "${cfg.tableModel}",`,
    `\t\ttaxonomyModel: "${cfg.taxonomyModel}",`,
    `\t\ttermModel: "${cfg.termModel}",`,
    `\t\ttaxonomyRid: $RID,`,
    `\t\ttaxonomyIdSpec: "${cfg.taxonomyId.replace(/"/g, '\\"')}",`,
    `\t\ttermIdSpec: "${cfg.termId.replace(/"/g, '\\"')}",`,
    `\t\tedgeRecordToTerm: "${cfg.edges.recordToTerm}",`,
    `\t\tedgeTaxonomyToTerm: "${cfg.edges.taxonomyToTerms}",`,
    `\t\tcardinality: "${cfg.cardinality}",`,
    `\t\tstoreOnModel: ${cfg.storeOnModel ? 'true' : 'false'},`,
    `\t\tcreateOnAttach: ${cfg.createOnAttach ? 'true' : 'false'},`,
    `\t\tgenerateNamedFunctions: ${cfg.generateNamedFunctions ? 'true' : 'false'},`,
    `\t\tpayloadField: "${cfg.payloadField}",`,
    `\t\tpayloadAliases: ${aliasList},`,
    `\t\trequired: ${cfg.required ? 'true' : 'false'},`,
    `\t\tprocessor: "${cfg.processor}",`,
    `\t\thierarchical: ${cfg.hierarchical ? 'true' : 'false'},`,
    `\t\ttaxonomyDefaults: ${taxonomyDefaults},`,
    `\t\ttermDefaults: ${termDefaults},`,
    `\t};`,
    '',
  ];

  return [
    '',
    ...registryPayload,
    `\tlet $APP_ID = type::record("app", "taxonomies");`,
    `\tlet $app = (select * from $APP_ID)[0] ?? {};`,
    `\tlet $modelEntry = $app["${cfg.tableModel}"] ?? {};`,
    `\tlet $taxMap = $modelEntry.taxonomies ?? {};`,
    `\tlet $taxMap = fn::objectAssign($taxMap, { "${cfg.key}": $registryPayload });`,
    `\tlet $modelEntry = fn::objectAssign($modelEntry, { taxonomies: $taxMap });`,
    `\tupsert $APP_ID set ${cfg.tableModel} = $modelEntry;`,
    '',
  ];
}

function buildAddTermFunction(cfg: NormalizedTaxonomy): string {
  return [
    `DEFINE FUNCTION OVERWRITE fn::${cfg.functions.addTerm}($payload: any) {`,
    `\treturn fn::createTerm("${cfg.tableModel}", "${cfg.key}", $payload);`,
    `};`,
  ].join('\n');
}

function buildRemoveTermFunction(cfg: NormalizedTaxonomy): string {
  return [
    `DEFINE FUNCTION OVERWRITE fn::${cfg.functions.removeTerm}($term: any) {`,
    `\treturn fn::removeTerm("${cfg.tableModel}", "${cfg.key}", $term);`,
    `};`,
  ].join('\n');
}

function buildAttachTermFunction(cfg: NormalizedTaxonomy): string {
  return [
    `DEFINE FUNCTION OVERWRITE fn::${cfg.functions.attachTerm}($RID: any, $term: any, $options: option<object>) {`,
    `\treturn fn::attachTerm("${cfg.tableModel}", "${cfg.key}", $RID, $term, $options);`,
    `};`,
  ].join('\n');
}

function buildDetachTermFunction(cfg: NormalizedTaxonomy): string {
  return [
    `DEFINE FUNCTION OVERWRITE fn::${cfg.functions.detachTerm}($RID: any, $term: any, $options: option<object>) {`,
    `\treturn fn::detachTerm("${cfg.tableModel}", "${cfg.key}", $RID, $term, $options);`,
    `};`,
  ].join('\n');
}

function replaceHookTokens(line: string): string {
  return line
    .replace(/<TERM_ID>/g, '$TERM_ID')
    .replace(/<RECORD_ID>/g, '$RID')
    .replace(/<RID>/g, '$RID');
}

function buildGetModelTermsFunction(cfg: NormalizedTaxonomy): string {
  return [
    `DEFINE FUNCTION OVERWRITE fn::${cfg.functions.getModelTerms}() {`,
    `\treturn fn::getTerms("${cfg.tableModel}", "${cfg.key}");`,
    `};`,
  ].join('\n');
}

function buildGetTableTermsFunction(cfg: NormalizedTaxonomy): string {
  return [
    `DEFINE FUNCTION OVERWRITE fn::${cfg.functions.getTableTerms}($RID: any) {`,
    `\treturn fn::getRecordTerms("${cfg.tableModel}", "${cfg.key}", $RID);`,
    `};`,
  ].join('\n');
}

function extractFieldDefaults(
  fields: Array<Record<string, any> | string>
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const entry of fields) {
    if (!entry) continue;
    if (typeof entry === 'string') {
      defaults[entry] = '';
      continue;
    }
    if (typeof entry === 'object') {
      for (const [key, value] of Object.entries(entry)) {
        if (isFieldMeta(value)) {
          if ('default' in (value as any)) {
            defaults[key] = (value as any).default;
          }
          continue;
        }
        if (typeof value === 'string' && isTypeTag(value)) {
          continue;
        }
        defaults[key] = value as unknown;
      }
    }
  }
  return defaults;
}

function isFieldMeta(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const meta = value as Record<string, unknown>;
  return (
    'type' in meta ||
    'required' in meta ||
    'nullable' in meta ||
    'default' in meta ||
    'items' in meta ||
    'options' in meta ||
    'assign' in meta ||
    'fields' in meta ||
    'description' in meta
  );
}

function isTypeTag(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('<') && trimmed.endsWith('>');
}

function buildDefaultData(defaults: Record<string, unknown>, indent: string): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(defaults)) {
    lines.push(`${indent}${key}: ${serializeSurrealLiteral(value)},`);
  }
  return lines.join('\n');
}

function serializeSurrealLiteral(value: unknown): string {
  if (typeof value === 'string') {
    if (looksLikeSurrealExpression(value)) return value;
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null || value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => serializeSurrealLiteral(item)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const lines = ['{'];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      lines.push(`  ${k}: ${serializeSurrealLiteral(v)},`);
    }
    lines.push('}');
    return lines.join('\n');
  }
  return 'null';
}

function looksLikeSurrealExpression(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (/^\[.*\]$/.test(trimmed) && /select\s+/i.test(trimmed)) return true;
  const namespaceCallPattern = /^(?:[a-z_][\w]*::)+[a-z_][\w]*(?:\([^]*\))?$/i;
  return namespaceCallPattern.test(trimmed);
}

function buildRecordIdExpression(
  model: string,
  structure: string,
  payloadVar: string
): string {
  const rawFieldMatch = structure.match(/<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>/i);
  if (rawFieldMatch && rawFieldMatch[1]) {
    return `type::record('${model}', ${payloadVar}.${rawFieldMatch[1].trim()})`;
  }
  const normalized = normalizeIdToken(structure);
  const stringId = parseStringIdSpec(normalized);
  if (stringId) {
    const args = stringId.args.map((token) => resolveIdToken(token, payloadVar));
    return `type::record('${model}', fn::stringID([${args.join(', ')}]))`;
  }

  const fieldMatch = normalized.match(/^<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>$/i);
  if (fieldMatch && fieldMatch[1]) {
    return `type::record('${model}', ${payloadVar}.${fieldMatch[1].trim()})`;
  }

  return `type::record('${model}', ${resolveIdToken(normalized, payloadVar)})`;
}

function normalizeTermId(termId: string, tableModel: string, taxonomyKey: string): string {
  const trimmed = termId.trim();
  const stringId = parseStringIdSpec(trimmed);
  if (stringId && stringId.fn === 'stringID' && stringId.args.length === 3) {
    const [a, b, c] = stringId.args;
    const fieldKeyMatch = /^<\s*field\s*:\s*key\s*>$/i.test(c);
    if (a === tableModel && b === taxonomyKey && fieldKeyMatch) {
      return `<field:key>`;
    }
  }
  return termId;
}

function normalizePayloadAliases(
  payloadAliases: TableTaxonomyConfig['payloadAliases'],
  payloadAlias: TableTaxonomyConfig['payloadAlias'],
  payloadField: string
): string[] {
  const aliases: string[] = [];
  if (Array.isArray(payloadAliases)) {
    for (const alias of payloadAliases) {
      if (typeof alias === 'string' && alias.trim()) {
        aliases.push(alias.trim());
      }
    }
  } else if (typeof payloadAliases === 'string' && payloadAliases.trim()) {
    aliases.push(payloadAliases.trim());
  }
  if (typeof payloadAlias === 'string' && payloadAlias.trim()) {
    aliases.push(payloadAlias.trim());
  }
  return Array.from(new Set(aliases.filter((alias) => alias !== payloadField)));
}

function parseStringIdSpec(value: string): { fn: 'stringID' | 'stringRIDs'; args: string[] } | null {
  const match = value.match(/^(stringID|stringRIDs)\s*<(.+)>$/i);
  if (!match || !match[1] || !match[2]) return null;
  const fn = match[1].toLowerCase() === 'stringrids' ? 'stringRIDs' : 'stringID';
  const args = match[2]
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return { fn, args };
}

function normalizeIdToken(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1).trim();
    const fieldMatch = inner.match(/^<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>$/i);
    if (fieldMatch) return inner;
    const stringId = parseStringIdSpec(inner);
    if (stringId) return inner;
  }
  return trimmed;
}

function resolveIdToken(token: string, payloadVar: string): string {
  const trimmed = token.trim();
  const fieldMatch = trimmed.match(/<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>/i);
  if (fieldMatch && fieldMatch[1]) {
    return `${payloadVar}.${fieldMatch[1].trim()}`;
  }
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed;
  }
  return JSON.stringify(trimmed);
}

function sanitizeCamel(value: string | undefined): string {
  if (!value) return 'table';
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part.toLowerCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('') || 'table';
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function buildDefaultTermModel(tableModel: string, taxonomyKey: string): string {
  const safeTable = sanitizeIdentifier(tableModel);
  const safeKey = sanitizeIdentifier(taxonomyKey);
  const parts = ['t', safeTable, safeKey].filter(Boolean);
  return parts.length > 0 ? parts.join('_') : 'term';
}

function sanitizeIdentifier(value: string): string {
  const sanitized = value
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized.length > 0 ? sanitized.toLowerCase() : '';
}
