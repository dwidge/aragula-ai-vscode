import * as vscode from "vscode";
import {
  AiApiSettings,
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
import { PostMessage } from "./PostMessage";
import { readFiles } from "./readFiles";
import {
  applyPrivacyReplacements,
  replaceToolCallContent,
  restoreToolCallContent,
  reversePrivacyReplacements,
} from "./replaceToolCallContent";
import { PrivacyPair } from "./settingsObject";
import { Logger } from "./utils/Logger";

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
  postMessage: PostMessage,
  message: {
    user: string;
    system: string;
    fileNames: string[];
    toolNames: string[];
    providerSetting: AiApiSettings;
    autoRemoveComments: boolean;
    autoFormat: boolean;
    autoFixErrors: boolean;
    messageId: string;
    privacySettings?: PrivacyPair[];
  },
  tabId: string,
  log: Logger,
  signal?: AbortSignal
) {
  const providerSetting = message.providerSetting;
  const messageId = message.messageId;

  try {
    const response = await performAiRequest(message, log, signal);

    if (providerSetting.vendor !== "manual") {
      postMessage({
        command: "updateMessage",
        messageId,
        text: response.assistant,
        sender: "assistant",
        messageType: "assistant",
      });
    }

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

    if (providerSetting.vendor !== "manual") {
      postMessage({
        command: "updateMessage",
        messageId,
        text: response.assistant,
        sender: "assistant",
        messageType: "assistant",
      });
    }

    context.workspaceState.update(`responseText-${tabId}`, response);
  } catch (error: any) {
    if (error.name === "AbortError") {
      log("Request was aborted by user.", "info");
      postMessage({
        command: "updateMessage",
        messageId,
        text: "Request was aborted.",
        sender: "system",
        messageType: "aborted",
      });
    } else {
      log(`API call failed: ${error.message}`, "error");
      postMessage({
        command: "updateMessage",
        messageId,
        text: `API call failed: ${error.message}`,
        sender: "error",
        messageType: "error",
      });
    }
  }
}

/**
 * Performs the core AI API request logic.
 * This function is used by both standard chat and plan execution.
 * It handles reading files, preparing tools, calling the AI, and logging.
 * It does NOT handle tool execution or cleanup; that's done by the caller (`handleSendMessage` or `callAI`).
 * @param message AI request parameters.
 * @param log Logger function (can be main logger or step logger).
 * @param signal Abort signal.
 * @returns Promise resolving to the raw AI response ({ assistant: string; tools: ToolCall[] }).
 */
export async function performAiRequest(
  message: {
    user: string;
    system: string;
    fileNames: string[];
    toolNames: string[];
    providerSetting: AiApiSettings;
    privacySettings?: PrivacyPair[];
  },
  log: Logger,
  signal?: AbortSignal
): Promise<{ assistant: string; tools: ToolCall[] }> {
  log("enabledToolNames\n\n" + message.toolNames, "info");
  const rawFilesContent: ToolCall[] = await readFiles(message.fileNames);
  log(`Read ${rawFilesContent.length} files\n\n${message.fileNames}`, "info");

  const privacySettings = message.privacySettings || [];

  const filesContent = rawFilesContent.map(
    replaceToolCallContent(privacySettings)
  );
  const userMessage = applyPrivacyReplacements(message.user, privacySettings);
  const systemMessage = applyPrivacyReplacements(
    message.system,
    privacySettings
  );

  const enabledToolDefinitions: ToolDefinition[] = filterToolsByName(
    availableToolsDefinitions,
    message.toolNames
  );

  const response = await newAiApi(message.providerSetting)(
    {
      user: userMessage,
      system: systemMessage,
      tools: filesContent,
    },
    enabledToolDefinitions,
    { logger: log, signal }
  );

  const responseTools = response.tools.map(
    restoreToolCallContent(privacySettings)
  );
  const responseText = reversePrivacyReplacements(
    response.assistant,
    privacySettings
  );

  return {
    assistant: responseText,
    tools: responseTools,
  };
}

export type CallAiProps = {
  user: string;
  system: string;
  fileNames: string[];
  toolNames: string[];
  providerSetting: AiApiSettings;
  autoRemoveComments: boolean;
  autoFormat: boolean;
  autoFixErrors: boolean;
  privacySettings?: PrivacyPair[];
};

/**
 * Calls the AI API with specific parameters, handles tool calls, and cleanup.
 * This function is designed for plan step execution.
 * @param message AI request parameters (user, system, fileNames, toolNames, providerSetting, autoRemoveComments, autoFormat, autoFixErrors).
 * @param log Logger function specific to the plan step.
 * @returns Promise resolving to the AI response object ({ assistant: string; tools?: ToolCall[]; modifiedFiles?: string[] }).
 */
export async function callAI(
  message: CallAiProps,
  log: Logger
): Promise<{
  assistant: string;
  tools?: ToolCall[];
  modifiedFiles?: string[];
}> {
  const {
    user,
    system,
    fileNames,
    toolNames,
    providerSetting,
    autoRemoveComments,
    autoFormat,
    autoFixErrors,
    privacySettings,
  } = message;

  const { assistant, tools } = await performAiRequest(
    {
      user: user,
      system: system,
      fileNames: fileNames,
      toolNames: toolNames,
      providerSetting: providerSetting,
      privacySettings,
    },
    log,
    new AbortController().signal
  );

  const enabledToolDefinitions = filterToolsByName(
    availableToolsDefinitions,
    toolNames
  );

  const toolCallResults = await executeToolCalls(
    tools,
    enabledToolDefinitions,
    log
  );
  const modifiedFileNames = getModifiedFileNames(toolCallResults);

  await cleanupFiles(
    log,
    providerSetting,
    modifiedFileNames,
    autoRemoveComments,
    autoFormat,
    autoFixErrors
  );

  return {
    assistant,
    tools,
    modifiedFiles: modifiedFileNames,
  };
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
      await handleRemoveCommentsInFiles(fileNames, log);
    }

    if (autoFormat) {
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
        "path" in toolResult.parameters &&
        typeof toolResult.parameters.path === "string"
      ) {
        return toolResult.parameters.path;
      }
    })
    .filter((s) => s) as string[];
