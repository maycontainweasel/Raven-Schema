import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { parseFile, TableAst, SubTableStub, EdgeDef } from './mpdg-to-spec';

type ModelNode = { key: string; label: string };

const ROOT = path.resolve(__dirname, '..');
const APP_CONFIG_PATH = path.join(ROOT, 'config', 'app.config.yaml');

const appConfigRaw = fs.readFileSync(APP_CONFIG_PATH, 'utf8');
const appConfig = yaml.parse(appConfigRaw) ?? {};
const graphConfig = appConfig.graph ?? {};

const inputRel: string = graphConfig.input ?? 'config/graph.mpdg';
const outputFileName: string = graphConfig.output ?? 'graph.ts';
const mermaidFileName: string = graphConfig.mermaidOutput ?? 'graph.mmd';

const INPUT = path.join(ROOT, inputRel);
const OUTPUT = path.join(path.dirname(INPUT), outputFileName);
const MERMAID = path.join(path.dirname(INPUT), mermaidFileName);

const text = fs.readFileSync(INPUT, 'utf8');
const tables = parseFile(text);

function toIdentifier(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

function toPascalCase(input: string): string {
  return input
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join('');
}

const modelLabelByName = new Map<string, string>();

function registerModel(table: TableAst | SubTableStub) {
  modelLabelByName.set(table.model, table.label);
}

tables.forEach((t) => {
  registerModel(t);
  (t.subTables ?? []).forEach(registerModel);
});

const modelNodes: Map<string, ModelNode> = new Map();
const relNodes: Map<string, string> = new Map();
const edgesLines: string[] = [];
const edgeKeys: Set<string> = new Set();
const groupMap: Record<string, Set<string>> = {};
const manyTargetNodes: Set<string> = new Set();

function addModelNode(key: string, label: string) {
  if (modelNodes.has(key)) return;
  modelNodes.set(key, { key, label });
}

function addRelationNode(key: string, label: string) {
  if (relNodes.has(key)) return;
  relNodes.set(key, label);
}

function resolveModelLabel(model: string): string {
  return modelLabelByName.get(model) ?? toPascalCase(model);
}

function addSubTableEdges(parent: TableAst, sub: SubTableStub) {
  const parentKey = toIdentifier(parent.model);
  const subKey = toIdentifier(sub.model);
  const relKey = toIdentifier(`rel_${parent.model}_${sub.model}`);
  addRelationNode(relKey, sub.label || sub.model);
  edgesLines.push(`${parentKey} --->|in| ${relKey}`);
  const outLabel = sub.tableType === 'submany' ? 'out many' : 'out';
  edgesLines.push(`${relKey} --->|${outLabel}| ${subKey}`);
  if (sub.tableType === 'submany') {
    manyTargetNodes.add(subKey);
  }
  if (!groupMap[parent.model]) groupMap[parent.model] = new Set();
  groupMap[parent.model].add(relKey);
}

function addEdgeLines(ownerModel: string, edge: EdgeDef) {
  const inModel = edge.in === '__SELF__' ? ownerModel : edge.in;
  const outModel = edge.out === '__SELF__' ? ownerModel : edge.out;
  const edgeKey = `${edge.table}:${inModel}:${outModel}`;
  if (edgeKeys.has(edgeKey)) return;
  edgeKeys.add(edgeKey);

  const inKey = toIdentifier(inModel);
  const outKey = toIdentifier(outModel);

  if (!modelNodes.has(inKey)) {
    addModelNode(inKey, `${resolveModelLabel(inModel)} (${inModel})`);
  }
  if (!modelNodes.has(outKey)) {
    addModelNode(outKey, `${resolveModelLabel(outModel)} (${outModel})`);
  }

  const relKey = toIdentifier(`rel_${edge.table}_${inModel}_${outModel}`);
  addRelationNode(relKey, edge.table);
  edgesLines.push(`${inKey} --->|in| ${relKey}`);
  edgesLines.push(`${relKey} --->|out| ${outKey}`);
}

function collectEdges(table: TableAst) {
  for (const edge of table.edges ?? []) {
    addEdgeLines(table.model, edge);
  }
  for (const sub of table.subTables ?? []) {
    for (const edge of sub.edges ?? []) {
      addEdgeLines(sub.model, edge);
    }
  }
  collectRelationEdges(table);
  for (const sub of table.subTables ?? []) {
    collectRelationEdges(sub as any);
  }
}

function collectRelationEdges(table: TableAst | SubTableStub) {
  const raw = (table as any)?.caps?.rawRelations;
  if (!raw) return;
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (const lineRaw of lines) {
    const cleaned = lineRaw.replace(/,\s*$/, '').trim();
    if (!cleaned || cleaned.startsWith('//') || cleaned.startsWith('#')) continue;
    const header = cleaned.split('{')[0].split('|')[0].trim();
    const match = header.match(/^([\w-]+)\s*->\s*([\w-]+)\s*->\s*([\w-]+)$/);
    if (!match) continue;
    const inModel = match[1];
    const edgeTable = match[2];
    const outModel = match[3];
    addEdgeLines(inModel, { dir: 'has', table: edgeTable, in: inModel, out: outModel });
  }
}

for (const tbl of tables) {
  const tableKey = toIdentifier(tbl.model);
  addModelNode(tableKey, `${tbl.label} (${tbl.model})`);
  if (!groupMap[tbl.model]) groupMap[tbl.model] = new Set();
  groupMap[tbl.model].add(tableKey);

  for (const sub of tbl.subTables ?? []) {
    const subKey = toIdentifier(sub.model);
    addModelNode(subKey, `${sub.label} (${sub.model})`);
    groupMap[tbl.model].add(subKey);
    addSubTableEdges(tbl, sub);
  }

  collectEdges(tbl);
}

const header =
  `// Auto-generated from ${path.relative(ROOT, INPUT)}. Do not edit manually.\n` +
  '// Run: pnpm run graph:mermaid\n\n';

const body = tables
  .map((tbl) => {
    const identifier = toIdentifier(tbl.model);
    const json = JSON.stringify(tbl, null, 2);
    return `export const ${identifier} = ${json} as const;\n`;
  })
  .join('\n');

fs.writeFileSync(OUTPUT, header + body, 'utf8');

// Mermaid generation
const mermaidLines: string[] = [];
mermaidLines.push('flowchart LR');
mermaidLines.push('    %% Colors %%');
mermaidLines.push('    classDef model color:white,stroke:cyan,stroke-width:1px');
mermaidLines.push('    classDef modelMany fill:#fff4cc,stroke:#d4a017,stroke-width:1px,color:#2d2d2d');
mermaidLines.push('    classDef rel color:yellow,stroke:yellow,stroke-width:1px');
mermaidLines.push('');
mermaidLines.push('%% Models %%');

const emittedNodes = new Set<string>();

for (const tbl of tables) {
  const groupId = `${toIdentifier(tbl.model)}_group`;
  if ((tbl.subTables ?? []).length > 0) {
    mermaidLines.push(`    subgraph ${groupId} ["${tbl.label}"]`);
    const tableKey = toIdentifier(tbl.model);
    const parentNode = modelNodes.get(tableKey);
    if (parentNode) {
      mermaidLines.push(`        ${parentNode.key}["${parentNode.label}"]:::model`);
      emittedNodes.add(parentNode.key);
    }
    for (const sub of tbl.subTables ?? []) {
      const subKey = toIdentifier(sub.model);
      const subNode = modelNodes.get(subKey);
      if (subNode) {
        mermaidLines.push(`        ${subNode.key}["${subNode.label}"]:::model`);
        emittedNodes.add(subNode.key);
      }
    }
    for (const nodeKey of groupMap[tbl.model] ?? []) {
      if (emittedNodes.has(nodeKey)) continue;
      const relLabel = relNodes.get(nodeKey);
      if (relLabel) {
        mermaidLines.push(`        ${nodeKey}["${relLabel}"]:::rel`);
        emittedNodes.add(nodeKey);
      }
    }
    mermaidLines.push('    end');
  }
}

for (const node of modelNodes.values()) {
  if (emittedNodes.has(node.key)) continue;
  mermaidLines.push(`    ${node.key}["${node.label}"]:::model`);
  emittedNodes.add(node.key);
}

if (manyTargetNodes.size > 0) {
  mermaidLines.push('');
  mermaidLines.push('%% Many Targets %%');
  for (const nodeKey of manyTargetNodes) {
    mermaidLines.push(`    class ${nodeKey} modelMany;`);
  }
}

mermaidLines.push('');
mermaidLines.push('%% REL %%');
for (const [relKey, relLabel] of relNodes.entries()) {
  if (emittedNodes.has(relKey)) continue;
  mermaidLines.push(`    ${relKey}["${relLabel}"]:::rel`);
  emittedNodes.add(relKey);
}

mermaidLines.push('');
mermaidLines.push('%% Relate %%');
for (const line of edgesLines) {
  mermaidLines.push(`    ${line}`);
}

fs.writeFileSync(MERMAID, mermaidLines.join('\n'), 'utf8');
console.log(`Wrote mermaid graph to ${path.relative(ROOT, MERMAID)}`);
