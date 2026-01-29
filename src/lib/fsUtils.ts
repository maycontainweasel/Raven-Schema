import { readdir, rmdir, stat } from 'fs/promises';
import path from 'path';

/**
 * Recursively remove empty directories under the given root.
 * Does not touch directories that contain any files or subdirectories.
 */
export async function removeEmptyDirs(root: string): Promise<void> {
  let entries: any[] = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (entry) => {
        const dirPath = path.join(root, entry.name);
        await removeEmptyDirs(dirPath);
      })
  );

  // re-read after cleaning children
  let finalEntries: any[] = [];
  try {
    finalEntries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  if (finalEntries.length === 0) {
    try {
      await rmdir(root);
    } catch {
      /* ignore */
    }
  }
}
