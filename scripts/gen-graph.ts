import fs from "fs";
import path from "path";
import yaml from "yaml";

type IdKind = "default" | "field" | "parent" | "template" | "array" | "object";

type IdPart = {
  type: "record" | "field" | "literal";
  value: string;
};

type IdDef = {
  kind: IdKind;
  field?: string;
  ref?: string;
  template?: string;
  parts?: IdPart[];
  name: string;
  type: string;
};

type SubTable = {
  name: string;
  table: string;
  label: string;
  plural: string;
  description?: string;
  id: IdDef;
  edge: boolean;
  edges: Edge[];
};

type Table = {
  table: string;
  label: string;
  plural: string;
  description?: string;
  id: IdDef;
  subtables: SubTable[];
  edges: Edge[];
};

type Edge = {
  table: string;
  in: string;
  out: string;
  cardinality: "single" | "many";
  id: IdDef;
};

const ROOT = path.resolve(__dirname, "..");
const APP_CONFIG_PATH = path.join(ROOT, "config", "app.config.yaml");

const appConfigRaw = fs.readFileSync(APP_CONFIG_PATH, "utf8");
const appConfig = yaml.parse(appConfigRaw) ?? {};
const graphConfig = appConfig.graph ?? {};

const inputRel: string = graphConfig.input ?? "config/graph.txt";
const outputFileName: string = graphConfig.output ?? "schema.graph.ts";
const mermaidFileName: string = graphConfig.mermaidOutput ?? "graph.mmd";

const INPUT = path.join(ROOT, inputRel);
const OUTPUT = path.join(path.dirname(INPUT), outputFileName);
const MERMAID = path.join(path.dirname(INPUT), mermaidFileName);

const lines = fs.readFileSync(INPUT, "utf8").split(/\r?\n/);

const tables: Table[] = [];
const stack: Array<{ indent: number; target: Table | SubTable | Edge }> = [];
const tableNames = new Set<string>();

function toPascalCase(input: string): string {
  return input
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("");
}

function defaultIdName(label: string): string {
  return `${toPascalCase(label)}Id`;
}

function cleanIdToken(token: string): string {
  return token.replace(/[<>{}]/g, "").trim();
}

function parseId(valueRaw: string, fallbackName: string): IdDef {
  let value = valueRaw.trim();
  let type = "string";

  const asMatch = value.match(/^(.*)\s+as\s+(.+)$/i);
  if (asMatch) {
    value = asMatch[1].trim();
    type = asMatch[2].trim();
  }

  // Field based ID e.g. <email>
  if (/^<.*>$|^<.*$/.test(value)) {
    const field = cleanIdToken(value);
    return { kind: "field", field, name: fallbackName, type };
  }

  // Object style {A, B} or {UserId}
  const obj = value.match(/^\{(.+)\}$/);
  if (obj) {
    const inner = obj[1];
    const parts = inner
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map<IdPart>((p) => {
        const val = cleanIdToken(p);
        const isId = /id$/i.test(val);
        return { type: isId ? "record" : "literal", value: val };
      });
    return { kind: "object", parts, name: fallbackName, type };
  }

  // Template string surrounded by backticks
  const tmpl = value.match(/^`(.+)`$/);
  if (tmpl) {
    return { kind: "template", template: tmpl[1], name: fallbackName, type };
  }

  // Array style [A, B]
  const list = value.match(/^\[(.+)\]$/);
  if (list) {
    const parts = list[1]
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map<IdPart>((p) => {
        const val = cleanIdToken(p);
        const isId = /id$/i.test(val);
        return { type: isId ? "record" : "literal", value: val };
      });
    return { kind: "array", parts, name: fallbackName, type };
  }

  if (value && value !== "default") {
    return { kind: "parent", ref: value, name: fallbackName, type };
  }

  return { kind: "default", name: fallbackName, type };
}

function toIdentifier(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}

function parseTableLine(content: string) {
  const match = content.match(/^T\(([^)]+),\s*([^)]+)\)\s*(?:\|\s*(.*))?$/);
  if (!match) return null;

  const labelPart = match[1].trim();
  const [labelRaw, pluralRaw] = labelPart.split("|").map((s) => s.trim());
  const label = labelRaw;
  const plural = pluralRaw || undefined;
  const table = match[2].trim();
  const description = match[3]?.trim();

  const idName = defaultIdName(label);
  const tableObj: Table = {
    table,
    label,
    plural,
    description,
    id: { kind: "default", name: idName, type: "string" },
    subtables: [],
    edges: [],
  };

  return tableObj;
}

function parseSubTableLine(content: string, parent: Table | undefined) {
  if (!parent) return null;

  const match = content.match(
    /^(?:[A-Za-z0-9_]+:)?:?ST\(([^)]+),\s*([^)]+)\)\s*(?:\|\s*(.*))?$/
  );
  if (!match) return null;

  const labelPart = match[1].trim();
  const [labelRaw, pluralRaw] = labelPart.split("|").map((s) => s.trim());
  const label = labelRaw;
  const plural = pluralRaw || undefined;
  const table = match[2].trim();
  const description = match[3]?.trim();

  const parentIdName = parent.id?.name || defaultIdName(parent.label);

  const idName = defaultIdName(label);
  const sub: SubTable = {
    name: label,
    table,
    label,
    plural,
    description,
    edge: true,
    edges: [],
    id: {
      kind: "parent",
      ref: parentIdName,
      name: idName,
      type: "string",
    },
  };

  return sub;
}

