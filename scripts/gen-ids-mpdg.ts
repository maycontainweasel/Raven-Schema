import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { parseFile, TableAst, FieldDef } from './mpdg-to-spec';

const ROOT = path.resolve(__dirname, '..');
const APP_CONFIG_PATH = path.join(ROOT, 'config', 'app.config.yaml');
const appConfig = yaml.parse(fs.readFileSync(APP_CONFIG_PATH, 'utf8')) ?? {};
const graphCfg = appConfig.graph ?? {};

const graphFile = graphCfg.input ?? 'config/graph.mpdg';
const graphPath = path.join(ROOT, graphFile);

const idsOutDir = path.join(ROOT, 'config', 'generated');
const idsOutFile = path.join(idsOutDir, 'ids.ts');

function toPascalCase(input: string): string {
  return input
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join('');
}

function idNameFromLabel(label: string): string {
  return `${toPascalCase(label)}Id`;
}

function findIdField(table: TableAst): FieldDef | undefined {
  return (table.fields ?? []).find((f) => f.name === 'id');
}

function resolveIdSchema(idField?: FieldDef): string {
  if (!idField) return 'z.string()';
  if (idField.idKind === 'template') return 'z.string()';
  if (idField.idKind === 'default') return 'z.string()';
  if (idField.idKind === 'parent') return 'z.string()';
  if (idField.idKind === 'field') {
    const source = idField.idSource ?? '';
    if (source.startsWith('stringID<')) return 'z.string()';
    return 'z.string()';
  }
  return 'z.string()';
}

function emitId(
  lines: string[],
  done: Set<string>,
  tableName: string,
  label: string,
  idField?: FieldDef
) {
  const name = idNameFromLabel(label);
  if (done.has(name)) return;
  const expr = resolveIdSchema(idField);
  lines.push(`export const ${name}_z = RecordID_z.extend({`);
  lines.push(`  tb: z.literal('${tableName}'),`);
  lines.push(`  id: ${expr},`);
  lines.push(`});`);
  lines.push(`export type ${name} = z.infer<typeof ${name}_z>;`);
  lines.push('');
  done.add(name);
}

const text = fs.readFileSync(graphPath, 'utf8');
const tables = parseFile(text);

fs.mkdirSync(idsOutDir, { recursive: true });

const lines: string[] = [];
lines.push(`import { z } from 'zod';`);
lines.push('');
lines.push(`export const RecordID_z = z.object({ tb: z.string(), id: z.any() });`);
lines.push(`export type RecordID = z.infer<typeof RecordID_z>;`);
lines.push('');

const done = new Set<string>();

for (const table of tables) {
  emitId(lines, done, table.model, table.label, findIdField(table));

  for (const sub of table.subTables ?? []) {
    emitId(lines, done, sub.model, sub.label, (sub.fields ?? []).find((f) => f.name === 'id'));
  }
}

fs.writeFileSync(idsOutFile, lines.join('\n'), 'utf8');
console.log(`Wrote ${path.relative(ROOT, idsOutFile)}`);
