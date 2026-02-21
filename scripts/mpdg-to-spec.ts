/**
 * Experimental parser: MPDG shorthand -> table spec YAMLs.
 *
 * Usage:
 *   pnpm exec tsx scripts/mpdg-to-spec.ts
 *     [--input config/graph.mpdg]
 *     [--out config/specs_stage]
 *     [--mode staging|live]
 *     [--force|--overwrite]
 *     [--only-new]
 *     [--conflict skip|overwrite|only-new]
 *
 * Status: MVP – covers fields, id, crud, router, views, edges, subtables (basic), indexes (unique/index/fulltext/count), flags.
 * Not yet: events, delete cascade, post payloads, advanced field nesting, hooks.
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import * as YAML from 'yaml';
import { fileURLToPath } from 'url';

type CapFlag = {
  crud?: string; // letters
  crudSlug?: string;
  crudOptions?: Record<string, any>;
  router?: { parent?: string; name?: string; embed?: boolean };
  routerEndpoints?: Array<string | Record<string, any>>;
  views?: string[]; // legacy simple list
  rawViews?: string; // new rich views syntax
  rawTaxonomies?: string;
  rawRelations?: string;
  rawTypesense?: string;
  instance?: boolean;
  instanceMode?: 'local' | 'remote';
  post?: boolean;
  refreshViews?: boolean;
  moduleOptions?: Record<string, any>;
  moduleTarget?: string;
};

type FieldTag =
  | { kind: 'unique' }
  | { kind: 'index' }
  | { kind: 'count' }
  | { kind: 'fulltext'; analyzer?: string; bm25?: { k1?: number; b?: number }; highlights?: boolean }
  | { kind: 'comment'; text: string };

export type FieldDef = {
  name: string;
  required: boolean;
  nullable: boolean;
  ignorePayload?: boolean;
  defaultValue?: any;
  type?: string;
  options?: Record<string, any>;
  assign?: boolean;
  tags: FieldTag[];
  children?: FieldDef[];
  isId?: boolean;
  idKind?: 'field' | 'default' | 'parent' | 'template';
  idSource?: string;
  idTemplate?: string;
  parentModel?: string;
};

export type EdgeDir = 'has' | 'belongs';
export type EdgeDef = { dir: EdgeDir; table: string; in: string; out: string; unique?: boolean; comment?: string };

export type SubTableStub = {
  label: string;
  model: string;
  description?: string;
  fields: FieldDef[];
  options?: Record<string, any>;
  tableType?: 'subsingle' | 'submany';
  caps?: CapFlag;
  edges?: EdgeDef[];
  subTables?: SubTableStub[];
};

export type TableAst = {
  label: string;
  model: string;
  parentModel?: string;
  tableType?: 'primary' | 'subsingle' | 'submany';
  description?: string;
  fields: FieldDef[];
  caps: CapFlag;
  edges: EdgeDef[];
  subTables: SubTableStub[];
};

const args = process.argv.slice(2);
const inputFlag = flagVal('--input');
const outFlag = flagVal('--out');
const modeFlag = flagVal('--mode');
const conflictFlag = flagVal('--conflict');
const forceFlag = flagBool('--force') || flagBool('--overwrite');
const onlyNewFlag = flagBool('--only-new');
const pruneFlag = flagBool('--prune');
const noPruneFlag = flagBool('--no-prune');
const strictFlag = flagBool('--strict');

const APP_CONFIG_PATH = path.resolve(process.cwd(), 'config/app.config.yaml');
const appConfig = loadAppConfig(APP_CONFIG_PATH);
const graphCfg = appConfig?.graph ?? {};
const graphSpecCfg = graphCfg.spec ?? {};

const resolvedMode = (modeFlag ?? graphSpecCfg.mode ?? 'staging').toLowerCase();
let conflictPolicy =
  (conflictFlag as 'skip' | 'overwrite' | 'only-new' | undefined) ??
  (graphSpecCfg.conflictPolicy as string | undefined) ??
  'skip';
if (onlyNewFlag) conflictPolicy = 'only-new';
if (forceFlag) conflictPolicy = 'overwrite';

const overwrite = conflictPolicy === 'overwrite';
const onlyNew = conflictPolicy === 'only-new';
const pruneStale =
  noPruneFlag
    ? false
    : pruneFlag
      ? true
      : graphSpecCfg.pruneStale !== undefined
        ? Boolean(graphSpecCfg.pruneStale)
        : true;

const defaultOut =
  resolvedMode === 'live'
    ? graphSpecCfg.liveDir ?? 'config/specs'
    : graphSpecCfg.stagingDir ?? 'config/specs_stage';

const INPUT = path.resolve(process.cwd(), inputFlag ?? graphCfg.input ?? 'config/graph.mpdg');
const OUT = path.resolve(process.cwd(), outFlag ?? defaultOut);
const MODULES_ROOT = appConfig?.paths?.modules
  ? path.resolve(process.cwd(), appConfig.paths.modules)
  : path.resolve(process.cwd(), 'config/bootstrap/modules');
const MODULE_SPECS_OVERRIDE_DIR = 'specs_overrides';

console.log(
  `🧭 mpdg-to-spec mode=${resolvedMode}, out=${path.relative(process.cwd(), OUT)}, conflict=${conflictPolicy}`
);

const generatedTaxonomyTermTables = new Set<string>();

function normalizeModelName(raw: string): string {
  const trimmed = raw.trim();
  const cleaned = stripDollarPrefix(trimmed) ?? '';
  if (!cleaned) return cleaned;
  if (!/[_-]/.test(cleaned)) return cleaned;
  const parts = cleaned.split(/[_-]+/).filter(Boolean);
  if (parts.length === 0) return trimmed;
  const first = parts[0];
  const head = first.charAt(0).toLowerCase() + first.slice(1);
  const tail = parts.slice(1).map((part) => part.charAt(0).toUpperCase() + part.slice(1));
  return [head, ...tail].join('');
}

function normalizeRecordType(raw: string): string {
  const match = raw.trim().match(/^record<\s*([^>]+)\s*>$/i);
  if (!match || !match[1]) return raw;
  const model = normalizeModelName(match[1]);
  return `record<${model}>`;
}

async function main(): Promise<void> {
  const text = await fs.readFile(INPUT, 'utf8');
  const tables = parseFile(text);
  const audit = auditTables(tables);
  logAuditResults(audit);
  if (audit.errors.length > 0 && strictFlag) {
    console.error(`❌ MPDG audit failed with ${audit.errors.length} error(s).`);
    process.exit(1);
  }
  if (pruneStale) {
    const baseTables = tables.filter((table) => !table.caps.moduleTarget);
    await cleanupStaleSpecDirs(baseTables);
  }
  for (const table of tables) {
    const outRoot = resolveOutRoot(table);
    const groupDirName = table.caps.moduleTarget ? '' : buildGroupDirName(table);
    await writeTableTree(table, groupDirName, overwrite, onlyNew, outRoot);
  }
  console.log(`✅ Wrote ${tables.length} table spec${tables.length === 1 ? '' : 's'} to ${path.relative(process.cwd(), OUT)}`);
}

async function writeTableTree(
  table: TableAst,
  groupDirName: string,
  overwrite: boolean,
  onlyNew: boolean,
  outRoot: string
): Promise<void> {
  if (overwrite) {
    await cleanupStaleSpecFiles(table, groupDirName, outRoot);
  }
  await writeTable(table, groupDirName, overwrite, onlyNew, outRoot);
  if (!table.subTables || table.subTables.length === 0) return;
  await writeSubTableTree(table, groupDirName, overwrite, onlyNew, outRoot);
}

async function writeSubTableTree(
  parent: TableAst,
  groupDirName: string,
  overwrite: boolean,
  onlyNew: boolean,
  outRoot: string
): Promise<void> {
  for (const sub of parent.subTables) {
    const defaultCaps: CapFlag = {
      crud: 'CUD',
      router: { parent: parent.model, name: toCamel(sub.label || sub.model) },
    };
    const caps: CapFlag = {
      ...defaultCaps,
      ...(sub.caps ?? {}),
      router: {
        ...(defaultCaps.router ?? {}),
        ...(sub.caps?.router ?? {}),
      },
    };
    if (parent.caps.moduleTarget && !caps.moduleTarget) {
      caps.moduleTarget = parent.caps.moduleTarget;
    }

    const defaultEdges: EdgeDef[] = [
      { dir: 'belongs', table: toPascal(sub.label), in: parent.model, out: sub.model },
    ];
    const mergedEdges = [...defaultEdges, ...(sub.edges ?? [])];

    const subTableAst: TableAst = {
      label: sub.label,
      model: sub.model,
      parentModel: parent.model,
      tableType: sub.tableType ?? 'subsingle',
      description: sub.description,
      fields: sub.fields,
      caps,
      edges: mergedEdges,
      subTables: sub.subTables ?? [],
    };

    await writeTable(subTableAst, groupDirName, overwrite, onlyNew, outRoot);

    if (subTableAst.subTables.length > 0) {
      await writeSubTableTree(subTableAst, groupDirName, overwrite, onlyNew, outRoot);
    }
  }
}

async function cleanupStaleSpecFiles(
  table: TableAst,
  groupDirName: string,
  outRoot: string
): Promise<void> {
  const dir = path.join(outRoot, groupDirName);
  if (!(await fs.pathExists(dir))) {
    return;
  }

  const expected = collectExpectedSpecFiles(table, dir);
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    if (!/(\.primary|\.st|\.st\.many)\.yaml$/.test(entry)) {
      continue;
    }
    const fullPath = path.resolve(dir, entry);
    if (!expected.has(fullPath)) {
      await fs.remove(fullPath);
      console.log(`🧹 Removed stale ${path.relative(process.cwd(), fullPath)}`);
    }
  }
}

async function cleanupStaleSpecDirs(tables: TableAst[]): Promise<void> {
  if (!(await fs.pathExists(OUT))) return;
  const expected = new Set<string>(tables.map((table) => buildGroupDirName(table)));
  const entries = await fs.readdir(OUT, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    if (name.startsWith('.')) continue;
    if (!expected.has(name)) {
      const fullPath = path.resolve(OUT, name);
      await fs.remove(fullPath);
      console.log(`🧹 Removed stale ${path.relative(process.cwd(), fullPath)}`);
    }
  }
}

function collectExpectedSpecFiles(table: TableAst, dir: string): Set<string> {
  const expected = new Set<string>();
  const rootFile = resolveSpecFileName(table.model, table.tableType, table.parentModel);
  expected.add(path.resolve(dir, rootFile));

  const visitSubTables = (parentModel: string, subTables?: TableAst['subTables']): void => {
    if (!subTables || subTables.length === 0) return;
    for (const sub of subTables) {
      const tableType = sub.tableType ?? 'subsingle';
      const fileName = resolveSpecFileName(sub.model, tableType, parentModel);
      expected.add(path.resolve(dir, fileName));
      if (sub.subTables && sub.subTables.length > 0) {
        visitSubTables(sub.model, sub.subTables);
      }
    }
  };

  visitSubTables(table.model, table.subTables);
  return expected;
}

export function parseFile(text: string): TableAst[] {
  const lines = text.split(/\r?\n/);
  const chunks: string[] = [];
  let buf: string[] = [];

  // Track nesting so we only split tables at the top level. Subtables (declared inside
  // the connections block `(...)`) also match the header regex, so a depth-aware split
  // is required to keep them attached to their parent table.
  let nestingDepth = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('//')) continue;

    const looksLikeHeader = /^[^,\s].*,\s*\S+/.test(line);
    if (looksLikeHeader && buf.length > 0 && nestingDepth === 0) {
      chunks.push(buf.join('\n'));
      buf = [];
    }

    buf.push(line);

    // Update nesting after consuming the line so a header line with `{` still starts a chunk.
    const opens = (line.match(/[\{\[\(]/g) ?? []).length;
    const closes = (line.match(/[\}\]\)]/g) ?? []).length;
    nestingDepth = Math.max(0, nestingDepth + opens - closes);
  }

  if (buf.length) chunks.push(buf.join('\n'));
  return chunks.map(parseTableChunk);
}

type AuditIssue = {
  level: 'error' | 'warning';
  table?: string;
  field?: string;
  message: string;
  hint?: string;
};

type AuditReport = {
  errors: AuditIssue[];
  warnings: AuditIssue[];
};

function auditTables(tables: TableAst[]): AuditReport {
  const errors: AuditIssue[] = [];
  const warnings: AuditIssue[] = [];

  const tableModels = new Map<string, number>();
  const tableLabels = new Map<string, number>();

  tables.forEach((table) => {
    const modelKey = table.model.toLowerCase();
    tableModels.set(modelKey, (tableModels.get(modelKey) ?? 0) + 1);
    const labelKey = table.label.toLowerCase();
    tableLabels.set(labelKey, (tableLabels.get(labelKey) ?? 0) + 1);
  });

  tableModels.forEach((count, model) => {
    if (count > 1) {
      errors.push({
        level: 'error',
        table: model,
        message: `Duplicate table model "${model}" appears ${count} times.`,
      });
    }
  });

  tableLabels.forEach((count, label) => {
    if (count > 1) {
      warnings.push({
        level: 'warning',
        table: label,
        message: `Duplicate table label "${label}" appears ${count} times.`,
        hint: 'Consider unique labels for clarity in docs.',
      });
    }
  });

  tables.forEach((table) => auditTable(table, errors, warnings));

  return { errors, warnings };
}

function auditTable(table: TableAst, errors: AuditIssue[], warnings: AuditIssue[], parentPath?: string): void {
  const tablePath = parentPath ? `${parentPath}.${table.model}` : table.model;

  const allFieldNames = new Set<string>(table.fields.map((field) => field.name.toLowerCase()));
  const seenFields = new Set<string>();
  table.fields.forEach((field) => {
    const key = field.name.toLowerCase();
    if (seenFields.has(key)) {
      errors.push({
        level: 'error',
        table: tablePath,
        field: field.name,
        message: `Duplicate field "${field.name}" in ${tablePath}.`,
      });
    } else {
      seenFields.add(key);
    }

    if (field.required && field.ignorePayload) {
      warnings.push({
        level: 'warning',
        table: tablePath,
        field: field.name,
        message: `Field "${field.name}" is marked required and ignored in payload.`,
        hint: 'Use either "!" (required) or "?" (ignore payload), not both.',
      });
    }

    if (field.isId && field.idKind === 'field' && field.idSource) {
      const sourceKey = field.idSource.toLowerCase();
      const stringIdMatch = sourceKey.match(/^stringid<(.+)>$/i);
      if (stringIdMatch && stringIdMatch[1]) {
        const rawArgs = stringIdMatch[1]
          .split(',')
          .map((arg) => arg.trim().replace(/^\$/, '').toLowerCase())
          .filter(Boolean);
        rawArgs.forEach((arg) => {
          if (arg === 'parent') {
            if (!table.parentModel) {
              warnings.push({
                level: 'warning',
                table: tablePath,
                field: field.name,
                message: 'ID uses $parent but this table has no parent.',
              });
            }
            return;
          }
          if (!allFieldNames.has(arg)) {
            errors.push({
              level: 'error',
              table: tablePath,
              field: field.name,
              message: `ID field references "${arg}", but no matching field exists on ${tablePath}.`,
            });
          }
        });
      } else if (!allFieldNames.has(sourceKey)) {
        errors.push({
          level: 'error',
          table: tablePath,
          field: field.name,
          message: `ID field references "${field.idSource}", but no matching field exists on ${tablePath}.`,
        });
      }
    }

    if (field.isId && field.idKind === 'parent') {
      if (!table.parentModel) {
        warnings.push({
          level: 'warning',
          table: tablePath,
          field: field.name,
          message: 'ID field uses parent reference on a table without a parent.',
        });
      }
    }
  });

  if (table.caps.crud) {
    const letters = table.caps.crud.toUpperCase().split('');
    const invalid = letters.filter((letter) => !['C', 'U', 'D'].includes(letter));
    if (invalid.length) {
      warnings.push({
        level: 'warning',
        table: tablePath,
        message: `CRUD capability includes unknown letters: ${invalid.join(', ')}`,
        hint: 'Valid CRUD letters are C, U, D.',
      });
    }
  }

  if (table.subTables?.length) {
    const subtableModels = new Map<string, number>();
    table.subTables.forEach((sub) => {
      const key = sub.model.toLowerCase();
      subtableModels.set(key, (subtableModels.get(key) ?? 0) + 1);
    });
    subtableModels.forEach((count, model) => {
      if (count > 1) {
        errors.push({
          level: 'error',
          table: tablePath,
          message: `Duplicate subtable model "${model}" under ${tablePath}.`,
        });
      }
    });
  }

  if (table.caps.rawViews) {
    auditViewSelectors(table.caps.rawViews, tablePath, warnings);
  }

  table.subTables?.forEach((sub) => {
    const subTableAst: TableAst = {
      label: sub.label,
      model: sub.model,
      description: sub.description,
      fields: sub.fields,
      caps: sub.caps ?? {},
      edges: sub.edges ?? [],
      subTables: sub.subTables ?? [],
      parentModel: table.model,
      tableType: sub.tableType,
    };
    auditTable(subTableAst, errors, warnings, tablePath);
  });
}

function auditViewSelectors(rawViews: string, tablePath: string, warnings: AuditIssue[]): void {
  const entries = splitViewEntries(rawViews);
  entries.forEach((entry) => {
    const nameMatch = entry.match(/^([A-Za-z][A-Za-z0-9_]*)/);
    const viewName = nameMatch?.[1] ?? 'view';
    const bracketMatch = entry.match(/\[([\s\S]*?)\]/);
    if (!bracketMatch) return;
    const inner = bracketMatch[1];
    if (inner.trim().endsWith(',')) {
      warnings.push({
        level: 'warning',
        table: tablePath,
        message: `Trailing comma detected in view selector "${viewName}[...]".`,
        hint: 'Remove the dangling comma before the closing bracket.',
      });
    }
  });
}

function logAuditResults(report: AuditReport): void {
  if (report.errors.length === 0 && report.warnings.length === 0) {
    console.log('✅ MPDG audit: no issues detected.');
    return;
  }
  if (report.errors.length > 0) {
    console.error(`⛔ MPDG audit errors (${report.errors.length})`);
    report.errors.forEach((issue) => {
      const scope = issue.table ? `[${issue.table}${issue.field ? `.${issue.field}` : ''}]` : '';
      console.error(`  - ${scope} ${issue.message}`);
      if (issue.hint) console.error(`    ↳ ${issue.hint}`);
    });
  }
  if (report.warnings.length > 0) {
    console.warn(`⚠️ MPDG audit warnings (${report.warnings.length})`);
    report.warnings.forEach((issue) => {
      const scope = issue.table ? `[${issue.table}${issue.field ? `.${issue.field}` : ''}]` : '';
      console.warn(`  - ${scope} ${issue.message}`);
      if (issue.hint) console.warn(`    ↳ ${issue.hint}`);
    });
  }
}

export function parseTableChunk(block: string): TableAst {
  // Header: Label, model [| desc]
  const headerSection = block.split('{')[0] ?? block;
  const headerMatch = headerSection.match(/^([^{\[\(]+?),(.*)$/m);
  if (!headerMatch) throw new Error(`Cannot parse table header in block:\n${block}`);
  const label = headerMatch[1].trim();
  const headerRhs = headerMatch[2] ?? '';
  const headerBeforeBrace = headerRhs.split('{')[0].trim();
  const model = normalizeModelName(headerBeforeBrace.split('|')[0].trim());
  let description = headerBeforeBrace.includes('|')
    ? headerBeforeBrace.split('|').slice(1).join('|').trim()
    : undefined;
  if (description) {
    description = description.split('{')[0].split('\n')[0].trim();
  }

  // Extract blocks in order: fields { }, caps [ ], connections ( )
  const fieldsInfo = findEnclosure(block, '{', '}', block.indexOf('{'));
  const fieldsBlock = fieldsInfo?.inner ?? '';

  const capsStart = fieldsInfo ? block.indexOf('[', fieldsInfo.end) : -1;
  const capsInfo = capsStart !== -1 ? findEnclosure(block, '[', ']', capsStart) : null;
  const capsBlock = capsInfo?.inner ?? '';

  const connStartSearch = capsInfo ? capsInfo.end : (fieldsInfo ? fieldsInfo.end : 0);
  const connStart = block.indexOf('(', connStartSearch);
  const connInfo = connStart !== -1 ? findEnclosure(block, '(', ')', connStart) : null;
  const connBlock = connInfo?.inner ?? '';

  const fields = parseFields(fieldsBlock);
  const caps = parseCaps(capsBlock);
  const { edges, subTables } = parseConnections(connBlock);

  return { label, model, description, fields, caps, edges, subTables };
}

function matchEnclosure(text: string, open: string, close: string, occurrence: number): string {
  let count = 0;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === open) {
      depth += 1;
      if (depth === 1) count += 1;
      if (depth === 1 && count === occurrence) start = i + 1;
    } else if (ch === close) {
      if (depth === 1 && count === occurrence) {
        return text.slice(start, i).trim();
      }
      depth = Math.max(0, depth - 1);
    }
  }
  return '';
}

export function parseFields(body: string): FieldDef[] {
  const statements = splitFieldStatements(body);
  const fields: FieldDef[] = [];
  for (const statement of statements) {
    const line = statement.trim();
    if (!line) continue;
    if (line.startsWith('//')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const rawLhs = line.slice(0, colonIndex).trim();
    const rhsRaw = line.slice(colonIndex + 1).trim();

    let name = rawLhs;
    const required = rawLhs.endsWith('!');
    const ignorePayload = rawLhs.endsWith('?');
    const nullable = false;
    if (required || ignorePayload) {
      name = rawLhs.slice(0, -1).trim();
    }

    const isId = name === 'id';
    let idKind: FieldDef['idKind'];
    let idSource: string | undefined;
    let idTemplate: string | undefined;
    let parentModel: string | undefined;

    // Legacy id syntaxes (still supported):
    // - id: {parent u}
    // - id: {template `...`}
    // - id: default
    if (isId) {
      const plain = rhsRaw.replace(/,$/, '').trim();
      if (/^\{parent\s+.+\}$/i.test(plain)) {
        idKind = 'parent';
        parentModel = plain.replace(/^\{parent\s+|\}$/gi, '').trim();
      } else if (/^\{template\s+`.*`\}$/i.test(plain)) {
        idKind = 'template';
        idTemplate = plain.replace(/^\{template\s+`|`\}$/gi, '');
      } else if (/^default$/i.test(plain)) {
        idKind = 'default';
      }
    }

    const rhsTrimmed = rhsRaw.trim();
    if (rhsTrimmed.startsWith('{')) {
      const objInfo = findEnclosure(rhsRaw, '{', '}', rhsRaw.indexOf('{'));
      if (objInfo) {
        const children = parseFields(objInfo.inner);
        const rest = rhsRaw.slice(objInfo.end).trim().replace(/^,\s*/, '');
        const { tags: angleTags, remainder: legacyTagPart } = extractAngleTags(rest);
        const tagPrograms = angleTags.map(parseAngleProgram).filter(Boolean) as ParsedAngleProgram[];
        const legacyTags = parseTags(legacyTagPart);
        const primaryProgram = tagPrograms.find((t) => t.kind === 'type') as
          | Extract<ParsedAngleProgram, { kind: 'type' }>
          | undefined;
        const rawType = primaryProgram?.typeName;
        const resolvedType = normalizeProgramType(rawType) ?? 'object';
        const normalizedType = normalizeEnumLiteralType(resolvedType) ?? resolvedType;
        const options = normalizeProgramOptions(resolvedType, primaryProgram?.options);
        const assignFlag = tagPrograms.some((t) => t.kind === 'flag' && t.name === 'assign');

        fields.push({
          name,
          required,
          nullable,
          ignorePayload,
          defaultValue: undefined,
          type: normalizedType,
          ...(options ? { options } : {}),
          ...(assignFlag ? { assign: true } : {}),
          tags: legacyTags,
          children,
          isId,
          idKind,
          idSource,
          idTemplate,
          parentModel,
        });
        continue;
      }
    }

    const { defaultPart: rawDefaultPart, tagPart } = splitDefaultAndAngleTags(rhsRaw);
    const defaultPart = normalizeDefaultExpression(rawDefaultPart);
    const { tags: angleTags, remainder: legacyTagPart } = extractAngleTags(tagPart);
    const tagPrograms = angleTags.map(parseAngleProgram).filter(Boolean) as ParsedAngleProgram[];

    const defaultToken = defaultPart.replace(/,$/, '').trim();

    if (isId && !idKind) {
      const directRef = defaultToken.match(/^\$([a-zA-Z0-9_.]+)$/);
      if (directRef && directRef[1]) {
        const raw = directRef[1].trim();
        if (raw.toLowerCase() === 'parent') {
          idKind = 'parent';
        } else {
          idKind = 'field';
          idSource = raw;
        }
      } else if (/^S\s*\(/i.test(defaultToken)) {
        const sMatch = defaultToken.match(/^S\s*\((.*)\)$/i);
        if (sMatch && sMatch[1]) {
          const args = splitCommaTopLevel(sMatch[1])
            .map((part) => stripDollarPrefix(part))
            .map((part) => part?.trim() ?? '')
            .filter(Boolean);
          if (args.length > 0) {
            idKind = 'field';
            idSource = `stringID<${args.join(', ')}>`;
          }
        }
      } else {
        // Preferred new syntax: id: $email
        const fieldRef = tagPrograms.find((t) => t.kind === 'kv' && t.key === 'field') as
          | Extract<ParsedAngleProgram, { kind: 'kv' }>
          | undefined;

        if (fieldRef?.value) {
          const raw = stripDollarPrefix(fieldRef.value);
          if (raw?.toLowerCase() === 'parent') {
            idKind = 'parent';
          } else {
            idKind = 'field';
            idSource = raw;
          }
        } else {
          // Fallback: id: <email>
          const bare = tagPrograms.find((t) => t.kind === 'type') as
            | Extract<ParsedAngleProgram, { kind: 'type' }>
            | undefined;
          if (bare?.typeName) {
            const raw = stripDollarPrefix(bare.typeName);
            if (raw?.toLowerCase() === 'parent') {
              idKind = 'parent';
            } else {
              idKind = 'field';
              idSource = raw;
            }
          }
        }
      }
    }

    const inferredFromDefault = inferDefaultAndType(defaultToken.length > 0 ? defaultToken : undefined);
    const legacyTags = parseTags(legacyTagPart);

    // Determine field type + options from the first program tag.
    const primaryProgram = tagPrograms.find((t) => t.kind === 'type') as
      | Extract<ParsedAngleProgram, { kind: 'type' }>
      | undefined;

    const rawType = primaryProgram?.typeName;
    const resolvedType = normalizeProgramType(rawType) ?? inferredFromDefault.type ?? 'string';
    const normalizedType = normalizeEnumLiteralType(resolvedType) ?? resolvedType;
    const options = normalizeProgramOptions(resolvedType, primaryProgram?.options);
    const assignFlag = tagPrograms.some((t) => t.kind === 'flag' && t.name === 'assign');

    // Default/required behavior:
    // - If a field is "primitive required" (string/email/password) and the author used "" as a placeholder,
    //   emit required: true and omit default (to avoid defaulting required strings to "").
    // - Otherwise, keep inferred defaults.
    let finalDefault = inferredFromDefault.defaultValue;
    let finalRequired = required;

    // Do not auto-promote required based on placeholder defaults; use explicit `!`.

    // Program-generated IDs generally shouldn't default to "".
    if ((normalizedType.toLowerCase() === 'uniqueid' || normalizedType.toLowerCase() === 'md5' || normalizedType.toLowerCase() === 'uuid') && finalDefault === '') {
      finalDefault = undefined;
    }

    fields.push({
      name,
      required: finalRequired,
      nullable,
      ignorePayload,
      defaultValue: finalDefault,
      type: normalizedType,
      ...(options ? { options } : {}),
      ...(assignFlag ? { assign: true } : {}),
      tags: legacyTags,
      children: undefined,
      isId,
      idKind,
      idSource,
      idTemplate,
      parentModel,
    });
  }
  return fields;
}

