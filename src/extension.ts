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

    const systemPrompt = getSystemPrompt();

    if (existingPanel) {
      // If panel exists, reuse it and add files
      existingPanel.reveal(vscode.ViewColumn.One); // Bring existing panel to front
      sendFilesToExistingChat(existingPanel, openFiles);
    } else {
      // If no panel exists, open a new one
      await openChatWindow(context, openFiles, tabId, systemPrompt);
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
  systemPrompt: string | undefined
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

  panel.webview.html = chatview(tabId, systemPrompt);
  sendInitialSystemMessage(panel, openedFiles);

  panel.webview.onDidReceiveMessage(
    (message) =>
      handleWebviewMessage(context, panel, message, openedFiles, tabId),
    undefined,
    context.subscriptions
  );

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
      updateSystemPrompt(context, message.systemPrompt);
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
    default:
      console.warn("Unknown command from webview:", message.command);
  }
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

/** Cancels an active API request. */
function cancelActiveRequest(messageId: string, log: Logger) {
  const activeRequest = activeRequests.get(messageId);
  if (activeRequest) {
    activeRequest.abortController.abort();
    log(`Cancelling request with ID: ${messageId}`, "info");
  }
}

/** Updates the system prompt in the global configuration. */
function updateSystemPrompt(
  context: vscode.ExtensionContext,
  newPrompt: string
) {
  const config = vscode.workspace.getConfiguration("aragula-ai");
  config
    .update("systemPrompt", newPrompt, vscode.ConfigurationTarget.Global)
    .then(
      () => vscode.window.showInformationMessage("System prompt updated."),
      (err) =>
        vscode.window.showErrorMessage(`Failed to update system prompt: ${err}`)
    );
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
