import * as fs from "fs/promises";
import path from "path";
import * as vscode from "vscode";
import { AiApiSettings } from "./aiTools/AiApi";
import { availableToolNames, availableVendors } from "./availableToolNames";
import { checkAndFixErrors } from "./checkAndFixErrors";
import { generateCommitMessage } from "./generateCommitMessage";
import {
  getWorkspaceAbsolutePath,
  getWorkspaceRoot,
} from "./getWorkspaceAbsolutePath";
import { handleFormatFilesInFiles } from "./handleFormatFilesInFiles";
import { handleRemoveCommentsInFiles } from "./handleRemoveCommentsInFiles";
import { handleRunCommand } from "./handleRunCommand";
import { handleSendMessage } from "./handleSendMessage";
import { handlePlanAndExecute } from "./planTool";
import { runTestMultiTask } from "./runTestMultiTask";
import { runTestSerialTask } from "./runTestSerialTask";
import { runTestTask } from "./runTestTask";
import {
  AUTO_FIX_ERRORS_STORAGE_KEY,
  AUTO_FORMAT_STORAGE_KEY,
  AUTO_REMOVE_COMMENTS_STORAGE_KEY,
  CURRENT_PROVIDER_SETTING_STORAGE_KEY,
  deleteProviderSettingFromStorage,
  deleteSystemPromptFromStorage,
  deleteUserPromptFromStorage,
  ENABLED_TOOLS_STORAGE_KEY,
  getCurrentProviderSetting,
  getCurrentProviderSettingFromGlobalState,
  getEnabledToolNamesFromGlobalState,
  getProviderSettingsFromStorage,
  getSystemPromptsFromStorage,
  getUserPromptsFromStorage,
  PROVIDER_SETTINGS_STORAGE_KEY,
  saveProviderSettingToStorage,
  saveSystemPromptToStorage,
  saveUserPromptToStorage,
  setAutoFixErrorsToWorkspace,
  setAutoFormatToWorkspace,
  setAutoRemoveCommentsToWorkspace,
  setCurrentSystemPromptToWorkspace,
  setCurrentUserPromptToWorkspace,
  setEnabledToolNamesToGlobalState,
  SYSTEM_PROMPTS_STORAGE_KEY,
  updateProviderSettingInStorage,
  useProviderSettingInGlobalState,
  USER_PROMPTS_STORAGE_KEY,
  useSystemPromptInStorage,
  useUserPromptInStorage,
  WORKSPACE_RUN_COMMAND_STORAGE_KEY,
  WORKSPACE_SYSTEM_PROMPT_STORAGE_KEY_PREFIX,
  WORKSPACE_USER_PROMPT_STORAGE_KEY_PREFIX,
} from "./settings";
import { commitStaged, stageFiles } from "./utils/git";
import {
  ActiveTasks,
  cancelAllTasks,
  cancelTask,
  createMessageLogger,
  createTask,
  Logger,
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
  console.log('Extension "aragula-ai" active');

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

    if (existingPanelInfo) {
      existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
      sendFilesToExistingChat(existingPanelInfo.panel, openFilePaths);
    } else {
      await openChatWindow(context, openFilePaths, tabId);
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

type GetState = <T>(key: string, defaultValue: T) => T;
type SetState = <T>(key: string, value: T) => Promise<void>;

async function openChatWindow(
  context: vscode.ExtensionContext,
  openedFilePaths: string[],
  tabId: string
) {
  const getGlobalState: GetState = <T>(key: string, defaultValue: T): T =>
    context.globalState.get<T>(key, defaultValue);

  const setGlobalState: SetState = async <T>(key: string, value: T) =>
    context.globalState.update(key, value);

  const getWorkspaceState: GetState = <T>(key: string, defaultValue: T): T =>
    context.workspaceState.get<T>(key, defaultValue);

  const setWorkspaceState: SetState = async <T>(key: string, value: T) =>
    context.workspaceState.update(key, value);

  const getTabState: GetState = <T>(key: string, defaultValue: T) =>
    getWorkspaceState(`${tabId}-${key}`, defaultValue);

  const setTabState: SetState = async <T>(key: string, value: T) =>
    setWorkspaceState(`${tabId}-${key}`, value);

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
  chatPanels.set(tabId, { panel, activeTasks });

  panel.onDidDispose(() => {
    try {
      cancelAllTasks(activeTasks);
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
  sendInitialSystemMessage(panel, openedFilePaths);

  panel.webview.onDidReceiveMessage(
    (message) =>
      handleWebviewMessage(
        context,
        panel,
        message,
        openedFilePaths,
        tabId,
        getWorkspaceState,
        setWorkspaceState
      ),
    undefined,
    context.subscriptions
  );

  await sendInitialSettingsToWebview(panel, getWorkspaceState);

  panel.webview.postMessage({
    command: "sendEnabledTools",
    enabledTools: getEnabledToolNamesFromGlobalState(context),
  });
  panel.webview.postMessage({
    command: "sendCurrentProviderSetting",
    currentProviderSetting: getCurrentProviderSettingFromGlobalState(context),
  });
}

async function sendInitialSettingsToWebview(
  panel: vscode.WebviewPanel,
  getWorkspaceState: GetState
) {
  const systemPrompts = getWorkspaceState<string[]>(
    SYSTEM_PROMPTS_STORAGE_KEY,
    []
  );
  const userPrompts = getWorkspaceState<string[]>(USER_PROMPTS_STORAGE_KEY, []);
  const enabledToolNames = getWorkspaceState<string[]>(
    ENABLED_TOOLS_STORAGE_KEY,
    []
  );
  const providerSettingsList = getWorkspaceState<AiApiSettings[]>(
    PROVIDER_SETTINGS_STORAGE_KEY,
    []
  );
  const providerSettingName = getWorkspaceState<string | undefined>(
    CURRENT_PROVIDER_SETTING_STORAGE_KEY,
    undefined
  );
  const currentProviderSetting = providerSettingsList.find(
    (p) => p.name === providerSettingName
  );

  const workspaceSystemPrompt = getWorkspaceState(
    WORKSPACE_SYSTEM_PROMPT_STORAGE_KEY_PREFIX,
    ""
  );
  const systemPrompt = workspaceSystemPrompt ?? systemPrompts[0] ?? "";

  const workspaceUserPrompt = getWorkspaceState(
    WORKSPACE_USER_PROMPT_STORAGE_KEY_PREFIX,
    ""
  );
  const userPrompt = workspaceUserPrompt ?? userPrompts[0] ?? "";

  const autoRemoveComments = getWorkspaceState(
    AUTO_REMOVE_COMMENTS_STORAGE_KEY,
    false
  );
  const autoFormat = getWorkspaceState(AUTO_FORMAT_STORAGE_KEY, false);
  const autoFixErrors = getWorkspaceState(AUTO_FIX_ERRORS_STORAGE_KEY, false);

  const runCommand = getWorkspaceState(WORKSPACE_RUN_COMMAND_STORAGE_KEY, "");

  const message = {
    command: "initPrompts",
    systemPrompt,
    userPrompt,
    systemPrompts,
    userPrompts,
    availableTools: availableToolNames,
    runCommand,
    enabledTools: enabledToolNames,
    providerSettingsList,
    currentProviderSetting,
    availableVendors,
    autoRemoveComments,
    autoFormat,
    autoFixErrors,
  };

  panel.webview.postMessage(message);
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

async function handleWebviewMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  message: any,
  openedFilePaths: string[],
  tabId: string,
  getState: GetState,
  setState: SetState
) {
  const panelInfo = chatPanels.get(tabId);
  if (!panelInfo) {
    throw new Error(`Panel info not found for tabId: ${tabId}`);
  }
  const activeTasks = panelInfo.activeTasks;

  const logTask: TaskLogger = createTask(async (v) => {
    await panel.webview.postMessage({ ...v, tabId });
  }, activeTasks);

  const log: Logger = createMessageLogger(logTask);

  console.log("handleWebviewMessage1", tabId, message);

  switch (message.command) {
    case "cancelTask":
      const taskIdToCancel = message.id;
      cancelTask(taskIdToCancel, activeTasks);
      break;
    case "sendMessage":
      handleSendMessage(context, panel, message, tabId, log);
      break;
    case "runCommand":
      handleRunCommand(message.runCommand, logTask)
        .catch((e) => console.log("runCommandE1", e))
        .finally(() => {
          panel.webview.postMessage({ command: "resetRunCommandButton" });
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
    case "setRunCommand":
      await setState(WORKSPACE_RUN_COMMAND_STORAGE_KEY, message.runCommand);
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
      handleCommitFiles(context, message.fileNames, logTask);
      break;
    case "planAndExecute":
      handlePlanAndExecute(message, logTask);
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
    default:
      console.warn("Unknown command from webview:", message.command);
  }
}

const handleCommitFiles = (
  context: vscode.ExtensionContext,
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
      const currentProviderSetting = getCurrentProviderSetting(context);

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

export function deactivate() {
  chatPanels.forEach((panelInfo) => {
    cancelAllTasks(panelInfo.activeTasks);
  });
}
