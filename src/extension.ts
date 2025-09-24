import * as vscode from "vscode";
import { useTextAi } from "./ai-api/useTextAi";
import { readOpenFilePaths } from "./file/readOpenFilePaths";
import { generateCommitMessage } from "./generateCommitMessage";
import { openChatWindow } from "./openChatWindow";
import { newPostMessage } from "./PostMessage";
import {
  GetterSetter,
  newVsCodeState,
  SETTINGS_STORAGE_KEY,
} from "./settingsObject";
import {
  ActiveTasks,
  cancelAllTasks,
  Logger,
  PendingFormRequests,
} from "./utils/Logger";

const log: Logger = (msg: string) => {
  vscode.window.showInformationMessage(msg);
};
const logError: Logger = (e: unknown) => {
  vscode.window.showErrorMessage(`${e}`);
};

interface ChatPanelInfo {
  panel: vscode.WebviewPanel;
  activeTasks: ActiveTasks;
  pendingFormRequests: PendingFormRequests;
}

export const chatPanels = new Map<string, ChatPanelInfo>();

export function activate(context: vscode.ExtensionContext) {
  const globalSettings: GetterSetter = newVsCodeState(
    context.globalState,
    SETTINGS_STORAGE_KEY
  );
  const workspaceSettings: GetterSetter = newVsCodeState(
    context.workspaceState,
    SETTINGS_STORAGE_KEY
  );

  const addFiles = async (multi: vscode.Uri[]) => {
    const openFilePaths = await readOpenFilePaths(
      multi.map((uri) => uri.fsPath)
    );
    let tabId = Date.now().toString();
    let existingPanelInfo: ChatPanelInfo | undefined = undefined;

    for (const panelInfo of chatPanels.values()) {
      if (!panelInfo || !panelInfo.panel) {
        continue;
      }
      existingPanelInfo = panelInfo;
      tabId = panelInfo.panel.title.split(" - ")[1];
      break;
    }

    const tabState: GetterSetter = newVsCodeState(
      context.workspaceState,
      tabId
    );

    if (existingPanelInfo) {
      existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
      const postMessage = newPostMessage(existingPanelInfo.panel);
      postMessage({
        command: "addFiles",
        filePaths: openFilePaths,
      });
    } else {
      await openChatWindow(context, openFilePaths, tabId, globalSettings);
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aragula-ai.askAI",
      async (single: vscode.Uri, multi: vscode.Uri[]) =>
        addFiles(multi).catch(logError)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aragula-ai.askAIEditor",
      async (single: vscode.Uri, options: any) =>
        addFiles([single]).catch(logError)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aragula-ai.generateCommitMessage",
      async (sourceControl: vscode.SourceControl) => {
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
      }
    )
  );
}

export function deactivate() {
  chatPanels.forEach((panelInfo) => {
    cancelAllTasks(panelInfo.activeTasks);
    panelInfo.pendingFormRequests.forEach(({ reject }) =>
      reject(
        new Error(
          "Form request cancelled: Webview panel closed during deactivation."
        )
      )
    );
    panelInfo.pendingFormRequests.clear();
  });
}
