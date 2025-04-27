import { extractFilesFromAIResponse } from "@dwidge/llm-file-diff";
import * as fs from "fs/promises";
import { sleep } from "openai/core.mjs";
import * as path from "path";
import * as vscode from "vscode";
import {
  AiApiSettings,
  Json,
  Logger,
  newAiApi,
  ToolCall,
  ToolDefinition,
} from "./aiTools/AiApi";
import { readFileSafe, writeFileSafe } from "./aiTools/file";
import { filterToolsByName } from "./aiTools/filterToolsByName";
import {
  formatCodeWithVscode,
  getCodeErrorsWithVscode,
} from "./aiTools/formatCodeWithVscode";
import {
  keepOnlyJsDocAndRemoveEmptyLinesReplacer,
  removeJsJsxComments,
} from "./aiTools/removeJsJsxComments";
import { readDirTool, readFileTool, writeFileTool } from "./aiTools/tools";
import chatview from "./chatview";
import { generateCommitMessage } from "./generateCommitMessage";
import {
  deleteProviderSettingFromStorage,
  deleteSystemPromptFromStorage,
  deleteUserPromptFromStorage,
  getAutoFixErrorsFromWorkspace,
  getAutoFormatFromWorkspace,
  getAutoRemoveCommentsFromWorkspace,
  getCurrentProviderSettingFromGlobalState,
  getCurrentSystemPromptFromWorkspace,
  getCurrentUserPromptFromWorkspace,
  getEnabledToolNamesFromGlobalState,
  getProviderSettingsFromStorage,
  getSystemPrompt,
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
} from "./storage";

const chatPanels = new Map<string, vscode.WebviewPanel>();

const availableToolsDefinitions: ToolDefinition[] = [
  readDirTool,
  readFileTool,
  writeFileTool,
];
const availableToolNames = availableToolsDefinitions.map((tool) => tool.name);

const availableVendors: string[] = [
  "openai",
  "gemini",
  "groq",
  "cerebras",
  "claude",
];

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
      getCurrentProviderSettingFromGlobalState(context) ||
      providerSettingsList[0];

    const workspaceSystemPrompt = getCurrentSystemPromptFromWorkspace(
      context,
      tabId
    );
    const systemPrompt =
      workspaceSystemPrompt ?? systemPrompts[0] ?? getSystemPrompt() ?? "";

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
      async (single: vscode.Uri, multi: vscode.Uri[]) => addFiles(multi)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aragula-ai.askAIEditor",
      async (single: vscode.Uri, options: any) => addFiles([single])
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aragula-ai.generateCommitMessage",
      (sourceControl: vscode.SourceControl) =>
        generateCommitMessage(context, sourceControl)
    )
  );
}

/** Send file paths to an existing chat panel */
function sendFilesToExistingChat(
  panel: vscode.WebviewPanel,
  filePaths: string[]
) {
  panel.webview.postMessage({
    command: "addFilesFromDialog",
    filePaths: filePaths,
  });
}

/** Reads the relative paths of open files given their URIs. */
async function readOpenFilePaths(uris: vscode.Uri[]): Promise<string[]> {
  const openFilePaths: string[] = [];
  if (!uris) {
    return openFilePaths;
  }

  for (const uri of uris) {
    if (uri.fsPath) {
      try {
        await fs.access(uri.fsPath);
        const relativePath = vscode.workspace.asRelativePath(uri);
        openFilePaths.push(relativePath);
      } catch {
        vscode.window.showErrorMessage(`Failed to access file: ${uri.fsPath}`);
      }
    }
  }
  return openFilePaths;
}

interface ActiveRequest {
  abortController: AbortController;
}

const activeRequests: Map<string, ActiveRequest> = new Map();

/** Opens a new chat webview and sets up message handling. */
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
  });

  panel.webview.postMessage({
    command: "sendEnabledTools",
    enabledTools: getEnabledToolNamesFromGlobalState(context),
  });
  panel.webview.postMessage({
    command: "sendCurrentProviderSetting",
    currentProviderSetting: getCurrentProviderSettingFromGlobalState(context),
  });

  context.workspaceState.update(`userInput-${tabId}`, "");
  context.workspaceState.update(`responseText-${tabId}`, "");
}

