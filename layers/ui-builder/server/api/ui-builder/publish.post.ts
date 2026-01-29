import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { createRequire } from 'module';
import { spawn } from 'child_process';
import { resolveRepoRoot, resolveSchemaRoot, resolveSchemaUiPath } from '../../utils/ui-builder/paths';

const loadYaml = () => {
  const schemaRoot = resolveSchemaRoot();
  const require = createRequire(path.join(schemaRoot, 'package.json'));
  return require('yaml') as typeof import('yaml');
};

const toModelKey = (spec: any): string => {
  if (spec?.model) return String(spec.model).toLowerCase();
  if (spec?.table) return String(spec.table).toLowerCase();
  if (spec?.name) return String(spec.name).toLowerCase();
  return 'model';
};

const runCommand = (cmd: string, args: string[], cwd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd });
    let output = '';
    child.stdout?.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${cmd} exited with code ${code}\n${output}`));
    });
  });
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const spec = body?.spec;
  const triggerGenerate = body?.generate !== false;

  if (!spec || typeof spec !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Missing spec payload.' });
  }

  if (spec.kind !== 'ui') {
    throw createError({ statusCode: 400, statusMessage: 'Spec kind must be ui.' });
  }

  const modelKey = toModelKey(spec);
  const YAML = loadYaml();
  const yamlText = YAML.stringify(spec);

  const specsDir = resolveSchemaUiPath();
  await mkdir(specsDir, { recursive: true });
  const filePath = path.join(specsDir, `${modelKey}.ui.yaml`);
  await writeFile(filePath, yamlText, 'utf-8');

  let generateOutput = '';
  if (triggerGenerate) {
    const repoRoot = resolveRepoRoot();
    generateOutput = await runCommand(
      'pnpm',
      ['--filter', 'mpdschema', 'schema:ui:generate', '--spec', modelKey, '--project', 'admin'],
      repoRoot
    );
  }

  return {
    ok: true,
    modelKey,
    filePath,
    generateOutput,
  };
});
