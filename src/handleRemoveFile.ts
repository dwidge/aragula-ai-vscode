import * as fs from "fs/promises";
import * as vscode from "vscode";
import { getWorkspaceAbsolutePath } from "./getWorkspaceAbsolutePath";
import { PostMessage } from "./PostMessage";

export async function openFilesDialog(postMessage: PostMessage) {
  const files = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: true,
    openLabel: "Add Files to AI Chat",
  });
  if (files) {
    const filePaths = files.map((file) =>
      vscode.workspace.asRelativePath(file)
    );
    postMessage({ command: "addFiles", filePaths });
  }
}

export function removeFiles(
  postMessage: PostMessage,
  filePath: string,
  openedFilePaths: string[]
) {
  const index = openedFilePaths.indexOf(filePath);
  if (index > -1) {
    openedFilePaths.splice(index, 1);
  }

  postMessage({
    command: "setOpenFiles",
    files: openedFilePaths,
  });
}

export async function addFiles(
  postMessage: PostMessage,
  filePaths: string[],
  openedFilePaths: string[]
) {
  for (const filePath of filePaths) {
    if (!openedFilePaths.includes(filePath)) {
      try {
        await fs.access(getWorkspaceAbsolutePath(filePath), fs.constants.R_OK);
        openedFilePaths.push(filePath);
      } catch (error) {
        vscode.window.showWarningMessage(`Failed to read file: ${filePath}`);
        continue;
      }
    }
  }

  postMessage({
    command: "setOpenFiles",
    files: openedFilePaths,
  });
}
