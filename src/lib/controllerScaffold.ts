import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

import type { ProjectPathsConfig } from '../types';

const DEFAULT_CONTROLLERS_DIR = path.join('schema', 'controllers');

const toCamel = (value: string) => {
  const cleaned = value.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const parts = cleaned.split(' ').filter(Boolean);
  if (!parts.length) return value;
  return parts
    .map((part, index) => {
      const lower = part.toLowerCase();
      return index === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
};

const toPascal = (value: string) => {
  const camel = toCamel(value);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

function buildControllerTemplate(model: string): string {
  const camel = toCamel(model);
  const pascal = toPascal(model);
  return `import type { ${pascal}Controller } from '@schema/controllers/${camel}';

export const extend${pascal}Controller = (base: ${pascal}Controller) => ({
  // override or extend methods here
  // example:
  // async create(payload, options) {
  //   return base.create(payload, options);
  // },
});
`;
}

export async function scaffoldControllerOverrides(options: {
  projectRoot: string;
  projects: ProjectPathsConfig[];
  controller: string;
  targets?: string[];
}): Promise<void> {
  const { projectRoot, projects, controller, targets = [] } = options;
  const normalized = controller.trim();
  if (!normalized) {
    throw new Error('Controller name is required');
  }

  const targetProjects = targets.length
    ? projects.filter((project) => targets.includes(project.name))
    : projects;

  if (!targetProjects.length) {
    throw new Error('No matching projects found to scaffold controllers');
  }

  const fileName = `${toCamel(normalized)}.ts`;
  const template = buildControllerTemplate(normalized);

  for (const project of targetProjects) {
    const projectRootDir = project.nuxtProjectRoot
      ? path.resolve(projectRoot, project.nuxtProjectRoot)
      : projectRoot;
    const controllersDir = path.join(projectRootDir, DEFAULT_CONTROLLERS_DIR);
    const outputPath = path.join(controllersDir, fileName);

    await mkdir(controllersDir, { recursive: true });

    try {
      const existing = await readFile(outputPath, 'utf-8');
      if (existing.trim().length > 0) {
        console.log(`⚠️  Controller override already exists: ${path.relative(projectRoot, outputPath)}`);
        continue;
      }
    } catch {
      // file doesn't exist
    }

    await writeFile(outputPath, template, 'utf-8');
    console.log(`🧩 Created controller override: ${path.relative(projectRoot, outputPath)}`);
  }
}
