import * as fs from "fs/promises";
import * as vscode from "vscode";
import { AiApiSettings } from "./aiTools/AiApi";
import { availableToolNames, availableVendors } from "./availableToolNames";
import chatview from "./chatview";
import { checkAndFixErrors } from "./checkAndFixErrors";
import { generateCommitMessage } from "./generateCommitMessage";
import {
  getWorkspaceAbsolutePath,
  getWorkspaceRoot,
} from "./getWorkspaceAbsolutePath";
import { handleFormatFilesInFiles } from "./handleFormatFilesInFiles";
import { handleRemoveCommentsInFiles } from "./handleRemoveCommentsInFiles";
import { cancelActiveRequest, handleSendMessage } from "./handleSendMessage";
import {
  handlePausePlan,
  handlePlanAndExecute,
  handleRequestPlanState,
  handleResumePlan,
  handleStopPlan,
  loadPlanState,
  savePlanState,
} from "./planTool";
import {
  deleteProviderSettingFromStorage,
  deleteSystemPromptFromStorage,
  deleteUserPromptFromStorage,
  getAutoFixErrorsFromWorkspace,
  getAutoFormatFromWorkspace,
  getAutoRemoveCommentsFromWorkspace,
  getCurrentProviderSetting,
  getCurrentProviderSettingFromGlobalState,
  getCurrentSystemPromptFromWorkspace,
  getCurrentUserPromptFromWorkspace,
  getEnabledToolNamesFromGlobalState,
  getProviderSettingsFromStorage,
  getSystemPromptsFromStorage,
  getUserPromptsFromStorage,
  saveProviderSettingToStorage,
  saveSystemPromptToStorage,
  saveUserPromptToStorage,
  setAutoFixErrorsToWorkspace,
  setAutoFormatToWorkspace,
  setAutoRemoveCommentsToWorkspace,
  setCurrentSystemPromptToWorkspace,
  setCurrentUserPromptToWorkspace,
  setEnabledToolNamesToGlobalState,
  updateProviderSettingInStorage,
  useProviderSettingInGlobalState,
  useSystemPromptInStorage,
  useUserPromptInStorage,
} from "./settings";
import { commitStaged, stageFiles } from "./utils/git";
import { Logger } from "./utils/Logger";

const log: Logger = (msg: string) => {
  vscode.window.showInformationMessage(msg);
};
const logError: Logger = (e: unknown) => {
  vscode.window.showErrorMessage(`${e}`);
};