function parseEdgeLine(
  content: string,
  current: Table | SubTable | undefined
): Edge | null {
  if (!current || !("table" in current)) return null;
  const ctx: any = current;

  const edgeMatch = content.match(
    /^:E(\-\>|<\-)(?:\(([^)]+)\)|([A-Za-z0-9_]+))\s*(?:as\s+([A-Za-z0-9_]+))?/i
  );
  if (!edgeMatch) return null;

  const dirSymbol = edgeMatch[1];
  const paramsRaw = (edgeMatch[2] || edgeMatch[3] || "").trim();
  const edgeTable = edgeMatch[4]?.trim();

  const params = paramsRaw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const targetTable = params[0];
  const cardinality = (params[1] || "single").toLowerCase() === "many" ? "many" : "single";

  const direction: "out" | "in" = dirSymbol === "->" ? "out" : "in";
  const fromTable = ctx.table as string;
  const inTable = direction === "out" ? fromTable : targetTable;
  const outTable = direction === "out" ? targetTable : fromTable;

  const defaultEdgeTable =
    edgeTable ||
    `${toPascalCase(ctx.label || fromTable)}${toPascalCase(targetTable)}`;

  const currentLabel = ctx.label || ctx.table;
  const findIdName = (tbl: string, labelHint?: string) => {
    const found = tables.find((t) => t.table === tbl);
    return found?.id.name || defaultIdName(labelHint || tbl);
  };

  const inFound = tables.find((t) => t.table === inTable);
  const outFound = tables.find((t) => t.table === outTable);

  const inLabel = inFound?.label || inTable;
  const outLabel = outFound?.label || outTable;

  const inIdName = findIdName(inTable, inLabel);
  const outIdName = findIdName(outTable, outLabel);

  const defaultEdgeIdName = `${toPascalCase(inLabel)}${toPascalCase(outLabel)}Id`;

  const ensureIdToken = (token: string) =>
    token.endsWith(".id") ? token : `${token}.id`;

  const edge: Edge = {
    table: defaultEdgeTable,
    in: inTable,
    out: outTable,
    cardinality,
    id: {
      kind: "template",
      template: `${ensureIdToken(inIdName)}-${ensureIdToken(outIdName)}`,
      name: defaultEdgeIdName,
      type: "string",
    },
  };

  return edge;
}

for (const rawLine of lines) {
  const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;
  const content = rawLine.trim();
  if (!content) continue;
  if (content.startsWith("#") || content.startsWith("//")) continue;

  // Close contexts whose indent is >= current line
  while (stack.length && stack[stack.length - 1].indent >= indent) {
    stack.pop();
  }

  // Table definition
  if (content.startsWith("T(")) {
    const tbl = parseTableLine(content);
    if (tbl) {
      if (tableNames.has(tbl.table)) {
        throw new Error(
          `Duplicate table name "${tbl.table}" encountered. Please ensure each T(...) uses a unique table identifier.`
        );
      }
      tableNames.add(tbl.table);
      tables.push(tbl);
      stack.push({ indent, target: tbl });
    }
    continue;
  }

  // Edge definition
  if (content.startsWith(":E")) {
    const parent = stack[stack.length - 1]?.target;
    if (parent && "edges" in (parent as any)) {
      const edge = parseEdgeLine(content, parent as Table | SubTable);
      if (edge) {
        (parent as any).edges.push(edge);
        stack.push({ indent, target: edge });
      }
    }
    continue;
  }

  // Subtable definition
  if (content.includes("ST(")) {
    const parent = stack[stack.length - 1]?.target;
    if (parent && "subtables" in (parent as Table)) {
      const sub = parseSubTableLine(content, parent as Table);
      if (sub) {
        (parent as Table).subtables.push(sub);
        stack.push({ indent, target: sub });
      }
    }
    continue;
  }

  // Commands (id, idName)
  const target = stack[stack.length - 1]?.target as any;
  if (!target || !("id" in target)) continue;

  const idNameMatch = content.match(/^:idName\s+is\s+(.+)$/i);
  if (idNameMatch) {
    const name = idNameMatch[1].trim();
    target.id.name = name;
    continue;
  }

  const idMatch = content.match(/^:id\s+is\s+(.+)$/i);
  if (idMatch) {
    const fallback = target.id?.name
      ? target.id.name
      : target.label
        ? defaultIdName(target.label)
        : target.table
          ? defaultIdName(target.table)
          : "Id";
    const parsed = parseId(idMatch[1], fallback);
    const name = target.id?.name || parsed.name;
    target.id = { ...parsed, name };
    continue;
  }
}

const header =
  `// Auto-generated from ${path.relative(ROOT, INPUT)}. Do not edit manually.\n` +
  "// Run: pnpm run graph\n\n";

