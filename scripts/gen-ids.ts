import fs from "fs";
import path from "path";
import yaml from "yaml";

type IdPart = { type: "record" | "field" | "literal"; value: string };
type IdDef = {
  kind: "default" | "field" | "parent" | "template" | "array" | "object";
  field?: string;
  ref?: string;
  template?: string;
  parts?: IdPart[];
  name: string;
  type: string;
};

type SubTable = {
  table: string;
  label: string;
  id: IdDef;
};

type Edge = { table: string; id: IdDef };

type Table = {
  table: string;
  label: string;
  id: IdDef;
  subtables: SubTable[];
  edges: Edge[];
};

const ROOT = path.resolve(__dirname, "..");
const APP_CONFIG_PATH = path.join(ROOT, "config", "app.config.yaml");
const appConfig = yaml.parse(fs.readFileSync(APP_CONFIG_PATH, "utf8")) ?? {};
const graphCfg = appConfig.graph ?? {};
const graphDir = graphCfg.input ? path.dirname(graphCfg.input) : "config";
const graphFile = graphCfg.output ?? "graph.ts";
const graphTsPath = path.join(ROOT, graphDir, path.basename(graphFile));
const idsOutDir = path.join(ROOT, "config", "generated");
const idsOutFile = path.join(idsOutDir, "ids.ts");

function loadGraphObjects(filePath: string): Table[] {
  const src = fs.readFileSync(filePath, "utf8");
  const regex = /export const (\w+)\s*=\s*([\s\S]*?)as const;/g;
  const tables: Table[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(src)) !== null) {
    const objLiteral = m[2];
    const obj = Function(`"use strict"; return (${objLiteral});`)();
    tables.push(obj);
  }
  return tables;
}

function sanitize(name: string): string {
  const trimmed = name.replace(/^\*/, "").replace(/\.id$/i, "");
  return trimmed.replace(/[^a-zA-Z0-9_]/g, "_");
}

function zodForId(def: IdDef): { expr: string; imports: Set<string> } {
  const imports = new Set<string>();
  const t = def.type || "string";
  const simple = () => (t.toLowerCase() === "string" ? "z.string()" : "z.any()");

  switch (def.kind) {
    case "field":
    case "default":
      return { expr: simple(), imports };
    case "parent": {
      // When an ID is derived from a parent RecordID, Surreal stores only the parent.id string.
      return { expr: "z.string()", imports };
    }
    case "template":
      return { expr: "z.string()", imports };
    case "array": {
      const parts = def.parts ?? [];
      const partExprs = parts.map((p, idx) => {
        if (p.type === "record") {
          const ref = sanitize(p.value);
          imports.add(ref + "_z");
          return `${ref}_z`;
        }
        return "z.string()";
      });
      return { expr: `z.tuple([${partExprs.join(", ")}])`, imports };
    }
    case "object": {
      const parts = def.parts ?? [];
      const lines = parts.map((p, idx) => {
        if (p.type === "record") {
          const ref = sanitize(p.value);
          imports.add(ref + "_z");
          return `  k${idx}: ${ref}_z`;
        }
        return `  k${idx}: z.string()`;
      });
      return { expr: `z.object({\n${lines.join(",\n")}\n})`, imports };
    }
    default:
      return { expr: "z.any()", imports };
  }
}

function generate() {
  const tables = loadGraphObjects(graphTsPath);
  fs.mkdirSync(idsOutDir, { recursive: true });

  const lines: string[] = [];
  const imports = new Set<string>();
  lines.push(`import { z } from 'zod';`);
  lines.push("");
  lines.push(`export const RecordID_z = z.object({ tb: z.string(), id: z.any() });`);
  lines.push(`export type RecordID = z.infer<typeof RecordID_z>;`);
  lines.push("");

  const done = new Set<string>();

  function emitId(def: IdDef, tb: string, label: string) {
    const name = sanitize(def.name || `${label}Id`);
    if (done.has(name)) return;
    const { expr, imports: deps } = zodForId(def);
    deps.forEach((d) => imports.add(d));
    lines.push(`export const ${name}_z = RecordID_z.extend({`);
    lines.push(`  tb: z.literal('${tb}'),`);
    lines.push(`  id: ${expr},`);
    lines.push(`});`);
    lines.push(`export type ${name} = z.infer<typeof ${name}_z>;`);
    lines.push("");
    done.add(name);
  }

  for (const tbl of tables) {
    emitId(tbl.id, tbl.table, tbl.label);
    for (const sub of tbl.subtables ?? []) emitId(sub.id, sub.table, sub.label);
    for (const e of tbl.edges ?? []) emitId(e.id, e.table, e.table);
  }

  // add imports now (self file - so skip)
  fs.writeFileSync(idsOutFile, lines.join("\n"), "utf8");
  console.log(`Wrote ${path.relative(ROOT, idsOutFile)}`);
}

generate();
