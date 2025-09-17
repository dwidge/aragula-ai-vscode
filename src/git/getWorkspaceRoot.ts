import * as vscode from "vscode";
import { toUnixPath } from "./toUnixPath";

export const getWorkspaceRoot = (): string =>
  toUnixPath(vscode.workspace.workspaceFolders?.[0]?.uri.path ?? "");
