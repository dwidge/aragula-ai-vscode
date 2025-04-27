import * as path from "path";
import * as vscode from "vscode";

const getWorkspaceRoot = () => {
  const w = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!w) {
    throw new Error("getWorkspaceRootE1: No workspace open");
  }
  return w;
};
export const getWorkspaceAbsolutePath = (relativePath: string) =>
  path.join(getWorkspaceRoot(), relativePath);
