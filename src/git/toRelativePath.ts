import * as vscode from "vscode";
import { getWorkspaceRoot } from "./getWorkspaceRoot";
import { toUnixPath } from "./toUnixPath";

export const toRelativePath = (pathOrUri: string | vscode.Uri) =>
  toUnixPath(vscode.workspace.asRelativePath(pathOrUri))
    .replaceAll(getWorkspaceRoot(), "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
