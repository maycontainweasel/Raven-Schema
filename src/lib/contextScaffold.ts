import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

import type { ProjectPathsConfig } from '../types';

const DEFAULT_CONTEXT_DIR = path.join('schema', 'context');

function buildContextTemplate(): string {
  return `import type { H3Event } from 'h3'

type ContextBase = Record<string, unknown>

// Optional app-specific context additions.
// Return an object whose keys will be merged into the base context.
export async function createContextExt(_event: H3Event, _base: ContextBase) {
  return {}
}
`;
}

export async function scaffoldContextOverrides(options: {
  projectRoot: string;
  projects: ProjectPathsConfig[];
  targets?: string[];
}): Promise<void> {
  const { projectRoot, projects, targets = [] } = options;

  const targetProjects = targets.length
    ? projects.filter((project) => targets.includes(project.name))
    : projects;

  if (!targetProjects.length) {
    throw new Error('No matching projects found to scaffold context overrides');
  }

  const fileName = 'trpc.ts';
  const template = buildContextTemplate();

  for (const project of targetProjects) {
    const projectRootDir = project.nuxtProjectRoot
      ? path.resolve(projectRoot, project.nuxtProjectRoot)
      : projectRoot;
    const contextDir = path.join(projectRootDir, DEFAULT_CONTEXT_DIR);
    const outputPath = path.join(contextDir, fileName);

    await mkdir(contextDir, { recursive: true });

    try {
      const existing = await readFile(outputPath, 'utf-8');
      if (existing.trim().length > 0) {
        console.log(`⚠️  Context override already exists: ${path.relative(projectRoot, outputPath)}`);
        continue;
      }
    } catch {
      // file doesn't exist
    }

    await writeFile(outputPath, template, 'utf-8');
    console.log(`🧩 Created context override: ${path.relative(projectRoot, outputPath)}`);
  }
}
