import type { AppConfig, ProjectPathsConfig } from '../types';

export type FileSyncScope = 'module' | 'layers' | 'docs';

export interface FileSyncScopeExcludeConfig {
  module?: string[];
  layers?: string[];
  docs?: string[];
}

export interface FileSyncProjectExcludeConfig {
  name: string;
  exclude?: FileSyncScopeExcludeConfig;
}

export interface FileSyncConfig {
  globalExclude?: FileSyncScopeExcludeConfig;
  projects?: FileSyncProjectExcludeConfig[];
}

export interface FileSyncMatcher {
  patterns: string[];
  matches: (targetRelativePath: string) => boolean;
}

export function resolveFileSyncMatcher(
  app: AppConfig | undefined,
  project: ProjectPathsConfig,
  scope: FileSyncScope
): FileSyncMatcher {
  const config = app?.fileSync;
  if (!config) {
    return createMatcher([]);
  }

  const globalPatterns = toPatternList(config.globalExclude?.[scope]);
  const projectPatterns = toPatternList(
    config.projects?.find((entry) => entry?.name === project.name)?.exclude?.[scope]
  );

  return createMatcher([...globalPatterns, ...projectPatterns]);
}

function createMatcher(patterns: string[]): FileSyncMatcher {
  const normalizedPatterns = Array.from(
    new Set(patterns.map(normalizePathLike).filter(Boolean))
  );
  const regexes = normalizedPatterns.map(globToRegExp);

  return {
    patterns: normalizedPatterns,
    matches(targetRelativePath: string) {
      if (regexes.length === 0) return false;
      const normalized = normalizePathLike(targetRelativePath);
      return regexes.some((regex) => regex.test(normalized));
    },
  };
}

function toPatternList(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry).trim()).filter(Boolean);
}

function normalizePathLike(value: string): string {
  return String(value)
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/');
}

function globToRegExp(pattern: string): RegExp {
  const token = '__DOUBLE_STAR__';
  let source = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, token)
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(new RegExp(token, 'g'), '.*');

  if (source.endsWith('/.*')) {
    source = `${source.slice(0, -3)}(?:/.*)?`;
  }

  return new RegExp(`^${source}$`);
}
