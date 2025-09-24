import { FilePath } from "./FilePath";
import { processPath } from "./processPath";

export async function readOpenFilePaths(
  paths: FilePath[]
): Promise<FilePath[]> {
  const openFilePaths: FilePath[] = [];
  if (!paths) {
    return openFilePaths;
  }

  for (const p of paths) {
    if (p) {
      const files = await processPath(p);
      openFilePaths.push(...files);
    }
  }

  return openFilePaths;
}
