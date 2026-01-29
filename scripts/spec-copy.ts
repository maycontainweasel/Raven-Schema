import fs from 'fs-extra';
import path from 'path';

const [arg] = process.argv.slice(2);

const root = process.cwd();
const stageRoot = path.resolve(root, 'config', 'specs_stage');
const liveRoot = path.resolve(root, 'config', 'specs');

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function parseFolderName(folder: string): { label: string; model: string } | null {
  const match = folder.match(/^(.+)\((.+)\)$/);
  if (!match || !match[1] || !match[2]) return null;
  return { label: match[1], model: match[2] };
}

async function main(): Promise<void> {
  if (!arg) {
    console.error('Usage: pnpm run spec:copy <label|model|FolderName>');
    process.exitCode = 1;
    return;
  }

  const entries = await fs.readdir(stageRoot, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  if (dirs.length === 0) {
    console.error(`No specs found in ${path.relative(root, stageRoot)}.`);
    process.exitCode = 1;
    return;
  }

  const target = normalize(arg);
  const matches = dirs.filter((dir) => {
    const normalizedDir = normalize(dir);
    if (normalizedDir === target) return true;

    const parsed = parseFolderName(dir);
    if (!parsed) return false;
    if (normalize(parsed.label) === target) return true;
    if (normalize(parsed.model) === target) return true;
    return false;
  });

  if (matches.length === 0) {
    console.error(`No spec folder match for "${arg}".`);
    console.error(`Available: ${dirs.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  if (matches.length > 1) {
    console.error(`Multiple matches for "${arg}": ${matches.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const folder = matches[0] as string;
  const source = path.join(stageRoot, folder);
  const destination = path.join(liveRoot, folder);

  await fs.ensureDir(liveRoot);
  await fs.copy(source, destination, { overwrite: true });
  console.log(`✅ Copied ${path.relative(root, source)} -> ${path.relative(root, destination)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
