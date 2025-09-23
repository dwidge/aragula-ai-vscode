import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { getIg } from "./vscode/git/gitignore";

export async function processPath(filePath: string): Promise<string[]> {
  const openFilePaths: string[] = [];

  const isIgnored = await getIg();

  async function process(filePath: string) {
    const relativePath = vscode.workspace.asRelativePath(filePath);
    if (isIgnored(relativePath)) {
      return;
    }

    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        const files = await fs.readdir(filePath);
        for (const file of files) {
          await process(path.join(filePath, file));
        }
      } else if (stats.isFile()) {
        await fs.access(filePath, fs.constants.R_OK);
        openFilePaths.push(relativePath);
      }
    } catch (error) {
      throw new Error(
        `Could not access file or directory: ${filePath}: ${error}`
      );
    }
  }

  await process(filePath);
  return openFilePaths;
}
