import { rm } from 'fs/promises';
import path from 'path';

export interface ClearModuleOptions {
  moduleRoot: string;
  runtime?: boolean;
  docs?: boolean;
}

export async function clearModuleGeneratedAssets(options: ClearModuleOptions): Promise<void> {
  const { moduleRoot, runtime = true, docs = true } = options;

  if (runtime) {
    const runtimeRoot = path.join(moduleRoot, 'src', 'runtime');
    const runtimeTargets = [
      path.join(runtimeRoot, 'controllers'),
      path.join(runtimeRoot, 'generated'),
      path.join(runtimeRoot, 'plugins', 'user-controller.ts'),
      path.join(runtimeRoot, 'index.ts'),
    ];
    for (const target of runtimeTargets) {
      await rm(target, { recursive: true, force: true });
    }
  }

  if (docs) {
    const docsRoot = path.join(moduleRoot, 'docs', 'controllers');
    await rm(docsRoot, { recursive: true, force: true });
  }
}