function splitFieldStatements(body: string): string[] {
  const rawLines = body
    .split(/\r?\n/)
    .map((line) => stripInlineComment(line).trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('//'));

  const statements: string[] = [];
  let buffer: string[] = [];
  let braceDepth = 0;

  for (const rawLine of rawLines) {
    const line = rawLine.replace(/,\s*$/, '').trim();
    if (!line) continue;

    const delta = countBraceDelta(line);
    buffer.push(line);
    braceDepth += delta;

    if (braceDepth <= 0) {
      statements.push(buffer.join('\n'));
      buffer = [];
      braceDepth = 0;
    }
  }

  if (buffer.length > 0) {
    statements.push(buffer.join('\n'));
  }

  return statements;
}

function countBraceDelta(line: string): number {
  let delta = 0;
  let inString = false;
  let quoteChar: '"' | "'" | null = null;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string;
    const prev = i > 0 ? line[i - 1] : '';

    if ((ch === '"' || ch === "'") && prev !== '\\') {
      if (inString && quoteChar === ch) {
        inString = false;
        quoteChar = null;
      } else if (!inString) {
        inString = true;
        quoteChar = ch as '"' | "'";
      }
      continue;
    }

    if (inString) continue;
    if (ch === '{') delta += 1;
    if (ch === '}') delta -= 1;
  }

  return delta;
}

// Find an enclosure starting at or after fromIndex; returns inner text and end index (position after closing).
function findEnclosure(text: string, open: string, close: string, fromIndex: number): { inner: string; end: number } | null {
  let inString = false;
  let depth = 0;
  let start = -1;
  for (let i = fromIndex; i < text.length; i++) {
    const ch = text[i] as string;
    const prev = i > 0 ? text[i - 1] : '';

    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    }
    if (inString) continue;

    if (ch === open) {
      depth += 1;
      if (depth === 1) {
        start = i + 1;
      }
      continue;
    }
    if (ch === close) {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return { inner: text.slice(start, i).trim(), end: i + 1 };
      }
    }
  }
  return null;
}

function stripInlineComment(raw: string): string {
  let inString = false;
  for (let i = 0; i < raw.length - 1; i++) {
    const ch = raw[i] as string;
    const next = raw[i + 1] as string;
    const prev = i > 0 ? raw[i - 1] : '';
    if (ch === '"' && prev !== '\\') {
      inString = !inString;
      continue;
    }
    if (!inString && ch === '#') {
      return raw.slice(0, i).trimEnd();
    }
    if (!inString && ch === '/' && next === '/') {
      return raw.slice(0, i).trimEnd();
    }
  }
  return raw;
}

function extractAngleTags(input: string): { tags: string[]; remainder: string } {
  const tags: string[] = [];
  let remainder = '';
  let inString = false;
  let angleDepth = 0;
  let buf = '';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i] as string;
    const prev = i > 0 ? input[i - 1] : '';
    const next = i + 1 < input.length ? input[i + 1] : '';

    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    }

    if (!inString && ch === '<') {
      if (next !== '-') {
        if (angleDepth === 0) {
          buf = '';
        } else {
          buf += ch;
        }
        angleDepth += 1;
        continue;
      }
    }

    if (!inString && ch === '>') {
      if (prev !== '-' && angleDepth > 0) {
        angleDepth = Math.max(0, angleDepth - 1);
        if (angleDepth === 0) {
          tags.push(buf.trim());
          buf = '';
        } else {
          buf += ch;
        }
        continue;
      }
    }

    if (angleDepth > 0) {
      buf += ch;
      continue;
    }

    remainder += ch;
  }

  return { tags, remainder };
}

function splitDefaultAndAngleTags(rhs: string): { defaultPart: string; tagPart: string } {
  const trimmed = rhs.trim();
  if (!trimmed) return { defaultPart: '', tagPart: '' };

  let inString = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i] as string;
    const prev = i > 0 ? trimmed[i - 1] : '';

    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    }
    if (inString) continue;

    if (ch === '{') braceDepth += 1;
    if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
    if (ch === '[') bracketDepth += 1;
    if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    if (ch === '(') parenDepth += 1;
    if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

    if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0 && ch === '<') {
      const defaultPart = trimmed.slice(0, i).trim().replace(/,\s*$/, '').trim();
      const tagPart = trimmed.slice(i).trim();
      return { defaultPart, tagPart };
    }
  }

  return { defaultPart: trimmed.replace(/,\s*$/, '').trim(), tagPart: '' };
}

type ParsedAngleProgram =
  | { kind: 'kv'; key: string; value: string }
  | { kind: 'type'; typeName: string; options?: Record<string, any> }
  | { kind: 'flag'; name: string };

function parseAngleProgram(raw: string): ParsedAngleProgram | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  const flagName = cleaned.toLowerCase();
  if (/^[a-zA-Z_][\w-]*$/.test(cleaned)) {
    if (flagName === 'assign') {
      return { kind: 'flag', name: flagName };
    }
  }

  // Support legacy `<record: role>` for now.
  const legacyRecord = cleaned.match(/^record\s*:\s*(.+)$/i);
  if (legacyRecord && legacyRecord[1]) {
    return { kind: 'type', typeName: `record<${legacyRecord[1].trim()}>` };
  }

  // Simple key:value tag (e.g. `<field: email>`).
  const kvMatch = cleaned.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.+)$/);
  if (kvMatch && kvMatch[1] && kvMatch[2]) {
    return { kind: 'kv', key: kvMatch[1].trim().toLowerCase(), value: kvMatch[2].trim() };
  }

  // Shorthand: `<uniqueId<$email>>` -> type program with options
  const shorthandMatch = cleaned.match(/^([a-zA-Z_][\w-]*)\s*<(.+)>$/);
  if (shorthandMatch && shorthandMatch[1] && shorthandMatch[2]) {
    const typeName = shorthandMatch[1].trim();
    const inner = shorthandMatch[2].trim();
    if (typeName.toLowerCase() === 'password') {
      return { kind: 'type', typeName: 'password', options: { hash: inner } };
    }
    if (typeName.toLowerCase() === 'uuid') {
      return { kind: 'type', typeName: 'uuid', options: { version: inner } };
    }
    let options: Record<string, any> | undefined;
    const innerKv = inner.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.+)$/);
    if (innerKv && innerKv[1] && innerKv[2]) {
      const key = innerKv[1].trim();
      const value = innerKv[2].trim();
      if (key.toLowerCase() === 'field') {
        options = { value: { field: value } };
      } else {
        options = { [key]: value };
      }
      return { kind: 'type', typeName, ...(options ? { options } : {}) };
    }
    if (inner.startsWith('$')) {
      const field = inner.slice(1).trim();
      if (field) {
        options = { value: { field } };
        return { kind: 'type', typeName, ...(options ? { options } : {}) };
      }
    }
    return { kind: 'type', typeName: `${typeName}<${inner}>` };
  }

  if (cleaned.includes('|') && !cleaned.includes('{')) {
    return { kind: 'type', typeName: cleaned };
  }

  // Program tag: `<typeName { ... }>` or `<typeName, { ... }>`
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (ch === ' ' || ch === '\t' || ch === ',' || ch === '{') break;
    i += 1;
  }
  const typeName = cleaned.slice(0, i).trim();
  let rest = cleaned.slice(i).trim();
  if (rest.startsWith(',')) {
    rest = rest.slice(1).trim();
  }

  let options: Record<string, any> | undefined;
  if (rest.startsWith('{')) {
    const parsed = parseJsObject(rest);
    options = parsed.value;
  }

  if (!typeName) return null;
  return { kind: 'type', typeName, ...(options ? { options } : {}) };
}

function normalizeProgramType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const val = raw.trim();
  if (!val) return undefined;
  if (val.toLowerCase().startsWith('record<')) {
    return normalizeRecordType(val);
  }
  return val;
}

function normalizeEnumLiteralType(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase().startsWith('enum<')) return null;
  if (!trimmed.includes('|')) return null;

  const parts = splitUnionParts(trimmed);
  if (parts.length < 2) return null;

  const allLiteral = parts.every((part) => isQuotedLiteral(part));
  if (!allLiteral) return null;

  return `enum<${parts.join(' | ')}>`;
}

function splitUnionParts(raw: string): string[] {
  const parts: string[] = [];
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

    if (!inString && ch === '|') {
      const trimmed = current.trim();
      if (trimmed.length > 0) parts.push(trimmed);
      current = '';
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) parts.push(trimmed);

  return parts;
}

function isQuotedLiteral(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.length < 2) return false;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'");
}

function normalizeProgramOptions(typeName: string, raw?: Record<string, any>): Record<string, any> | undefined {
  if (!raw) return undefined;

  const lowered = typeName.toLowerCase();

  if (lowered === 'password') {
    // `password` program currently maps `{type: argon2}` -> `options.hash: argon2`
    const hashType = raw.type ?? raw.hash;
    return { hash: normalizePasswordHash(hashType ?? 'argon2') };
  }

  if (lowered === 'uniqueid' || lowered === 'md5') {
    // `{ value: { field: email } }` -> `{ value: $email }`
    const value = normalizeOptionValue(raw.value);
    return value !== undefined ? { value } : undefined;
  }

  if (lowered === 'uuid') {
    const version = normalizeUuidVersion(raw.version ?? raw.v ?? raw.type);
    return version ? { version } : undefined;
  }

  // Default: keep as-is, but normalize `{field: x}` objects to `$x` references.
  const normalized: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    normalized[k] = normalizeOptionValue(v);
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeOptionValue(value: any): any {
  if (!value) return value;
  if (typeof value === 'string') {
    const fieldMatch = value.match(/^<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>$/i);
    if (fieldMatch && fieldMatch[1]) {
      return `$${fieldMatch[1].trim()}`;
    }
    return value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => normalizeOptionValue(v));
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === 'field' && typeof (value as any).field === 'string') {
    const rawField = String((value as any).field).trim();
    const field = rawField.startsWith('$') ? rawField.slice(1) : rawField;
    return `$${field}`;
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = normalizeOptionValue(v);
  }
  return out;
}

function normalizePasswordHash(value: string): string {
  const lowered = value.toLowerCase();
  if (lowered === 'argon') return 'argon2';
  if (lowered === 'argon2') return 'argon2';
  if (lowered === 'bcrypt') return 'bcrypt';
  return value;
}

function normalizeUuidVersion(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === '4' || raw === 'v4') return 'v4';
  if (raw === '7' || raw === 'v7') return 'v7';
  return raw;
}

type JsParseResult<T> = { value: T; rest: string };

function parseJsObject(raw: string): JsParseResult<Record<string, any>> {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) {
    return { value: {}, rest: trimmed };
  }
  const { value, index } = parseJsObjectInner(trimmed, 0);
  return { value, rest: trimmed.slice(index).trim() };
}

function parseJsObjectInner(source: string, startIndex: number): { value: Record<string, any>; index: number } {
  let index = startIndex;
  if (source[index] !== '{') throw new Error('Expected "{"');
  index += 1;
  const out: Record<string, any> = {};

  while (index < source.length) {
    index = skipJsWhitespace(source, index);
    if (source[index] === '}') {
      index += 1;
      break;
    }

    const keyParsed = parseJsIdentifier(source, index);
    const key = keyParsed.value;
    index = skipJsWhitespace(source, keyParsed.index);

    if (source[index] !== ':') {
      throw new Error('Expected ":" in object literal');
    }
    index += 1;

    index = skipJsWhitespace(source, index);
    const valParsed = parseJsValue(source, index);
    out[key] = valParsed.value;
    index = skipJsWhitespace(source, valParsed.index);

    if (source[index] === ',') {
      index += 1;
      continue;
    }
    if (source[index] === '}') {
      index += 1;
      break;
    }
  }

  return { value: out, index };
}

