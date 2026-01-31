import path from 'path';
import { stat, mkdir, readdir, copyFile, rm } from 'fs/promises';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

type MigrateOptions = {
  projectRoot: string;
  from?: string;
  to?: string;
  move?: boolean;
  overwrite?: boolean;
  yes?: boolean;
  skipServer?: boolean;
};

type CopyDecision = 'overwrite' | 'skip' | 'overwrite-all' | 'skip-all';

export async function runSiteMigrate(options: MigrateOptions): Promise<void> {
  const projectRoot = options.projectRoot;
  const repoRoot = path.resolve(projectRoot, '..', '..');

  const fromInput = options.from?.trim();
  const toInput = options.to?.trim();

  if (!fromInput || !toInput) {
    throw new Error('Both source and target are required for site:migrate.');
  }

  const sourceRoot = await resolveAppPath(fromInput, repoRoot);
  const targetRoot = await resolveAppPath(toInput, repoRoot);

  if (path.resolve(sourceRoot) === path.resolve(targetRoot)) {
    throw new Error('Source and target cannot be the same path.');
  }

  const sourceExists = await stat(sourceRoot).catch(() => null);
  const targetExists = await stat(targetRoot).catch(() => null);
  if (!sourceExists?.isDirectory()) {
    throw new Error(`Source app not found: ${sourceRoot}`);
  }
  if (!targetExists?.isDirectory()) {
    throw new Error(`Target app not found: ${targetRoot}`);
  }

  if (options.move && !options.yes) {
    const proceed = await promptYesNo(
      `Move (not copy) assets from ${path.basename(sourceRoot)} into ${path.basename(targetRoot)}?`,
      false
    );
    if (!proceed) {
      console.log('Aborted.');
      return;
    }
  }

  const candidates = buildMigrateDirs(options);
  const stats = { copied: 0, skipped: 0, overwritten: 0 };
  const state = { overwriteAll: false, skipAll: false };

  for (const rel of candidates) {
    const srcDir = path.join(sourceRoot, rel);
    const destDir = path.join(targetRoot, rel);
    const exists = await stat(srcDir).catch(() => null);
    if (!exists?.isDirectory()) continue;
    await copyTree(srcDir, destDir, path.join(rel), options, stats, state);
  }

  if (options.move) {
    for (const rel of candidates) {
      const srcDir = path.join(sourceRoot, rel);
      const exists = await stat(srcDir).catch(() => null);
      if (exists?.isDirectory()) {
        await rm(srcDir, { recursive: true, force: true });
      }
    }
  }

  console.log('✅ Migration complete.');
  console.log(
    `📦 Files copied: ${stats.copied}, overwritten: ${stats.overwritten}, skipped: ${stats.skipped}`
  );
}

function buildMigrateDirs(options: MigrateOptions): string[] {
  const dirs = [
    'app',
    'public',
    'assets',
    'plugins',
    'middleware',
    'composables',
    'types',
    'utils',
    'content',
  ];
  if (!options.skipServer) {
    dirs.push('server');
  }
  return dirs;
}

async function resolveAppPath(inputPath: string, repoRoot: string): Promise<string> {
  if (path.isAbsolute(inputPath)) return inputPath;
  const appsCandidate = path.join(repoRoot, 'apps', inputPath);
  const appsExists = await stat(appsCandidate).catch(() => null);
  if (appsExists?.isDirectory()) return appsCandidate;
  return path.resolve(repoRoot, inputPath);
}

async function copyTree(
  srcDir: string,
  destDir: string,
  relBase: string,
  options: MigrateOptions,
  stats: { copied: number; skipped: number; overwritten: number },
  state: { overwriteAll: boolean; skipAll: boolean }
): Promise<void> {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const relPath = path.join(relBase, entry.name);

    if (entry.isDirectory()) {
      await copyTree(srcPath, destPath, relPath, options, stats, state);
      continue;
    }
    if (!entry.isFile()) continue;

    const destExists = await stat(destPath).catch(() => null);
    if (!destExists) {
      await copyFile(srcPath, destPath);
      stats.copied += 1;
      continue;
    }

    const decision = await resolveConflictDecision(relPath, options, state);
    if (decision === 'skip' || decision === 'skip-all') {
      stats.skipped += 1;
      continue;
    }
    await copyFile(srcPath, destPath);
    stats.overwritten += 1;
  }
}

async function resolveConflictDecision(
  relPath: string,
  options: MigrateOptions,
  state: { overwriteAll: boolean; skipAll: boolean }
): Promise<CopyDecision> {
  if (options.overwrite) return 'overwrite';
  if (state.overwriteAll) return 'overwrite';
  if (state.skipAll) return 'skip';
  if (options.yes) return 'skip';

  const answer = await promptInput(
    `File exists: ${relPath} — overwrite? (y/N/a=all/s=skip all)`
  );
  const normalized = answer.trim().toLowerCase();
  if (normalized === 'a') {
    state.overwriteAll = true;
    return 'overwrite-all';
  }
  if (normalized === 's') {
    state.skipAll = true;
    return 'skip-all';
  }
  if (normalized === 'y' || normalized === 'yes') {
    return 'overwrite';
  }
  return 'skip';
}

async function promptInput(label: string): Promise<string> {
  if (!process.stdin.isTTY) return '';
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(`${label}: `);
  rl.close();
  return answer;
}

async function promptYesNo(question: string, defaultYes: boolean): Promise<boolean> {
  if (!process.stdin.isTTY) return defaultYes;
  const hint = defaultYes ? 'Y/n' : 'y/N';
  const answer = await promptInput(`${question} (${hint})`);
  if (!answer) return defaultYes;
  return /^y(es)?$/i.test(answer.trim());
}
