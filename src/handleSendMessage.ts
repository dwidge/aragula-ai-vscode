import { AiApiSettings } from "@/ai-api/types/AiApiSettings";
import { ToolCall } from "@/ai-api/types/ToolCall";
import { ToolDefinition } from "@/ai-api/types/ToolDefinition";
import { executeToolCalls } from "./ai-api/executeToolCalls";
import { AiPrompt } from "./ai-api/types/AiApiCaller";
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
  return async (update, log, signal) => {
    const prompt: AiPrompt = await log(
      { summary: "Create Ai Prompt", type: "user" },
      createAiPrompt(message)
    );

    const safePrompt = applyPromptPrivacy(
      prompt,
      message.privacySettings || []
    );

    const response = await log(
      { summary: "Send Ai Prompt", type: "task" },
      sendAiPrompt(safePrompt, message)
    );

    const restoredResponse = await restoreResponsePrivacy(
      response,
      message.privacySettings || []
    );

    await log(
      { summary: "Apply AI Changes", type: "task" },
      applyAiChanges(restoredResponse, message.providerSetting, message)
    );

    update({
      type: "success",
      summary: "Message sent and processed.",
    });

    return response;
  };
}

const createAiPrompt =
  (message: {
    user: string;
    system: string;
    fileNames: string[];
    toolNames: string[];
    providerSetting: AiApiSettings;
    autoGenerateCommit: boolean;
    useConventionalCommits: boolean;
    includeCodebaseSummary: boolean;
  }): TaskRunner<AiPrompt> =>
  async (update, log, signal) => {
    const commitPrompt = message.autoGenerateCommit
      ? await log(
          { summary: "Preparing commit instruction...", type: "info" },
          async (update) => {
            const commitPrompt = await getCommitMessageInstruction({
              useConventionalCommits: message.useConventionalCommits,
              filePaths: message.fileNames,
            });
            await update({
              detail: commitPrompt,
            });
            return commitPrompt;
          }
        )
      : undefined;

    log({
      summary: "Enabled tools",
      detail: message.toolNames.join("\n"),
    });

    const rawFilesContent: ToolCall[] = message.fileNames.length
      ? await log(
          {
            summary: `Read ${message.fileNames.length} files`,
            detail: message.fileNames.join("'n'"),
          },
          async (update) => {
            const files = await readFiles(message.fileNames);
            await update({
              summary: `Read ${files.length} files`,
              detail: message.fileNames.join("'n'"),
            });
            return files;
          }
        )
      : [];

    const codebaseSummaryToolcalls = message.includeCodebaseSummary
      ? await log(
          {
            summary: `Codebase summary`,
          },
          async (update, log) => {
            const targetDir = "src";
            const codebaseSummaryFiles = await getCodebaseSummary(targetDir);
            const codebaseSummaryContent = readFileMap(codebaseSummaryFiles);
            update({
              summary: `Codebase summary ${codebaseSummaryContent.length} files`,
              detail: `Dir: "${targetDir}"`,
            });
            return codebaseSummaryContent;
          }
        )
      : [];
    rawFilesContent.push(...codebaseSummaryToolcalls);

    const prompt = {
      user: message.user,
      system: [message.system, commitPrompt].filter((s) => s).join("\n\n"),
      tools: rawFilesContent,
    };

    update({ detail: prompt.user });

    return prompt;
  };

const applyPromptPrivacy = (
  prompt: AiPrompt,
  privacySettings: PrivacyPair[]
) => ({
  user: applyPrivacyReplacements(prompt.user, privacySettings),
  system: applyPrivacyReplacements(prompt.system || "", privacySettings),
  tools: prompt.tools?.map(replaceToolCallContent(privacySettings)),
});

const sendAiPrompt =
  (
    prompt: AiPrompt,
    message: {
      toolNames: string[];
      providerSetting: AiApiSettings;
    }
  ): TaskRunner<{ assistant: string; tools: ToolCall[] }> =>
  async (update, log, signal) => {
    let streamedText = "";
    const onChunk = (chunk: { text?: string }) => {
      if (chunk.text) {
        streamedText += chunk.text;
        update({ detail: streamedText });
      }
    };

    const enabledToolDefinitions = filterToolsByName(
      availableToolsDefinitions,
      message.toolNames
    );

    const response = await newAiApi(message.providerSetting)(
      prompt,
      enabledToolDefinitions,
      { logger: createMessageLogger(log), signal: signal, onChunk }
    );
    await update({ detail: response.assistant });
    response.tools.map((tool) =>
      log({
        summary: `${tool.name}`,
        detail: JSON.stringify(tool.parameters),
      })
    );
    return response;
  };

type AiResponse = { assistant: string; tools: ToolCall[] };

const restoreResponsePrivacy = (
  response: AiResponse,
  privacySettings: PrivacyPair[]
): AiResponse => ({
  assistant: reversePrivacyReplacements(response.assistant, privacySettings),
  tools: response.tools.map(restoreToolCallContent(privacySettings)),
});

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
