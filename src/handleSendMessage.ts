import * as vscode from "vscode";
import {
  AiApiSettings,
  Logger,
  newAiApi,
  ToolCall,
  ToolDefinition,
} from "./aiTools/AiApi";
import { filterToolsByName } from "./aiTools/filterToolsByName";
import { availableToolsDefinitions } from "./availableToolNames";
import { checkAndFixErrors } from "./checkAndFixErrors";
import { executeToolCalls, ToolCallResult } from "./executeToolCalls";
import { handleFormatFilesInFiles } from "./handleFormatFilesInFiles";
import { handleRemoveCommentsInFiles } from "./handleRemoveCommentsInFiles";
import { readFiles } from "./readFiles";
import { setCurrentUserPromptToWorkspace } from "./settings";

interface ActiveRequest {
  abortController: AbortController;
}
const activeRequests: Map<string, ActiveRequest> = new Map();

/** Cancels an active API request. */
export function cancelActiveRequest(messageId: string, log: Logger) {
  const activeRequest = activeRequests.get(messageId);
  if (activeRequest) {
    activeRequest.abortController.abort();
    log(`Cancelling request with ID: ${messageId}`, "info");
    activeRequests.delete(messageId);
  }
}

/** Handles a sendMessage request from the webview. */
export async function handleSendMessage(
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
  tabId: string,
  log: Logger,
  signal?: AbortSignal
) {
  const providerSetting = message.providerSetting;

  panel.webview.postMessage({
    command: "receiveMessage",
    text: message.user,
    sender: "user",
  });

  setCurrentUserPromptToWorkspace(context, tabId, message.user);

  const messageId = Date.now().toString();
  panel.webview.postMessage({ command: "startLoading", messageId });

  try {
    const response = await performAiRequest(message, log, signal);

    panel.webview.postMessage({
      command: "updateMessage",
      messageId,
      text: response.assistant,
      sender: "assistant",
    });

    const enabledToolDefinitions = filterToolsByName(
      availableToolsDefinitions,
      message.toolNames
    );
    const toolCallResults = await executeToolCalls(
      response.tools,
      enabledToolDefinitions,
      log
    );
    const modifiedFileNames = getModifiedFileNames(toolCallResults);
    const modifiedFiles = await cleanupFiles(
      log,
      providerSetting,
      modifiedFileNames,
      message.autoRemoveComments,
      message.autoFormat,
      message.autoFixErrors
    );

    if (message.autoFixErrors) {
      await checkAndFixErrors(modifiedFiles, providerSetting, log);
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
  }
}

export async function performAiRequest(
  message: {
    user: string;
    system: string;
    fileNames: string[];
    toolNames: string[];
    providerSetting: AiApiSettings;
  },
  log: Logger,
  signal?: AbortSignal
): Promise<{ assistant: string; tools: ToolCall[] }> {
  log("enabledToolNames\n\n" + message.toolNames, "prompt");
  const providerSetting = message.providerSetting;
  const filesContent: ToolCall[] = await readFiles(message.fileNames);

  const enabledToolDefinitions: ToolDefinition[] = filterToolsByName(
    availableToolsDefinitions,
    message.toolNames
  );

  const response = await newAiApi(providerSetting)(
    {
      user: message.user,
      system: message.system,
      tools: filesContent,
    },
    enabledToolDefinitions,
    { logger: log, signal }
  );

  return response;
}

export async function cleanupFiles(
  log: Logger,
  providerSetting: AiApiSettings,
  fileNames: string[],
  autoRemoveComments: boolean,
  autoFormat: boolean,
  autoFixErrors: boolean
): Promise<string[]> {
  if (fileNames.length > 0) {
    if (autoRemoveComments) {
      log("Auto-removing comments from modified files...", "info");
      await handleRemoveCommentsInFiles(fileNames, log);
    }

    if (autoFormat) {
      log("Auto-formatting modified files...", "info");
      await handleFormatFilesInFiles(fileNames, log);
    }

    if (autoFixErrors) {
      await checkAndFixErrors(fileNames, providerSetting, log);
    }
  }

  return fileNames;
}

export const getModifiedFileNames = (toolCallResults: ToolCallResult[]) =>
  toolCallResults
    .map((toolResult) => {
      if (
        toolResult.name === "writeFile" &&
        typeof toolResult.parameters === "object" &&
        toolResult.parameters !== null &&
        "filePath" in toolResult.parameters &&
        typeof toolResult.parameters.filePath === "string"
      ) {
        return toolResult.parameters.filePath;
      }
    })
    .filter((s) => s) as string[];
