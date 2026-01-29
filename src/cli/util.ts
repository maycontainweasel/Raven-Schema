import path from 'path';

export function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function toCamelCase(value: string): string {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function resolveMigrationDir(rootDir: string, tableKey: string): string {
  return path.resolve(rootDir, 'config', 'migrations', tableKey);
}

function normalizeTableFileSuffix(value?: string): string {
  if (!value) return 'table';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'primary') return 'primary';
  if (normalized === 'subsingle' || normalized === 'st.single' || normalized === 'st') return 'st';
  if (normalized === 'submany' || normalized === 'st.many') return 'st.many';
  if (normalized === 'table') return 'table';
  return value;
}

export function buildTableFileName(tableKey: string, suffixOrType?: string): string {
  const suffix = normalizeTableFileSuffix(suffixOrType);
  const base = suffix ? `${tableKey}.${suffix}` : tableKey;
  return `${base}.yaml`;
}

export function buildTableFileNameCandidates(tableKey: string): string[] {
  return ['primary', 'st', 'st.many', 'table'].map((suffix) => `${tableKey}.${suffix}.yaml`);
}

export function sanitizeBranch(branch: string): string {
  return branch.trim().replace(/\s+/g, '.').replace(/\.+/g, '.');
}

export function matchesTableKey(tableName: string, key: string): boolean {
  const normalized = sanitizeKey(tableName);
  const target = sanitizeKey(key);
  return normalized === target;
}

function sanitizeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

export function toKebabCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part, index) => index === 0 ? part.toLowerCase() : part.toLowerCase())
    .join('-');
}
