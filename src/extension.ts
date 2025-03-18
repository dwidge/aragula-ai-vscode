import { extractFilesFromAIResponse } from "@dwidge/llm-file-diff";
import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { Logger, newOpenAiApi, ToolCall } from "./aiTools/AiApi";
import { filterToolsByName } from "./aiTools/filterToolsByName";
import { readDirTool, readFileTool, writeFileTool } from "./aiTools/tools";
import chatview from "./chatview";

// Track existing chat panels using tabId as key
const chatPanels = new Map<string, vscode.WebviewPanel>();

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "aragula-ai" active');

  const addFiles = async (multi: vscode.Uri[]) => {
    const openFiles = await readOpenFiles(multi);
    let tabId = Date.now().toString();
    let existingPanel: vscode.WebviewPanel | undefined = undefined;

    // Try to find an existing chat panel
    for (const panel of chatPanels.values()) {
      if (!panel) continue; // defensive check in case of null panel in map
      existingPanel = panel;
      tabId = panel.title.split(" - ")[1]; // Extract tabId from panel title "Ask AI - {tabId}"
      break; // Use the first non-disposed panel found
    }

    const systemPrompts = getSystemPromptsFromStorage(context);
    const userPrompts = getUserPromptsFromStorage(context);

    // Load workspace prompts if available, otherwise use defaults
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

    if (existingPanel) {
      // If panel exists, reuse it and add files
      existingPanel.reveal(vscode.ViewColumn.One); // Bring existing panel to front
      sendFilesToExistingChat(existingPanel, openFiles);
    } else {
      // If no panel exists, open a new one
      await openChatWindow(
        context,
        openFiles,
        tabId,
        systemPrompt,
        systemPrompts,
        userPrompts,
        userPrompt // Pass userPrompt to openChatWindow
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
}

/** Send files to an existing chat panel */
function sendFilesToExistingChat(
  panel: vscode.WebviewPanel,
  openFiles: { [key: string]: string }
) {
  const filePaths = Object.keys(openFiles).map((filePath) => filePath);
  panel.webview.postMessage({
    command: "addFilesFromDialog",
    filePaths: filePaths,
  });
}

/** Reads the content of open files given their URIs. */
async function readOpenFiles(
  uris: vscode.Uri[]
): Promise<{ [key: string]: string }> {
  const openFiles: { [key: string]: string } = {};
  if (!uris) return openFiles; // Handle case where no files are selected

  for (const uri of uris) {
    if (uri.fsPath) {
      try {
        const content = await fs.readFile(uri.fsPath, "utf8");
        const relativePath = vscode.workspace.asRelativePath(uri);
        openFiles[relativePath] = content;
      } catch {
        vscode.window.showErrorMessage(`Failed to read file: ${uri.fsPath}`);
      }
    }
  }
  return openFiles;
}

interface ActiveRequest {
  abortController: AbortController;
}

const activeRequests: Map<string, ActiveRequest> = new Map();

/** Opens a new chat webview and sets up message handling. */
async function openChatWindow(
  context: vscode.ExtensionContext,
  openedFiles: { [key: string]: string },
  tabId: string,
  systemPrompt: string | undefined,
  systemPrompts: string[],
  userPrompts: string[],
  userPrompt: string // Receive userPrompt
) {
  const panel = vscode.window.createWebviewPanel(
    "askAIChat",
    `Ask AI - ${tabId}`, // Include tabId in title for tracking
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  // Store the panel in the map
  chatPanels.set(tabId, panel);

  panel.onDidDispose(() => {
    chatPanels.delete(tabId); // Remove panel from map when disposed
  });

  panel.webview.html = chatview(tabId);
  sendInitialSystemMessage(panel, openedFiles);

  panel.webview.onDidReceiveMessage(
    (message) =>
      handleWebviewMessage(context, panel, message, openedFiles, tabId),
    undefined,
    context.subscriptions
  );

  // Send initial prompts and prompt libraries via message
  panel.webview.postMessage({
    command: "initPrompts",
    systemPrompt: systemPrompt,
    userPrompt: userPrompt,
    systemPrompts: systemPrompts,
    userPrompts: userPrompts,
  });

  context.workspaceState.update(`userInput-${tabId}`, "");
  context.workspaceState.update(`responseText-${tabId}`, "");
}

/** Sends an initial system message with the list of open files. */
function sendInitialSystemMessage(
  panel: vscode.WebviewPanel,
  openedFiles: { [key: string]: string }
) {
  panel.webview.postMessage({
    command: "setOpenFiles",
    files: Object.keys(openedFiles),
  });
  const initialMessage = generateInitialMessage(openedFiles);
  if (initialMessage) {
    panel.webview.postMessage({
      command: "receiveMessage",
      text: initialMessage,
      sender: "system",
    });
  }
}

function generateInitialMessage(openedFiles: {
  [key: string]: string;
}): string {
  return "using:\n" + Object.keys(openedFiles).join("\n");
}

/** Dispatches webview messages to the appropriate handler. */
function handleWebviewMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  message: any,
  openedFiles: { [key: string]: string },
  tabId: string
) {
  const log: Logger = (msg: string, type: string = "log") => {
    vscode.window.showInformationMessage(msg);
    panel.webview.postMessage({
      command: "logMessage",
      text: msg,
      tabId: tabId,
      messageType: type,
    });
  };

  switch (message.command) {
    case "sendMessage":
      handleSendMessage(context, panel, message, openedFiles, tabId, log);
      break;
    case "setSystemPrompt":
      handleSetSystemPrompt(context, panel, message.systemPrompt, tabId); // Use new handler
      break;
    case "setUserPrompt": // New case for user prompt
      handleSetUserPrompt(context, panel, message.userPrompt, tabId); // New handler for user prompt
      break;
    case "clearMessages":
      panel.webview.postMessage({ command: "clearMessages" });
      break;
    case "cancelRequest":
      cancelActiveRequest(message.messageId, log);
      break;
    case "removeFile":
      handleRemoveFile(panel, message.filePath, openedFiles);
      break;
    case "addFiles":
      handleAddFiles(panel, message.filePaths, openedFiles);
      break;
    case "requestAddFiles":
      requestAddFilesDialog(panel);
      break;
    case "addFilesFromDialog":
      handleAddFilesFromDialog(panel, message.filePaths, openedFiles);
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
    case "useSystemPromptFromLibrary": // New case for using system prompt from library
      handleUseSystemPromptFromLibrary(context, panel, message.prompt);
      break;
    case "useUserPromptFromLibrary": // New case for using user prompt from library
      handleUseUserPromptFromLibrary(context, panel, message.prompt);
      break;
    default:
      console.warn("Unknown command from webview:", message.command);
  }
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
  }); // Renamed command
}