const chatPanels = new Map<string, vscode.WebviewPanel>();

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

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "aragula-ai" active');

  const addFiles = async (multi: vscode.Uri[]) => {
    const openFilePaths = await readOpenFilePaths(multi);
    let tabId = Date.now().toString();
    let existingPanel: vscode.WebviewPanel | undefined = undefined;

    for (const panel of chatPanels.values()) {
      if (!panel) {
        continue;
      }
      existingPanel = panel;
      tabId = panel.title.split(" - ")[1];
      break;
    }

    const systemPrompts = getSystemPromptsFromStorage(context);
    const userPrompts = getUserPromptsFromStorage(context);
    const enabledToolNames = getEnabledToolNamesFromGlobalState(context);
    const providerSettingsList = getProviderSettingsFromStorage(context);
    const currentProviderSetting =
      getCurrentProviderSettingFromGlobalState(context);

    const workspaceSystemPrompt = getCurrentSystemPromptFromWorkspace(
      context,
      tabId
    );
    const systemPrompt = workspaceSystemPrompt ?? systemPrompts[0] ?? "";

    const workspaceUserPrompt = getCurrentUserPromptFromWorkspace(
      context,
      tabId
    );
    const userPrompt = workspaceUserPrompt ?? userPrompts[0] ?? "";

    const autoRemoveComments =
      getAutoRemoveCommentsFromWorkspace(context, tabId) ?? false;
    const autoFormat = getAutoFormatFromWorkspace(context, tabId) ?? false;
    const autoFixErrors =
      getAutoFixErrorsFromWorkspace(context, tabId) ?? false;

    if (existingPanel) {
      existingPanel.reveal(vscode.ViewColumn.One);
      sendFilesToExistingChat(existingPanel, openFilePaths);
    } else {
      await openChatWindow(
        context,
        openFilePaths,
        tabId,
        systemPrompt,
        systemPrompts,
        userPrompts,
        userPrompt,
        availableToolNames,
        enabledToolNames,
        providerSettingsList,
        currentProviderSetting,
        availableVendors,
        autoRemoveComments,
        autoFormat,
        autoFixErrors
      );
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

        const currentProviderSetting = getCurrentProviderSetting(context);

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

function sendFilesToExistingChat(
  panel: vscode.WebviewPanel,
  filePaths: string[]
) {
  panel.webview.postMessage({
    command: "addFilesFromDialog",
    filePaths: filePaths,
  });
}

async function readOpenFilePaths(uris: vscode.Uri[]): Promise<string[]> {
  const openFilePaths: string[] = [];
  if (!uris) {
    return openFilePaths;
  }

  for (const uri of uris) {
    if (uri.fsPath) {
      try {
        await fs.access(uri.fsPath, fs.constants.R_OK);
        const relativePath = vscode.workspace.asRelativePath(uri);
        openFilePaths.push(relativePath);
      } catch (error) {
        throw new Error(`Could not access file: ${uri.fsPath}: ${error}`);
      }
    }
  }
  return openFilePaths;
}

async function openChatWindow(
  context: vscode.ExtensionContext,
  openedFilePaths: string[],
  tabId: string,
  systemPrompt: string | undefined,
  systemPrompts: string[],
  userPrompts: string[],
  userPrompt: string,
  availableToolNames: string[],
  enabledToolNames: string[],
  providerSettingsList: AiApiSettings[],
  currentProviderSetting: AiApiSettings | undefined,
  availableVendors: string[],
  autoRemoveComments: boolean,
  autoFormat: boolean,
  autoFixErrors: boolean
) {
  const panel = vscode.window.createWebviewPanel(
    "askAIChat",
    `Ask AI - ${tabId}`,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  chatPanels.set(tabId, panel);

  panel.onDidDispose(() => {
    chatPanels.delete(tabId);
  });

  panel.webview.html = chatview(tabId);
  sendInitialSystemMessage(panel, openedFilePaths);

  panel.webview.onDidReceiveMessage(
    (message) =>
      handleWebviewMessage(context, panel, message, openedFilePaths, tabId),
    undefined,
    context.subscriptions
  );

  const planState = loadPlanState(context, tabId);

  panel.webview.postMessage({
    command: "initPrompts",
    systemPrompt: systemPrompt,
    userPrompt: userPrompt,
    systemPrompts: systemPrompts,
    userPrompts: userPrompts,
    availableTools: availableToolNames,
    enabledTools: enabledToolNames,
    providerSettingsList: providerSettingsList,
    currentProviderSetting: currentProviderSetting,
    availableVendors: availableVendors,
    autoRemoveComments: autoRemoveComments,
    autoFormat: autoFormat,
    autoFixErrors: autoFixErrors,
    planState: planState,
  });

  panel.webview.postMessage({
    command: "sendEnabledTools",
    enabledTools: getEnabledToolNamesFromGlobalState(context),
  });
  panel.webview.postMessage({
    command: "sendCurrentProviderSetting",
    currentProviderSetting: getCurrentProviderSettingFromGlobalState(context),
  });

  setCurrentSystemPromptToWorkspace(context, tabId, systemPrompt ?? "");
  setCurrentUserPromptToWorkspace(context, tabId, userPrompt);
  setAutoRemoveCommentsToWorkspace(context, tabId, autoRemoveComments);
  setAutoFormatToWorkspace(context, tabId, autoFormat);
  setAutoFixErrorsToWorkspace(context, tabId, autoFixErrors);
}

function sendInitialSystemMessage(
  panel: vscode.WebviewPanel,
  openedFilePaths: string[]
) {
  panel.webview.postMessage({
    command: "setOpenFiles",
    files: openedFilePaths,
  });
}

function handleWebviewMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  message: any,
  openedFilePaths: string[],
  tabId: string
) {
  const log: Logger = (msg: string, type: string = "log") => {
    panel.webview.postMessage({
      command: "logMessage",
      text: msg,
      tabId: tabId,
      messageType: type,
      stepIndex: message.stepIndex,
    });
  };

  switch (message.command) {
    case "sendMessage":
      handleSendMessage(context, panel, message, tabId, log);
      break;
    case "checkErrorsInFiles":
      checkAndFixErrors(message.filePaths, message.providerSetting, log);
      break;
    case "setSystemPrompt":
      handleSetSystemPrompt(context, panel, message.systemPrompt || "", tabId);
      break;
    case "setUserPrompt":
      handleSetUserPrompt(context, panel, message.userPrompt, tabId);
      break;
    case "clearMessages":
      panel.webview.postMessage({ command: "clearMessages" });
      break;
    case "cancelRequest":
      cancelActiveRequest(message.messageId, log);
      break;
    case "removeFile":
      handleRemoveFile(panel, message.filePath, openedFilePaths);
      break;
    case "addFiles":
      handleAddFiles(panel, message.filePaths, openedFilePaths);
      break;
    case "requestAddFiles":
      requestAddFilesDialog(panel);
      break;
    case "addFilesFromDialog":
      handleAddFilesFromDialog(panel, message.filePaths, openedFilePaths);
      break;
    case "saveSystemPromptToLibrary":
      handleSaveSystemPromptToLibrary(context, panel, message.prompt);
      break;
    case "saveUserPromptToLibrary":
      handleSaveUserPromptToLibrary(context, panel, message.prompt);
      break;
    case "deleteSystemPromptFromLibrary":
      handleDeleteSystemPromptFromLibrary(context, panel, message.prompt);
      break;
    case "deleteUserPromptFromLibrary":
      handleDeleteUserPromptFromLibrary(context, panel, message.prompt);
      break;
    case "requestSystemPrompts":
      handleRequestSystemPrompts(context, panel);
      break;
    case "requestUserPrompts":
      handleRequestUserPrompts(context, panel);
      break;
    case "useSystemPromptFromLibrary":
      handleUseSystemPromptFromLibrary(context, panel, message.prompt, tabId);
      break;
    case "useUserPromptFromLibrary":
      handleUseUserPromptFromLibrary(context, panel, message.prompt, tabId);
      break;
    case "enableTool":
      handleEnableTool(context, panel, message.toolName);
      break;
    case "disableTool":
      handleDisableTool(context, panel, message.toolName);
      break;
    case "requestProviderSettings":
      handleRequestProviderSettings(context, panel);
      break;
    case "saveProviderSetting":
      handleSaveProviderSetting(context, panel, message.providerSetting);
      break;
    case "updateProviderSetting":
      handleUpdateProviderSetting(
        context,
        panel,
        message.oldProviderSettingName,
        message.providerSetting
      );
      break;
    case "deleteProviderSettingFromLibrary":
      handleDeleteProviderSettingFromLibrary(
        context,
        panel,
        message.providerSettingName
      );
      break;
    case "useProviderSettingFromLibrary":
      handleUseProviderSettingFromLibrary(
        context,
        panel,
        message.providerSettingName,
        tabId
      );
      break;
    case "requestAvailableVendors":
      handleRequestAvailableVendors(context, panel);
      break;
    case "requestEnabledTools":
      handleRequestEnabledTools(context, panel);
      break;
    case "requestCurrentProviderSetting":
      handleRequestCurrentProviderSetting(context, panel);
      break;
    case "removeCommentsInFiles":
      handleRemoveCommentsInFiles(message.filePaths, log);
      break;
    case "formatFilesInFiles":
      handleFormatFilesInFiles(message.filePaths, log);
      break;
    case "setAutoRemoveComments":
      setAutoRemoveCommentsToWorkspace(context, tabId, message.checked);
      break;
    case "setAutoFormat":
      setAutoFormatToWorkspace(context, tabId, message.checked);
      break;
    case "setAutoFixErrors":
      setAutoFixErrorsToWorkspace(context, tabId, message.checked);
      break;
    case "commitFiles":
      handleCommitFiles(context, message.fileNames, log);
      break;
    case "planAndExecute":
      handlePlanAndExecute(context, panel, message, tabId, log);
      break;
    case "pausePlan":
      handlePausePlan(context, panel, tabId, log);
      break;
    case "resumePlan":
      handleResumePlan(context, panel, tabId, log);
      break;
    case "stopPlan":
      handleStopPlan(context, panel, tabId, log);
      break;
    case "requestPlanState":
      handleRequestPlanState(context, panel, tabId);
      break;
    default:
      console.warn("Unknown command from webview:", message.command);
  }
}

async function handleCommitFiles(
  context: vscode.ExtensionContext,
  fileNames: string[],
  log: Logger
) {
  if (!fileNames || fileNames.length === 0) {
    log("No files selected to commit.", "warning");
    return;
  }

  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    log("No workspace folder found.", "error");
    return;
  }

  const currentProviderSetting = getCurrentProviderSetting(context);

  const abortController = new AbortController();

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Committing files...",
      cancellable: true,
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        abortController.abort();
      });

      try {
        progress.report({ message: "Staging files..." });
        await stageFiles(fileNames);

        progress.report({ message: "Generating commit message..." });
        const commitMessage = await generateCommitMessage(
          workspaceRoot.fsPath,
          currentProviderSetting,
          {
            signal: abortController.signal,
            progress: (message) => progress.report({ message }),
          }
        );

        progress.report({ message: "Committing staged files..." });
        await commitStaged(commitMessage);

        log(
          `Successfully committed ${fileNames.length} file(s) with message: "${commitMessage}"`,
          "info"
        );
      } catch (error: unknown) {
        if (!abortController.signal.aborted) {
          log(`Failed to commit files: ${error}`, "error");
        } else {
          log("Commit generation or process cancelled.", "info");
        }
      } finally {
        progress.report({ increment: 100 });
      }
    }
  );
}

