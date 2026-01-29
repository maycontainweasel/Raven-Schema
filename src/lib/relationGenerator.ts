import { mkdir } from 'fs/promises';
import path from 'path';

import type { TableMigrationConfig } from '../types';
import { getTableAssetDir } from './tableAssetPaths';
import { buildEdgeStatements, type NormalizedEdge } from './edgeRunner';
import type { AssetTrackingOptions } from './assetTracker';
import { createAssetTracker } from './assetTracker';
import { writeGeneratedAsset } from './assetWriter';
import { collectRelations, type NormalizedRelation } from './relationUtils';

interface GenerateRelationOptions {
  tables: TableMigrationConfig[];
  outputRoot: string;
  assetTracking?: AssetTrackingOptions;
}

export async function generateTableRelations(options: GenerateRelationOptions): Promise<void> {
  const { tables, outputRoot } = options;
  const tracker = await createAssetTracker(options.assetTracking);

  const tablesByModel = new Map<string, TableMigrationConfig>();
  for (const table of tables) {
    const model = table.table?.model;
    if (model) {
      tablesByModel.set(model, table);
    }
  }

  const relations = collectRelations(tables);
  if (relations.length === 0) return;

  const uniqueByEdge = new Map<string, NormalizedRelation>();
  for (const relation of relations) {
    const key = `${relation.edge}:${relation.leftModel}:${relation.rightModel}`;
    if (!uniqueByEdge.has(key)) {
      uniqueByEdge.set(key, relation);
    }
  }

  const byOwner = new Map<string, NormalizedRelation[]>();
  for (const relation of uniqueByEdge.values()) {
    const ownerModel = relation.leftModel;
    const list = byOwner.get(ownerModel) ?? [];
    list.push(relation);
    byOwner.set(ownerModel, list);
  }

  for (const [ownerModel, ownerRelations] of byOwner) {
    const ownerTable = tablesByModel.get(ownerModel);
    if (!ownerTable) continue;

    const edgeStatements: string[] = [];
    const functionBlocks: string[] = [];

    for (const relation of ownerRelations) {
      edgeStatements.push(...buildRelationEdges(relation));
      if (relation.functionsEnabled) {
        functionBlocks.push(buildAttachFunction(relation));
        functionBlocks.push(buildDetachFunction(relation));
        functionBlocks.push(buildGetLeftFunction(relation));
        functionBlocks.push(buildGetRightFunction(relation));
      }
    }

    const dir = getTableAssetDir(ownerTable, tablesByModel, outputRoot);
    await mkdir(dir, { recursive: true });

    if (edgeStatements.length > 0) {
      const edgePath = path.join(dir, `L_${ownerModel}RelationEdges.surql`);
      await writeGeneratedAsset({
        filePath: edgePath,
        content: edgeStatements.join('\n'),
        tracker,
        meta: {
          source: 'generated',
          layer: 'edges',
          table: ownerModel,
        },
      });
      console.log(`🔗 Generated relation edges: ${path.relative(process.cwd(), edgePath)}`);
    }

    if (functionBlocks.length > 0) {
      const fnPath = path.join(dir, `F_${ownerModel}Relations.surql`);
      await writeGeneratedAsset({
        filePath: fnPath,
        content: functionBlocks.join('\n\n'),
        tracker,
        meta: {
          source: 'generated',
          layer: 'functions',
          table: ownerModel,
        },
      });
      console.log(`🔗 Generated relation functions: ${path.relative(process.cwd(), fnPath)}`);
    }
  }
}

function buildRelationEdges(relation: NormalizedRelation): string[] {
  const edge: NormalizedEdge = {
    table: relation.edge,
    inModel: relation.leftModel,
    outModel: relation.rightModel,
    unique: true,
    allowAnyIn: false,
    allowAnyOut: false,
  };
  return [...buildEdgeStatements(edge), ''];
}

