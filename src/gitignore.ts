import { getWorkspaceRoot } from "@/vscode/getWorkspaceAbsolutePath";
import * as fs from "fs/promises";
import ignore from "ignore";

export async function getIg(root = getWorkspaceRoot()?.fsPath) {
  const gitignorePath = root + "/.gitignore";
  const ig = ignore();
  ig.add([".git"]);
  if (
    gitignorePath &&
    (await fs
      .access(gitignorePath)
      .then(() => true)
      .catch(() => false))
  ) {
    const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
    ig.add(gitignoreContent);
  }
  return (filePath: string): boolean => ig.ignores(filePath);
}