async function handleRequestCurrentProviderSetting(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  const currentProviderSetting =
    getCurrentProviderSettingFromGlobalState(context);
  panel.webview.postMessage({
    command: "sendCurrentProviderSetting",
    currentProviderSetting: currentProviderSetting,
  });
}

async function handleRequestEnabledTools(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  const enabledTools = getEnabledToolNamesFromGlobalState(context);
  panel.webview.postMessage({
    command: "sendEnabledTools",
    enabledTools: enabledTools,
  });
}

async function handleRequestAvailableVendors(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  panel.webview.postMessage({
    command: "availableVendors",
    availableVendors: availableVendors,
  });
}

async function handleUpdateProviderSetting(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  oldProviderSettingName: string,
  providerSetting: AiApiSettings
) {
  await updateProviderSettingInStorage(
    context,
    oldProviderSettingName,
    providerSetting
  );
  const updatedProviderSettings = getProviderSettingsFromStorage(context);
  panel.webview.postMessage({
    command: "providerSettingsList",
    providerSettingsList: updatedProviderSettings,
  });
  panel.webview.postMessage({ command: "providerSettingsUpdated" });
}

async function handleUseProviderSettingFromLibrary(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  providerSettingName: string,
  tabId: string
) {
  await useProviderSettingInGlobalState(context, providerSettingName);
  const updatedProviderSettings = getProviderSettingsFromStorage(context);
  const currentProviderSetting = updatedProviderSettings.find(
    (p) => p.name === providerSettingName
  );

  const planState = loadPlanState(context, tabId);
  if (planState.status === "paused" || planState.status === "failed") {
    const newPlanState = {
      ...planState,
      providerSetting: currentProviderSetting || null,
    };
    savePlanState(context, tabId, newPlanState);
    panel.webview.postMessage({
      command: "updatePlanState",
      planState: newPlanState,
    });
  }

  panel.webview.postMessage({
    command: "providerSettingsList",
    providerSettingsList: updatedProviderSettings,
    currentProviderSetting: currentProviderSetting,
  });
  panel.webview.postMessage({
    command: "sendCurrentProviderSetting",
    currentProviderSetting: currentProviderSetting,
  });
}