function parseJsValue(source: string, startIndex: number): { value: any; index: number } {
  const index = skipJsWhitespace(source, startIndex);
  const ch = source[index];
  if (ch === '{') {
    return parseJsObjectInner(source, index);
  }
  if (ch === '[') {
    return parseJsArray(source, index);
  }
  if (ch === '"') {
    return parseJsString(source, index);
  }
  return parseJsAtom(source, index);
}

function parseJsArray(source: string, startIndex: number): { value: any[]; index: number } {
  let index = startIndex;
  if (source[index] !== '[') throw new Error('Expected "["');
  index += 1;
  const out: any[] = [];

  while (index < source.length) {
    index = skipJsWhitespace(source, index);
    if (source[index] === ']') {
      index += 1;
      break;
    }

    const valParsed = parseJsValue(source, index);
    out.push(valParsed.value);
    index = skipJsWhitespace(source, valParsed.index);

    if (source[index] === ',') {
      index += 1;
      continue;
    }
    if (source[index] === ']') {
      index += 1;
      break;
    }
  }

  return { value: out, index };
}

function parseJsIdentifier(source: string, startIndex: number): { value: string; index: number } {
  let index = startIndex;
  let out = '';
  while (index < source.length) {
    const ch = source[index];
    if (!ch || !/[a-zA-Z0-9_\-]/.test(ch)) break;
    out += ch;
    index += 1;
  }
  if (!out) {
    throw new Error('Expected identifier');
  }
  return { value: out, index };
}

function parseJsString(source: string, startIndex: number): { value: string; index: number } {
  let index = startIndex;
  if (source[index] !== '"') throw new Error('Expected string');
  index += 1;
  let out = '';
  while (index < source.length) {
    const ch = source[index];
    if (ch === '"' && source[index - 1] !== '\\') {
      index += 1;
      break;
    }
    out += ch;
    index += 1;
  }
  return { value: out, index };
}

function parseJsAtom(source: string, startIndex: number): { value: any; index: number } {
  let index = startIndex;
  let out = '';
  while (index < source.length) {
    const ch = source[index];
    if (!ch || /[\s,}\]]/.test(ch)) break;
    out += ch;
    index += 1;
  }
  const trimmed = out.trim();
  if (trimmed === 'true') return { value: true, index };
  if (trimmed === 'false') return { value: false, index };
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return { value: Number(trimmed), index };
  return { value: trimmed, index };
}

function skipJsWhitespace(source: string, startIndex: number): number {
  let index = startIndex;
  while (index < source.length && /\s/.test(source[index] as string)) {
    index += 1;
  }
  return index;
}

function normalizeEdgeTableName(raw: string | undefined, table: TableAst): string {
  if (raw && raw.trim().length > 0 && raw.trim() !== '__SELF__') return raw.trim();
  // Default edge table name to the table's PascalCase label (no separators).
  return toPascal(table.label);
}

function inferDefaultAndType(valRaw?: string): { defaultValue: any; type?: string } {
  if (!valRaw) return { defaultValue: undefined, type: undefined };
  const val = normalizeDefaultExpression(valRaw).trim();
  if (val.startsWith('$')) {
    return { defaultValue: val, type: undefined };
  }
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return { defaultValue: val.slice(1, -1), type: 'string' };
  }
  if (looksLikeSurrealExpression(val)) {
    return { defaultValue: val, type: undefined };
  }
  if (val === '0' || val === '1') return { defaultValue: Number(val), type: 'number' };
  if (val === 'false' || val === 'true') return { defaultValue: val === 'true', type: 'boolean' };
  if (val === '[]') return { defaultValue: [], type: 'array' };
  if (val === '{}') return { defaultValue: {}, type: 'object' };
  if (val.startsWith('[') && val.endsWith(']')) {
    const parsed = tryParseJsonLiteral(val);
    if (parsed !== undefined) return { defaultValue: parsed, type: 'array' };
  }
  if (val.startsWith('{') && val.endsWith('}')) {
    const parsed = tryParseJsonLiteral(val);
    if (parsed !== undefined) return { defaultValue: parsed, type: 'object' };
  }
  if (val.startsWith('record<')) return { defaultValue: '', type: normalizeRecordType(val) };
  return { defaultValue: val, type: 'string' };
}

function looksLikeSurrealExpression(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const namespaceCallPattern = /^(?:[a-z_][\w]*::)+[a-z_][\w]*(?:\([^]*\))?$/i;
  return namespaceCallPattern.test(trimmed);
}

function tryParseJsonLiteral(raw: string): unknown | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    // Attempt to coerce simple single-quoted JSON-like literals.
    try {
      const normalized = raw.replace(/'/g, '"');
      return JSON.parse(normalized);
    } catch {
      return undefined;
    }
  }
}

function normalizeDefaultExpression(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  // Convert shorthand R(table, value) -> type::record("table", value)
  const recordPattern = /\bR\s*\(\s*([^,]+?)\s*,\s*([^)]+?)\s*\)/g;
  const normalized = trimmed.replace(recordPattern, (_match, tableRaw, valueRaw) => {
    const table = normalizeModelName(tableRaw.trim());
    const value = valueRaw.trim();
    const tableLiteral =
      (table.startsWith('"') && table.endsWith('"')) ||
      (table.startsWith("'") && table.endsWith("'"))
        ? table
        : `"${table}"`;
    return `type::record(${tableLiteral}, ${value})`;
  });

  const md5Normalized = normalized.replace(/(?<!::)\bmd5\s*\(/g, 'crypto::md5(');
  return normalizeFieldRefTokens(md5Normalized);
}

function normalizeFieldRefTokens(value: string): string {
  return value.replace(/<\s*field\s*:\s*([a-zA-Z0-9_.]+)\s*>/g, (_, field) => {
    return `$${field}`;
  });
}

function stripDollarPrefix(value: string | undefined): string | undefined {
  if (!value) return value;
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith('$') ? trimmed.slice(1) : trimmed;
}

function parseTags(tagPart: string): FieldTag[] {
  if (!tagPart) return [];
  const tokens = tagPart.split(/\s+/).filter(Boolean);
  const tags: FieldTag[] = [];
  for (const tok of tokens) {
    if (tok === 'unique') tags.push({ kind: 'unique' });
    else if (tok === 'index') tags.push({ kind: 'index' });
    else if (tok === 'count') tags.push({ kind: 'count' });
    else if (tok.startsWith('fulltext')) {
      const cfg: any = {};
      const inner = tok.match(/fulltext\((.*)\)/);
      if (inner && inner[1]) {
        inner[1].split(',').forEach((p) => {
          const [k, v] = p.split('=').map((s) => s.trim());
          if (k === 'analyzer') cfg.analyzer = v;
          if (k === 'bm25') {
            const [k1, b] = (v || '').split(':');
            cfg.bm25 = { k1: k1 ? Number(k1) : undefined, b: b ? Number(b) : undefined };
          }
          if (k === 'highlights') cfg.highlights = v !== 'false';
        });
      }
      tags.push({ kind: 'fulltext', ...cfg });
    } else if (tok.startsWith('comment(')) {
      const inner = tok.match(/comment\((.*)\)/);
      if (inner) tags.push({ kind: 'comment', text: inner[1].replace(/^"|"$/g, '') });
    }
  }
  return tags;
}

function parseCaps(body: string): CapFlag {
  const caps: CapFlag = {};
  const raw = body.trim();
  if (!raw) return caps;

  const rawLines = raw
    .split(/\r?\n/)
    .map((line) => stripInlineComment(line).trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('//'));

  const lines: Array<{ raw: string; trimmed: string }> = [];
  for (const rawLine of rawLines) {
    const rawTrimmed = rawLine.trim();
    const trimmed = rawTrimmed.replace(/,\s*$/, '').trim();
    if (!trimmed) continue;

    if (
      trimmed.startsWith('views:') ||
      trimmed === 'views' ||
      trimmed.startsWith('taxonomies:') ||
      trimmed === 'taxonomies' ||
      trimmed.startsWith('relations:') ||
      trimmed === 'relations' ||
      trimmed.startsWith('typesense:') ||
      trimmed === 'typesense' ||
      trimmed.startsWith('router:') ||
      trimmed.startsWith('mods:') ||
      trimmed.startsWith('modules:')
    ) {
      lines.push({ raw: rawTrimmed, trimmed });
      continue;
    }

    if (/[|{\(\[]/.test(trimmed)) {
      lines.push({ raw: rawTrimmed, trimmed });
      continue;
    }

    // Avoid splitting capability lines that contain inline tag syntax
    // (e.g. typesense "as" lines: instances: $instances, <array<string>> <facet>)
    if (trimmed.includes(':') && trimmed.includes('<')) {
      lines.push({ raw: rawTrimmed, trimmed });
      continue;
    }

    const parts = splitCommaTopLevel(trimmed);
    if (parts.length > 1) {
      parts
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => lines.push({ raw: part, trimmed: part }));
    } else {
      lines.push({ raw: rawTrimmed, trimmed });
    }
  }

  let viewBuffer: string[] = [];
  let viewsActive = false;
  let viewsFlagged = false;
  let taxonomyBuffer: string[] = [];
  let taxonomiesActive = false;
  let taxonomiesFlagged = false;
  let relationsBuffer: string[] = [];
  let relationsActive = false;
  let relationsFlagged = false;
  let typesenseBuffer: string[] = [];
  let typesenseActive = false;
  let typesenseFlagged = false;
  let crudBuffer: string[] = [];
  let crudActive = false;
  const flushViews = () => {
    if (!viewsFlagged && viewBuffer.length === 0) {
      return;
    }
    const joined = viewBuffer.join('\n').trim();
    caps.rawViews = joined;
    viewBuffer = [];
    viewsActive = false;
    viewsFlagged = false;
  };
  const flushTaxonomies = () => {
    if (!taxonomiesFlagged && taxonomyBuffer.length === 0) {
      return;
    }
    const joined = taxonomyBuffer.join('\n').trim();
    caps.rawTaxonomies = joined;
    taxonomyBuffer = [];
    taxonomiesActive = false;
    taxonomiesFlagged = false;
  };
  const flushRelations = () => {
    if (!relationsFlagged && relationsBuffer.length === 0) {
      return;
    }
    const joined = relationsBuffer.join('\n').trim();
    caps.rawRelations = joined;
    relationsBuffer = [];
    relationsActive = false;
    relationsFlagged = false;
  };
  const flushTypesense = () => {
    if (!typesenseFlagged && typesenseBuffer.length === 0) {
      return;
    }
    const joined = typesenseBuffer.join('\n').trim();
    caps.rawTypesense = joined;
    typesenseBuffer = [];
    typesenseActive = false;
    typesenseFlagged = false;
  };
  const flushCrud = () => {
    if (!crudActive && crudBuffer.length === 0) {
      return;
    }
    const joined = crudBuffer.join('\n').trim().replace(/,\s*$/, '');
    if (joined) {
      const parsed = splitCapSettings(joined);
      applyCrudCaps(caps, parsed.main, parsed.settings);
    }
    crudBuffer = [];
    crudActive = false;
  };

  // Support a "modules: [ ... ]" stanza. This is treated as flags for now.
  const modules = extractModulesList(raw);
  for (const mod of modules) {
    applyModuleFlag(caps, mod);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimmed;

    if (crudActive) {
      crudBuffer.push(lines[i].raw);
      const depth = getInlineDepth(crudBuffer.join('\n'));
      if (depth.brace > 0) {
        continue;
      }
      flushCrud();
      continue;
    }

    if (line.startsWith('crud')) {
      const depth = getInlineDepth(line);
      if (depth.brace > 0) {
        crudActive = true;
        crudBuffer = [lines[i].raw];
        continue;
      }
    }

    if (line === 'views') {
      flushTaxonomies();
      flushRelations();
      flushTypesense();
      flushViews();
      viewsActive = true;
      viewsFlagged = true;
      continue;
    }

    if (line.startsWith('views:')) {
      flushTaxonomies();
      flushRelations();
      flushTypesense();
      flushViews();
      viewsActive = true;
      viewsFlagged = true;
      const list = line.slice('views:'.length).trim().replace(/,\s*$/, '');
      if (list.length > 0) {
        viewBuffer.push(list);
      }
      continue;
    }

    if (line === 'taxonomies') {
      flushViews();
      flushRelations();
      flushTypesense();
      flushTaxonomies();
      taxonomiesActive = true;
      taxonomiesFlagged = true;
      continue;
    }

    if (line.startsWith('taxonomies:')) {
      flushViews();
      flushRelations();
      flushTypesense();
      flushTaxonomies();
      taxonomiesActive = true;
      taxonomiesFlagged = true;
      const list = line.slice('taxonomies:'.length).trim().replace(/,\s*$/, '');
      if (list.length > 0) {
        taxonomyBuffer.push(list);
      }
      continue;
    }

    if (line === 'relations') {
      flushViews();
      flushTaxonomies();
      flushTypesense();
      flushRelations();
      relationsActive = true;
      relationsFlagged = true;
      continue;
    }

    if (line.startsWith('relations:')) {
      flushViews();
      flushTaxonomies();
      flushTypesense();
      flushRelations();
      relationsActive = true;
      relationsFlagged = true;
      const list = line.slice('relations:'.length).trim().replace(/,\s*$/, '');
      if (list.length > 0) {
        relationsBuffer.push(list);
      }
      continue;
    }

    if (line === 'typesense') {
      flushViews();
      flushTaxonomies();
      flushRelations();
      flushTypesense();
      typesenseActive = true;
      typesenseFlagged = true;
      continue;
    }

    if (line.startsWith('typesense:')) {
      flushViews();
      flushTaxonomies();
      flushRelations();
      flushTypesense();
      typesenseActive = true;
      typesenseFlagged = true;
      const list = line.slice('typesense:'.length).trim().replace(/,\s*$/, '');
      if (list.length > 0) {
        typesenseBuffer.push(list);
      }
      continue;
    }

    const isCapLine =
      line === 'crud' ||
      line.startsWith('crud<') ||
      line.startsWith('crud(') ||
      line === 'router' ||
      line.startsWith('router:') ||
      line.startsWith('router(') ||
      line.startsWith('router<') ||
      line === 'module' ||
      line.startsWith('module:') ||
      line.startsWith('module<') ||
      line === 'instance' ||
      line.startsWith('instance:') ||
      line.startsWith('instance<') ||
      line === 'post' ||
      line.startsWith('post:') ||
      line.startsWith('post<') ||
      line === 'refreshViews' ||
      line.startsWith('refreshViews:') ||
      line === 'taxonomies' ||
      line.startsWith('taxonomies:') ||
      line === 'relations' ||
      line.startsWith('relations:') ||
      line === 'typesense' ||
      line.startsWith('typesense:') ||
      line.startsWith('mods:') ||
      line.startsWith('modules:');

    if (viewsActive) {
      const depth = getInlineDepth(viewBuffer.join('\n'));
      if (depth.paren > 0 || depth.brace > 0) {
        viewBuffer.push(lines[i].raw);
        continue;
      }
    }
    if (typesenseActive) {
      const depth = getInlineDepth(typesenseBuffer.join('\n'));
      if (depth.paren > 0 || depth.brace > 0) {
        typesenseBuffer.push(lines[i].raw);
        continue;
      }
    }

    if (!isCapLine && viewsActive) {
      // Preserve raw line so inline commas inside view expressions are retained.
      viewBuffer.push(lines[i].raw);
      continue;
    }
    if (!isCapLine && taxonomiesActive) {
      taxonomyBuffer.push(line.replace(/,$/, ''));
      continue;
    }
    if (!isCapLine && relationsActive) {
      relationsBuffer.push(line.replace(/,$/, ''));
      continue;
    }
    if (!isCapLine && typesenseActive) {
      typesenseBuffer.push(lines[i].raw);
      continue;
    }

    // If we hit another capability, flush any buffered views first
    flushViews();
    flushTaxonomies();
    flushRelations();
    flushTypesense();
    flushCrud();

    if (line.startsWith('modules:') || line.startsWith('mods:')) {
      // Inline modules syntax:
      //   mods: instance, post, refreshViews
      //   mods: instance: {}, refreshViews: { ... }
      // Bracket list form is handled by extractModulesList(raw).
      if (!line.includes('[')) {
        const inline = line.split(':').slice(1).join(':').trim();
        const entries = splitCommaTopLevel(inline);
        for (const entry of entries) {
          const trimmed = entry.trim();
          if (!trimmed) continue;
          const parsed = parseModuleEntry(trimmed);
          if (!parsed) continue;
          applyModuleFlag(caps, parsed.name, parsed.options);
        }
      }
      continue;
    }

    if (line.startsWith('module<')) {
      const match = line.match(/module\s*<([^>]+)>/i);
      const target = match?.[1]?.trim();
      if (target) {
        caps.moduleTarget = normalizeModelName(target).toLowerCase();
      }
      continue;
    }

    if (line.startsWith('module:')) {
      const inline = line.slice('module:'.length).trim().replace(/,\s*$/, '');
      if (inline) {
        const first = splitCommaTopLevel(inline)[0]?.trim();
        if (first) {
          caps.moduleTarget = normalizeModelName(first).toLowerCase();
        }
      }
      continue;
    }

    const moduleEntry = parseModuleEntry(line);
    if (moduleEntry) {
      const lower = moduleEntry.name.toLowerCase();
      if (lower === 'instance' || lower === 'post' || lower === 'refreshviews') {
        applyModuleFlag(caps, moduleEntry.name, moduleEntry.options);
        continue;
      }
    }

    if (line.startsWith('crud')) {
      const parsed = splitCapSettings(line);
      applyCrudCaps(caps, parsed.main, parsed.settings);
      continue;
    }

    if (line.startsWith('router:')) {
      const inline = line.slice('router:'.length).trim();
      const endpoints = parseRouterEndpoints(inline);
      if (endpoints.length > 0) {
        caps.routerEndpoints = endpoints;
      }
      caps.router = caps.router ?? {};
      continue;
    }

    if (line.startsWith('router<')) {
      const letters = line.match(/router\s*<([^>]+)>/i)?.[1] ?? '';
      const endpoints: Array<string | Record<string, any>> = [];
      const normalized = letters.toUpperCase();
      if (normalized.includes('C')) endpoints.push('create');
      if (normalized.includes('U')) endpoints.push('update');
      if (normalized.includes('D')) endpoints.push('delete');
      if (normalized.includes('V')) endpoints.push({ views: '*' });
      if (endpoints.length > 0) {
        caps.routerEndpoints = endpoints;
      }
      caps.router = caps.router ?? {};
      continue;
    }

    if (line.startsWith('router')) {
      const opts = line.match(/router\(([^)]*)\)/)?.[1] ?? '';
      const parsed: any = {};
      opts
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((p) => {
          const [k, v] = p.split('=').map((s) => s.trim());
          if (k === 'parent') parsed.parent = v;
          if (k === 'name') parsed.name = v;
          if (k === 'embed') parsed.embed = v === 'true';
        });
      caps.router = parsed;
      continue;
    }

    if (line.startsWith('instance')) {
      const modeMatch = line.match(/instance\s*<([^>]+)>/i);
      if (modeMatch && modeMatch[1]) {
        const mode = modeMatch[1].trim().toLowerCase();
        if (mode === 'remote' || mode === 'local') {
          caps.instanceMode = mode as 'local' | 'remote';
          caps.moduleOptions = caps.moduleOptions ?? {};
          caps.moduleOptions.instance = { ...(caps.moduleOptions.instance ?? {}), mode };
        }
      }
      caps.instance = true;
    }
    if (line.startsWith('post')) {
      caps.post = true;
    }
    if (line.startsWith('refreshViews')) {
      const value = line.split(':').slice(1).join(':').trim().toLowerCase();
      if (value === 'false' || value === '0' || value === 'off') {
        caps.refreshViews = false;
      } else {
        caps.refreshViews = true;
      }
    }
  }

  flushViews();
  flushTaxonomies();
  flushRelations();
  flushTypesense();
  flushCrud();

  return caps;
}

function applyCrudCaps(
  caps: CapFlag,
  main: string,
  settings?: Record<string, any>
): void {
  const slugMatch = main.match(/crud\s*<([^>]+)>/i);
  if (slugMatch && slugMatch[1]) {
    const slug = slugMatch[1].trim().replace(/^\$/, '');
    if (slug) caps.crudSlug = slug;
  }
  const subset = main.match(/crud\(([^)]+)\)/)?.[1]?.toUpperCase() ?? 'CUD';
  caps.crud = subset;
  if (settings && typeof settings === 'object') {
    caps.crudOptions = mergeDeep(caps.crudOptions ?? {}, settings);
  }
}

