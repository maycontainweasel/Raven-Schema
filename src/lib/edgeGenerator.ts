import { mkdir } from 'fs/promises';
import path from 'path';

import type { TableMigrationConfig } from '../types';
import { getTableAssetDir } from './tableAssetPaths';
import { buildEdgeStatements, collectEdges } from './edgeRunner';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker } from './assetTracker';
import { writeGeneratedAsset } from './assetWriter';

interface GenerateEdgesOptions {
  tables: TableMigrationConfig[];
  outputRoot: string;
  assetTracking?: AssetTrackingOptions;
}

export async function generateTableEdges(options: GenerateEdgesOptions): Promise<void> {
  const { tables, outputRoot } = options;
  const tracker = await createAssetTracker(options.assetTracking);

  // Precompute maps for lookups
  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tablesByModel.set(model, table);
    }
  }

  const edges = collectEdges(tables);
  if (edges.length === 0) return;

  // For each table, gather relevant edges (where it is inModel or outModel)
  for (const table of tables) {
    const model = table.table?.model;
    if (!model) continue;

    const relevant = edges.filter((edge) => edge.inModel === model || edge.outModel === model);
    if (relevant.length === 0) continue;

    const dir = getTableAssetDir(table, tablesByModel, outputRoot);
    await mkdir(dir, { recursive: true });

    const statements: string[] = [];
    const seen = new Set<string>();
    for (const edge of relevant) {
      const key = `${edge.table}:${edge.inModel}:${edge.outModel}`;
      if (seen.has(key)) continue;
      seen.add(key);
      statements.push(...buildEdgeStatements(edge), '');
    }

    const filePath = path.join(dir, `L_${model}Edges.surql`);
    await writeGeneratedAsset({
      filePath,
      content: statements.join('\n'),
      tracker,
      meta: {
        source: 'generated',
        layer: 'edges',
        table: model,
      },
    });
    console.log(`🕸️  Generated edges file: ${path.relative(process.cwd(), filePath)}`);
  }
}