/** Sends an initial system message with the list of open file paths. */
function sendInitialSystemMessage(
  panel: vscode.WebviewPanel,
  openedFilePaths: string[]
) {
  panel.webview.postMessage({
    command: "setOpenFiles",
    files: openedFilePaths,
  });
}

/** Dispatches webview messages to the appropriate handler. */
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
    });
  };

  switch (message.command) {
    case "sendMessage":
      handleSendMessage(context, panel, message, openedFilePaths, tabId, log);
      break;
    case "checkErrorsInFiles":
      checkAndFixErrors(message.filePaths, message.providerSetting, log);
      break;
    case "setSystemPrompt":
      handleSetSystemPrompt(context, panel, message.systemPrompt, tabId);
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
      handleUseSystemPromptFromLibrary(context, panel, message.prompt);
      break;
    case "useUserPromptFromLibrary":
      handleUseUserPromptFromLibrary(context, panel, message.prompt);
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
    default:
      console.warn("Unknown command from webview:", message.command);
  }
}

async function handleRemoveCommentsInFiles(filePaths: string[], log: Logger) {
  for (const filePath of filePaths) {
    const fullPath = getWorkspaceAbsolutePath(filePath);
    try {
      const originalContent = await readFileSafe(fullPath);

      const cleanedContent = removeJsJsxComments(
        originalContent,
        keepOnlyJsDocAndRemoveEmptyLinesReplacer
      );
      if (originalContent !== cleanedContent) {
        await writeFileSafe(fullPath, cleanedContent);
        try {
          await formatCodeWithVscode(fullPath);
          log(`Removed comments and formatted ${filePath}`, "info");
        } catch (error: any) {
          await writeFileSafe(fullPath, originalContent);
          throw new Error(
            `Failed to format ${filePath} after removing comments: ${error.message}`
          );
        }
      } else {
        log(`No comments to remove in ${filePath}`, "info");
      }
    } catch (error: any) {
      log(
        `Error processing file ${filePath} for comment removal: ${error.message}`,
        "error"
      );
    }
  }
}

async function handleFormatFilesInFiles(filePaths: string[], log: Logger) {
  for (const filePath of filePaths) {
    try {
      await formatCodeWithVscode(getWorkspaceAbsolutePath(filePath));
      log(`Formatted file: ${filePath}`, "info");
    } catch (error: any) {
      log(`Error formatting file ${filePath}: ${error.message}`, "error");
    }
  }
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
  prompt: string
) {
  await useSystemPromptInStorage(context, prompt);
  const updatedSystemPrompts = getSystemPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "systemPromptsList",
    prompts: updatedSystemPrompts,
  });
}

async function handleUseUserPromptFromLibrary(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  prompt: string
) {
  await useUserPromptInStorage(context, prompt);
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
  panel.webview.postMessage({
    command: "setOpenFiles",
    files: openedFilePaths.filter((f) => f !== filePath),
  });
}

const getWorkspaceRoot = () => {
  const w = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!w) {
    throw new Error("getWorkspaceRootE1: No workspace open");
  }
  return w;
};
const getWorkspaceAbsolutePath = (relativePath: string) =>
  path.join(getWorkspaceRoot(), relativePath);