function buildAttachFunction(relation: NormalizedRelation): string {
  const fnName = relation.functions.attach;
  const rightParam = `$${relation.rightLabel}ID`;
  const leftParam = `$${relation.leftLabel}ID`;

  return [
    `DEFINE FUNCTION OVERWRITE fn::${fnName}(${rightParam}: any, ${leftParam}: any) {`,
    '',
    `\tlet $RIGHT_ID = fn::ridParam("${relation.rightModel}", ${rightParam});`,
    `\tif !type::is_record($RIGHT_ID) || !record::exists($RIGHT_ID) {`,
    `\t\tthrow "${fnName} | ${rightParam} is not a valid record";`,
    `\t};`,
    '',
    `\tlet $REL_IDS = fn::toRecordArray("${relation.leftModel}", ${leftParam});`,
    `\tif array::len($REL_IDS) == 0 {`,
    `\t\treturn [];`,
    `\t};`,
    '',
    `\tfor $REL_ID in $REL_IDS {`,
    `\t\tif !record::exists($REL_ID) {`,
    `\t\t\tthrow "${fnName} | related record does not exist";`,
    `\t\t};`,
    `\t\tfn::createEdge($REL_ID, "${relation.edge}", $RIGHT_ID, { boundId: true, overwrite: false, skipExists: true });`,
    `\t};`,
    '',
    `\treturn $REL_IDS;`,
    `};`,
    '',
  ].join('\n');
}

function buildDetachFunction(relation: NormalizedRelation): string {
  const fnName = relation.functions.detach;
  const rightParam = `$${relation.rightLabel}ID`;
  const leftParam = `$${relation.leftLabel}ID`;

  return [
    `DEFINE FUNCTION OVERWRITE fn::${fnName}(${rightParam}: any, ${leftParam}: any) {`,
    '',
    `\tlet $RIGHT_ID = fn::ridParam("${relation.rightModel}", ${rightParam});`,
    `\tif !type::is_record($RIGHT_ID) || !record::exists($RIGHT_ID) {`,
    `\t\tthrow "${fnName} | ${rightParam} is not a valid record";`,
    `\t};`,
    '',
    `\tlet $REL_IDS = fn::toRecordArray("${relation.leftModel}", ${leftParam});`,
    `\tif array::len($REL_IDS) == 0 {`,
    `\t\treturn [];`,
    `\t};`,
    '',
    `\tfor $REL_ID in $REL_IDS {`,
    `\t\tfn::deleteEdge($REL_ID, "${relation.edge}", $RIGHT_ID, { boundId: true });`,
    `\t};`,
    `\treturn $REL_IDS;`,
    `};`,
    '',
  ].join('\n');
}

function buildGetLeftFunction(relation: NormalizedRelation): string {
  const fnName = relation.functions.getLeft;
  const rightParam = `$${relation.rightLabel}ID`;

  return [
    `DEFINE FUNCTION OVERWRITE fn::${fnName}(${rightParam}: any) {`,
    '',
    `\tlet $RIGHT_ID = fn::ridParam("${relation.rightModel}", ${rightParam});`,
    `\tif !type::is_record($RIGHT_ID) || !record::exists($RIGHT_ID) {`,
    `\t\tthrow "${fnName} | ${rightParam} is not a valid record";`,
    `\t};`,
    '',
    `\treturn select * from ${relation.leftModel} where <-(${relation.edge} where out = $RIGHT_ID);`,
    `};`,
    '',
  ].join('\n');
}

function buildGetRightFunction(relation: NormalizedRelation): string {
  const fnName = relation.functions.getRight;
  const leftParam = `$${relation.leftLabel}ID`;

  return [
    `DEFINE FUNCTION OVERWRITE fn::${fnName}(${leftParam}: any) {`,
    '',
    `\tlet $LEFT_ID = fn::ridParam("${relation.leftModel}", ${leftParam});`,
    `\tif !type::is_record($LEFT_ID) || !record::exists($LEFT_ID) {`,
    `\t\tthrow "${fnName} | ${leftParam} is not a valid record";`,
    `\t};`,
    '',
    `\treturn select * from ${relation.rightModel} where <-(${relation.edge} where in = $LEFT_ID);`,
    `};`,
    '',
  ].join('\n');
}
