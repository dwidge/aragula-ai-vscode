import * as vscode from "vscode";
import { getWorkspaceRoot } from "./getWorkspaceRoot";
import { toUnixPath } from "./toUnixPath";

export const toRelativePath = (pathOrUri: string | vscode.Uri) =>
  prependDotSlash(
    toUnixPath(vscode.workspace.asRelativePath(pathOrUri)).replaceAll(
      getWorkspaceRoot(),
      ""
    )
  );

const prependDotSlash = (path: string) =>
  path.startsWith("./") || path.startsWith("/") ? path : `./${path}`;
