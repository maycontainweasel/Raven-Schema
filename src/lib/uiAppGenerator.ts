import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import YAML from 'yaml';
import type { ProjectPathsConfig } from '../types';

export interface UiAppSpec {
  version?: number;
  kind?: string;
  app?: {
    name?: string;
    menu?: {
      sections?: UiNavSection[];
    };
  };
}

export interface UiNavSection {
  id: string;
  label: string;
  enabled?: boolean;
  hidden?: boolean;
  items?: UiNavItem[];
}

export interface UiNavItem {
  id: string;
  label: string;
  icon?: string;
  to?: string;
  enabled?: boolean;
  hidden?: boolean;
  children?: UiNavItem[];
}

export async function loadUiAppSpec(specsDir: string): Promise<UiAppSpec | null> {
  const candidatePaths = [
    path.join(specsDir, 'app.ui.yaml'),
    path.join(specsDir, 'app.ui.yml'),
  ];

  for (const filePath of candidatePaths) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const parsed = YAML.parse(content) as UiAppSpec;
      if (parsed?.kind === 'ui-app') {
        return parsed;
      }
    } catch (error: any) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
  }

  return null;
}

const shouldInclude = (item?: { enabled?: boolean; hidden?: boolean }): boolean => {
  if (!item) return false;
  if (item.hidden === true) return false;
  if (item.enabled === false) return false;
  return true;
};

const normalizeItems = (items: UiNavItem[] = []): UiNavItem[] => {
  return items
    .filter((item) => shouldInclude(item))
    .map((item) => {
      const children = Array.isArray(item.children) ? normalizeItems(item.children) : undefined;
      return {
        id: item.id,
        label: item.label,
        icon: item.icon,
        to: item.to,
        ...(children && children.length ? { children } : {}),
      } as UiNavItem;
    });
};

const normalizeSections = (sections: UiNavSection[] = []): UiNavSection[] => {
  return sections
    .filter((section) => shouldInclude(section))
    .map((section) => {
      const items = normalizeItems(section.items ?? []);
      return {
        id: section.id,
        label: section.label,
        items,
      } as UiNavSection;
    })
    .filter((section) => (section.items ?? []).length > 0);
};

const buildAdminNavFile = (sections: UiNavSection[]): string => {
  const payload = {
    sections,
  };
  return `import type { AdminNavConfig } from '~/types/admin-nav'

export const adminNavGenerated: AdminNavConfig = ${JSON.stringify(payload, null, 2)}
`;
};

export async function generateAdminNav(options: {
  spec: UiAppSpec;
  projectRoot: string;
  projects: ProjectPathsConfig[];
}): Promise<void> {
  const { spec, projectRoot, projects } = options;
  const sections = normalizeSections(spec.app?.menu?.sections ?? []);

  for (const project of projects) {
    if (!project.nuxtProjectRoot) continue;
    const nuxtRoot = path.resolve(projectRoot, project.nuxtProjectRoot);
    const outputPath = path.join(nuxtRoot, 'app', 'config', 'admin-nav.generated.ts');
    const content = buildAdminNavFile(sections);
    await writeFile(outputPath, content, 'utf-8');
  }
}
