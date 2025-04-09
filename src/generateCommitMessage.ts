import * as vscode from "vscode";
import {
  AiApiCaller,
  Logger,
  newCerebrasApi,
  newClaudeApi,
  newGeminiApi,
  newGroqApi,
  newOpenAiApi,
} from "./aiTools/AiApi";
import { getCommitMessages, getDiffs } from "./diff";
import {
  getCurrentProviderSettingFromGlobalState,
  getProviderSettingsFromStorage,
} from "./extension";

export const generateCommitMessage = async (
  context: vscode.ExtensionContext,
  sourceControl: vscode.SourceControl
) => {
  const log: Logger = (msg: string, type: string = "log") => {
    vscode.window.showInformationMessage(msg); // Simple logger for commit message gen
  };

  if (!sourceControl.rootUri) {
    log("No rootUri.", "error");
    return;
  }

  const providerSettingsList = getProviderSettingsFromStorage(context); // Load provider settings
  const currentProviderSetting =
    getCurrentProviderSettingFromGlobalState(context) || // Load from global state
    providerSettingsList[0]; // Get current or default provider
  if (!currentProviderSetting) {
    log(
      "No AI provider settings configured. Please add provider settings.",
      "error"
    );
    return;
  }
  if (!currentProviderSetting.apiKey) {
    log(
      `API key missing for provider: ${currentProviderSetting.name}. Please configure API key in settings.`,
      "error"
    );
    return;
  }

  let callAiApi: AiApiCaller;
  switch (currentProviderSetting.vendor) {
    case "openai":
      callAiApi = newOpenAiApi(currentProviderSetting);
      break;
    case "gemini":
      callAiApi = newGeminiApi({
        ...currentProviderSetting,
        model: "gemini-2.0-flash-lite",
      });
      break;
    case "groq":
      callAiApi = newGroqApi(currentProviderSetting);
      break;
    case "cerebras":
      callAiApi = newCerebrasApi(currentProviderSetting);
      break;
    case "claude":
      callAiApi = newClaudeApi(currentProviderSetting);
      break;
    default:
      log(`Vendor "${currentProviderSetting.vendor}" not supported.`, "error");
      return;
  }

  const diffText = await getDiffs(sourceControl.rootUri);
  if (diffText.length === 0) {
    log("No staged changes to generate commit message for.");
    return;
  }

  const previousMessages: string = await getCommitMessages(
    sourceControl.rootUri
  );

  const systemPrompt =
    "Write a concise and informative commit message based on the following diff. " +
    "The commit message should be suitable for a git commit. " +
    "Keep it short and to the point, summarizing the changes, in a single line/sentence, no full stop at the end. " +
    "It must follow the same style as the previous commits.";
  const userPrompt =
    "Previous commit messages:\n\n```\n" +
    previousMessages +
    "\n```\n\nHere is the diff:\n\n" +
    diffText;

  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Generating Commit Message...",
      cancellable: false,
    },
    async (progress) => {
      try {
        const response = await callAiApi(
          {
            user: userPrompt,
            system: systemPrompt,
            tools: [], // No tools needed for commit message generation
          },
          [], // No tools needed
          { logger: log, signal: new AbortController().signal } // No cancellation for now
        );

        let commitMessage = response.assistant.trim();
        commitMessage = parseCommitMessage(commitMessage);

        if (commitMessage) {
          setCommitMessageInInputBox(sourceControl, commitMessage);
        } else {
          log("Could not generate commit message.", "error");
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          log("Commit message request aborted by user.", "info");
        } else {
          log(`Commit message API call failed: ${error.message}`, "error");
        }
      }
      progress.report({ increment: 100 }); // Indicate completion
    }
  );
};

const parseCommitMessage = (rawMessage: string): string => {
  const trimmedMessage = rawMessage.trim();
  if (trimmedMessage.startsWith("```") && trimmedMessage.endsWith("```")) {
    const messageContent = trimmedMessage.slice(3, -3).trim();
    return messageContent;
  }
  return trimmedMessage;
};

const setCommitMessageInInputBox = (
  sourceControl: vscode.SourceControl,
  message: string
) => {
  sourceControl.inputBox.value = message;
};