async function handleDeleteProviderSettingFromLibrary(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  providerSettingName: string
) {
  await deleteProviderSettingFromStorage(context, providerSettingName);
  const updatedProviderSettings = getProviderSettingsFromStorage(context);
  panel.webview.postMessage({
    command: "providerSettingsList",
    providerSettingsList: updatedProviderSettings,
  });
  panel.webview.postMessage({ command: "providerSettingsUpdated" });
}

async function handleSaveProviderSetting(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  providerSetting: AiApiSettings
) {
  await saveProviderSettingToStorage(context, providerSetting);
  const updatedproviderSettings = getProviderSettingsFromStorage(context);
  panel.webview.postMessage({
    command: "providerSettingsList",
    providerSettingsList: updatedproviderSettings,
  });
  panel.webview.postMessage({ command: "providerSettingsUpdated" });
}

async function handleRequestProviderSettings(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  const providerSettingsList = getProviderSettingsFromStorage(context);
  const currentProviderSetting =
    getCurrentProviderSettingFromGlobalState(context) ||
    providerSettingsList[0];

  panel.webview.postMessage({
    command: "providerSettingsList",
    providerSettingsList: providerSettingsList,
    currentProviderSetting: currentProviderSetting,
  });
}

async function handleEnableTool(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  toolName: string
) {
  let enabledTools = getEnabledToolNamesFromGlobalState(context);
  if (!enabledTools.includes(toolName)) {
    enabledTools = [...enabledTools, toolName];
    setEnabledToolNamesToGlobalState(context, enabledTools);
    panel.webview.postMessage({
      command: "updateEnabledTools",
      enabledTools: enabledTools,
    });
    panel.webview.postMessage({
      command: "sendEnabledTools",
      enabledTools: enabledTools,
    });
  }
}

