import * as vscode from "vscode";
import * as path from "path";

export const workspaceRelativePathToAbsolutePath = (
  relativePath: string
): string => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const root = workspaceFolders[0].uri.fsPath;
    return path.join(root, relativePath);
  }
  throw new Error("No active workspace found.");
};
