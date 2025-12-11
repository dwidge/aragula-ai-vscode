import { AiApiSettings } from "@/ai-api/types/AiApiSettings";
import { ToolCall } from "@/ai-api/types/ToolCall";
import { ToolDefinition } from "@/ai-api/types/ToolDefinition";
import { executeToolCalls } from "./ai-api/executeToolCalls";
import { ToolCallResult } from "./ai-api/types/ToolCallResult";
import { newAiApi } from "./aiTools/AiApi";
import { availableToolsDefinitions } from "./aiTools/availableToolNames";
import { filterToolsByName } from "./aiTools/filterToolsByName";
import { readFiles } from "./aiTools/readFiles";
import { getCodebaseSummary } from "./codebase/getCodebaseSummary";
import { getCommitMessageInstruction } from "./generateCommitMessageInstruction";
import { parseCommitMessages } from "./parseCommitMessages";
import { applyPrivacyReplacements } from "./privacy/applyPrivacyReplacements";
import { PrivacyPair } from "./privacy/PrivacyPair";
import { replaceToolCallContent } from "./privacy/replaceToolCallContent";
import { restoreToolCallContent } from "./privacy/restoreToolCallContent";
import { reversePrivacyReplacements } from "./privacy/reversePrivacyReplacements";
import { readFileMap } from "./readFileMap";
import { checkAndFixErrors } from "./task/checkAndFixErrors";
import { handleFormatFilesInFiles } from "./task/handleFormatFilesInFiles";
import { handleRemoveCommentsInFiles } from "./task/handleRemoveCommentsInFiles";
import { createMessageLogger, Logger, TaskRunner } from "./utils/Logger";
import { setCommitMessage } from "./vscode/git/setCommitMessage";

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
export function handleSendMessage(message: {
  user: string;
  system: string;
  fileNames: string[];
  toolNames: string[];
  providerSetting: AiApiSettings;
  autoRemoveComments: boolean;
  autoFormat: boolean;
  autoFixErrors: boolean;
  autoGenerateCommit: boolean;
  useConventionalCommits: boolean;
  includeCodebaseSummary: boolean;
  messageId: string;
  privacySettings?: PrivacyPair[];
}): TaskRunner<{ assistant: string; tools: ToolCall[] }> {
  const providerSetting = message.providerSetting;
  const messageId = message.messageId;

  return async (update, log, signal) => {
    if (message.autoGenerateCommit) {
      await log(
        { summary: "Preparing commit instruction...", type: "info" },
        async (update) => {
          const commitInstruction = await getCommitMessageInstruction({
            useConventionalCommits: message.useConventionalCommits,
            filePaths: message.fileNames,
          });
          message.system = `${message.system}\n\n${commitInstruction}`;
          update({
            detail: commitInstruction,
          });
        }
      );
    }

    const response: { assistant: string; tools: ToolCall[] } = await log(
      { summary: "Receiving AI response...", type: "stream" },
      sendAiPrompt(message)
    );

    if (providerSetting.vendor !== "manual") {
      log({
        summary: "AI Response Received",
        detail: response!.assistant,
        type: "assistant",
      });
    }

    await log(
      { summary: "Processing AI output...", type: "task" },
      applyAiChanges(response, providerSetting, message)
    );

    update({
      type: "success",
      summary: "Message sent and processed.",
    });

    return response;
  };
}