async function handleDisableTool(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  toolName: string
) {
  let enabledTools = getEnabledToolNamesFromGlobalState(context);
  enabledTools = enabledTools.filter((name) => name !== toolName);
  setEnabledToolNamesToGlobalState(context, enabledTools);
  panel.webview.postMessage({
    command: "updateEnabledTools",
    enabledTools: enabledTools,
  });
  panel.webview.postMessage({
    command: "sendEnabledTools",
    enabledTools: enabledTools,
  });
}

async function handleUseSystemPromptFromLibrary(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  prompt: string,
  tabId: string
) {
  await useSystemPromptInStorage(context, prompt);
  setCurrentSystemPromptToWorkspace(context, tabId, prompt);
  const updatedSystemPrompts = getSystemPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "systemPromptsList",
    prompts: updatedSystemPrompts,
  });
}

async function handleUseUserPromptFromLibrary(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  prompt: string,
  tabId: string
) {
  await useUserPromptInStorage(context, prompt);
  setCurrentUserPromptToWorkspace(context, tabId, prompt);
  const updatedUserPrompts = getUserPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "userPromptsList",
    prompts: updatedUserPrompts,
  });
}

async function handleRequestSystemPrompts(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  const systemPrompts = getSystemPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "systemPromptsList",
    prompts: systemPrompts,
  });
}

async function handleRequestUserPrompts(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  const userPrompts = getUserPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "userPromptsList",
    prompts: userPrompts,
  });
}

async function handleSaveSystemPromptToLibrary(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  prompt: string
) {
  await saveSystemPromptToStorage(context, prompt);
  const updatedSystemPrompts = getSystemPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "systemPromptsList",
    prompts: updatedSystemPrompts,
  });
}

async function handleSaveUserPromptToLibrary(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  prompt: string
) {
  await saveUserPromptToStorage(context, prompt);
  const updatedUserPrompts = getUserPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "userPromptsList",
    prompts: updatedUserPrompts,
  });
}

async function handleDeleteSystemPromptFromLibrary(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  prompt: string
) {
  await deleteSystemPromptFromStorage(context, prompt);
  const updatedSystemPrompts = getSystemPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "systemPromptsList",
    prompts: updatedSystemPrompts,
  });
}

async function handleDeleteUserPromptFromLibrary(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  prompt: string
) {
  await deleteUserPromptFromStorage(context, prompt);
  const updatedUserPrompts = getUserPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "userPromptsList",
    prompts: updatedUserPrompts,
  });
}

async function handleAddFilesFromDialog(
  panel: vscode.WebviewPanel,
  filePaths: string[],
  openedFilePaths: string[]
) {
  await handleAddFiles(panel, filePaths, openedFilePaths);
}

async function requestAddFilesDialog(panel: vscode.WebviewPanel) {
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
    panel.webview.postMessage({ command: "addFilesFromDialog", filePaths });
  }
}

function handleRemoveFile(
  panel: vscode.WebviewPanel,
  filePath: string,
  openedFilePaths: string[]
) {
  const updatedFilePaths = openedFilePaths.filter((f) => f !== filePath);
  panel.webview.postMessage({
    command: "setOpenFiles",
    files: updatedFilePaths,
  });
}

async function handleAddFiles(
  panel: vscode.WebviewPanel,
  filePaths: string[],
  openedFilePaths: string[]
) {
  const addedFiles: string[] = [];
  const currentOpenedFiles = [...openedFilePaths];

  for (const filePath of filePaths) {
    if (!currentOpenedFiles.includes(filePath)) {
      try {
        await fs.access(getWorkspaceAbsolutePath(filePath), fs.constants.R_OK);
        currentOpenedFiles.push(filePath);
        addedFiles.push(filePath);
      } catch (error) {
        vscode.window.showWarningMessage(`Failed to read file: ${filePath}`);
        continue;
      }
    }
  }
  panel.webview.postMessage({
    command: "setOpenFiles",
    files: currentOpenedFiles,
  });
  return addedFiles;
}

async function handleSetSystemPrompt(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  newPrompt: string,
  tabId: string
) {
  setCurrentSystemPromptToWorkspace(context, tabId, newPrompt || "");
}

async function handleSetUserPrompt(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  newPrompt: string,
  tabId: string
) {
  setCurrentUserPromptToWorkspace(context, tabId, newPrompt);
}

export function deactivate() {}
