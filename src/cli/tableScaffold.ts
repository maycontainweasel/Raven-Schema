import { mkdir, writeFile, access, readFile } from 'fs/promises';
import path from 'path';
import { constants as fsConstants } from 'fs';

import { buildTableFileName, resolveMigrationDir, sanitizeBranch, toCamelCase, toPascalCase } from './util';

interface ScaffoldOptions {
  rootDir: string;
  tableKey: string;
  branches: string[];
  force?: boolean;
}

export async function scaffoldTable(options: ScaffoldOptions): Promise<void> {
  const { rootDir, tableKey } = options;
  const primaryName = tableKey;
  const primaryPascal = toPascalCase(primaryName);
  const primaryModel = toCamelCase(primaryName);

  const tableDir = resolveMigrationDir(rootDir, tableKey);
  await mkdir(tableDir, { recursive: true });

  const primaryFile = path.join(tableDir, buildTableFileName(tableKey, 'primary'));

  if (!(await fileExists(primaryFile)) || options.force) {
    const content = buildPrimaryTemplate({
      name: primaryPascal,
      model: primaryModel,
      routerKey: tableKey.toLowerCase(),
      branches: options.branches.map(sanitizeBranch),
    });
    await writeFile(primaryFile, content, 'utf-8');
    console.log(`🆕 Created primary table config: ${path.relative(rootDir, primaryFile)}`);
  } else {
    console.log(`ℹ️  Primary table config already exists: ${path.relative(rootDir, primaryFile)}`);
    if (options.branches.length > 0) {
      await updatePrimaryBranchSection(primaryFile, options.branches.map(sanitizeBranch));
    }
  }

  for (const rawBranch of options.branches) {
    const branch = sanitizeBranch(rawBranch);
    const branchFileName = buildTableFileName(`${tableKey}.${branch}`, 'st');
    const branchFile = path.join(tableDir, branchFileName);

    if (await fileExists(branchFile) && !options.force) {
      console.log(`ℹ️  Branch table config already exists: ${path.relative(rootDir, branchFile)}`);
      continue;
    }

    const branchContent = buildBranchTemplate({
      tableKey,
      branch,
    });
    await writeFile(branchFile, branchContent, 'utf-8');
    console.log(`🆕 Created branch table config: ${path.relative(rootDir, branchFile)}`);
  }
}

async function updatePrimaryBranchSection(filePath: string, branches: string[]): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8');
    if (!/branchTables:/i.test(content)) {
      // Append a branchTables block
      const branchBlock = buildBranchTablesBlock(branches);
      const updated = `${content.trim()}\n\nbranchTables:\n${branchBlock}\n`;
      await writeFile(filePath, `${updated}\n`, 'utf-8');
      return;
    }

    const existingLines = content.split('\n');
    const branchLineIndex = existingLines.findIndex((line) => line.trim().startsWith('branchTables:'));
    if (branchLineIndex === -1) {
      const branchBlock = buildBranchTablesBlock(branches);
      const updated = `${content.trim()}\n\nbranchTables:\n${branchBlock}\n`;
      await writeFile(filePath, `${updated}\n`, 'utf-8');
      return;
    }

    // For now we do not deduplicate entries; appending is safer than rewriting complex YAML.
    const insertion = buildBranchTablesBlock(branches);
    existingLines.splice(branchLineIndex + 1, 0, ...insertion.split('\n'));
    await writeFile(filePath, `${existingLines.join('\n')}\n`, 'utf-8');
  } catch (error) {
    console.warn(`⚠️  Unable to update branchTables block in ${filePath}:`, error);
  }
}

function buildBranchTablesBlock(branches: string[]): string {
  if (branches.length === 0) {
    return '  - # add branch tables here';
  }
  return branches
    .map((branch) => {
      const branchPascal = toPascalCase(branch.replace(/\./g, ' '));
      const branchModel = toCamelCase(`${branchPascal}`);
      return [
        `  - name: ${branchPascal}`,
        `    model: ${branchModel}`,
        `    inheritsIdFromParent: true`,
        `    description: ''`,
        `    schema:`,
        `      fields:`,
        `        - exampleField:`,
        `            type: string`,
        `            required: false`
      ].join('\n');
    })
    .join('\n');
}

function buildPrimaryTemplate({
  name,
  model,
  routerKey,
  branches,
}: {
  name: string;
  model: string;
  routerKey: string;
  branches: string[];
}): string {
  const branchBlock = branches.length > 0 ? `branchTables:\n${buildBranchTablesBlock(branches)}` : '# branchTables: []';

  return `version: 1
kind: table
name: ${name}
primary: true
tableType: primary
description: ''
tags: []

table:
  model: "${model}"
  type: "NORMAL"
  drop: false
  schemaMode: schemaless
  permissions: full

id:
  type: string
  structure: exampleField
  exportType: true
  exportName: __NAME__ID

fields:
  - exampleField:
      type: string
      required: false

edges:
  has:
    - table: ${model}_has_child
      out: ${model}
  belongs:
    - table: child_belongs_${model}
      in: ${model}

indexes:
  - name: ${model}ExampleField
    mode: OVERWRITE
    columns:
      - exampleField
    unique: true

views:
  - name: Public
    fields:
      - id: record
      - exampleField: string

crud:
  create:
    enabled: true
    name: create__NAME__
    params:
      - name: payload
        type: object
    options:
      idSource: exampleField
      validations:
        required:
          - exampleField
  update:
    enabled: true
    name: update__NAME__
    params:
      - name: rid
        type: record
      - name: payload
        type: object
    options:
      validations:
        required:
          - rid
  delete:
    enabled: true
    name: delete__NAME__
    params:
      - name: rid
        type: record
    options:
      validations:
        required:
          - rid

router:
  name: ${routerKey}
  endpoints:
    - resource:
        public:
          target: view
          value: Public
    - create:
        target: crud
        value: create
    - update:
        target: crud
        value: update
    - delete:
        target: crud
        value: delete

${branchBlock}
`;
}

function buildBranchTemplate({
  tableKey,
  branch,
}: {
  tableKey: string;
  branch: string;
}): string {
  const branchDisplay = branch.replace(/\./g, ' ');
  const branchPascal = toPascalCase(branchDisplay);
  const model = toCamelCase(`${tableKey} ${branchDisplay}`);
  const routerKey = `${tableKey}-${branch.replace(/\./g, '-')}`;
  const parentRouterKey = tableKey.toLowerCase();

  return `version: 1
kind: table
name: ${branchPascal}
primary: false
tableType: subsingle
description: ''
tags: []

table:
  model: "${model}"
  type: "NORMAL"
  drop: false
  schemaMode: schemaless
  permissions: full

id:
  type: string
  exportType: false
  exportName: __NAME__ID

fields:
  - exampleField:
      type: string
      required: false

edges:
  has: []
  belongs: []

post:
  enabled: false

views: []

crud:
  create:
    enabled: false
    name: create__NAME__
  update:
    enabled: false
    name: update__NAME__
  delete:
    enabled: false
    name: delete__NAME__

router:
  parent: ${parentRouterKey}
  name: ${routerKey}
  endpoints: []
`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}
