#!/usr/bin/env node
// @ts-check
const fs = require("fs");
const path = require("path");

/**
 * @typedef {{table:string, in:string, out:string}} Edge
 * @typedef {{file:string, name?:string, model?:string, has:Edge[], belongs:Edge[]}} ParsedFile
 */

function extractEdgesLiteral(src) {
  const idx = src.indexOf("export const edges");
  if (idx < 0) return null;
  const rest = src.slice(idx);
  const start = rest.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < rest.length; i++) {
    const ch = rest[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) {
      const literal = rest.slice(start, i + 1);
      try {
        const obj = Function("return " + literal)();
        return {
          has: obj.has || [],
          belongs: obj.belongs || [],
        };
      } catch {
        return null;
      }
    }
  }
  return null;
}

function findModel(src) {
  const m = src.match(/model:\s*'([^']+)'/);
  if (m) return m[1];
  return undefined;
}

function findName(src) {
  const n = src.match(/name:\s*'([^']+)'/);
  if (n) return n[1];
  return undefined;
}

/**
 * @param {string} migrationsDir
 * @returns {ParsedFile[]}
 */
function parseAll(migrationsDir) {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".ts"));
  const parsed = [];
  for (const file of files) {
    const full = path.join(migrationsDir, file);
    const src = fs.readFileSync(full, "utf8");
    const edgesObj = extractEdgesLiteral(src) || { has: [], belongs: [] };
    const model = findModel(src);
    const name = findName(src);
    parsed.push({
      file,
      name,
      model,
      has: edgesObj.has || [],
      belongs: edgesObj.belongs || [],
    });
  }
  return parsed;
}

/**
 * @param {ParsedFile[]} parsed
 */
function toGraphEdges(parsed) {
  const lines = [];
  for (const p of parsed) {
    const label = p.name || p.file.replace(/\.ts$/,'');
    const model = p.model || label;
    lines.push(`# ${p.file}`);
    lines.push(`T(${label.replace(/\\s+/g,' ')}, ${model})`);
    for (const h of p.has) {
      lines.push(`:E->(${h.out}) as ${h.table}`);
    }
    for (const b of p.belongs) {
      lines.push(`:E<-(${b.in}) as ${b.table}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function main() {
  const ROOT = path.resolve(__dirname, "..");
  const migrationsDir = path.resolve(ROOT, "..", "surreal-db-tools", "src", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.error(`Migrations directory not found at ${migrationsDir}`);
    process.exit(1);
  }
  const parsed = parseAll(migrationsDir);
  const output = toGraphEdges(parsed);
  process.stdout.write(output);
}

main();
