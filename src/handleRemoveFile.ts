import * as vscode from "vscode";
import { addChatFiles } from "./chat/addChatFiles";
import { readOpenFilePaths } from "./file/readOpenFilePaths";
import { toShortRelativePath } from "./git/toRelativePath";
import { PostMessage } from "./PostMessage";
import { sendWorkspaceSettingsToWebview } from "./sendSettingsToWebview";
import { GetterSetter } from "./settingsObject";

export async function openFilesDialog(
  postMessage: PostMessage,
  workspaceSettingsState: GetterSetter
) {
  const files = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: true,
    openLabel: "Add Files to AI Chat",
  });
  if (!files) {
    return;
  }
  const filePaths = await readOpenFilePaths(files.map(toShortRelativePath));
  const workspaceSettings = await addChatFiles(
    workspaceSettingsState,
    filePaths
  );
  await sendWorkspaceSettingsToWebview(postMessage, workspaceSettings);
}
