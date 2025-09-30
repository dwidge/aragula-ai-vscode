import * as vscode from "vscode";
import { closeAllPanels } from "./chat/closeAllPanels";
import {
  getOpenPanelWithFiles,
  OpenPanelFiles,
} from "./chat/openPanelWithFiles";
import {
  GetterSetter,
  newVsCodeState,
  SETTINGS_STORAGE_KEY,
} from "./settingsObject";
import { generateCommitMessageCommand } from "./task/generateCommitMessageCommand";
import { Logger } from "./utils/Logger";

const log: Logger = (msg: string) => {
  vscode.window.showInformationMessage(msg);
};
const logError: Logger = (e: unknown) => {
  vscode.window.showErrorMessage(`${e}`);
};

const askAICommand = async (
  openFiles: OpenPanelFiles,
  single: vscode.Uri,
  multi: vscode.Uri[]
) => openFiles(multi).catch(logError);

const askAIEditorCommand = async (
  openFiles: OpenPanelFiles,
  single: vscode.Uri,
  options: any
) => openFiles([single]).catch(logError);

export function activate(context: vscode.ExtensionContext) {
  const globalSettings: GetterSetter = newVsCodeState(
    context.globalState,
    SETTINGS_STORAGE_KEY
  );
  const workspaceSettings: GetterSetter = newVsCodeState(
    context.workspaceState,
    SETTINGS_STORAGE_KEY
  );

  const openPanelWithFiles = getOpenPanelWithFiles(
    context,
    globalSettings,
    workspaceSettings
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aragula-ai.askAI",
      (single: vscode.Uri, multi: vscode.Uri[]) =>
        askAICommand(openPanelWithFiles, single, multi)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aragula-ai.askAIEditor",
      (single: vscode.Uri, options: any) =>
        askAIEditorCommand(openPanelWithFiles, single, options)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aragula-ai.generateCommitMessage",
      (sourceControl: vscode.SourceControl) =>
        generateCommitMessageCommand(globalSettings, sourceControl).catch(
          logError
        )
    )
  );
}

export function deactivate() {
  closeAllPanels();
}