function splitCapSettings(
  raw: string
): { main: string; settings?: Record<string, any> } {
  const trimmed = raw.trim();
  if (!trimmed) return { main: trimmed };
  const braceStart = trimmed.lastIndexOf('{');
  if (braceStart === -1) return { main: trimmed };
  const info = findEnclosure(trimmed, '{', '}', braceStart);
  if (!info) return { main: trimmed };
  const tail = trimmed.slice(info.end + 1).trim();
  if (tail && tail !== ',' && tail !== ';') return { main: trimmed };
  const block = trimmed.slice(info.start, info.end + 1);
  try {
    const parsed = parseJsObject(block);
    return { main: trimmed.slice(0, braceStart).trim(), settings: parsed.value };
  } catch {
    const loose = parseSettingsBlockLoose(block);
    if (loose) {
      return { main: trimmed.slice(0, braceStart).trim(), settings: loose };
    }
    return { main: trimmed };
  }
}

function parseRouterEndpoints(raw: string): Array<string | Record<string, any>> {
  if (!raw) return [];
  const entries = splitCommaTopLevel(raw);
  const endpoints: Array<string | Record<string, any>> = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const viewsMatch = trimmed.match(/^views?\s*:\s*(.+)$/i);
    if (viewsMatch) {
      const selector = parseViewSelector(viewsMatch[1] ?? '');
      endpoints.push({ views: selector });
      continue;
    }

    const parsed = parseModuleEntry(trimmed);
    if (parsed?.options) {
      endpoints.push({ [parsed.name]: parsed.options });
      continue;
    }
    if (parsed?.name) {
      endpoints.push(parsed.name);
    }
  }

  return endpoints;
}

function parseViewSelector(raw: string): '*' | string[] {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '*') {
    return '*';
  }

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1);
    return splitCommaTopLevel(inner)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.replace(/^"|"$/g, ''));
  }

  return [trimmed.replace(/^"|"$/g, '')];
}

function applyModuleFlag(caps: CapFlag, name: string, options?: Record<string, any>): void {
  const normalized = name.trim();
  if (!normalized) return;
  const lower = normalized.toLowerCase();

  const normalizedOptions = options && Object.keys(options).length > 0 ? options : undefined;
  if (normalizedOptions) {
    caps.moduleOptions = caps.moduleOptions ?? {};
    caps.moduleOptions[lower] = normalizedOptions;
    if (lower === 'instance') {
      const mode = String((normalizedOptions as any).mode ?? '').toLowerCase();
      if (mode === 'remote' || mode === 'local') {
        caps.instanceMode = mode as 'local' | 'remote';
      }
    }
  }

  if (lower === 'instance') caps.instance = true;
  if (lower === 'post') caps.post = true;
  if (lower === 'refreshviews') caps.refreshViews = true;
}

function splitCommaTopLevel(value: string): string[] {
  const out: string[] = [];
  let current = '';
  let inString = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i] as string;
    const prev = i > 0 ? value[i - 1] : '';

    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (ch === '{') braceDepth += 1;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (ch === '[') bracketDepth += 1;
      else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (ch === '(') parenDepth += 1;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    }

    if (!inString && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0 && ch === ',') {
      if (current.trim()) out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }

  if (current.trim()) out.push(current.trim());
  return out;
}

function splitCommaTopLevelPreserveSelect(value: string): string[] {
  const out: string[] = [];
  let current = '';
  let inString = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let inSelect = false;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i] as string;
    const prev = i > 0 ? value[i - 1] : '';

    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (ch === '{') braceDepth += 1;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (ch === '[') bracketDepth += 1;
      else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (ch === '(') parenDepth += 1;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);

      if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
        if (!inSelect && matchesWord(value, i, 'select')) {
          inSelect = true;
        } else if (inSelect && matchesWord(value, i, 'from')) {
          inSelect = false;
        }
      }
    }

    if (!inString && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0 && !inSelect && ch === ',') {
      if (current.trim()) out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }

  if (current.trim()) out.push(current.trim());
  return out;
}

function matchesWord(source: string, index: number, word: string): boolean {
  const slice = source.slice(index, index + word.length);
  if (slice.toLowerCase() !== word.toLowerCase()) return false;
  const before = index > 0 ? source[index - 1] : '';
  const after = index + word.length < source.length ? source[index + word.length] : '';
  const isWordChar = (ch: string) => /[A-Za-z0-9_]/.test(ch);
  if (before && isWordChar(before)) return false;
  if (after && isWordChar(after)) return false;
  return true;
}

function splitViewEntries(value: string): string[] {
  const out: string[] = [];
  let current = '';
  let inString = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let angleDepth = 0;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i] as string;
    const prev = i > 0 ? value[i - 1] : '';

    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (ch === '{') braceDepth += 1;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (ch === '[') bracketDepth += 1;
      else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (ch === '(') parenDepth += 1;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
      else if (ch === '<') {
        const next = i + 1 < value.length ? value[i + 1] : '';
        if (next !== '-') angleDepth += 1;
      } else if (ch === '>') {
        if (prev !== '-') angleDepth = Math.max(0, angleDepth - 1);
      }
    }

    const atTopLevel =
      !inString && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0 && angleDepth === 0;
    if (atTopLevel && (ch === ',' || ch === '\n')) {
      if (current.trim()) out.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) out.push(current.trim());
  return out;
}

function parseModuleEntry(value: string): { name: string; options?: Record<string, any> } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Support `instance: { ... }`
  const kvMatch = trimmed.match(/^([a-zA-Z_][\w-]*)\s*:\s*(\{[\s\S]*\})$/);
  if (kvMatch && kvMatch[1] && kvMatch[2]) {
    try {
      const parsed = parseJsObject(kvMatch[2]);
      return { name: kvMatch[1], options: parsed.value };
    } catch {
      return { name: kvMatch[1] };
    }
  }

  // Support `instance { ... }`
  const objMatch = trimmed.match(/^([a-zA-Z_][\w-]*)\s+(\{[\s\S]*\})$/);
  if (objMatch && objMatch[1] && objMatch[2]) {
    try {
      const parsed = parseJsObject(objMatch[2]);
      return { name: objMatch[1], options: parsed.value };
    } catch {
      return { name: objMatch[1] };
    }
  }

  return { name: trimmed };
}

function extractModulesList(raw: string): string[] {
  const idxModules = raw.indexOf('modules:');
  const idxMods = raw.indexOf('mods:');
  const idx =
    idxModules === -1 ? idxMods : idxMods === -1 ? idxModules : Math.min(idxModules, idxMods);
  if (idx === -1) return [];

  const startBracket = raw.indexOf('[', idx);
  if (startBracket === -1) return [];

  let depth = 0;
  let endBracket = -1;
  for (let i = startBracket; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        endBracket = i;
        break;
      }
    }
  }
  if (endBracket === -1) return [];

  const inner = raw.slice(startBracket + 1, endBracket);
  return inner
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.startsWith('//'));
}

function splitTopLevelLines(body: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inString = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let angleDepth = 0;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i] as string;
    const prev = i > 0 ? body[i - 1] : '';

    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (ch === '{') braceDepth += 1;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (ch === '[') bracketDepth += 1;
      else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (ch === '(') parenDepth += 1;
      else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
      else if (ch === '<') {
        const next = i + 1 < body.length ? body[i + 1] : '';
        if (next !== '-') angleDepth += 1;
      } else if (ch === '>') {
        if (prev !== '-') angleDepth = Math.max(0, angleDepth - 1);
      }
    }

    if (ch === '\n') {
      if (!inString && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0 && angleDepth === 0) {
        if (current.trim()) lines.push(current.trim());
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) lines.push(current.trim());
  return lines;
}

function getInlineDepth(body: string): { paren: number; brace: number } {
  let inString = false;
  let angleDepth = 0;
  let parenDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i] as string;
    const prev = i > 0 ? body[i - 1] : '';
    const next = i + 1 < body.length ? body[i + 1] : '';

    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    }
    if (inString) continue;

    if (ch === '<') {
      if (next !== '-') angleDepth += 1;
      continue;
    }
    if (ch === '>') {
      if (prev !== '-') angleDepth = Math.max(0, angleDepth - 1);
      continue;
    }
    if (angleDepth > 0) continue;

    if (ch === '(') parenDepth += 1;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === '{') braceDepth += 1;
    else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
  }

  return { paren: parenDepth, brace: braceDepth };
}