const sendAiPrompt =
  (message: {
    user: string;
    system: string;
    fileNames: string[];
    toolNames: string[];
    providerSetting: AiApiSettings;
    includeCodebaseSummary: boolean;
    privacySettings?: PrivacyPair[];
  }): TaskRunner<{ assistant: string; tools: ToolCall[] }> =>
  async (update, log, signal) => {
    const aiLog = createMessageLogger(log);

    log({
      summary: "Enabled tools",
      detail: message.toolNames.join("\n"),
    });

    const rawFilesContent: ToolCall[] = await readFiles(message.fileNames);
    log({
      summary: `Read ${rawFilesContent.length} files`,
      detail: message.fileNames.join("'n'"),
    });

    if (message.includeCodebaseSummary) {
      const targetDir = "src";
      const codebaseSummaryFiles = await getCodebaseSummary(targetDir);
      const codebaseSummaryContent = readFileMap(codebaseSummaryFiles);
      rawFilesContent.push(...codebaseSummaryContent);
      log({
        summary: `Codebase summary ${codebaseSummaryContent.length} files`,
        detail: `Dir: "${targetDir}"`,
      });
    }

    const privacySettings = message.privacySettings || [];
    const filesContent = rawFilesContent.map(
      replaceToolCallContent(privacySettings)
    );
    const userMessage = applyPrivacyReplacements(message.user, privacySettings);
    const systemMessage = applyPrivacyReplacements(
      message.system,
      privacySettings
    );

    const enabledToolDefinitions = filterToolsByName(
      availableToolsDefinitions,
      message.toolNames
    );

    const response = await log(
      { summary: "Calling AI API...", type: "info" },
      async (update, log) => {
        let streamedText = "";
        const onChunk = (chunk: { text?: string }) => {
          if (chunk.text) {
            streamedText += chunk.text;
            update({ detail: streamedText });
          }
        };
        return await newAiApi(message.providerSetting)(
          {
            user: userMessage,
            system: systemMessage,
            tools: filesContent,
          },
          enabledToolDefinitions,
          { logger: aiLog, signal: signal, onChunk }
        );
      }
    );

    return {
      assistant: reversePrivacyReplacements(
        response.assistant,
        privacySettings
      ),
      tools: response.tools.map(restoreToolCallContent(privacySettings)),
    };
  };

const applyAiChanges =
  (
    response: { assistant: string; tools: ToolCall[] },
    providerSetting: AiApiSettings,
    message: {
      autoGenerateCommit: boolean;
      useConventionalCommits: boolean;
      fileNames: string[];
      toolNames: string[];
      providerSetting: AiApiSettings;
      autoRemoveComments: boolean;
      autoFormat: boolean;
      autoFixErrors: boolean;
    }
  ): TaskRunner<void> =>
  async (update, log) => {
    const processLog = createMessageLogger(log);

    const enabledToolDefinitions = filterToolsByName(
      availableToolsDefinitions,
      message.toolNames
    );
    processLog("Executing tool calls...", "info");
    const toolCallResults = await executeToolCalls(
      response!.tools,
      enabledToolDefinitions,
      processLog
    );
    const modifiedFileNames = getModifiedFileNames(toolCallResults);
    processLog(
      `Executed ${
        toolCallResults.length
      } tool calls. Modified files: ${modifiedFileNames.join(", ")}`,
      "info"
    );

    if (modifiedFileNames.length > 0) {
      processLog("Cleaning up modified files...", "info");
      await cleanupFiles(
        processLog,
        message.providerSetting,
        modifiedFileNames,
        message.autoRemoveComments,
        message.autoFormat,
        message.autoFixErrors
      );
      processLog("File cleanup complete.", "info");
    }

    if (message.autoGenerateCommit) {
      processLog("Generating and setting commit message...", "info");
      const commitMessages = parseCommitMessages(response!.assistant);
      for (const { repoPath, message: commitMessage } of commitMessages) {
        await setCommitMessage(repoPath, commitMessage);
        processLog(
          `Commit message set for ${repoPath}: "${commitMessage}"`,
          "info"
        );
      }
    }

    if (providerSetting.vendor !== "manual") {
      processLog(response!.assistant, "assistant");
    }
  };
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
    autoGenerateCommit?: boolean;
    useConventionalCommits?: boolean;
    includeCodebaseSummary?: boolean;
    privacySettings?: PrivacyPair[];
  },
  log: Logger,
  signal?: AbortSignal,
  onChunk?: (chunk: { text?: string }) => void
): Promise<{ assistant: string; tools: ToolCall[] }> {
  log("enabledToolNames\n\n" + message.toolNames, "info");
  const rawFilesContent: ToolCall[] = await readFiles(message.fileNames);
  log(`Read ${rawFilesContent.length} files\n\n${message.fileNames}`, "info");

  if (message.includeCodebaseSummary) {
    const targetDir = "src";
    const codebaseSummaryFiles = await getCodebaseSummary(targetDir);
    const codebaseSummaryContent = readFileMap(codebaseSummaryFiles);
    rawFilesContent.push(...codebaseSummaryContent);
    log(
      `Included ${codebaseSummaryContent.length} codebase summary files.`,
      "info"
    );
  }

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
    { logger: log, signal, onChunk }
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
    new AbortController().signal,
    undefined
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