async function handleRequestUserPrompts(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
) {
  const userPrompts = getUserPromptsFromStorage(context);
  panel.webview.postMessage({
    command: "userPromptsList",
    prompts: userPrompts,
  }); // New command for user prompts
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
  }); // Renamed command
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
  }); // New command for user prompts
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
  }); // Renamed command
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
  }); // New command for user prompts
}

async function handleAddFilesFromDialog(
  panel: vscode.WebviewPanel,
  filePaths: string[],
  openedFiles: { [key: string]: string }
) {
  await handleAddFiles(panel, filePaths, openedFiles);
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
  openedFiles: { [key: string]: string }
) {
  delete openedFiles[filePath];
  panel.webview.postMessage({
    command: "setOpenFiles",
    files: Object.keys(openedFiles),
  });
}

async function handleAddFiles(
  panel: vscode.WebviewPanel,
  filePaths: string[],
  openedFiles: { [key: string]: string }
) {
  const addedFiles: string[] = [];
  for (const filePath of filePaths) {
    if (!openedFiles[filePath]) {
      try {
        const fileUri = vscode.Uri.file(
          path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, filePath)
        );
        const content = await fs.readFile(fileUri.fsPath, "utf8");
        openedFiles[filePath] = content;
        addedFiles.push(filePath);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to read file: ${filePath}`);
        continue; // Skip to the next file if this one fails
      }
    }
  }
  panel.webview.postMessage({
    command: "setOpenFiles",
    files: Object.keys(openedFiles),
  });
  console.log("addedFiles1", addedFiles);
  return addedFiles;
}

/** Handles a sendMessage request from the webview. */
async function handleSendMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  message: { text: string; systemPrompt: string },
  openedFiles: { [key: string]: string },
  tabId: string,
  log: Logger
) {
  const apiKey = getApiKey();
  if (!apiKey) {
    log("Api key missing", "error");
    return;
  }

  const callAiApi = newOpenAiApi({
    apiKey,
    model: "gpt-4o-mini",
    logger: log,
  });

  panel.webview.postMessage({
    command: "receiveMessage",
    text: message.text,
    sender: "user",
  });

  // Save current user prompt to workspace state
  setCurrentUserPromptToWorkspace(context, tabId, message.text);

  const messageId = Date.now().toString();
  const abortController = new AbortController();
  activeRequests.set(messageId, { abortController });
  panel.webview.postMessage({ command: "startLoading", messageId });

  try {
    const readFileToolResponse: ToolCall[] = Object.entries(openedFiles).map(
      ([k, v]) => ({
        name: "readFile",
        parameters: { path: k },
        response: { content: v },
      })
    );
    const response = await callAiApi(
      {
        user: message.text,
        system: message.systemPrompt,
        tools: readFileToolResponse,
      },
      filterToolsByName(
        [readDirTool, readFileTool, writeFileTool],
        ["writeFile"]
      ),
      abortController.signal
    );
    log("Calling tools: " + response.tools.map((t) => t.name).join(", "));
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

/** Retrieves the API key from configuration. */
function getApiKey(): string | null {
  const apiKey = vscode.workspace.getConfiguration("aragula-ai").get("apiKey");
  if (typeof apiKey !== "string") {
    vscode.window.showErrorMessage("API key is not configured properly.");
    return null;
  }
  return apiKey;
}

/** Retrieves the default system prompt from configuration. */
function getSystemPrompt(): string | undefined {
  const prompt = vscode.workspace
    .getConfiguration("aragula-ai")
    .get("systemPrompt");
  return typeof prompt === "string" ? prompt : undefined;
}

/** Retrieves system prompts from global storage, MRU order */
function getSystemPromptsFromStorage(
  context: vscode.ExtensionContext
): string[] {
  return context.globalState.get<string[]>("systemPrompts", []) || [];
}

/** Retrieves user prompts from global storage, MRU order */
function getUserPromptsFromStorage(context: vscode.ExtensionContext): string[] {
  return context.globalState.get<string[]>("userPrompts", []) || []; // New storage for user prompts
}

/** Saves system prompt to global storage, MRU at top */
async function saveSystemPromptToStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getSystemPromptsFromStorage(context);
  if (!prompts.includes(prompt)) {
    prompts.unshift(prompt); // Add to the beginning for MRU
    await context.globalState.update("systemPrompts", prompts);
  }
}

/** Saves user prompt to global storage, MRU at top */
async function saveUserPromptToStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getUserPromptsFromStorage(context);
  if (!prompts.includes(prompt)) {
    prompts.unshift(prompt); // Add to the beginning for MRU
    await context.globalState.update("userPrompts", prompts); // Save to user prompts storage
  }
}

/** Use system prompt, move to top in MRU list */
async function useSystemPromptInStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getSystemPromptsFromStorage(context);
  const filteredPrompts = prompts.filter((p) => p !== prompt); // Remove existing
  filteredPrompts.unshift(prompt); // Add to the beginning for MRU
  await context.globalState.update("systemPrompts", filteredPrompts);
}

/** Use user prompt, move to top in MRU list */
async function useUserPromptInStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getUserPromptsFromStorage(context);
  const filteredPrompts = prompts.filter((p) => p !== prompt); // Remove existing
  filteredPrompts.unshift(prompt); // Add to the beginning for MRU
  await context.globalState.update("userPrompts", filteredPrompts);
}

/** Deletes system prompt from global storage */
async function deleteSystemPromptFromStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getSystemPromptsFromStorage(context);
  const updatedPrompts = prompts.filter((p) => p !== prompt);
  await context.globalState.update("systemPrompts", updatedPrompts);
}

/** Deletes user prompt from global storage */
async function deleteUserPromptFromStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getUserPromptsFromStorage(context);
  const updatedPrompts = prompts.filter((p) => p !== prompt);
  await context.globalState.update("userPrompts", updatedPrompts); // Delete from user prompts storage
}

/** Get current system prompt from workspace state */
function getCurrentSystemPromptFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): string | undefined {
  return context.workspaceState.get<string>(`workspaceSystemPrompt-${tabId}`);
}

/** Set current system prompt to workspace state */
async function setCurrentSystemPromptToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  prompt: string
): Promise<void> {
  await context.workspaceState.update(`workspaceSystemPrompt-${tabId}`, prompt);
}

/** Get current user prompt from workspace state */
function getCurrentUserPromptFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): string | undefined {
  return context.workspaceState.get<string>(`workspaceUserPrompt-${tabId}`);
}

/** Set current user prompt to workspace state */
async function setCurrentUserPromptToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  prompt: string
): Promise<void> {
  await context.workspaceState.update(`workspaceUserPrompt-${tabId}`, prompt);
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