const body = tables
  .map((tbl) => {
    const identifier = toIdentifier(tbl.table);
    const json = JSON.stringify(tbl, null, 2);
    return `export const ${identifier} = ${json} as const;\n`;
  })
  .join("\n");

fs.writeFileSync(OUTPUT, header + body, "utf8");

console.log(
  `Wrote ${tables.length} table definition${tables.length === 1 ? "" : "s"} to ${path.relative(
    ROOT,
    OUTPUT
  )}`
);

// Mermaid generation
const modelNodes: Array<{ key: string; label: string }> = [];
const relNodes: Set<string> = new Set();
const groupMap: Record<string, Set<string>> = {}; // parent table -> node keys in subgraph
const edgesLines: string[] = [];

function addModelNode(key: string, label: string, tableName: string, idName?: string) {
  const safeKey = toIdentifier(key);
  modelNodes.push({ key: safeKey, label: `${label} (${tableName})` });
}

// collect models (tables + subtables)
for (const tbl of tables) {
  addModelNode(tbl.table, tbl.label, tbl.table, tbl.id?.name);
  if (!groupMap[tbl.table]) groupMap[tbl.table] = new Set();
  groupMap[tbl.table].add(toIdentifier(tbl.table));
  for (const sub of tbl.subtables) {
    addModelNode(sub.table, sub.label, sub.table, sub.id?.name);
    groupMap[tbl.table].add(toIdentifier(sub.table));
  }
}

// collect rel nodes and edges
for (const tbl of tables) {
  // implicit parent -> sub edges if edge flag true
  for (const sub of tbl.subtables) {
    if (sub.edge !== false) {
      const inTable = tbl.table;
      const outTable = sub.table;
      const relName = sub.label || sub.table;
      relNodes.add(relName);
      const relKey = toIdentifier(relName);
      groupMap[tbl.table].add(relKey); // keep implicit sub relation inside group
      edgesLines.push(`${toIdentifier(inTable)} --->|in| ${relKey}`);
      edgesLines.push(`${relKey} --->|out| ${toIdentifier(outTable)}`);
    }
  }

  for (const e of tbl.edges) {
    relNodes.add(e.table);
    const inKey = toIdentifier(e.in);
    const outKey = toIdentifier(e.out);
    const relKey = toIdentifier(e.table);
    const outLabel =
      e.cardinality === "many" ? "out (many)" : "out";
    edgesLines.push(`${inKey} --->|in| ${relKey}`);
    edgesLines.push(`${relKey} --->|${outLabel}| ${outKey}`);
  }
}

const mermaidLines: string[] = [];
mermaidLines.push("flowchart LR");
mermaidLines.push("    %% Colors %%");
mermaidLines.push("    classDef model color:white,stroke:cyan,stroke-width:1px");
mermaidLines.push("    classDef rel color:yellow,stroke:yellow,stroke-width:1px");
mermaidLines.push("");
mermaidLines.push("%% Models %%");
const emittedModels = new Set<string>();
for (const tbl of tables) {
  if (tbl.subtables.length > 0) {
    const groupId = `${toIdentifier(tbl.table)}_group`;
    mermaidLines.push(`    subgraph ${groupId} ["${tbl.label}"]`);
    const parentKey = toIdentifier(tbl.table);
    if (!emittedModels.has(parentKey)) {
      const parentNode = modelNodes.find((m) => m.key === parentKey);
      if (parentNode) {
        mermaidLines.push(`        ${parentNode.key}["${parentNode.label}"]:::model`);
        emittedModels.add(parentKey);
      }
    }
    for (const sub of tbl.subtables) {
      const subKey = toIdentifier(sub.table);
      if (!emittedModels.has(subKey)) {
        const subNode = modelNodes.find((m) => m.key === subKey);
        if (subNode) {
          mermaidLines.push(`        ${subNode.key}["${subNode.label}"]:::model`);
          emittedModels.add(subKey);
        }
      }
    }
    // relation nodes that belong in this group (implicit sub edges)
    for (const nodeKey of groupMap[tbl.table]) {
      if (emittedModels.has(nodeKey)) continue;
      const relLabel = Array.from(relNodes).find((r) => toIdentifier(r) === nodeKey);
      if (relLabel) {
        mermaidLines.push(`        ${nodeKey}["${relLabel}"]:::rel`);
        emittedModels.add(nodeKey);
      }
    }
    mermaidLines.push("    end");
  }
}
for (const m of modelNodes) {
  if (!emittedModels.has(m.key)) {
    mermaidLines.push(`    ${m.key}["${m.label}"]:::model`);
    emittedModels.add(m.key);
  }
}
mermaidLines.push("");
mermaidLines.push("%% REL %%");
for (const r of Array.from(relNodes)) {
  const rKey = toIdentifier(r);
  mermaidLines.push(`    ${rKey}["${r}"]:::rel`);
}
mermaidLines.push("");
mermaidLines.push("%% Relate %%");
for (const line of edgesLines) {
  mermaidLines.push("    " + line);
}

fs.writeFileSync(MERMAID, mermaidLines.join("\n"), "utf8");
console.log(`Wrote mermaid graph to ${path.relative(ROOT, MERMAID)}`);
