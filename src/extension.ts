import * as vscode from "vscode";
import { useTextAi } from "./ai-api/useTextAi";
import { closeAllPanels } from "./chat/closeAllPanels";
import {
  getOpenPanelWithFiles,
  OpenPanelFiles,
} from "./chat/openPanelWithFiles";
import { generateCommitMessage } from "./generateCommitMessage";
import {
  GetterSetter,
  newVsCodeState,
  SETTINGS_STORAGE_KEY,
} from "./settingsObject";
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

const generateCommitMessageCommand = async (
  globalSettings: GetterSetter,
  sourceControl: vscode.SourceControl
) => {
  if (!sourceControl.rootUri) {
    log("No rootUri found for the source control.", "error");
    return;
  }

  const textAi = useTextAi(globalSettings);

  const abortController = new AbortController();

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.SourceControl,
      title: "Generating Commit Message...",
      cancellable: true,
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        abortController.abort();
      });

      try {
        const commitMessage = await generateCommitMessage(
          sourceControl.rootUri!.fsPath,
          textAi,
          {
            signal: abortController.signal,
            progress: (message) => progress.report({ message }),
          }
        );

        if (commitMessage) {
          sourceControl.inputBox.value = commitMessage;
        } else {
          log("Generated commit message was empty.", "error");
        }
      } catch (error: unknown) {
        if (!abortController.signal.aborted) {
          log(`Failed to generate commit message: ${error}`, "error");
        }
      } finally {
        progress.report({ increment: 100 });
      }
    }
  );
};

export function activate(context: vscode.ExtensionContext) {
  const globalSettings: GetterSetter = newVsCodeState(
    context.globalState,
    SETTINGS_STORAGE_KEY
  );
  const workspaceSettings: GetterSetter = newVsCodeState(
    context.workspaceState,
    SETTINGS_STORAGE_KEY
  );

  const openPanelWithFiles = getOpenPanelWithFiles(context, globalSettings);

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
        generateCommitMessageCommand(globalSettings, sourceControl)
    )
  );
}

export function deactivate() {
  closeAllPanels();
}
