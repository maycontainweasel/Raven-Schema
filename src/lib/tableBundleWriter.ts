import { readFile, readdir } from 'fs/promises';
import path from 'path';

import type { TableMigrationConfig } from '../types';
import { getTableAssetDir } from './tableAssetPaths';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker } from './assetTracker';
import { writeGeneratedAsset } from './assetWriter';

const BUNDLE_PREFIX = 'Z_';

const SECTION_CONFIG: Array<{ prefix: string; heading: string }> = [
  { prefix: 'F_', heading: 'Functions' },
  { prefix: 'E_', heading: 'Events' },
  { prefix: 'V_', heading: 'Views' },
  { prefix: 'I_', heading: 'Indexes' },
  { prefix: 'L_', heading: 'Edges' },
];

interface SectionedFile {
  fileName: string;
  content: string;
}

export async function writeTableBundles(
  tables: TableMigrationConfig[],
  outputRoot: string,
  assetTracking?: AssetTrackingOptions
): Promise<void> {
  const tracker = await createAssetTracker(assetTracking);
  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tablesByModel.set(model, table);
    }
  }

  for (const table of tables) {
    const dir = getTableAssetDir(table, tablesByModel, outputRoot);
    let entries: string[] = [];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }

    const sectionMap = new Map<string, SectionedFile[]>();
    for (const { heading } of SECTION_CONFIG) {
      sectionMap.set(heading, []);
    }
    sectionMap.set('Miscellaneous', []);

    const bundleFileBase = `${BUNDLE_PREFIX}${toPascalCase(table.name || table.table?.model || 'Table')}Bundle.surql`;

    for (const entry of entries) {
      if (!entry.endsWith('.surql')) continue;
      if (entry === bundleFileBase) continue;

      const sectionHeading = resolveSection(entry);
      const files = sectionMap.get(sectionHeading) ?? sectionMap.get('Miscellaneous')!;
      let content = await readFile(path.join(dir, entry), 'utf-8');
      if (sectionHeading === 'Functions') {
        content = ensureFunctionOverwrite(content);
      }
      files.push({
        fileName: entry,
        content: content.trimEnd(),
      });
    }

    const nonEmptySections = Array.from(sectionMap.entries()).filter(
      ([_, files]) => files.length > 0
    );

    if (nonEmptySections.length === 0) {
      continue;
    }

    const lines: string[] = [];
    const tableLabel = table.name || table.table?.model || 'Table';
    lines.push(`-- ========================================`);
    lines.push(`-- Table Bundle: ${tableLabel}`);
    lines.push(`-- ========================================`);
    lines.push('');

    for (const [heading, files] of nonEmptySections) {
      lines.push(`-- ---------- ${heading.toUpperCase()} ----------`);
      lines.push('');
      for (const file of files) {
        lines.push(`-- File: ${file.fileName}`);
        lines.push(file.content);
        if (!file.content.endsWith(';')) {
          lines.push(';');
        }
        lines.push('');
      }
      lines.push('');
    }

    const bundlePath = path.join(dir, bundleFileBase);
    await writeGeneratedAsset({
      filePath: bundlePath,
      content: lines.join('\n'),
      tracker,
      meta: {
        source: 'generated',
        layer: 'bundle',
        table: table.table?.model ?? table.name,
      },
    });
    console.log(`📦 Generated bundle: ${path.relative(process.cwd(), bundlePath)}`);
  }
}

function resolveSection(fileName: string): string {
  for (const config of SECTION_CONFIG) {
    if (fileName.startsWith(config.prefix)) {
      return config.heading;
    }
  }
  return 'Miscellaneous';
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

function ensureFunctionOverwrite(content: string): string {
  return content.replace(
    /DEFINE FUNCTION\s+(?:IF NOT EXISTS\s+)?(?=fn::)/gi,
    'DEFINE FUNCTION OVERWRITE '
  );
}