export function parseConnections(body: string): { edges: EdgeDef[]; subTables: SubTableStub[] } {
  const edges: EdgeDef[] = [];
  const subTables: SubTableStub[] = [];
  const lines = splitTopLevelLines(body);
  for (const line of lines) {
    if (line.startsWith('//')) continue;
    if (line.startsWith('->')) {
      const m = line.match(/^->([A-Za-z0-9_]+)->([A-Za-z0-9_]+)(.*)$/);
      if (!m) continue;
      const edgeName = m[1];
      const target = normalizeModelName(m[2]);
      edges.push({ dir: 'has', table: edgeName, in: '__SELF__', out: target, unique: true });
    } else if (line.startsWith('<-')) {
      const m = line.match(/^<-([A-Za-z0-9_]+)<-([A-Za-z0-9_]+)(.*)$/);
      if (!m) continue;
      const source = normalizeModelName(m[1]);
      const edgeName = m[2];
      edges.push({ dir: 'belongs', table: edgeName, in: source, out: '__SELF__', unique: true });
    } else if (!line.startsWith('->') && !line.startsWith('<-') && line.includes(',')) {
      // subtable header form: Label, model ...
      const block = line;
      const hdr = line;
      const fieldsInfo = findEnclosure(block, '{', '}', block.indexOf('{'));
      const subFieldsBlock = fieldsInfo?.inner ?? '';

      const headerSection = hdr.split('{')[0] ?? hdr;
      const headerMatch = headerSection.match(/^([^{\[\(]+?),(.*)$/m);
      if (!headerMatch) continue;
      let label = headerMatch[1].trim();
      let tableType: SubTableStub['tableType'] = 'subsingle';
      if (label.startsWith('*')) {
        tableType = 'submany';
        label = label.slice(1).trim();
      }
      const headerRhs = headerMatch[2] ?? '';
      const headerBeforeBrace = headerRhs.split('{')[0].trim();
      const model = normalizeModelName(headerBeforeBrace.split('|')[0].trim());
      let descriptionSource = headerBeforeBrace.includes('|')
        ? headerBeforeBrace.split('|').slice(1).join('|').replace(/\{$/, '').trim()
        : undefined;
      if (descriptionSource) {
        descriptionSource = descriptionSource.split('{')[0].split('\n')[0].trim();
      }

      const capsStart = fieldsInfo ? block.indexOf('[', fieldsInfo.end) : -1;
      const capsInfo = capsStart !== -1 ? findEnclosure(block, '[', ']', capsStart) : null;
      const capsBlock = capsInfo?.inner ?? '';

      const connStartSearch = capsInfo ? capsInfo.end : (fieldsInfo ? fieldsInfo.end : 0);
      const connStart = block.indexOf('(', connStartSearch);
      const connInfo = connStart !== -1 ? findEnclosure(block, '(', ')', connStart) : null;
      const connBlock = connInfo?.inner ?? '';

      const subFields = parseFields(subFieldsBlock);
      const subCaps = parseCaps(capsBlock);
      const nestedConnections = connBlock ? parseConnections(connBlock) : { edges: [], subTables: [] };
      subTables.push({
        label,
        model,
        ...(descriptionSource ? { description: descriptionSource } : {}),
        fields: subFields,
        tableType,
        ...(Object.keys(subCaps).length > 0 ? { caps: subCaps } : {}),
        ...(nestedConnections.edges.length > 0 ? { edges: nestedConnections.edges } : {}),
        ...(nestedConnections.subTables.length > 0 ? { subTables: nestedConnections.subTables } : {}),
      });
    }
  }
  return { edges, subTables };
}

async function writeTable(
  table: TableAst,
  groupDirName: string,
  overwrite: boolean,
  onlyNew: boolean,
  outRoot: string
): Promise<void> {
  const dir = path.join(outRoot, groupDirName);
  await fs.ensureDir(dir);
  const fileName = resolveSpecFileName(table.model, table.tableType, table.parentModel);
  const file = path.join(dir, fileName);

  if (!overwrite && (await fs.pathExists(file))) {
    if (onlyNew) {
      console.log(`↩️  Skipping existing ${path.relative(process.cwd(), file)} (only-new).`);
      return;
    }
    console.log(`↩️  Skipping existing ${path.relative(process.cwd(), file)} (use --force to overwrite).`);
    return;
  }

  const spec = buildSpec(table);
  const doc = YAML.stringify(spec, { aliasDuplicateObjects: false });
  await fs.writeFile(file, doc, 'utf8');
  console.log(`📝 ${path.relative(process.cwd(), file)}`);

  await writeTaxonomyTermTables(table, overwrite, onlyNew, outRoot);
}

async function writeTaxonomyTermTables(
  table: TableAst,
  overwrite: boolean,
  onlyNew: boolean,
  outRoot: string
): Promise<void> {
  const rawTaxonomies = table.caps.rawTaxonomies;
  if (!rawTaxonomies) {
    return;
  }

  const entries = parseTaxonomyEntries(rawTaxonomies, table);
  for (const entry of entries) {
    const termTable = entry.termTable;
    if (!termTable?.model) {
      continue;
    }
    if (generatedTaxonomyTermTables.has(termTable.model)) {
      continue;
    }
    generatedTaxonomyTermTables.add(termTable.model);

    const termCaps: CapFlag = termTable.caps ?? {};
    if (table.caps.moduleTarget && !termCaps.moduleTarget) {
      termCaps.moduleTarget = table.caps.moduleTarget;
    }
    const termAst: TableAst = {
      label: termTable.label,
      model: termTable.model,
      ...(termTable.description ? { description: termTable.description } : {}),
      fields: termTable.fields,
      caps: termCaps,
      edges: termTable.edges ?? [],
      subTables: termTable.subTables ?? [],
      tableType: 'primary',
    };

    const termGroupDir = termAst.caps.moduleTarget ? '' : buildGroupDirName(termAst);
    await writeTable(termAst, termGroupDir, overwrite, onlyNew, outRoot);
  }
}

type SubtableInputBinding = {
  field: FieldDef;
  target: string;
  many: boolean;
  subtableIndex: number;
};

function extractSubtableInputBindings(fields: FieldDef[], subTables: SubTableStub[]): SubtableInputBinding[] {
  if (!fields.length || !subTables.length) return [];

  const bindings: SubtableInputBinding[] = [];
  for (const field of fields) {
    const parsed = parseSubtableInputType(field.type);
    if (!parsed) continue;

    const subtableIndex = resolveSubtableInputIndex(parsed.target, subTables);
    if (subtableIndex === -1) {
      console.warn(
        `⚠️  Subtable input "${field.name}" targets "${parsed.target}" but no matching subtable was found.`
      );
      continue;
    }

    bindings.push({
      field,
      target: parsed.target,
      many: parsed.many,
      subtableIndex,
    });
  }

  return bindings;
}

function parseSubtableInputType(rawType?: string): { target: string; many: boolean } | null {
  if (!rawType) return null;
  const compact = rawType.trim().replace(/\s+/g, '');
  const keywordMatch = compact.match(/^(submany|subsingle|subtable\*?)<(.+)>$/i);
  if (!keywordMatch || !keywordMatch[1] || !keywordMatch[2]) return null;
  const keyword = keywordMatch[1].toLowerCase();
  const keywordMany = keyword === 'submany' || keyword === 'subtable*';
  let target = keywordMatch[2].trim();
  let innerMany = false;
  if (target.startsWith('*')) {
    innerMany = true;
    target = target.slice(1).trim();
  }
  if (!target) return null;
  const many =
    keyword === 'subsingle'
      ? false
      : keywordMany || innerMany;
  return {
    target,
    many,
  };
}

function resolveSubtableInputIndex(target: string, subTables: SubTableStub[]): number {
  const targetLower = target.toLowerCase();
  const targetModel = normalizeModelName(target).toLowerCase();
  for (let i = 0; i < subTables.length; i++) {
    const sub = subTables[i];
    const model = normalizeModelName(sub.model).toLowerCase();
    const label = sub.label.toLowerCase();
    if (targetLower === label || targetLower === model || targetModel === model) {
      return i;
    }
  }
  return -1;
}

function buildSpec(t: TableAst): any {
  const idField = t.fields.find((f) => f.isId);
  const dataFields = t.fields.filter((f) => !f.isId);
  const subtableInputBindings = extractSubtableInputBindings(dataFields, t.subTables ?? []);
  const subtableInputFieldNames = new Set(subtableInputBindings.map((binding) => binding.field.name));
  const fields = dataFields.filter((field) => !subtableInputFieldNames.has(field.name));
  const subtableInputByIndex = new Map<number, SubtableInputBinding>(
    subtableInputBindings.map((binding) => [binding.subtableIndex, binding])
  );
  const tableType = t.tableType ?? (t.parentModel ? 'subsingle' : 'primary');
  let normalizedFields = fields;
  if (tableType === 'submany') {
    const hasOrder = fields.some((field) => field.name === 'order');
    if (!hasOrder) {
      normalizedFields = [
        ...fields,
        {
          name: 'order',
          required: false,
          nullable: false,
          defaultValue: 0,
          type: 'number',
          options: undefined,
          assign: false,
          tags: [],
        },
      ];
    }
  }
  const out: any = {
    version: 1,
    kind: 'table',
    name: t.label,
    primary: tableType === 'primary',
    tableType,
    description: t.description ?? '',
    table: {
      model: t.model,
      type: 'NORMAL',
      schemaMode: 'schemaless',
      permissions: 'full',
    },
  };

  if (t.parentModel && tableType === 'subsingle') {
    out.structure = { type: 'parent', parentModel: t.parentModel };
  }

  if (idField) {
    if (idField.idKind === 'parent') {
      const parentModel = idField.parentModel ?? t.parentModel;
      if (parentModel) {
        out.structure = { type: 'parent', parentModel };
      }
      out.id = { type: 'string', exportType: true, exportName: `${toPascal(t.label)}Id` };
    } else if (idField.idKind === 'field') {
      out.id = {
        type: 'string',
        structure: idField.idSource,
        exportType: true,
        exportName: `${toPascal(t.label)}Id`,
      };
    } else if (idField.idKind === 'template') {
      out.id = {
        type: 'string',
        structure: idField.idTemplate,
        exportType: true,
        exportName: `${toPascal(t.label)}Id`,
      };
    } else {
    out.id = { type: 'string', exportType: true, exportName: `${toPascal(t.label)}Id` };
  }
  }

  if (normalizedFields.length) {
    out.fields = normalizedFields.map((f) => ({
      [f.name]: buildFieldMeta(f),
    }));
  }


  // Auto edge for subtables (belongs to parent) when none provided.
  if (!out.edges && t.parentModel) {
    const edgeTable = toPascal(t.label);
    out.edges = {
      has: [],
      belongs: [
        {
          table: edgeTable,
          in: t.parentModel,
          out: t.model,
        },
      ],
    };
  }

  const indexes = collectIndexes(t.model, fields);
  if (indexes.length) out.indexes = indexes;

  if (t.edges.length) {
    out.edges = {
      has: t.edges.filter((e) => e.dir === 'has').map((e) => ({
        table: normalizeEdgeTableName(e.table, t),
        in: e.in === '__SELF__' ? t.model : e.in,
        out: e.out,
        unique: e.unique,
      })),
      belongs: t.edges.filter((e) => e.dir === 'belongs').map((e) => ({
        table: normalizeEdgeTableName(e.table, t),
        in: e.in,
        out: e.out === '__SELF__' ? t.model : e.out,
        unique: e.unique,
      })),
    };
  }

  if (t.subTables.length) {
    out.subTables = t.subTables.map((s, index) => {
      const binding = subtableInputByIndex.get(index);
      const subtableType = s.tableType;
      const inferredMany = subtableType === 'submany';
      if (binding && binding.many !== inferredMany) {
        console.warn(
          `⚠️  Subtable input "${binding.field.name}" uses ${
            binding.many ? 'many' : 'single'
          } tag syntax but connection "${s.label}" is ${inferredMany ? 'submany' : 'subsingle'}. Using connection type.`
        );
      }
      const createInput =
        binding
          ? {
              field: binding.field.name,
              many: inferredMany,
              required: binding.field.required,
            }
          : undefined;
      const existingOptions =
        s.options && typeof s.options === 'object'
          ? { ...s.options }
          : {};
      const options =
        createInput
          ? {
              ...existingOptions,
              createInput,
            }
          : existingOptions;

      return {
        name: s.label,
        model: s.model,
        autoCreate: s.tableType === 'submany' ? false : true,
        ...(s.tableType ? { tableType: s.tableType } : {}),
        ...(Object.keys(options).length > 0 ? { options } : {}),
      };
    });
  }

  if (t.caps.crud) {
    out.crud = buildCrud(t.caps.crud);
    if (t.caps.crudOptions && typeof t.caps.crudOptions === 'object') {
      out.crud = mergeDeep(out.crud, t.caps.crudOptions);
    }
  }

  if (t.caps.router) {
    const routerName = t.caps.router.name ?? toCamel(t.label || t.model);
    const endpoints = buildRouterEndpoints(t);
    out.router = {
      name: routerName,
      parent: t.caps.router.parent,
      embedInParent: t.caps.router.embed,
      ...(endpoints && endpoints.length > 0 ? { endpoints } : {}),
    };
  }

  if (t.caps.rawViews !== undefined || t.caps.views !== undefined) {
    out.views = buildViews(
      t,
      fields,
      t.caps.rawViews,
      t.caps.views,
      Boolean(t.caps.post)
    );
  }

  if (t.caps.rawTypesense !== undefined) {
    const typesense = buildTypesense(t, fields, t.caps.rawTypesense);
    if (typesense) {
      out.typesense = typesense;
    } else if (t.model === 'instance') {
      out.typesense = buildInstanceTypesenseFallback(t);
    }
  }

  if (t.caps.rawTaxonomies !== undefined) {
    const defaults = appConfig?.taxonomies ?? {};
    const taxonomyDefaults = defaults.taxonomies?.fields ?? [];
    const termDefaults = defaults.terms?.fields ?? [];
    out.taxonomies = buildTaxonomies(t, t.caps.rawTaxonomies, taxonomyDefaults, termDefaults);
    if (Array.isArray(out.fields)) {
      injectTaxonomyFields(out.fields, out.taxonomies ?? []);
    }
  }

  if (t.caps.rawRelations !== undefined) {
    const relations = buildRelations(t, t.caps.rawRelations);
    if (relations.length > 0) {
      out.relations = relations;
      if (Array.isArray(out.fields)) {
        injectRelationFields(out.fields, relations);
      }
    }
  }

  if (t.caps.instance) {
    out.instance = t.caps.moduleOptions?.instance ?? true;
  }
  if (t.caps.post) {
    const raw = t.caps.moduleOptions?.post;
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length > 0) {
      out.post = {
        enabled: raw.enabled ?? true,
        ...raw,
      };
    } else {
      out.post = true;
    }
  }
  out.refreshViews = t.caps.refreshViews ?? true;

  const adminMeta: Record<string, any> = {};
  if (t.caps.crudSlug) {
    adminMeta.slugPolicy = t.caps.crudSlug;
  }
  if (t.caps.instance) {
    adminMeta.data = t.caps.instanceMode ?? 'local';
  } else if (t.caps.instanceMode) {
    adminMeta.data = t.caps.instanceMode;
  }
  if (Object.keys(adminMeta).length > 0) {
    out.admin = adminMeta;
  }

  return out;
}

function buildTaxonomies(
  table: TableAst,
  raw: string,
  taxonomyDefaults: Array<Record<string, any> | string>,
  termDefaults: Array<Record<string, any> | string>
): any[] {
  const entries = parseTaxonomyEntries(raw, table);
  return entries.map((entry) => {
    const taxonomyOverrides = entry.taxonomyFields;
    if (entry.taxonomyDescription && !entry.taxonomyHasDescription) {
      taxonomyOverrides.push({ description: entry.taxonomyDescription });
    }
    const termOverrides = entry.termFields;
    if (entry.termDescription && !entry.termHasDescription) {
      termOverrides.push({ description: entry.termDescription });
    }

    const taxonomyFields = mergeFieldEntries(taxonomyDefaults, taxonomyOverrides);
    const termFields = mergeFieldEntries(termDefaults, termOverrides);

    const out: any = {
      key: entry.key,
      labels: entry.labels,
      ...(entry.permalink ? { permalink: entry.permalink } : {}),
    };

    out.taxonomy = {
      ...(entry.taxonomy ?? {}),
      id: entry.taxonomyId,
      ...(taxonomyFields.length > 0 ? { fields: taxonomyFields } : {}),
    };

    out.term = {
      ...(entry.term ?? {}),
      id: entry.termId,
      ...(termFields.length > 0 ? { fields: termFields } : {}),
    };

    if (entry.settings && typeof entry.settings === 'object') {
      const { taxonomy, term, ...rest } = entry.settings as Record<string, any>;
      if (taxonomy && typeof taxonomy === 'object') {
        out.taxonomy = {
          ...(out.taxonomy ?? {}),
          ...taxonomy,
        };
      }
      if (term && typeof term === 'object') {
        out.term = {
          ...(out.term ?? {}),
          ...term,
        };
      }
      Object.assign(out, rest);
    }

    return out;
  });
}

function buildRelations(table: TableAst, raw: string): any[] {
  const entries = parseRelationEntries(raw, table);
  return entries.map((entry) => {
    const out: any = {
      edge: entry.edge,
      left: entry.left,
      right: entry.right,
      cardinality: entry.cardinality,
      storeOnModel: entry.storeOnModel,
      payloadField: entry.payloadField,
      linkOnCreate: entry.linkOnCreate,
      required: entry.required,
      processor: entry.processor,
      hook: entry.hook,
    };
    if (entry.functions && Object.keys(entry.functions).length > 0) {
      out.functions = entry.functions;
    }
    return out;
  });
}

function parseRelationEntries(
  raw: string,
  table: TableAst
): Array<{
  edge: string;
  left: string;
  right: string;
  cardinality: 'one' | 'many';
  storeOnModel: boolean;
  payloadField: string;
  linkOnCreate: boolean;
  required: boolean;
  processor: 'functions' | 'events' | 'none';
  hook: string;
  functions?: Record<string, string>;
}> {
  const lines = mergeTaxonomyEntryLines(splitTopLevelLines(raw));
  const entries: Array<{
    edge: string;
    left: string;
    right: string;
    cardinality: 'one' | 'many';
    storeOnModel: boolean;
    payloadField: string;
    linkOnCreate: boolean;
    required: boolean;
    processor: 'functions' | 'events' | 'none';
    hook: string;
    functions?: Record<string, string>;
  }> = [];

  for (const rawLine of lines) {
    const cleaned = stripInlineComment(rawLine).trim().replace(/,\s*$/, '').trim();
    if (!cleaned) continue;
    if (cleaned.startsWith('//')) continue;

    const { main, settings } = splitRelationSettings(cleaned);
    const header = main.split('|')[0].trim();
    const match = header.match(/^([\w-]+)\s*->\s*([\w-]+)\s*->\s*([\w-]+)$/);
    if (!match) {
      console.warn(`⚠️  Skipping relation entry (invalid syntax): ${cleaned}`);
      continue;
    }

    const left = match[1];
    const edge = match[2];
    const right = match[3];

    const cardinalityRaw = String(settings?.cardinality ?? 'many').toLowerCase();
    const cardinality = cardinalityRaw === 'one' || cardinalityRaw === 'single' ? 'one' : 'many';
    const storeOnModel =
      typeof settings?.storeOnModel === 'boolean' ? settings.storeOnModel : true;
    const required = typeof settings?.required === 'boolean' ? settings.required : false;
    const processorRaw = String(settings?.processor ?? 'functions').toLowerCase();
    const processor =
      processorRaw === 'events' || processorRaw === 'none' ? processorRaw : 'functions';
    const hook = String(settings?.hook ?? 'right');

    const payloadField =
      settings?.payloadField ??
      settings?.payload ??
      (cardinality === 'one' ? left : `${left}s`);
    const linkOnCreate =
      typeof settings?.linkOnCreate === 'boolean' ? settings.linkOnCreate : true;

    const functions =
      settings?.functions && typeof settings.functions === 'object'
        ? settings.functions
        : undefined;

    entries.push({
      edge,
      left,
      right,
      cardinality,
      storeOnModel,
      payloadField,
      linkOnCreate,
      required,
      processor,
      hook,
      functions,
    });
  }

  return entries;
}

function mergeTaxonomyEntryLines(lines: string[]): string[] {
  const entries: string[] = [];
  let current: string[] = [];

  const isHeaderLine = (line: string) => {
    const cleaned = stripInlineComment(line).trim().replace(/,\s*$/, '').trim();
    if (!cleaned) return false;
    if (cleaned.startsWith('//')) return false;
    const headerSection = cleaned.split('{')[0].split('[')[0].split('(')[0];
    return /^([^{\[\(]+?),(.*)$/m.test(headerSection);
  };

  for (const line of lines) {
    if (isHeaderLine(line)) {
      if (current.length > 0) {
        entries.push(current.join('\n'));
      }
      current = [line];
      continue;
    }
    if (current.length > 0) {
      current.push(line);
      continue;
    }
    entries.push(line);
  }

  if (current.length > 0) {
    entries.push(current.join('\n'));
  }

  return entries;
}

function splitRelationSettings(
  raw: string
): { main: string; settings?: Record<string, any> } {
  const trimmed = raw.trim();
  if (!trimmed) return { main: trimmed };
  const braceStart = trimmed.lastIndexOf('{');
  if (braceStart === -1) return { main: trimmed };
  const braceInfo = findEnclosure(trimmed, '{', '}', braceStart);
  if (!braceInfo) return { main: trimmed };
  const tail = trimmed.slice(braceInfo.end).trim();
  if (tail) return { main: trimmed };
  const block = trimmed.slice(braceStart, braceInfo.end);
  try {
    const parsed = parseJsObject(block);
    return { main: trimmed.slice(0, braceStart).trim(), settings: parsed.value };
  } catch {
    const loose = parseSettingsBlockLoose(block);
    if (loose) {
      return { main: trimmed.slice(0, braceStart).trim(), settings: loose };
    }
    return { main: trimmed };
  }
}

function injectRelationFields(
  fields: Array<Record<string, any>>,
  relations: Array<{
    left: string;
    payloadField: string;
    cardinality: 'one' | 'many';
    required: boolean;
    storeOnModel: boolean;
  }>
): void {
  const existing = new Set<string>();
  for (const entry of fields) {
    const key = Object.keys(entry)[0];
    if (key) existing.add(key);
  }

  for (const relation of relations) {
    const fieldName = relation.payloadField;
    if (!fieldName || existing.has(fieldName)) continue;
    if (relation.storeOnModel === false) continue;
    const type =
      relation.cardinality === 'one'
        ? `record<${relation.left}>`
        : `array<record<${relation.left}>>`;
    const meta: any = { type };
    if (relation.required) meta.required = true;
    fields.push({ [fieldName]: meta });
    existing.add(fieldName);
  }
}

function injectTaxonomyFields(
  fields: Array<Record<string, any>>,
  taxonomies: Array<{
    key: string;
    term?: { model?: string };
    payloadField?: string;
    cardinality?: 'one' | 'many';
    required?: boolean;
    storeOnModel?: boolean;
  }>
): void {
  if (!taxonomies || taxonomies.length === 0) return;
  const existing = new Set<string>();
  for (const entry of fields) {
    const key = Object.keys(entry)[0];
    if (key) existing.add(key);
  }

  for (const taxonomy of taxonomies) {
    const key = taxonomy.key;
    if (!key) continue;
    const cardinality = taxonomy.cardinality === 'one' ? 'one' : 'many';
    const payloadField =
      taxonomy.payloadField ??
      (cardinality === 'one' ? key : `${key}s`);
    if (!payloadField || existing.has(payloadField)) continue;
    if (taxonomy.storeOnModel === false) continue;
    const termModel = taxonomy.term?.model ?? 'term';
    const type =
      cardinality === 'one'
        ? `record<${termModel}>`
        : `array<record<${termModel}>>`;
    const meta: any = { type };
    if (taxonomy.required) meta.required = true;
    fields.push({ [payloadField]: meta });
    existing.add(payloadField);
  }
}

function parseTaxonomyEntries(
  raw: string,
  table: TableAst
): Array<{
  key: string;
  labels: { singular: string; plural: string };
  permalink?: string;
  taxonomy?: { fields?: Array<Record<string, any> | string> };
  term?: { model?: string; fields?: Array<Record<string, any> | string> };
  taxonomyFields: Array<Record<string, any> | string>;
  termFields: Array<Record<string, any> | string>;
  taxonomyId: string;
  termId: string;
  taxonomyDescription?: string;
  termDescription?: string;
  taxonomyHasDescription: boolean;
  termHasDescription: boolean;
  termTable?: SubTableStub;
  settings?: Record<string, any>;
}> {
  const lines = mergeTaxonomyEntryLines(splitTopLevelLines(raw));
  const entries: Array<{
    key: string;
    labels: { singular: string; plural: string };
    permalink?: string;
    taxonomy?: { fields?: Array<Record<string, any> | string> };
    term?: { model?: string; fields?: Array<Record<string, any> | string> };
    taxonomyFields: Array<Record<string, any> | string>;
    termFields: Array<Record<string, any> | string>;
    taxonomyId: string;
    termId: string;
    taxonomyDescription?: string;
    termDescription?: string;
    taxonomyHasDescription: boolean;
    termHasDescription: boolean;
    termTable?: SubTableStub;
    settings?: Record<string, any>;
  }> = [];

  for (const lineRaw of lines) {
    const line = stripInlineComment(lineRaw).trim().replace(/,\s*$/, '').trim();
    if (!line) continue;
    if (line.startsWith('//')) continue;
    const rest = lineRaw.trim().replace(/,\s*$/, '');

    const headerSection = line.split('{')[0].split('[')[0].split('(')[0];
    const headerMatch = headerSection.match(/^([^{\[\(]+?),(.*)$/m);
    if (!headerMatch) continue;
    const nameSpec = headerMatch[1].trim();
    const headerRhs = headerMatch[2] ?? '';
    const headerBeforeBrace = headerRhs.split('{')[0].trim();
    const keySpec = headerBeforeBrace.split('|')[0].trim();
    const description = headerBeforeBrace.includes('|')
      ? headerBeforeBrace.split('|').slice(1).join('|').trim()
      : undefined;
    if (!nameSpec || !keySpec) continue;

    const { singular, plural } = parseNameSpec(nameSpec);

    const fieldsStart = rest.indexOf('{');
    const fieldsInfo = fieldsStart !== -1 ? findEnclosure(rest, '{', '}', fieldsStart) : null;
    const taxonomyFieldsBlock = fieldsInfo?.inner ?? '';

    const capsStart = fieldsInfo ? rest.indexOf('[', fieldsInfo.end) : -1;
    const capsInfo = capsStart !== -1 ? findEnclosure(rest, '[', ']', capsStart) : null;

    const connStartSearch = capsInfo ? capsInfo.end : (fieldsInfo ? fieldsInfo.end : 0);
    const connStart = rest.indexOf('(', connStartSearch);
    const connInfo = connStart !== -1 ? findEnclosure(rest, '(', ')', connStart) : null;
    const termBlock = connInfo?.inner ?? '';
    const settingsStartIndex = connInfo?.end ?? fieldsInfo?.end ?? 0;
    const settingsCandidates = [
      extractTrailingTaxonomySettings(rest, settingsStartIndex),
      extractTrailingTaxonomySettingsLoose(rest),
      extractAnyTaxonomySettings(rest),
      extractInlineTaxonomySettings(rest),
    ];
    const settingsKeySet = new Set([
      'cardinality',
      'payloadField',
      'payloadAlias',
      'payloadAliases',
      'storeOnModel',
      'processor',
      'required',
      'hierarchical',
      'hook',
      'taxonomy',
      'term',
    ]);
    const settings = settingsCandidates.find((candidate) => {
      if (!candidate || typeof candidate !== 'object') return false;
      return Object.keys(candidate).some((key) => settingsKeySet.has(key));
    });

    const taxonomyFieldDefs = taxonomyFieldsBlock ? parseFields(taxonomyFieldsBlock) : [];
    const termParsed = termBlock ? parseConnections(termBlock).subTables[0] : undefined;
    const termFieldDefs = termParsed?.fields ?? [];
    const termModel = termParsed?.model;

    const taxonomyFields = fieldDefsToEntries(taxonomyFieldDefs);
    const termFields = fieldDefsToEntries(termFieldDefs);

    const taxonomyHasDescription = taxonomyFields.some((entry) => entryHasAnyKey(entry, ['description']));
    const termHasDescription = termFields.some((entry) => entryHasAnyKey(entry, ['description']));

    const taxonomyId = resolveTaxonomyId(table.model, keySpec, taxonomyFieldDefs);
    const termId = resolveTermId(table.model, keySpec, termFieldDefs);

    entries.push({
      key: keySpec,
      labels: { singular, plural },
      taxonomyFields,
      termFields,
      taxonomyId,
      termId,
      taxonomyDescription: description,
      termDescription: termParsed?.description,
      taxonomyHasDescription,
      termHasDescription,
      ...(termModel ? { term: { model: termModel } } : {}),
      ...(termParsed ? { termTable: termParsed } : {}),
      ...(settings ? { settings } : {}),
    });
  }

  return entries;
}

function extractTrailingTaxonomySettings(
  raw: string,
  startIndex: number
): Record<string, any> | undefined {
  const lastBrace = raw.lastIndexOf('{');
  if (lastBrace === -1 || lastBrace <= startIndex) return undefined;
  const info = findEnclosure(raw, '{', '}', lastBrace);
  if (!info) return undefined;
  const tail = raw.slice(info.end + 1).trim();
  if (tail && tail !== ',' && tail !== '};' && tail !== '}' && tail !== '),' ) {
    return undefined;
  }
  const block = raw.slice(info.start, info.end + 1);
  try {
    const parsed = parseJsObject(block);
    return parsed.value;
  } catch {
    const loose = parseSettingsBlockLoose(block);
    return loose ?? undefined;
  }
}

function extractTrailingTaxonomySettingsLoose(raw: string): Record<string, any> | undefined {
  const lastBrace = raw.lastIndexOf('{');
  if (lastBrace === -1) return undefined;
  const info = findEnclosure(raw, '{', '}', lastBrace);
  if (!info) return undefined;
  const block = raw.slice(info.start, info.end + 1);
  if (
    !/(cardinality|payloadField|payloadAlias|payloadAliases|storeOnModel|processor|required|hierarchical)\s*:/i.test(block)
  ) {
    return undefined;
  }
  try {
    const parsed = parseJsObject(block);
    return parsed.value;
  } catch {
    const loose = parseSettingsBlockLoose(block);
    return loose ?? undefined;
  }
}

function extractAnyTaxonomySettings(raw: string): Record<string, any> | undefined {
  const lastBrace = raw.lastIndexOf('{');
  if (lastBrace === -1) return undefined;
  const info = findEnclosure(raw, '{', '}', lastBrace);
  if (!info) return undefined;
  const block = raw.slice(info.start, info.end + 1);
  if (
    !/(cardinality|payloadField|payloadAlias|payloadAliases|storeOnModel|processor|required|hierarchical)\s*:/i.test(block)
  ) {
    return undefined;
  }
  try {
    const parsed = parseJsObject(block);
    return parsed.value;
  } catch {
    const loose = parseSettingsBlockLoose(block);
    return loose ?? undefined;
  }
}

function extractInlineTaxonomySettings(raw: string): Record<string, any> | undefined {
  const lines = raw.split(/\r?\n/);
  const out: Record<string, any> = {};
  for (const line of lines) {
    const cleaned = stripInlineComment(line).trim();
    if (!cleaned) continue;
    const match = cleaned.match(
      /^(cardinality|payloadField|payloadAlias|payloadAliases|storeOnModel|required|processor|hierarchical)\s*:\s*(.+)$/i
    );
    if (!match || !match[1] || !match[2]) continue;
    const key = match[1].trim();
    const valueRaw = match[2].trim().replace(/,\s*$/, '');
    try {
      const parsed = parseJsValue(valueRaw, 0);
      out[key] = parsed.value;
    } catch {
      out[key] = valueRaw;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseNameSpec(value: string): { singular: string; plural: string } {
  const parts = value.split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { singular: value.trim(), plural: value.trim() };
  }
  if (parts.length === 1) {
    return { singular: parts[0], plural: parts[0] };
  }
  const singular = parts[0];
  const suffix = parts[1];
  if (suffix.toLowerCase() === 's') {
    return { singular, plural: `${singular}s` };
  }
  return { singular, plural: suffix };
}

function mergeFieldEntries(
  base: Array<Record<string, any> | string>,
  overrides: Array<Record<string, any> | string>
): Array<Record<string, any> | string> {
  let merged = [...(base ?? [])];
  for (const override of overrides ?? []) {
    const keys = getFieldEntryKeys(override);
    if (keys.length > 0) {
      merged = merged.filter((entry) => !entryHasAnyKey(entry, keys));
    }
    merged.push(override);
  }
  return merged;
}

function fieldDefsToEntries(fields: FieldDef[]): Array<Record<string, any> | string> {
  return fields
    .filter((field) => !field.isId)
    .map((field) => ({
      [field.name]: buildFieldMeta(field),
    }));
}

function resolveTaxonomyId(tableModel: string, key: string, fields: FieldDef[]): string {
  const idField = fields.find((field) => field.isId);
  if (idField?.idKind === 'template' && idField.idTemplate) {
    return idField.idTemplate;
  }
  if (idField?.idKind === 'field' && idField.idSource) {
    if (idField.idSource === 'key') {
      return `stringID<${tableModel}, ${key}>`;
    }
    if (idField.idSource.toLowerCase().startsWith('stringid<')) {
      return idField.idSource;
    }
  }
  return `stringID<${tableModel}, ${key}>`;
}

function resolveTermId(tableModel: string, key: string, fields: FieldDef[]): string {
  const idField = fields.find((field) => field.isId);
  if (idField?.idKind === 'template' && idField.idTemplate) {
    return idField.idTemplate;
  }
  if (idField?.idKind === 'field' && idField.idSource) {
    if (idField.idSource.toLowerCase().startsWith('stringid<')) {
      return idField.idSource;
    }
    return `<field:${idField.idSource}>`;
  }
  return `<field:key>`;
}

function getFieldEntryKeys(entry: Record<string, any> | string): string[] {
  if (typeof entry === 'string') return [entry];
  return Object.keys(entry);
}

function entryHasAnyKey(entry: Record<string, any> | string, keys: string[]): boolean {
  if (typeof entry === 'string') {
    return keys.includes(entry);
  }
  return Object.keys(entry).some((key) => keys.includes(key));
}

function buildRouterEndpoints(t: TableAst): Array<string | Record<string, any>> | undefined {
  const explicit = t.caps.routerEndpoints;
  if (Array.isArray(explicit) && explicit.length > 0) {
    return explicit;
  }

  const endpoints: Array<string | Record<string, any>> = [];
  const crud = t.caps.crud ?? '';
  const crudLetters = crud.toUpperCase();
  if (crudLetters.includes('C')) endpoints.push('create');
  if (crudLetters.includes('U')) endpoints.push('update');
  if (crudLetters.includes('D')) endpoints.push('delete');

  const hasViews = t.caps.rawViews !== undefined || t.caps.views !== undefined;
  if (hasViews) {
    endpoints.push({ views: '*' });
  }

  return endpoints.length > 0 ? endpoints : undefined;
}

function buildViews(
  table: TableAst,
  fields: FieldDef[],
  rawViews?: string,
  legacyViews?: string[],
  postEnabled?: boolean
): any[] {
  const parsed = rawViews ? parseRichViews(rawViews, table) : [];
  const namesAndSpecs = parsed.length > 0
    ? parsed
    : (legacyViews && legacyViews.length > 0
        ? legacyViews.map((v) => ({
            name: v,
            includeMode: 'only' as const,
            fields: [],
            asPairs: [],
            fetchFields: [],
          }))
        : [{ name: 'Record', includeMode: 'all' as const, fields: [], asPairs: [], fetchFields: [] }]);

  const allFieldNames = ['id', ...fields.map((f) => f.name)];

  return namesAndSpecs.map((spec) => {
    const viewName = toPascal(spec.name);

    if (spec.functionName) {
      return {
        name: viewName,
        function: spec.functionName,
        functionMode: spec.functionMode,
      };
    }

    let viewFields: string[] = [];

    if (spec.includeMode === 'all') {
      viewFields = [...allFieldNames];
    } else if (spec.includeMode === 'only') {
      viewFields = spec.fields.length > 0 ? ['id', ...spec.fields] : ['id'];
    } else if (spec.includeMode === 'exclude') {
      const exclude = new Set(spec.fields);
      viewFields = allFieldNames.filter((f) => !exclude.has(f));
    }

    // Remove overridden fields (e.g. id(customExpr)) from the base list.
    const overrideFields = new Set(Object.keys(spec.fieldOverrides ?? {}));
    if (overrideFields.size > 0) {
      viewFields = viewFields.filter((f) => !overrideFields.has(f));
    }

    // De-duplicate while preserving order (e.g. if id explicitly listed).
    const seen = new Set<string>();
    viewFields = viewFields.filter((f) => {
      if (seen.has(f)) return false;
      seen.add(f);
      return true;
    });

    const asClauses = [...(spec.asPairs ?? [])];
    if (spec.fieldOverrides && Object.keys(spec.fieldOverrides).length > 0) {
      for (const [alias, expr] of Object.entries(spec.fieldOverrides)) {
        if (!alias || !expr) continue;
        for (let i = asClauses.length - 1; i >= 0; i -= 1) {
          if (Object.prototype.hasOwnProperty.call(asClauses[i], alias)) {
            asClauses.splice(i, 1);
          }
        }
        asClauses.push({ [alias]: expr });
      }
    }
    // If post is enabled, we no longer auto-inject a post clause; keep views explicit.

    const view: any = {
      name: viewName,
      fields: viewFields,
    };
    if (spec.functionMode === 'generate') {
      view.functionMode = 'generate';
      view.function = buildViewFunctionName(table, spec.name);
    }
    if (asClauses.length > 0) {
      view.as = asClauses;
    }
    if (spec.fetchFields && spec.fetchFields.length > 0) {
      view.fetch = Array.from(new Set(spec.fetchFields));
    }
    return view;
  });
}

function buildViewFunctionName(table: TableAst, viewName: string): string {
  const tableLabel = table.label || table.model || 'Record';
  const fnName = `view${toPascal(tableLabel)}${toPascal(viewName)}`;
  return fnName.charAt(0).toLowerCase() + fnName.slice(1);
}

function buildTypesense(table: TableAst, fields: FieldDef[], rawTypesense: string): any | null {
  if (!rawTypesense.trim()) return null;
  const { main, settings, nameOverride } = splitTypesenseSettings(rawTypesense);
  const adjustedMain = nameOverride ? normalizeTypesenseMain(main) : main;
  const viewDefs = buildViews(table, fields, adjustedMain, undefined, Boolean(table.caps.post));
  if (viewDefs.length === 0) return null;
  const view = viewDefs[0];

  const tagMap = parseTypesenseTags(adjustedMain);
  if (rawTypesense.trim() !== adjustedMain.trim()) {
    const extraTags = parseTypesenseTags(rawTypesense);
    for (const [key, tags] of extraTags.entries()) {
      const existing = tagMap.get(key) ?? [];
      const merged = Array.from(new Set([...existing, ...tags]));
      if (merged.length > 0) tagMap.set(key, merged);
    }
  }

  // Ensure typesense "as" entries and tags are captured even when the main view parser skips them.
  const parenInnerRaw = extractTypesenseParenInner(adjustedMain);
  if (parenInnerRaw) {
    const parenInner = normalizeTypesenseObjectTags(parenInnerRaw);
    const parsedAs = parseViewProgramEntries(parenInner, table);
    const fallbackAs = parsedAs.length > 0 ? parsedAs : buildTypesenseAsFallback(parenInner);
    if ((!view.as || view.as.length === 0) && fallbackAs.length > 0) {
      view.as = fallbackAs;
    }
    const programFieldLists = parseTypesenseProgramFieldLists(parenInner);
    if (programFieldLists.size > 0) {
      (view as any).__programFieldLists = programFieldLists;
    }
    mergeTypesenseTagsFromParen(parenInner, tagMap);
  }

  const schemaFieldsOverride = Array.isArray(settings?.fields) ? settings?.fields : undefined;
  const schemaBuild = schemaFieldsOverride
    ? { fields: schemaFieldsOverride, meta: {} }
    : buildTypesenseSchemaFields(view, fields, tagMap);
  if (schemaBuild.fields.length === 0) return null;

  const defaultCollection = `${toPascal(table.label || table.model)}`.toLowerCase();
  const rawCollection =
    (settings?.collection as string | undefined) ??
    (nameOverride ? normalizeTypesenseCollectionName(nameOverride) : undefined) ??
    defaultCollection;
  const collection = normalizeTypesenseCollectionName(rawCollection) ?? defaultCollection;

  const mergedSettings = mergeTypesenseSettingsDefaults(settings);
  let sortableFields: string[] | undefined;
  if (mergedSettings.sortableFields !== undefined) {
    if (!Array.isArray(mergedSettings.sortableFields)) {
      throw new Error(
        `Typesense settings error (${table.label || table.model}): sortableFields must be an array`
      );
    }
    sortableFields = Array.from(new Set(mergedSettings.sortableFields.map((item: any) => String(item))));
    delete mergedSettings.sortableFields;
  }
  const { schemaSettings, metaSettings } = splitTypesenseSettingsForSchema(mergedSettings, table);

  const schema: any = {
    collection,
    fields: schemaBuild.fields,
  };
  if (sortableFields && sortableFields.length > 0) {
    schema.sortableFields = sortableFields;
  }
  if (Object.keys(schemaSettings).length > 0) {
    schema.settings = schemaSettings;
  }

  applyRidOverrides(view, tagMap);

  const metaCombined: Record<string, any> = {};
  if (Object.keys(metaSettings).length > 0) {
    metaCombined.settings = metaSettings;
  }
  if (Object.keys(schemaBuild.meta).length > 0) {
    metaCombined.fields = schemaBuild.meta;
  }

  return {
    view,
    schema,
    ...(Object.keys(metaCombined).length > 0 ? { meta: metaCombined } : {}),
  };
}

function buildInstanceTypesenseFallback(table: TableAst): any {
  const collection = normalizeTypesenseCollectionName(table.model) ?? table.model;
  return {
    view: {
      name: 'Typesense',
      fields: ['id', 'key', 'instance', 'title', 'status', 'active'],
      functionMode: 'generate',
      function: `view${toPascal(table.label || table.model)}Typesense`,
      as: [{ id: '(<string> record::id($this.id))' }],
    },
    schema: {
      collection,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'key', type: 'string' },
        { name: 'instance', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'active', type: 'bool' },
      ],
      sortableFields: ['title', 'key'],
      settings: {
        enable_nested_fields: true,
        default_sorting_field: 'title',
      },
    },
    meta: {
      settings: {
        queryBy: ['title', 'key', 'instance'],
        queryByWeights: [3, 2, 2],
        filters: ['status', 'active'],
      },
    },
  };
}

function extractTypesenseParenInner(raw: string): string | null {
  const idx = raw.indexOf('(');
  if (idx === -1) return null;
  const info = findEnclosure(raw, '(', ')', idx);
  return info?.inner ?? null;
}

function normalizeTypesenseObjectTags(raw: string): string {
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const start = raw.indexOf('<{', i);
    if (start === -1) {
      out += raw.slice(i);
      break;
    }
    out += raw.slice(i, start);
    let j = start + 2;
    let braceDepth = 1;
    let inString = false;
    for (; j < raw.length; j++) {
      const ch = raw[j] as string;
      const prev = j > 0 ? raw[j - 1] : '';
      if (ch === '"' && prev !== '\\') {
        inString = !inString;
      }
      if (inString) continue;
      if (ch === '{') braceDepth += 1;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      if (braceDepth === 0 && raw[j + 1] === '>') {
        j += 1;
        break;
      }
    }
    const block = raw.slice(start, j + 1).replace(/\r?\n/g, ' ');
    out += block;
    i = j + 1;
  }
  return out;
}

function mergeTypesenseTagsFromParen(inner: string, tagMap: Map<string, string[]>): void {
  const lines = splitTopLevelLines(inner);
  for (const line of lines) {
    const cleaned = stripInlineComment(line).trim().replace(/,\s*$/, '');
    if (!cleaned) continue;
    const match = cleaned.match(/^([A-Za-z_][\w-]*)([!?])?\s*:\s*([\s\S]+)$/);
    if (!match) continue;
    let key = match[1].trim();
    if (!key) continue;
    const optional = match[2] === '?';
    const rhsRaw = match[3].trim();
    const { tags } = extractAngleTags(rhsRaw);
    const expanded = tags
      .flatMap((tag) => splitCommaTopLevel(tag))
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.includes('{') ? tag : tag.toLowerCase()));
    if (optional && !expanded.includes('optional')) expanded.push('optional');
    if (!expanded.includes('facet') && /<\s*facet\s*>/i.test(rhsRaw)) {
      expanded.push('facet');
    }
    if (expanded.length > 0) {
      const current = tagMap.get(key) ?? [];
      tagMap.set(key, Array.from(new Set([...current, ...expanded])));
    }
  }
}

function buildTypesenseAsFallback(inner: string): Array<Record<string, string>> {
  const lines = splitTopLevelLines(inner);
  const out: Array<Record<string, string>> = [];
  for (const line of lines) {
    const cleaned = stripInlineComment(line).trim().replace(/,\s*$/, '');
    if (!cleaned) continue;
    const match = cleaned.match(/^([A-Za-z_][\w-]*)([!?])?\s*:\s*([\s\S]+)$/);
    if (!match) continue;
    const key = match[1].trim();
    const rhsRaw = match[3].trim();
    const rhs = extractAngleTags(rhsRaw).remainder.trim();
    if (!key || !rhs) continue;
    const parts = splitCommaTopLevel(rhs);
    const token = parts[0]?.trim() ?? '';
    if (!token) continue;
    const rawExpr = extractRawViewExpression(token) ?? token;
    out.push({ [key]: rawExpr });
  }
  return out;
}

function parseTypesenseProgramFieldLists(inner: string): Map<string, string[]> {
  const fieldLists = new Map<string, string[]>();
  const lines = splitTopLevelLines(inner);
  for (const line of lines) {
    const cleaned = stripInlineComment(line).trim().replace(/,\s*$/, '');
    if (!cleaned) continue;
    const match = cleaned.match(/^([A-Za-z_][\w-]*)([!?])?\s*:\s*([\s\S]+)$/);
    if (!match) continue;
    const key = match[1]?.trim();
    const rhsRaw = match[3]?.trim() ?? '';
    if (!key || !rhsRaw) continue;
    const rhs = extractAngleTags(rhsRaw).remainder.trim();
    const parts = splitCommaTopLevel(rhs);
    const fieldsToken = parts[1]?.trim();
    if (!fieldsToken) continue;
    const parsed = parseSubSelectFields(fieldsToken);
    if (parsed.includeMode === 'only' && parsed.fields.length > 0) {
      fieldLists.set(key, parsed.fields);
    }
  }
  return fieldLists;
}

function normalizeTypesenseCollectionName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.trim().toLowerCase();
  if (cleaned === 'typesense') {
    return undefined;
  }
  const minLength = typeof appConfig?.typesense?.collectionMinLength === 'number'
    ? appConfig.typesense.collectionMinLength
    : 3;
  if (cleaned.length < minLength) {
    console.warn(`⚠️  Typesense: collection name "${raw}" is too short (min ${minLength}). Ignoring.`);
    return undefined;
  }
  return cleaned;
}

function normalizeTypesenseMain(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'Typesense';
  if (/^fn\b/i.test(trimmed)) {
    return `Typesense::${trimmed}`;
  }
  if (!/^[A-Za-z]/.test(trimmed)) {
    return `Typesense${trimmed}`;
  }
  if (/^typesense\b/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

function mergeTypesenseSettingsDefaults(
  settings: Record<string, any> | undefined
): Record<string, any> {
  const defaults = appConfig?.typesense?.settings ?? {};
  return { ...(defaults as Record<string, any>), ...(settings ?? {}) };
}

function splitTypesenseSettingsForSchema(
  settings: Record<string, any>,
  table: TableAst
): { schemaSettings: Record<string, any>; metaSettings: Record<string, any> } {
  const schemaSettings: Record<string, any> = {};
  const metaSettings: Record<string, any> = {};
  const mapping: Record<string, string> = {
    defaultSortingField: 'default_sorting_field',
    nestedFields: 'enable_nested_fields',
    symbolsToIndex: 'symbols_to_index',
    tokenSeparators: 'token_separators',
  };
  const schemaKeys = new Set([
    'default_sorting_field',
    'enable_nested_fields',
    'symbols_to_index',
    'token_separators',
  ]);

  for (const [key, value] of Object.entries(settings)) {
    if (key === 'collection' || key === 'fields') continue;
    if (key === 'queryBy' || key === 'queryByWeights') {
      if (!Array.isArray(value)) {
        throw new Error(
          `Typesense settings error (${table.label || table.model}): ${key} must be an array`
        );
      }
      if (key === 'queryByWeights') {
        const queryBy = settings.queryBy;
        if (!Array.isArray(queryBy)) {
          throw new Error(
            `Typesense settings error (${table.label || table.model}): queryByWeights requires queryBy (array)`
          );
        }
        if (queryBy.length !== value.length) {
          throw new Error(
            `Typesense settings error (${table.label || table.model}): queryByWeights length must match queryBy length`
          );
        }
        if (!value.every((item) => typeof item === 'number')) {
          throw new Error(
            `Typesense settings error (${table.label || table.model}): queryByWeights must be numbers`
          );
        }
      }
      metaSettings[key] = value;
      continue;
    }
    const mapped = mapping[key] ?? key;
    if (schemaKeys.has(mapped)) {
      if (
        mapped === 'default_sorting_field' &&
        typeof value === 'string' &&
        value.trim().toLowerCase() === 'id'
      ) {
        console.warn(
          `⚠️  Typesense: default_sorting_field cannot be "id" (table: ${table.label || table.model}). Ignoring.`
        );
        continue;
      }
      schemaSettings[mapped] = value;
    } else {
      metaSettings[key] = value;
    }
  }

  return { schemaSettings, metaSettings };
}

function splitTypesenseSettings(raw: string): { main: string; settings?: Record<string, any>; nameOverride?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { main: trimmed };

  const nameMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s*::([\s\S]+)$/);
  if (nameMatch) {
    const nameOverride = nameMatch[1]?.trim();
    const rest = nameMatch[2]?.trim() ?? '';
    const inner = splitTypesenseSettings(rest);
    return { ...inner, nameOverride };
  }

  let inString = false;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i] as string;
    const prev = i > 0 ? trimmed[i - 1] : '';
    if (ch === '"' && prev !== '\\') {
      inString = !inString;
    }
    if (inString) continue;

    if (ch === '(') parenDepth += 1;
    else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (ch === '[') bracketDepth += 1;
    else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (ch === '{' && parenDepth === 0 && bracketDepth === 0) {
      if (braceDepth === 0) startIndex = i;
      braceDepth += 1;
    } else if (ch === '}' && parenDepth === 0 && bracketDepth === 0 && braceDepth > 0) {
      braceDepth -= 1;
      if (braceDepth === 0) endIndex = i + 1;
    }
  }

  if (startIndex !== -1 && endIndex !== -1) {
    const tail = trimmed.slice(endIndex).trim();
    if (!tail || tail === ',' || tail === ';') {
      const block = trimmed.slice(startIndex, endIndex);
      try {
        const parsed = parseJsObject(block);
        return { main: trimmed.slice(0, startIndex).trim(), settings: parsed.value };
      } catch {
        const loose = parseSettingsBlockLoose(block);
        if (loose) {
          return { main: trimmed.slice(0, startIndex).trim(), settings: loose };
        }
        return { main: trimmed };
      }
    }
  }

  return { main: trimmed };
}

function parseSettingsBlockLoose(raw: string): Record<string, any> | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return {};
  let parts = splitCommaTopLevel(inner);
  if (parts.length === 1 && inner.includes('\n')) {
    parts = inner
      .split(/\n+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  const out: Record<string, any> = {};
  for (const part of parts) {
    const cleaned = stripInlineComment(part).trim();
    if (!cleaned) continue;
    const idx = cleaned.indexOf(':');
    if (idx === -1) continue;
    const key = cleaned.slice(0, idx).trim();
    const valueRaw = cleaned.slice(idx + 1).trim();
    if (!key || !valueRaw) continue;
    try {
      const parsed = parseJsValue(valueRaw, 0);
      out[key] = parsed.value;
    } catch {
      out[key] = valueRaw;
    }
  }
  return out;
}

function mergeDeep(base: any, override: any): any {
  if (override === undefined) return base;
  if (base === undefined) return override;
  if (Array.isArray(base) && Array.isArray(override)) {
    return override;
  }
  if (isPlainObject(base) && isPlainObject(override)) {
    const out: Record<string, any> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      out[key] = mergeDeep(base[key], value);
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

function parseTypesenseTags(raw: string): Map<string, string[]> {
  const tagMap = new Map<string, string[]>();
  const entries = splitViewEntries(raw);
  if (entries.length === 0) return tagMap;
  const entry = entries[0];

  const includeIndex = entry.indexOf('[');
  if (includeIndex !== -1) {
    const includeInfo = findEnclosure(entry, '[', ']', includeIndex);
    if (includeInfo?.inner !== undefined) {
      const parts = splitCommaTopLevel(includeInfo.inner);
      for (const part of parts) {
        const { tags, remainder } = extractAngleTags(part);
        let cleaned = remainder.replace(/<\s*fetch\s*>/gi, '').trim();
        if (!cleaned) continue;
        let optional = false;
        if (cleaned.endsWith('?')) {
          optional = true;
          cleaned = cleaned.slice(0, -1).trim();
        } else if (cleaned.endsWith('!')) {
          cleaned = cleaned.slice(0, -1).trim();
        }
        const expanded = tags
          .flatMap((tag) => splitCommaTopLevel(tag))
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => (tag.includes('{') ? tag : tag.toLowerCase()));
        if (optional) expanded.push('optional');
        if (expanded.length > 0) {
          tagMap.set(cleaned, expanded);
        }
      }
    }
  }

  const parenIndex = entry.indexOf('(');
  if (parenIndex !== -1) {
    const parenInfo = findEnclosure(entry, '(', ')', parenIndex);
    if (parenInfo?.inner !== undefined) {
      const lines = splitTopLevelLines(parenInfo.inner);
      let lastKey: string | null = null;
      for (const line of lines) {
        const cleanedLine = stripInlineComment(line).trim().replace(/,\s*$/, '');
        if (!cleanedLine) continue;
        let idx = cleanedLine.indexOf(':');
        if (idx === -1 && cleanedLine.includes(',')) {
          const parts = splitCommaTopLevel(cleanedLine);
          const keyCandidate = parts[0]?.trim() ?? '';
          if (/^[A-Za-z_][\\w-]*$/.test(keyCandidate)) {
            const rest = parts.slice(1).join(',').trim();
            if (rest) {
              const synthetic = `${keyCandidate}: ${rest}`;
              idx = synthetic.indexOf(':');
              if (idx !== -1) {
                const key = keyCandidate;
                const rhsRaw = synthetic.slice(idx + 1).trim();
                let { tags } = extractAngleTags(rhsRaw);
                if (tags.length === 0 && rhsRaw.includes(',')) {
                  const afterComma = rhsRaw.slice(rhsRaw.indexOf(',') + 1).trim();
                  tags = extractAngleTags(afterComma).tags;
                }
                const expanded = tags
                  .flatMap((tag) => splitCommaTopLevel(tag))
                  .map((tag) => tag.trim())
                  .filter(Boolean)
                  .map((tag) => (tag.includes('{') ? tag : tag.toLowerCase()));
                if (!expanded.includes('facet') && /<\s*facet\s*>/i.test(rhsRaw)) {
                  expanded.push('facet');
                }
                if (expanded.length > 0) {
                  tagMap.set(key, expanded);
                } else if (key && !tagMap.has(key)) {
                  tagMap.set(key, []);
                }
                lastKey = key;
                continue;
              }
            }
          }
        }
        if (idx === -1) {
          if (lastKey) {
            const { tags } = extractAngleTags(cleanedLine);
            const expanded = tags
              .flatMap((tag) => splitCommaTopLevel(tag))
              .map((tag) => tag.trim())
              .filter(Boolean)
              .map((tag) => (tag.includes('{') ? tag : tag.toLowerCase()));
            if (expanded.length > 0) {
              const current = tagMap.get(lastKey) ?? [];
              tagMap.set(lastKey, Array.from(new Set([...current, ...expanded])));
            }
          }
          continue;
        }
        let key = cleanedLine.slice(0, idx).trim();
        let optional = false;
        if (key.endsWith('?')) {
          optional = true;
          key = key.slice(0, -1).trim();
        } else if (key.endsWith('!')) {
          key = key.slice(0, -1).trim();
        }
        const rhsRaw = cleanedLine.slice(idx + 1).trim();
        let { tags } = extractAngleTags(rhsRaw);
        if (tags.length === 0 && rhsRaw.includes(',')) {
          const afterComma = rhsRaw.slice(rhsRaw.indexOf(',') + 1).trim();
          tags = extractAngleTags(afterComma).tags;
        }
        const expanded = tags
          .flatMap((tag) => splitCommaTopLevel(tag))
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => (tag.includes('{') ? tag : tag.toLowerCase()));
        if (optional) expanded.push('optional');
        if (!expanded.includes('facet') && /<\s*facet\s*>/i.test(rhsRaw)) {
          expanded.push('facet');
        }
        if (expanded.length > 0) {
          tagMap.set(key, expanded);
        } else if (key && !tagMap.has(key)) {
          tagMap.set(key, []);
        }
        lastKey = key || lastKey;
      }
    }
  }

  return tagMap;
}

function buildTypesenseSchemaFields(
  view: any,
  fields: FieldDef[],
  tagMap: Map<string, string[]>
): { fields: Array<Record<string, any>>; meta: Record<string, any> } {
  const fieldMap = new Map<string, FieldDef>();
  for (const field of fields) {
    fieldMap.set(field.name, field);
  }

  const schemaFields: Array<Record<string, any>> = [];
  const seen = new Set<string>();
  const metaFields: Record<string, any> = {};

  const addField = (name: string) => {
    if (!name || seen.has(name)) return;
    const tags = tagMap.get(name) ?? [];
    const objectTag = tags.find((tag) => {
      if (!tag.includes('{')) return false;
      const lower = tag.trim().toLowerCase();
      return (
        lower.startsWith('{') ||
        lower.startsWith('object') ||
        lower.startsWith('array<object') ||
        lower.startsWith('array< object') ||
        lower.startsWith('array<{') ||
        lower.startsWith('array< {')
      );
    });
    const parsedObject = objectTag ? parseTypesenseObjectTag(objectTag) : null;
    const type = parsedObject?.type ?? resolveTypesenseType(fieldMap.get(name), tags);
    const entry: Record<string, any> = { name, type };
    if (tags.includes('facet')) entry.facet = true;
    if (tags.includes('optional')) entry.optional = true;
    if (parsedObject?.fields && parsedObject.fields.length > 0) {
      let objectFields = parsedObject.fields;
      let objectMeta = parsedObject.meta;
      const programLists: Map<string, string[]> | undefined = view?.__programFieldLists;
      const allowed = programLists?.get(name);
      if (allowed && allowed.length > 0) {
        objectFields = objectFields.filter((field) => allowed.includes(field.name));
        if (objectMeta) {
          const nextMeta: Record<string, any> = {};
          for (const key of Object.keys(objectMeta)) {
            if (allowed.includes(key)) {
              nextMeta[key] = objectMeta[key];
            }
          }
          objectMeta = nextMeta;
        }
      }
      entry.fields = objectFields;
      if (objectMeta && Object.keys(objectMeta).length > 0) {
        parsedObject.meta = objectMeta;
      }
    }
    const fieldMeta = extractTypesenseFieldMeta(tags);
    if (Object.keys(fieldMeta).length > 0 || parsedObject?.meta) {
      metaFields[name] = {
        ...(Object.keys(fieldMeta).length > 0 ? fieldMeta : {}),
        ...(parsedObject?.meta ? { fields: parsedObject.meta } : {}),
      };
    }
    schemaFields.push(entry);
    seen.add(name);
  };

  for (const entry of view.fields ?? []) {
    if (typeof entry === 'string') {
      addField(entry);
    }
  }

  for (const entry of view.as ?? []) {
    if (typeof entry === 'string') {
      const key = entry.split(':')[0]?.trim();
      if (key) addField(key);
    } else if (entry && typeof entry === 'object') {
      const key = Object.keys(entry)[0];
      if (key) addField(key);
    }
  }

  for (const key of tagMap.keys()) {
    addField(key);
  }

  return { fields: schemaFields, meta: metaFields };
}

function resolveTypesenseType(field: FieldDef | undefined, tags: string[]): string {
  const explicit = tags.find((tag) =>
    ['string', 'string[]', 'int32', 'int64', 'float', 'bool', 'object', 'object[]'].includes(tag)
  );
  if (explicit) return explicit;
  if (tags.some((tag) => tag.replace(/\s+/g, '') === 'array<string>')) return 'string[]';
  if (tags.includes('rid')) return 'string';

  const type = (field?.type ?? '').toString().toLowerCase();
  if (type.includes('array')) return 'string[]';
  if (type.includes('record')) return 'string';
  if (type === 'boolean' || type === 'bool') return 'bool';
  if (type === 'number' || type === 'int' || type === 'int32' || type === 'int64') return 'int32';
  if (type === 'float' || type === 'double') return 'float';
  if (type === 'object') return 'object';
  return 'string';
}

function extractTypesenseFieldMeta(tags: string[]): Record<string, any> {
  const meta: Record<string, any> = {};
  const infixTag = tags.find((tag) => tag.startsWith('infix'));
  if (infixTag) {
    const value = infixTag.split(':')[1]?.trim();
    meta.infix = value || true;
  }
  const sortTag = tags.find((tag) => tag.startsWith('sort'));
  if (sortTag) {
    const value = sortTag.split(':')[1]?.trim();
    meta.sort = value || true;
  }
  const highlightTag = tags.find((tag) => tag.startsWith('highlight'));
  if (highlightTag) {
    const value = highlightTag.split(':')[1]?.trim();
    meta.highlight = value || true;
  }
  return meta;
}

function parseTypesenseObjectTag(tag: string): { type: string; fields: Array<Record<string, any>>; meta: Record<string, any> } | null {
  const cleaned = tag.trim();
  const braceIndex = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (braceIndex === -1 || lastBrace === -1 || lastBrace <= braceIndex) {
    return null;
  }

  const typePart = cleaned.slice(0, braceIndex).trim().toLowerCase();
  const suffix = cleaned.slice(lastBrace + 1).trim();
  const isArray =
    typePart.includes('object[]') ||
    typePart.startsWith('array<object') ||
    typePart.startsWith('array< object') ||
    typePart.startsWith('array<{') ||
    typePart.startsWith('array< {') ||
    suffix.startsWith('[]');
  const type = isArray ? 'object[]' : 'object';
  const inner = cleaned.slice(braceIndex + 1, lastBrace).trim();
  if (!inner) return { type, fields: [], meta: {} };

  const parts = splitCommaTopLevel(inner);
  const fields: Array<Record<string, any>> = [];
  const meta: Record<string, any> = {};
  let lastField: Record<string, any> | null = null;
  for (const part of parts) {
    const segment = part.trim();
    if (!segment) continue;

    if (segment.startsWith('<') && segment.endsWith('>') && lastField) {
      const { tags } = extractAngleTags(segment);
      const fieldMeta = applyObjectFieldTags(lastField, tags);
      if (Object.keys(fieldMeta).length > 0) {
        meta[lastField.name] = fieldMeta;
      }
      continue;
    }

    const idx = segment.indexOf(':');
    if (idx === -1) continue;
    let name = segment.slice(0, idx).trim();
    const specRaw = segment.slice(idx + 1).trim();
    if (!name || !specRaw) continue;

    let optional = false;
    if (name.endsWith('?')) {
      optional = true;
      name = name.slice(0, -1).trim();
    } else if (name.endsWith('!')) {
      name = name.slice(0, -1).trim();
    }

    const { spec, tags } = extractTrailingTypesenseTags(specRaw);
    const fieldType = resolveTypesenseTypeFromSpec(spec);
    const field: Record<string, any> = { name, type: fieldType };
    if (optional) field.optional = true;
    const fieldMeta = applyObjectFieldTags(field, tags);
    if (Object.keys(fieldMeta).length > 0) {
      meta[name] = fieldMeta;
    }
    fields.push(field);
    lastField = field;
  }

  return { type, fields, meta };
}

function extractTrailingTypesenseTags(raw: string): { spec: string; tags: string[] } {
  let spec = raw.trim();
  const tags: string[] = [];
  while (spec.endsWith('>')) {
    const gt = spec.lastIndexOf('>');
    const lt = spec.lastIndexOf('<', gt);
    if (lt === -1) break;
    const tag = spec.slice(lt + 1, gt).trim();
    const tagLower = tag.toLowerCase();
    if (
      tagLower === 'facet' ||
      tagLower === 'optional' ||
      tagLower.startsWith('infix') ||
      tagLower.startsWith('sort') ||
      tagLower.startsWith('highlight')
    ) {
      tags.push(tagLower);
      spec = spec.slice(0, lt).trim();
      continue;
    }
    break;
  }
  return { spec, tags: tags.reverse() };
}

function applyObjectFieldTags(field: Record<string, any>, tags: string[]): Record<string, any> {
  const expanded = tags
    .flatMap((tag) => splitCommaTopLevel(tag))
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.toLowerCase());
  if (expanded.includes('facet')) field.facet = true;
  if (expanded.includes('optional')) field.optional = true;
  return extractTypesenseFieldMeta(expanded);
}

function resolveTypesenseTypeFromSpec(spec: string): string {
  const trimmed = spec.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('enum<')) return 'string';
  if (lower.startsWith('record<')) return 'string';
  if (lower.startsWith('datetime')) return 'string';
  if (lower === 'string') return 'string';
  if (lower === 'string[]' || lower.startsWith('array<string')) return 'string[]';
  if (lower === 'int32' || lower === 'int64' || lower === 'number' || lower === 'int') return 'int32';
  if (lower === 'float' || lower === 'double') return 'float';
  if (lower === 'bool' || lower === 'boolean') return 'bool';
  if (lower === 'object' || lower === 'object[]') return lower;
  return 'string';
}

function applyRidOverrides(view: any, tagMap: Map<string, string[]>): void {
  const ridFields = Array.from(tagMap.entries())
    .filter(([, tags]) => tags.includes('rid'))
    .map(([name]) => name);
  if (ridFields.length === 0) return;

  const asEntries: Array<Record<string, string>> = [];
  const existingAs = Array.isArray(view.as) ? view.as : [];
  for (const entry of existingAs) {
    if (typeof entry === 'string') {
      const key = entry.split(':')[0]?.trim();
      if (key && ridFields.includes(key)) {
        continue;
      }
    } else if (entry && typeof entry === 'object') {
      const key = Object.keys(entry)[0];
      if (key && ridFields.includes(key)) {
        continue;
      }
    }
    asEntries.push(entry as any);
  }

  for (const fieldName of ridFields) {
    const baseExpr = fieldName === 'id'
      ? 'record::id($this.id)'
      : `record::id($this.${fieldName})`;
    const expr = `(<string> ${baseExpr})`;
    asEntries.push({ [fieldName]: expr });
  }

  if (Array.isArray(view.fields)) {
    view.fields = view.fields.filter((entry: any) => typeof entry !== 'string' || !ridFields.includes(entry));
  }

  view.as = asEntries;
}

type ParsedViewSpec = {
  name: string;
  includeMode: 'all' | 'only' | 'exclude';
  fields: string[];
  asPairs: Array<Record<string, string>>;
  fetchFields: string[];
  fieldOverrides?: Record<string, string>;
  functionName?: string;
  functionMode?: 'generate' | 'reference';
};

function parseRichViews(raw: string, table?: TableAst): ParsedViewSpec[] {
  const trimmed = raw.trim();
  // Support wrapper views(...) syntax
  const body =
    trimmed.startsWith('views(') && trimmed.endsWith(')')
      ? trimmed.slice('views('.length, -1)
      : trimmed;

  const entries = splitViewEntries(body);
  const results: ParsedViewSpec[] = [];

  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    // Name + include block + options block
    // Syntax examples:
    //   Admin[](as: foo)
    //   Public![](post: select ..., as: bar)
    //   Typesense[*](as: baz)
    //   Typesense::initUserResourceTypesense(<ID>)

    const nameMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    let rest = trimmed.slice(name.length).trim();

    let functionMode: ParsedViewSpec['functionMode'];
    if (rest.startsWith('::')) {
      const functionSpec = rest.slice(2).trim();
      if (/^fn\b/i.test(functionSpec)) {
        // Typesense::fn[...](...) -> generate a view function from the projection
        rest = functionSpec.replace(/^fn\b/i, '').trim();
        functionMode = 'generate';
      } else {
        const fnMatch = functionSpec.match(/^([A-Za-z_][\w:]*)\s*(\((.*)\))?$/);
        if (fnMatch && fnMatch[1]) {
          results.push({
            name,
            includeMode: 'only',
            fields: [],
            asPairs: [],
            fetchFields: [],
            functionName: fnMatch[1].trim(),
            functionMode: 'reference',
          });
          continue;
        }
      }
    }

    let includeMode: 'all' | 'only' | 'exclude' = 'all';
    let includeFields: string[] = [];
    let fetchFields: string[] = [];
    let asPairs: Array<Record<string, string>> = [];
    let fieldOverrides: Record<string, string> | undefined;

    // Handle include block: optional leading !
    let excludeMode = false;
    if (rest.startsWith('!')) {
      excludeMode = true;
      rest = rest.slice(1).trim();
    }

    const includeMatch = rest.match(/^\[(.*?)\]/);
    if (includeMatch) {
      const content = includeMatch[1].trim();
      rest = rest.slice(includeMatch[0].length).trim();

      const parsed = parseViewFieldSelector(content, excludeMode);
      includeMode = parsed.includeMode;
      includeFields = parsed.fields;
      fetchFields = parsed.fetchFields;
      fieldOverrides = Object.keys(parsed.fieldOverrides).length > 0 ? parsed.fieldOverrides : undefined;
    } else {
      // No include block: default to id only
      includeMode = 'only';
      includeFields = [];
      fetchFields = [];
    }

    // Options block in parentheses (allow trailing comma after closing paren)
    rest = rest.replace(/,\s*$/, '').trim();
    const optsMatch = rest.match(/^\(([\s\S]*)\)$/);
    if (optsMatch) {
      const inner = optsMatch[1];
      const programAs = table ? parseViewProgramEntries(inner, table) : [];
      if (programAs.length > 0) {
        asPairs = programAs;
      } else {
        asPairs = parseAsPairs(inner);
      }
    }

    results.push({
      name,
      includeMode: includeMode === 'exclude' && includeFields.length === 0 ? 'all' : includeMode,
      fields: includeFields,
      asPairs,
      fetchFields,
      fieldOverrides,
      functionMode,
    });
  }

  return results;
}

function parseViewFieldSelector(
  content: string,
  excludeMode: boolean
): { includeMode: 'all' | 'only' | 'exclude'; fields: string[]; fetchFields: string[]; fieldOverrides: Record<string, string> } {
  const trimmed = content.trim();
  if (!trimmed || trimmed === '*') {
    return {
      includeMode: excludeMode ? 'exclude' : 'all',
      fields: [],
      fetchFields: [],
      fieldOverrides: {},
    };
  }

  const fields: string[] = [];
  const fetchFields: string[] = [];
  const fieldOverrides: Record<string, string> = {};
  const parts = splitCommaTopLevel(trimmed);
  for (const part of parts) {
    const raw = part.trim();
    if (!raw) continue;
    const fetch = /<\s*fetch\s*>/i.test(raw);
    const cleanedRaw = raw.replace(/<\s*fetch\s*>/gi, '').trim();
    const { remainder: cleaned } = extractAngleTags(cleanedRaw);
    const overrideMatch = cleaned.match(/^([A-Za-z_][\w-]*)\s*\(([\s\S]+)\)$/);
    if (overrideMatch && overrideMatch[1]) {
      const name = overrideMatch[1].trim();
      const expr = overrideMatch[2]?.trim() ?? '';
      if (name && expr) {
        fieldOverrides[name] = expr;
      }
      continue;
    }
    let name = cleaned;
    if (name.endsWith('?') || name.endsWith('!')) {
      name = name.slice(0, -1).trim();
    }
    if (!name) continue;
    fields.push(name);
    if (fetch) fetchFields.push(name);
  }

  return {
    includeMode: excludeMode ? 'exclude' : 'only',
    fields,
    fetchFields,
    fieldOverrides,
  };
}

function parseViewProgramEntries(inner: string, table: TableAst): Array<Record<string, string>> {
  const lines = splitTopLevelLines(inner);
  const out: Array<Record<string, string>> = [];
  const subTableLabelMap = new Map<string, string>();
  for (const sub of table.subTables) {
    if (sub.model) {
      subTableLabelMap.set(sub.model, sub.label);
    }
  }

  for (const line of lines) {
    let cleaned = stripInlineComment(line).trim().replace(/,\s*$/, '');
    if (!cleaned) continue;
    if (cleaned.startsWith('#') || cleaned.startsWith('//')) continue;
    if (!cleaned.includes(':') && cleaned.includes(',')) {
      const parts = splitCommaTopLevel(cleaned);
      const keyCandidate = parts[0]?.trim() ?? '';
      if (/^[A-Za-z_][\w-]*$/.test(keyCandidate)) {
        const rest = parts.slice(1).join(',').trim();
        if (rest) {
          cleaned = `${keyCandidate}: ${rest}`;
        }
      }
    }
    const match = cleaned.match(/^([A-Za-z_][\w-]*)([!?])?\s*:\s*([\s\S]+)$/);
    if (!match) continue;
    const keyRaw = match[1].trim();
    const key = keyRaw;
    const rhsRaw = match[3].trim();
    const rhs =
      rhsRaw.startsWith('(') && rhsRaw.endsWith(')')
        ? rhsRaw
        : extractAngleTags(rhsRaw).remainder;
    if (!key || !rhs) continue;

    const parts = splitCommaTopLevel(rhs);
    const programToken = parts[0]?.trim() ?? '';
    if (!programToken) continue;

    const program = parseViewProgramToken(programToken);
    if (!program) {
      const rawExpr = extractRawViewExpression(programToken);
      if (rawExpr) {
        out.push({ [key]: rawExpr });
      }
      continue;
    }

    const fieldsToken = parts[1]?.trim() ?? '[*]';
    const parsedFields = parseSubSelectFields(fieldsToken);

    if (program.kind === 'ST') {
      const selectExpr = buildSubSelectExpression({
        model: program.model,
        fields: parsedFields,
        mode: program.many ? 'submany' : 'subsingle',
        edgeTable: resolveEdgeTableName(program.model, subTableLabelMap),
      });
      out.push({ [key]: selectExpr });
      continue;
    }

    if (program.kind === 'RID') {
      const ridExpr = normalizeRidArg(program.arg);
      const selectExpr = buildSubSelectExpression({
        model: program.model,
        fields: parsedFields,
        mode: 'rid',
        ridExpr,
      });
      out.push({ [key]: selectExpr });
      continue;
    }

    if (program.kind === 'PID') {
      const baseArg = normalizeRidArg(program.arg);
      const usesPid =
        program.raw === true ||
        !program.arg ||
        /^id$/i.test(program.arg.trim()) ||
        /^parent$/i.test(program.arg.trim());
      const ridExpr = usesPid ? `fn::PID(${baseArg})` : baseArg;
      const selectExpr = buildSubSelectExpression({
        model: program.model || 'p',
        fields: parsedFields,
        mode: usesPid ? 'rid-raw' : 'rid',
        ridExpr,
      });
      out.push({ [key]: selectExpr });
      continue;
    }

    if (program.kind === 'EDGE') {
      const selectExpr = buildSubSelectExpression({
        model: program.model,
        fields: parsedFields,
        mode: program.direction === 'right' ? 'edge-right' : 'edge-left',
        edgeTable: program.edgeTable,
      });
      out.push({ [key]: selectExpr });
      continue;
    }
  }

  return out;
}

function extractRawViewExpression(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  if (
    trimmed.startsWith('$') ||
    trimmed.includes('$this.') ||
    lower.startsWith('select ') ||
    lower.startsWith('return ') ||
    lower.startsWith('let ') ||
    lower.startsWith('if ')
  ) {
    return trimmed;
  }
  return null;
}

type ViewProgramToken =
  | { kind: 'ST'; model: string; many: boolean }
  | { kind: 'RID'; model: string; arg?: string }
  | { kind: 'PID'; model: string; arg?: string; raw?: boolean }
  | { kind: 'EDGE'; model: string; edgeTable: string; direction: 'right' | 'left' };

function parseViewProgramToken(token: string): ViewProgramToken | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const pidMatch = trimmed.match(/^PID(?:\((.*)\))?$/i);
  if (pidMatch) {
    const arg = pidMatch[1]?.trim();
    return { kind: 'PID', model: '', arg, raw: true };
  }

  const edgeRight = trimmed.match(/^->([A-Za-z0-9_]+)->([A-Za-z0-9_]+)$/);
  if (edgeRight && edgeRight[1] && edgeRight[2]) {
    return {
      kind: 'EDGE',
      edgeTable: edgeRight[1].trim(),
      model: normalizeModelName(edgeRight[2].trim()),
      direction: 'right',
    };
  }

  const edgeLeft = trimmed.match(/^<-([A-Za-z0-9_]+)<-([A-Za-z0-9_]+)$/);
  if (edgeLeft && edgeLeft[1] && edgeLeft[2]) {
    return {
      kind: 'EDGE',
      edgeTable: edgeLeft[1].trim(),
      model: normalizeModelName(edgeLeft[2].trim()),
      direction: 'left',
    };
  }

  const legacySt = trimmed.match(/^(\*?)ST\s*<\s*([^>]+)\s*>$/i);
  if (legacySt && legacySt[2]) {
    return {
      kind: 'ST',
      model: normalizeModelName(legacySt[2].trim()),
      many: legacySt[1] === '*',
    };
  }

  const pipeMatch = trimmed.match(/^(\*?)([A-Za-z_][\w-]*)\s*\|\s*([A-Za-z0-9_]+)\s*(?:\((.*)\))?$/);
  if (!pipeMatch || !pipeMatch[2] || !pipeMatch[3]) return null;

  const star = pipeMatch[1] === '*';
  const program = pipeMatch[2].trim().toUpperCase();
  const model = normalizeModelName(pipeMatch[3].trim());
  const arg = pipeMatch[4]?.trim();

  if (program === 'ST') {
    return { kind: 'ST', model, many: star };
  }
  if (program === 'RID') {
    return { kind: 'RID', model, arg };
  }
  if (program === 'PID') {
    return { kind: 'PID', model, arg };
  }

  return null;
}

function resolveEdgeTableName(model: string, labelMap: Map<string, string>): string {
  const label = labelMap.get(model);
  return toPascal(label ?? model);
}

function normalizeRidArg(raw?: string): string {
  if (!raw) return '$this.id';
  const trimmed = raw.trim();
  if (!trimmed) return '$this.id';
  const lowered = trimmed.toLowerCase();
  if (lowered === 'id' || lowered === 'parent') {
    return '$this.id';
  }
  if (trimmed.startsWith('$')) {
    const field = trimmed.slice(1).trim();
    return field ? `$this.${field}` : '$this.id';
  }
  return trimmed;
}

type SubSelectFields = {
  includeMode: 'all' | 'only' | 'exclude';
  fields: string[];
  fetchFields: string[];
  asPairs: Array<Record<string, string>>;
};

function parseSubSelectFields(raw: string): SubSelectFields {
  let trimmed = raw.trim();
  if (!trimmed) {
    return { includeMode: 'all', fields: [], fetchFields: [], asPairs: [] };
  }

  let asPairs: Array<Record<string, string>> = [];
  let listPart = trimmed;
  const bracketIdx = trimmed.indexOf(']');
  if (bracketIdx !== -1) {
    listPart = trimmed.slice(0, bracketIdx + 1).trim();
    const rest = trimmed.slice(bracketIdx + 1).trim();
    if (rest.startsWith('(') && rest.endsWith(')')) {
      const inner = rest.slice(1, -1).trim();
      asPairs = parseAsPairs(inner);
    }
  }

  let excludeMode = false;
  if (listPart.startsWith('!')) {
    excludeMode = true;
    listPart = listPart.slice(1).trim();
  }

  const match = listPart.match(/^\[(.*)\]$/);
  const content = match ? match[1].trim() : '';
  if (!content || content === '*') {
    return { includeMode: excludeMode ? 'exclude' : 'all', fields: [], fetchFields: [], asPairs };
  }

  const fields: string[] = [];
  const fetchFields: string[] = [];
  let hasStar = false;
  const parts = splitCommaTopLevel(content);
  for (const part of parts) {
    const rawField = part.trim();
    if (!rawField) continue;
    const fetch = /<\s*fetch\s*>/i.test(rawField);
    const name = rawField.replace(/<\s*fetch\s*>/gi, '').trim();
    if (!name) continue;
    if (name === '*') {
      hasStar = true;
      continue;
    }
    fields.push(name);
    if (fetch) fetchFields.push(name);
  }

  if (hasStar && !excludeMode) {
    return { includeMode: 'all', fields: [], fetchFields, asPairs };
  }

  return { includeMode: excludeMode ? 'exclude' : 'only', fields, fetchFields, asPairs };
}

function buildSubSelectExpression(input: {
  model: string;
  fields: SubSelectFields;
  mode: 'subsingle' | 'submany' | 'rid' | 'rid-raw' | 'edge-right' | 'edge-left';
  edgeTable?: string;
  ridExpr?: string;
}): string {
  const { model, fields, mode, edgeTable, ridExpr } = input;
  const selectParts: string[] = [];
  const fetchSet = new Set(fields.fetchFields);

  if (fields.includeMode === 'exclude') {
    if (fields.fields.length > 0) {
      selectParts.push(`* omit ${fields.fields.join(', ')}`);
    } else {
      selectParts.push('*');
    }
  } else if (fields.includeMode === 'only') {
    if (fields.fields.length > 0) {
      for (const field of fields.fields) {
        if (fetchSet.has(field)) {
          selectParts.push(`(select * from only $this.${field}) as ${field}`);
        } else {
          selectParts.push(field);
        }
      }
    } else {
      selectParts.push('*');
    }
  } else {
    selectParts.push('*');
  }

  for (const fetchField of fetchSet) {
    if (fields.includeMode !== 'only') {
      selectParts.push(`(select * from only $this.${fetchField}) as ${fetchField}`);
    }
  }

  for (const pair of fields.asPairs) {
    for (const [alias, expr] of Object.entries(pair)) {
      if (!alias || expr === undefined) continue;
      const value = String(expr).trim();
      if (!value) continue;
      selectParts.push(`(${value}) as ${alias}`);
    }
  }

  const selectList = selectParts.join(', ');

  if (mode === 'submany') {
    const edge = edgeTable ?? toPascal(model);
    return `(select ${selectList} from ${model} where <-(${edge} where in = $parent.id))`;
  }

  if (mode === 'edge-right') {
    const edge = edgeTable ?? toPascal(model);
    return `(select ${selectList} from ${model} where <-(${edge} where in = $parent.id))`;
  }

  if (mode === 'edge-left') {
    const edge = edgeTable ?? toPascal(model);
    return `(select ${selectList} from ${model} where ->(${edge} where out = $parent.id))`;
  }

  if (mode === 'rid') {
    const rid = ridExpr ?? '$this.id';
    return `(select ${selectList} from only type::record("${model}", ${rid}))`;
  }

  if (mode === 'rid-raw') {
    const rid = ridExpr ?? '$this.id';
    return `(select ${selectList} from only ${rid})`;
  }

  return `(select ${selectList} from only type::record('${model}', $this.id))`;
}

function parseAsPairs(body: string): Array<Record<string, string>> {
  const parts = splitCommaTopLevelPreserveSelect(body);
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const idx = p.indexOf(':');
      if (idx === -1) {
        return { [p.trim()]: '' };
      }
      const key = p.slice(0, idx).trim();
      if (key.startsWith('#') || key.startsWith('//')) {
        return {};
      }
      const val = stripOuterQuotes(p.slice(idx + 1).trim());
      return { [key]: val };
    });
}

function stripOuterQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function buildCrud(mask: string) {
  const crud: any = {};
  if (mask.includes('C')) {
    crud.create = {
      enabled: true,
      name: 'create__NAME__',
      params: [{ name: 'payload', type: 'object' }],
    };
  }
  if (mask.includes('U')) {
    crud.update = {
      enabled: true,
      name: 'update__NAME__',
      params: [
        { name: 'rid', type: 'record' },
        { name: 'payload', type: 'object' },
      ],
    };
  }
  if (mask.includes('D')) {
    crud.delete = {
      enabled: true,
      name: 'delete__NAME__',
      params: [{ name: 'rid', type: 'record' }],
    };
  }
  return crud;
}

function collectIndexes(tableModel: string, fields: FieldDef[]) {
  const out: any[] = [];
  for (const f of fields) {
    for (const tag of f.tags) {
      if (tag.kind === 'unique') {
        out.push({
          name: toPascal(`${tableModel}_${f.name}_unique`),
          mode: 'OVERWRITE',
          fields: [f.name],
          unique: true,
        });
      } else if (tag.kind === 'index') {
        out.push({
          name: toPascal(`${tableModel}_${f.name}_idx`),
          mode: 'OVERWRITE',
          fields: [f.name],
        });
      } else if (tag.kind === 'count') {
        out.push({
          name: toPascal(`${tableModel}_${f.name}_count`),
          mode: 'OVERWRITE',
          fields: [f.name],
          count: true,
        });
      } else if (tag.kind === 'fulltext') {
        out.push({
          name: toPascal(`${tableModel}_${f.name}_ft`),
          mode: 'OVERWRITE',
          fields: [f.name],
          fulltext: {
            analyzer: tag.analyzer ?? 'english',
            bm25: tag.bm25,
            highlights: tag.highlights,
          },
        });
      }
    }
  }
  return out;
}

