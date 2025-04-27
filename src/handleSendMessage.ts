import { sleep } from "openai/core.mjs";
import * as vscode from "vscode";
import {
  AiApiSettings,
  Json,
  Logger,
  ToolCall,
  ToolDefinition,
  newAiApi,
} from "./aiTools/AiApi";
import { filterToolsByName } from "./aiTools/filterToolsByName";
import { availableToolsDefinitions } from "./availableToolNames";
import { checkAndFixErrors } from "./checkAndFixErrors";
import { executeToolCalls } from "./executeToolCalls";
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
