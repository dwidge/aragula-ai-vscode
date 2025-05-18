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
  GetState,
  SetState,
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

  const getGlobalState: GetState = <T>(key: string, defaultValue: T): T =>
    context.globalState.get<T>(key, defaultValue);

  const setGlobalState: SetState = async <T>(key: string, value: T) =>
    context.globalState.update(key, value).then(() => value);

  const getWorkspaceState: GetState = <T>(key: string, defaultValue: T): T =>
    context.workspaceState.get<T>(key, defaultValue);

  const setWorkspaceState: SetState = async <T>(key: string, value: T) =>
    context.workspaceState.update(key, value).then(() => value);

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

    const getTabState: GetState = <T>(key: string, defaultValue: T) =>
      getWorkspaceState(`${tabId}-${key}`, defaultValue);

    const setTabState: SetState = async <T>(key: string, value: T) =>
      setWorkspaceState(`${tabId}-${key}`, value);

    if (existingPanelInfo) {
      existingPanelInfo.panel.reveal(vscode.ViewColumn.One);
      sendFilesToExistingChat(existingPanelInfo.panel, openFilePaths);
    } else {
      await openChatWindow(
        context,
        openFilePaths,
        tabId,
        getWorkspaceState,
        setWorkspaceState
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

        const [settings, setSettings] = useSettingsObject(
          getWorkspaceState,
          setWorkspaceState
        );

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
  getWorkspaceState: GetState,
  setWorkspaceState: SetState
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

  const [settings, setSettings] = useSettingsObject(
    getWorkspaceState,
    setWorkspaceState
  );
  await sendInitialSettingsToWebview(panel, settings);

  panel.webview.postMessage({
    command: "sendEnabledTools",
    enabledTools: settings.enabledTools,
  });
  panel.webview.postMessage({
    command: "sendCurrentProviderSetting",
    currentProviderSetting: useProviderByName(settings, settings.providerName),
  });
}

async function sendInitialSettingsToWebview(
  panel: vscode.WebviewPanel,
  globalSettings: SettingsObject
) {
  const {
    systemPrompt,
    userPrompt,
    autoRemoveComments,
    autoFormat,
    autoFixErrors,
    runCommand,
  } = globalSettings;

  const message = {
    command: "initPrompts",
    availableTools: availableToolNames,
    availableVendors,
    systemPrompts: globalSettings.systemPromptList,
    userPrompts: globalSettings.userPromptList,
    providerSettingsList: globalSettings.providerList,
    systemPrompt,
    userPrompt,
    runCommand,
    enabledTools: globalSettings.enabledTools,
    currentProviderSetting: globalSettings.providerName,
    autoRemoveComments,
    autoFormat,
    autoFixErrors,
  };
  console.log("sendInitialSettingsToWebview1", message);

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
  const [settings, setSettings] = useSettingsObject(getState, setState);

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
      await setSettings((prev) => ({
        ...prev,
        userPrompt: message.user || "",
      }));
      await handleSendMessage(context, panel, message, tabId, log);
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
      await setSettings((prev) => ({
        ...prev,
        runCommand: message.runCommand,
      }));
      break;
    case "setSystemPrompt":
      await setSettings((prev) => ({
        ...prev,
        systemPrompt: message.systemPrompt || "",
      }));
      break;
    case "setUserPrompt":
      await setSettings((prev) => ({
        ...prev,
        userPrompt: message.userPrompt || "",
      }));
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
      {
        const updatedSettings = await setSettings((prev) => {
          const filtered = prev.systemPromptList.filter(
            (p) => p !== message.prompt
          );
          return { ...prev, systemPromptList: [message.prompt, ...filtered] };
        });
        panel.webview.postMessage({
          command: "systemPromptsList",
          prompts: updatedSettings.systemPromptList,
        });
      }
      break;
    case "saveUserPromptToLibrary":
      {
        const updatedSettings = await setSettings((prev) => {
          const filtered = prev.userPromptList.filter(
            (p) => p !== message.prompt
          );
          return { ...prev, userPromptList: [message.prompt, ...filtered] };
        });
        panel.webview.postMessage({
          command: "userPromptsList",
          prompts: updatedSettings.userPromptList,
        });
      }
      break;
    case "deleteSystemPromptFromLibrary":
      {
        const updatedSettings = await setSettings((prev) => {
          const filtered = prev.systemPromptList.filter(
            (p) => p !== message.prompt
          );
          return { ...prev, systemPromptList: filtered };
        });
        panel.webview.postMessage({
          command: "systemPromptsList",
          prompts: updatedSettings.systemPromptList,
        });
      }
      break;
    case "deleteUserPromptFromLibrary":
      {
        const updatedSettings = await setSettings((prev) => {
          const filtered = prev.userPromptList.filter(
            (p) => p !== message.prompt
          );
          return { ...prev, userPromptList: filtered };
        });
        panel.webview.postMessage({
          command: "userPromptsList",
          prompts: updatedSettings.userPromptList,
        });
      }
      break;
    case "requestSystemPrompts":
      panel.webview.postMessage({
        command: "systemPromptsList",
        prompts: settings.systemPromptList,
      });
      break;
    case "requestUserPrompts":
      panel.webview.postMessage({
        command: "userPromptsList",
        prompts: settings.userPromptList,
      });
      break;
    case "useSystemPromptFromLibrary":
      {
        const updatedSettings = await setSettings((prev) => {
          const filtered = prev.systemPromptList.filter(
            (p) => p !== message.prompt
          );
          return {
            ...prev,
            systemPromptList: [message.prompt, ...filtered],
            systemPrompt: message.prompt,
          };
        });
        panel.webview.postMessage({
          command: "systemPromptsList",
          prompts: updatedSettings.systemPromptList,
        });
      }
      break;
    case "useUserPromptFromLibrary":
      {
        const updatedSettings = await setSettings((prev) => {
          const filtered = prev.userPromptList.filter(
            (p) => p !== message.prompt
          );
          return {
            ...prev,
            userPromptList: [message.prompt, ...filtered],
            userPrompt: message.prompt,
          };
        });
        panel.webview.postMessage({
          command: "userPromptsList",
          prompts: updatedSettings.userPromptList,
        });
      }
      break;
    case "enableTool":
      await setSettings((prev) => ({
        ...prev,
        enabledTools: prev.enabledTools
          .filter((name) => name !== message.toolName)
          .concat(message.toolName),
      }));
      panel.webview.postMessage({
        command: "updateEnabledTools",
        enabledTools: settings.enabledTools,
      });
      panel.webview.postMessage({
        command: "sendEnabledTools",
        enabledTools: settings.enabledTools,
      });
      break;
    case "disableTool":
      await setSettings((prev) => ({
        ...prev,
        enabledTools: prev.enabledTools.filter(
          (name) => name !== message.toolName
        ),
      }));
      panel.webview.postMessage({
        command: "updateEnabledTools",
        enabledTools: settings.enabledTools,
      });
      panel.webview.postMessage({
        command: "sendEnabledTools",
        enabledTools: settings.enabledTools,
      });
      break;
    case "requestProviderSettings":
      panel.webview.postMessage({
        command: "providerSettingsList",
        providerSettingsList: settings.providerList,
        currentProviderSetting: useProviderByName(
          settings,
          settings.providerName
        ),
      });
      break;
    case "saveProviderSetting":
      {
        const oldName = message.providerSetting.name;
        const newSetting = message.providerSetting;
        const updatedSettings = await setSettings((prev) => {
          const updatedList = prev.providerList.map((p) =>
            p.name === oldName ? newSetting : p
          );
          return { ...prev, providerList: updatedList };
        });
        panel.webview.postMessage({
          command: "providerSettingsList",
          providerSettingsList: updatedSettings.providerList,
        });
        panel.webview.postMessage({ command: "providerSettingsUpdated" });
      }
      break;
    case "updateProviderSetting":
      {
        const oldName = message.oldProviderSettingName;
        const newSetting = message.providerSetting;
        const updatedSettings = await setSettings((prev) => {
          const updatedList = prev.providerList.map((p) =>
            p.name === oldName ? newSetting : p
          );
          return { ...prev, providerList: updatedList };
        });
        panel.webview.postMessage({
          command: "providerSettingsList",
          providerSettingsList: updatedSettings.providerList,
        });
        panel.webview.postMessage({ command: "providerSettingsUpdated" });
      }
      break;
    case "deleteProviderSettingFromLibrary":
      {
        const updatedSettings = await setSettings((prev) => {
          const filtered = prev.providerList.filter(
            (p) => p.name !== message.providerSettingName
          );
          return { ...prev, providerList: filtered };
        });
        panel.webview.postMessage({
          command: "providerSettingsList",
          providerSettingsList: updatedSettings.providerList,
        });
        panel.webview.postMessage({ command: "providerSettingsUpdated" });
      }
      break;
    case "useProviderSettingFromLibrary":
      await setSettings((prev) => ({
        ...prev,
        providerName: message.providerSettingName,
      }));
      panel.webview.postMessage({
        command: "providerSettingsList",
        providerSettingsList: settings.providerList,
        currentProviderSetting: useProviderByName(
          settings,
          message.providerSettingName
        ),
      });
      panel.webview.postMessage({
        command: "sendCurrentProviderSetting",
        currentProviderSetting: useProviderByName(
          settings,
          message.providerSettingName
        ),
      });
      break;
    case "requestAvailableVendors":
      panel.webview.postMessage({
        command: "availableVendors",
        availableVendors: availableVendors,
      });
      break;
    case "requestEnabledTools":
      panel.webview.postMessage({
        command: "sendEnabledTools",
        enabledTools: settings.enabledTools,
      });
      break;
    case "requestCurrentProviderSetting":
      panel.webview.postMessage({
        command: "sendCurrentProviderSetting",
        currentProviderSetting: useProviderByName(
          settings,
          settings.providerName
        ),
      });
      break;
    case "removeCommentsInFiles":
      handleRemoveCommentsInFiles(message.filePaths, log);
      break;
    case "formatFilesInFiles":
      handleFormatFilesInFiles(message.filePaths, log);
      break;
    case "setAutoRemoveComments":
      await setSettings((prev) => ({
        ...prev,
        autoRemoveComments: message.checked,
      }));
      break;
    case "setAutoFormat":
      await setSettings((prev) => ({ ...prev, autoFormat: message.checked }));
      break;
    case "setAutoFixErrors":
      await setSettings((prev) => ({
        ...prev,
        autoFixErrors: message.checked,
      }));
      break;
    case "commitFiles":
      handleCommitFiles(settings, message.fileNames, logTask);
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

export function deactivate() {
  chatPanels.forEach((panelInfo) => {
    cancelAllTasks(panelInfo.activeTasks);
  });
}