function inferTypeFromDefault(val: any): string {
  if (Array.isArray(val)) return 'array';
  if (val === null) return 'any';
  switch (typeof val) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'bool';
    case 'object':
      return 'object';
    default:
      return 'string';
  }
}

function flagVal(name: string): string | undefined {
  const idx = args.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (idx === -1) return undefined;
  if (args[idx].includes('=')) return args[idx].split('=').slice(1).join('=');
  return args[idx + 1];
}

function flagBool(name: string): boolean {
  return args.includes(name);
}

function loadAppConfig(filePath: string): any | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return YAML.parse(raw);
  } catch {
    return null;
  }
}

function toPascal(str: string): string {
  return str
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function toCamel(str: string): string {
  const pascal = toPascal(str);
  return pascal ? pascal.charAt(0).toLowerCase() + pascal.slice(1) : '';
}

function buildGroupDirName(table: TableAst): string {
  const base = `${toPascal(table.label)}(${table.model})`;
  // Prevent accidental path traversal / nested dirs if a model ever contains separators.
  return base.replace(/[\\/]/g, '-').replace(/:/g, '');
}

function resolveOutRoot(table: TableAst): string {
  const target = table.caps.moduleTarget?.trim();
  if (!target) return OUT;
  return path.resolve(MODULES_ROOT, target, MODULE_SPECS_OVERRIDE_DIR);
}

function resolveSpecFileName(
  model: string,
  tableType?: TableAst['tableType'],
  parentModel?: string
): string {
  const resolvedType = tableType ?? (parentModel ? 'subsingle' : 'primary');
  const suffix = resolvedType === 'submany' ? 'st.many' : resolvedType === 'subsingle' ? 'st' : 'primary';
  return `${model}.${suffix}.yaml`;
}

function buildFieldMeta(field: FieldDef): Record<string, any> {
  const baseType = field.type ?? inferTypeFromDefault(field.defaultValue);
  const { type, options } = formatProgramTypeAndOptions(baseType, field.options);

  const meta: Record<string, any> = {
    type,
    ...(field.required ? { required: true } : {}),
    ...(field.defaultValue !== undefined ? { default: field.defaultValue } : {}),
    ...(options ? { options } : {}),
    ...(field.assign ? { assign: true } : {}),
    ...(field.ignorePayload ? { ignorePayload: true } : {}),
  };

  if (field.children && field.children.length > 0) {
    const nested: Record<string, any> = {};
    for (const child of field.children) {
      nested[child.name] = buildFieldMeta(child);
    }
    meta.fields = nested;
  }

  return meta;
}


function formatProgramTypeAndOptions(
  type: string,
  options?: Record<string, any>
): { type: string; options?: Record<string, any> } {
  const lowered = type.toLowerCase();
  if (lowered === 'md5' && options && typeof options.value === 'string') {
    const fieldName = extractFieldRefName(options.value);
    if (fieldName) {
      const { value, ...rest } = options;
      const nextOptions = Object.keys(rest).length > 0 ? rest : undefined;
      return {
        type: `md5<$${fieldName}>`,
        ...(nextOptions ? { options: nextOptions } : {}),
      };
    }
  }

  return { type, ...(options ? { options } : {}) };
}

function extractFieldRefName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('$')) {
    return trimmed.slice(1).trim() || null;
  }
  const fieldMatch = trimmed.match(/^<\s*field\s*:\s*([^>]+)\s*>$/i);
  if (fieldMatch && fieldMatch[1]) {
    return fieldMatch[1].trim();
  }
  const angleMatch = trimmed.match(/^<\s*([^>]+)\s*>$/);
  if (angleMatch && angleMatch[1]) {
    return angleMatch[1].trim();
  }
  return null;
}

const isDirectRun = (() => {
  if (!process.argv[1]) return false;
  const entry = path.resolve(process.argv[1]);
  const self = fileURLToPath(import.meta.url);
  return entry === self;
})();

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
