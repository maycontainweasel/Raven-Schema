import path from 'path';
import { readdir, readFile } from 'fs/promises';
import { createRequire } from 'module';
import { resolveSchemaRoot, resolveSchemaUiPath } from '../../utils/ui-builder/paths';

const loadYaml = () => {
  const schemaRoot = resolveSchemaRoot();
  const require = createRequire(path.join(schemaRoot, 'package.json'));
  return require('yaml') as typeof import('yaml');
};

const isYamlFile = (name: string) => name.endsWith('.yaml') || name.endsWith('.yml');

export default defineEventHandler(async () => {
  const specsDir = resolveSchemaUiPath();
  const YAML = loadYaml();
  const entries = await readdir(specsDir);

  const specs: any[] = [];
  let appSpec: any | null = null;

  await Promise.all(
    entries
      .filter(isYamlFile)
      .map(async (file) => {
        const fullPath = path.join(specsDir, file);
        const raw = await readFile(fullPath, 'utf-8');
        const parsed = YAML.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;
        if (parsed.kind === 'ui-app') {
          appSpec = parsed;
          return;
        }
        if (parsed.kind === 'ui') {
          specs.push(parsed);
        }
      })
  );

  return {
    specs,
    appSpec,
  };
});
