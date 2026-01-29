import path from 'path';
import { existsSync } from 'fs';

const findRepoRoot = (start: string): string => {
  let current = start;
  for (let i = 0; i < 6; i += 1) {
    const marker = path.join(current, 'pnpm-workspace.yaml');
    if (existsSync(marker)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return start;
};

export const resolveRepoRoot = (): string => {
  const cwd = process.cwd();
  return findRepoRoot(cwd);
};

export const resolveSchemaRoot = (): string => {
  const repoRoot = resolveRepoRoot();
  return path.join(repoRoot, 'apps', 'schema');
};

export const resolveSchemaUiPath = (): string => {
  return path.join(resolveSchemaRoot(), 'config', 'ui');
};
