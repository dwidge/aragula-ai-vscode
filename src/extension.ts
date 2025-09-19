import * as fs from "fs/promises";
import path from "path";
import * as vscode from "vscode";
import { AiApiSettings } from "./aiTools/AiApi";
import { availableToolNames, availableVendors } from "./availableToolNames";
import { checkAndFixErrors } from "./checkAndFixErrors";
import { generateCommitMessage } from "./generateCommitMessage";
import { getWorkspaceRoot } from "./getWorkspaceAbsolutePath";
import { handleFormatFilesInFiles } from "./handleFormatFilesInFiles";
import { handleRemoveCommentsInFiles } from "./handleRemoveCommentsInFiles";
import { addFiles, openFilesDialog, removeFiles } from "./handleRemoveFile";
import { handleRunCommand } from "./handleRunCommand";
import { handleSendMessage } from "./handleSendMessage";
import { handlePlanAndExecute } from "./planTool";
import { newPostMessage, PostMessage } from "./PostMessage";
import { processPath } from "./processPath";
import { runTestFormTask } from "./runTestFormTask";
import { runTestMultiTask } from "./runTestMultiTask";
import { runTestSerialTask } from "./runTestSerialTask";
import { runTestSetCommitMessage } from "./runTestSetCommitMessage";
import { runTestTask } from "./runTestTask";
import {
  GetterSetter,
  newVsCodeState,
  SETTINGS_STORAGE_KEY,
  SettingsObject,
  useProviderByName,
  useSettingsObject,
} from "./settingsObject";
import { commitStaged, stageFiles } from "./utils/git";
import {
  ActiveTasks,
  cancelAllTasks,
  cancelTask,
  createMessageLogger,
  createTask,
  Logger,
  PendingFormRequests,
  TaskLogger,
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

const chatPanels = new Map<string, ChatPanelInfo>();

export interface PlanStep {
  description: string;
  subPrompt: string;
}

export interface AIPlan {
  overallGoal: string;
  steps: PlanStep[];
}

export interface PlanState {
  status: "idle" | "planning" | "executing" | "paused" | "failed" | "completed";
  currentStepIndex: number;
  plan: AIPlan | null;
  error: string | null;
  filePaths: string[];
  providerSetting: AiApiSettings | null;
  autoRemoveComments: boolean;
  autoFormat: boolean;
  autoFixErrors: boolean;
  tabId: string;
}

export const PLAN_STATE_KEY = (tabId: string) => `planState-${tabId}`;

const getTextAsset = async (extensionPath: string, assetFileName: string) => {
  try {
    const assetPathInDist = path.join(extensionPath, "dist", assetFileName);
    const fileUri = vscode.Uri.file(assetPathInDist);
    return await fs.readFile(fileUri.fsPath, "utf8");
  } catch (error) {
    throw new Error(
      `getTextAssetE1: Could not read asset file: ${assetFileName}: ${error}`
    );
  }
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

  const addFiles = async (multi: vscode.Uri[]) => {
    const openFilePaths = await readOpenFilePaths(multi);
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

        const [settings, setSettings] = useSettingsObject(globalSettings);

        const currentProviderSetting = useProviderByName(
          settings,
          settings.providerName
        );
        if (!currentProviderSetting) {
          throw new Error("No provider selected");
        }

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
                currentProviderSetting,
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

async function readOpenFilePaths(uris: vscode.Uri[]): Promise<string[]> {
  const openFilePaths: string[] = [];
  if (!uris) {
    return openFilePaths;
  }

  for (const uri of uris) {
    if (uri.fsPath) {
      const files = await processPath(uri.fsPath);
      openFilePaths.push(...files);
    }
  }

  return openFilePaths;
}

async function openChatWindow(
  context: vscode.ExtensionContext,
  openedFilePaths: string[],
  tabId: string,
  globalSettings: GetterSetter
) {
  const panel = vscode.window.createWebviewPanel(
    "askAIChat",
    `Ask AI - ${tabId}`,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  const activeTasks: ActiveTasks = new Map<
    string,
    [AbortController, string | undefined]
  >();
  const pendingFormRequests: PendingFormRequests = new Map();
  chatPanels.set(tabId, { panel, activeTasks, pendingFormRequests });

  panel.onDidDispose(() => {
    try {
      cancelAllTasks(activeTasks);
      pendingFormRequests.forEach(({ reject }) =>
        reject(new Error("Form request cancelled: Webview panel closed."))
      );
      pendingFormRequests.clear();
    } catch (e) {
      console.log("onDidDisposeE1", e);
    }
    chatPanels.delete(tabId);
  });

  const htmlContent = await getTextAsset(
    context.extensionPath,
    "chatview.html"
  );
  panel.webview.html = htmlContent.replace("${tabId}", tabId);

  const postMessage = newPostMessage(panel);

  postMessage({
    command: "addFiles",
    filePaths: openedFilePaths,
  });

  panel.webview.onDidReceiveMessage(
    (message) =>
      handleWebviewMessage(
        context,
        postMessage,
        message,
        openedFilePaths,
        tabId,
        globalSettings
      ),
    undefined,
    context.subscriptions
  );

  const [settings, setSettings] = useSettingsObject(globalSettings);
  const currentProviderSetting = useProviderByName(
    settings,
    settings.providerName
  );

  await sendSettingsToWebview(
    postMessage,
    settings,
    currentProviderSetting,
    availableVendors,
    availableToolNames
  );
}

/**
 * Sends the full settings object and related state to the webview.
 * @param postMessage Function to post message to webview.
 * @param settings The settings object to send.
 * @param currentProviderSetting The currently selected provider settings.
 * @param availableVendors List of available AI vendors.
 * @param availableTools List of available AI tools.
 */
async function sendSettingsToWebview(
  postMessage: PostMessage,
  settings: SettingsObject,
  currentProviderSetting: AiApiSettings | undefined,
  availableVendors: string[],
  availableTools: string[]
) {
  postMessage({
    command: "settingsUpdated",
    settings,
    currentProviderSetting,
    availableVendors,
    availableTools,
  });
}

async function handleWebviewMessage(
  context: vscode.ExtensionContext,
  postMessage: PostMessage,
  message: any,
  openedFilePaths: string[],
  tabId: string,
  globalSettings: GetterSetter
) {
  const [settings, setSettings] = useSettingsObject(globalSettings);

  const panelInfo = chatPanels.get(tabId);
  if (!panelInfo) {
    throw new Error(`Panel info not found for tabId: ${tabId}`);
  }
  const activeTasks = panelInfo.activeTasks;
  const pendingFormRequests = panelInfo.pendingFormRequests;

  const logTask: TaskLogger = createTask(
    async (v) => {
      await postMessage({ ...v, tabId });
    },
    activeTasks,
    undefined,
    pendingFormRequests
  );

  const log: Logger = createMessageLogger(logTask);

  switch (message.command) {
    case "cancelTask":
      const taskIdToCancel = message.id;
      cancelTask(taskIdToCancel, activeTasks);
      break;
    case "formResponse":
      const formResponse = message.formResponse;
      const pending = pendingFormRequests.get(formResponse.id);
      if (pending) {
        if (formResponse.isCancelled) {
          const abortError = new Error("Form submission cancelled by user.");
          abortError.name = "AbortError";
          pending.reject(abortError);
        } else {
          pending.resolve({
            button: formResponse.button,
            formData: formResponse.formData,
          });
        }
        pendingFormRequests.delete(formResponse.id);
      }
      break;
    case "sendMessage":
      try {
        await handleSendMessage(
          context,
          postMessage,
          {
            ...message,
            privacySettings: settings.privacySettings,
          },
          tabId,
          logTask
        );
      } catch (e) {
        console.error("handleSendMessage error:", e);
        log("Error during send message: " + e);
      } finally {
        postMessage({ command: "resetSendButton" });
      }
      break;
    case "runCommand":
      handleRunCommand(message.runCommand, logTask)
        .catch((e) => console.log("runCommandE1", e))
        .finally(() => {
          postMessage({ command: "resetRunCommandButton" });
        });
      break;
    case "checkErrorsInFiles":
      logTask(
        {
          summary: `Check and fix errors`,
          detail: `Files: ${message.filePaths.join(", ")}`,
          type: "task",
        },
        async (progress, log, signal) =>
          checkAndFixErrors(
            message.filePaths,
            message.providerSetting,
            createMessageLogger(log)
          )
      );
      break;
    case "clearMessages":
      postMessage({ command: "clearMessages" });
      break;
    case "removeFile":
      removeFiles(postMessage, message.filePath, openedFilePaths);
      break;
    case "addFiles":
      await addFiles(postMessage, message.filePaths, openedFilePaths);
      break;
    case "openFilesDialog":
      openFilesDialog(postMessage);
      break;
    case "updateSettings":
      {
        const updatedSettings = await setSettings((prev) => ({
          ...prev,
          ...message.settings,
        }));
        const currentProviderSetting = useProviderByName(
          updatedSettings,
          updatedSettings.providerName
        );
        await sendSettingsToWebview(
          postMessage,
          updatedSettings,
          currentProviderSetting,
          availableVendors,
          availableToolNames
        );
      }
      break;
    case "removeCommentsInFiles":
      handleRemoveCommentsInFiles(message.filePaths, log);
      break;
    case "formatFilesInFiles":
      handleFormatFilesInFiles(message.filePaths, log);
      break;
    case "commitFiles":
      handleCommitFiles(settings, message.fileNames, logTask);
      break;
    case "planAndExecute":
      handlePlanAndExecute(message, logTask)
        .catch((e) => {
          console.error("handlePlanAndExecute error:", e);
          log("Error during plan and execute: " + e, "error");
        })
        .finally(() => {
          postMessage({ command: "resetPlanButton" });
        });
      break;
    case "runTestTask":
      runTestTask(logTask);
      break;
    case "runTestMultiTask":
      runTestMultiTask(logTask);
      break;
    case "runTestSerialTask":
      runTestSerialTask(logTask);
      break;
    case "runTestFormTask":
      runTestFormTask(logTask);
      break;
    case "runTestSetCommitMessage":
      runTestSetCommitMessage(logTask);
      break;
    default:
      console.warn("Unknown command from webview:", message.command);
  }
}

const handleCommitFiles = (
  settings: SettingsObject,
  fileNames: string[],
  log: TaskLogger
) =>
  log(
    {
      summary: `Commit files`,
      detail: `Files: ${fileNames.join(", ")}`,
      type: "task",
    },
    async (progress, log, signal) => {
      if (!fileNames || fileNames.length === 0) {
        throw new Error("No files selected to commit.");
      }

      const workspaceRoot = getWorkspaceRoot();
      const currentProviderSetting = useProviderByName(
        settings,
        settings.providerName
      );
      if (!currentProviderSetting) {
        throw new Error("No provider selected");
      }

      log({ summary: "Stage files" });
      await stageFiles(fileNames);

      log({ summary: "Generate commit message" });
      const commitMessage = await log({}, (progress, log, signal) =>
        generateCommitMessage(workspaceRoot.fsPath, currentProviderSetting, {
          signal,
          progress: (message) =>
            log({
              summary: message,
            }),
        })
      );

      log({ summary: "Commit staged files" });
      await commitStaged(commitMessage);

      log({
        summary: `Successfully committed ${fileNames.length} file(s).`,
        detail: `Commit message: "${commitMessage}"`,
        type: "success",
      });
    }
  );

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
