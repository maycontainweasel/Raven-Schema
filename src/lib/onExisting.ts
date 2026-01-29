import type { OnExistingMode } from '../types';

const DEFINE_REGEX =
  /DEFINE\s+(FUNCTION|EVENT|TABLE|INDEX|ANALYZER|SCOPE|TOKEN|FIELD|PARAM|USER|NAMESPACE|DATABASE|VIEW|MODEL|TYPE|ROLE)\s+(?:OVERWRITE|IF NOT EXISTS)?/gi;

export function normalizeOnExisting(value?: string | OnExistingMode): OnExistingMode {
  if (!value) return 'OVERWRITE';
  const normalized = String(value).trim().toUpperCase().replace(/[\s_-]+/g, ' ');
  if (normalized === 'IF NOT EXISTS') return 'IF NOT EXISTS';
  if (normalized === 'NONE') return 'NONE';
  return 'OVERWRITE';
}

export function applyOnExisting(query: string, mode: OnExistingMode): string {
  if (mode === 'NONE') return query;
  const keyword = mode === 'IF NOT EXISTS' ? 'IF NOT EXISTS' : 'OVERWRITE';
  return query.replace(DEFINE_REGEX, (_match, kind) => `DEFINE ${kind} ${keyword} `);
}