async function handleAddFiles(
  panel: vscode.WebviewPanel,
  filePaths: string[],
  openedFilePaths: string[]
) {
  const addedFiles: string[] = [];

  for (const filePath of filePaths) {
    if (!openedFilePaths.includes(filePath)) {
      try {
        await fs.access(getWorkspaceAbsolutePath(filePath));
        openedFilePaths.push(filePath);
        addedFiles.push(filePath);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to read file: ${filePath}`);
        continue;
      }
    }
  }
  panel.webview.postMessage({
    command: "setOpenFiles",
    files: openedFilePaths,
  });
  console.log("addedFiles1", addedFiles);
  return addedFiles;
}

/**
 * Checks for errors in files, constructs a prompt with errors and file content,
 * calls the AI to fix them, and applies the changes.
 */
const checkAndFixErrors = async (
  filePaths: string[],
  providerSetting: AiApiSettings,
  log: Logger
) => {
  log("Checking for errors...", "info");
  let allErrors: {
    filePath: string;
    line: number;
    message: string;
  }[] = [];
  for (const filePath of filePaths) {
    try {
      const errors = await getCodeErrorsWithVscode(
        getWorkspaceAbsolutePath(filePath)
      );
      allErrors.push(...errors.map((err) => ({ filePath, ...err })));
    } catch (error: any) {
      log(`Error checking errors in ${filePath}: ${error.message}`, "error");
    }
  }

  if (allErrors.length === 0) {
    log("No errors found.", "info");
    return;
  }

  log(`Found ${allErrors.length} errors. Attempting to fix...`, "warning");

  const system =
    "You are an AI assistant specialized in fixing code errors based on provided diagnostics. You will receive a list of errors and the corresponding file contents. Your task is to provide the corrected file contents in the specified format.";
  let user =
    "Please fix the following errors in the provided files.\n\nErrors:\n";
  allErrors.forEach((err) => {
    user += `- file: ${err.filePath}, line: ${err.line}: ${err.message}\n`;
  });

  const abortController = new AbortController();
  const readFileToolResponse: ToolCall[] = await readFiles(filePaths);
  const enabledTools: ToolDefinition[] = [writeFileTool];
  const response = await newAiApi(providerSetting)(
    {
      user: user,
      system: system,
      tools: readFileToolResponse,
    },
    enabledTools,
    { logger: log, signal: abortController.signal }
  );
  await executeToolCalls(response.tools, enabledTools);
};

const readFiles = async (relativePaths: string[]): Promise<ToolCall[]> =>
  Promise.all(
    relativePaths.map(async (k) => ({
      name: "readFile",
      parameters: { path: k },
      response: { content: await readFileSafe(getWorkspaceAbsolutePath(k)) },
      type: "backtick",
    }))
  );

type ToolCallResult = {
  name: string;
  parameters?: Json;
  response?: Json;
  error?: string;
};

const executeToolCalls = async (
  toolCalls: ToolCall[],
  availableTools: ToolDefinition[]
): Promise<ToolCallResult[]> =>
  Promise.all(
    toolCalls.map(async (tool) => {
      try {
        const toolFunction = availableTools.find((t) => t.name === tool.name);
        if (!toolFunction) {
          throw new Error(`Unknown tool: ${tool.name}`);
        }
        if (toolFunction.function) {
          const toolResult: any = await toolFunction.function(
            {},
            tool.parameters
          );
          return { ...tool, response: toolResult };
        } else {
          return tool;
        }
      } catch (error: any) {
        return { ...tool, error: error.message || "Tool execution failed" };
      }
    })
  );

/** Handles a sendMessage request from the webview. */
async function handleSendMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  message: {
    user: string;
    system: string;
    fileNames: string[];
    toolNames: string[];
    providerSetting: AiApiSettings;
    autoRemoveComments: boolean;
    autoFormat: boolean;
    autoFixErrors: boolean;
  },
  openedFilePaths: string[],
  tabId: string,
  log: Logger
) {
  const providerSetting = message.providerSetting;

  panel.webview.postMessage({
    command: "receiveMessage",
    text: message.user,
    sender: "user",
  });

  setCurrentUserPromptToWorkspace(context, tabId, message.user);

  const messageId = Date.now().toString();
  const abortController = new AbortController();
  activeRequests.set(messageId, { abortController });
  panel.webview.postMessage({ command: "startLoading", messageId });

  try {
    const readFileToolResponse: ToolCall[] = await readFiles(message.fileNames);
    console.log("enabledToolNames in handleSendMessage:", message.toolNames);
    const enabledTools: ToolDefinition[] = filterToolsByName(
      availableToolsDefinitions,
      message.toolNames
    );

    log("Calling " + providerSetting.vendor, "system");
    const response = await newAiApi(providerSetting)(
      {
        user: message.user,
        system: message.system,
        tools: readFileToolResponse,
      },
      enabledTools,
      { logger: log, signal: abortController.signal }
    );
    log(response.tools.map((t) => t.name).join(", "), "tools");
    panel.webview.postMessage({
      command: "updateMessage",
      messageId,
      text: response.assistant,
      sender: "assistant",
    });

    const toolCallResults: {
      name: string;
      parameters?: Json;
      response?: Json;
      error?: string;
    }[] = await executeToolCalls(response.tools, enabledTools);

    for (const toolResult of toolCallResults) {
      log(JSON.stringify(toolResult), "tool");
    }
    await sleep(1000);

    if (message.fileNames.length > 0) {
      if (message.autoRemoveComments) {
        log("Auto-removing comments from modified files...", "info");
        await handleRemoveCommentsInFiles(message.fileNames, log);
        await sleep(1000);
      }

      if (message.autoFormat) {
        log("Auto-formatting modified files...", "info");
        await handleFormatFilesInFiles(message.fileNames, log);
        await sleep(500);
      }

      if (message.autoFixErrors) {
        await checkAndFixErrors(message.fileNames, providerSetting, log);
      }
    }

    panel.webview.postMessage({
      command: "updateMessage",
      messageId,
      text: response.assistant,
      sender: "assistant",
    });
    context.workspaceState.update(`responseText-${tabId}`, response);
  } catch (error: any) {
    if (error.name === "AbortError") {
      log("Request was aborted by user.", "info");
      panel.webview.postMessage({
        command: "updateMessage",
        messageId,
        text: "Request was aborted.",
        sender: "system",
        messageType: "aborted",
      });
    } else {
      log(`API call failed: ${error.message}`, "error");
      panel.webview.postMessage({
        command: "updateMessage",
        messageId,
        text: `API call failed: ${error.message}`,
        sender: "error",
        messageType: "error",
      });
    }
  } finally {
    activeRequests.delete(messageId);
  }
}

/** Handles setting the system prompt and saves it to workspace state. */
async function handleSetSystemPrompt(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  newPrompt: string,
  tabId: string
) {
  setCurrentSystemPromptToWorkspace(context, tabId, newPrompt);
}

/** Handles setting the user prompt and saves it to workspace state. */
async function handleSetUserPrompt(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  newPrompt: string,
  tabId: string
) {
  setCurrentUserPromptToWorkspace(context, tabId, newPrompt);
}

/** Cancels an active API request. */
function cancelActiveRequest(messageId: string, log: Logger) {
  const activeRequest = activeRequests.get(messageId);
  if (activeRequest) {
    activeRequest.abortController.abort();
    log(`Cancelling request with ID: ${messageId}`, "info");
  }
}

/** Builds the complete prompt from the open files and user input. */
function createPrompt(
  openedFiles: { [key: string]: string },
  userText: string,
  systemPrompt: string | undefined
): string {
  const fileContent = Object.entries(openedFiles)
    .map(([file, content]) => `${file}\n\`\`\`\n${content}\n\`\`\`\n`)
    .join("\n\n");
  return (systemPrompt ? systemPrompt + "\n\n" : "") + fileContent + userText;
}

async function applyChanges(
  response: string,
  openedFiles: { [key: string]: string }
) {
  const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!root) {
    return;
  }

  const extractedFiles = extractFilesFromAIResponse(response, openedFiles);
  await Promise.all(
    Object.entries(extractedFiles).map(([filePath, content]) =>
      saveFile(root, filePath, content)
    )
  );
}

async function saveFile(root: string, filePath: string, content: string) {
  try {
    const absolutePath = path.join(root, filePath);
    await fs.writeFile(absolutePath, content);
    vscode.window.showInformationMessage(`File saved: ${filePath}`);
  } catch {
    vscode.window.showErrorMessage(`Failed to save file: ${filePath}`);
  }
}

export function deactivate() {}
