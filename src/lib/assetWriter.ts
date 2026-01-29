import { mkdir, readFile, readdir, stat, writeFile } from 'fs/promises';
import path from 'path';

import type { AssetImportMeta } from './assetTracker';
import type { AssetTracker } from './assetTracker';

export interface WriteAssetOptions {
  filePath: string;
  content: string;
  tracker?: AssetTracker | null;
  meta?: AssetImportMeta;
  compareContent?: string | null;
}

export async function writeGeneratedAsset(options: WriteAssetOptions): Promise<void> {
  const { filePath, content, tracker, meta, compareContent } = options;
  await mkdir(path.dirname(filePath), { recursive: true });

  let existingContent: string | null = null;
  if (await fileExists(filePath)) {
    existingContent = await readFile(filePath, 'utf-8');
  }

  const shouldWrite = existingContent === null || existingContent !== content;
  if (shouldWrite) {
    await writeFile(filePath, content, 'utf-8');
  }

  if (tracker && !isBundleSurql(filePath)) {
    const fallbackCompare = existingContent ?? compareContent ?? null;
    await tracker.recordGeneration({
      filePath,
      content,
      meta,
      compareContent: fallbackCompare,
    });
  }
}

export async function readSurqlFiles(dir: string): Promise<Map<string, string>> {
  const contents = new Map<string, string>();
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return contents;
  }

  for (const entry of entries) {
    if (!entry.toLowerCase().endsWith('.surql')) continue;
    const filePath = path.join(dir, entry);
    try {
      const content = await readFile(filePath, 'utf-8');
      contents.set(filePath, content);
    } catch {
      // ignore read errors
    }
  }
  return contents;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

function isBundleSurql(filePath: string): boolean {
  const base = path.basename(filePath);
  return base.startsWith('Z_') && base.toLowerCase().endsWith('.surql');
}
