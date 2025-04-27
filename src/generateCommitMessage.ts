import * as vscode from "vscode";
import { Logger, newAiApi } from "./aiTools/AiApi";
import { getCommitMessages, getDiffs } from "./diff";
import {
  getCurrentProviderSettingFromGlobalState,
  getProviderSettingsFromStorage,
} from "./settings";

export const generateCommitMessage = async (
  context: vscode.ExtensionContext,
  sourceControl: vscode.SourceControl
) => {
  const log: Logger = (msg: string, type: string = "log") => {
    vscode.window.showInformationMessage(msg);
  };

  if (!sourceControl.rootUri) {
    log("No rootUri.", "error");
    return;
  }

  const providerSettingsList = getProviderSettingsFromStorage(context);
  const currentProviderSetting =
    getCurrentProviderSettingFromGlobalState(context) ||
    providerSettingsList[0];
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

  const callAiApi = newAiApi(
    currentProviderSetting.vendor === "gemini"
      ? {
          ...currentProviderSetting,
          model: "gemini-2.0-flash-lite",
        }
      : currentProviderSetting
  );

  const diffText = await getDiffs(sourceControl.rootUri);
  if (diffText.length === 0) {
    log("No staged changes to generate commit message for.");
    return;
  }

  const previousMessages: string[] = await getCommitMessages(
    sourceControl.rootUri
  );

  const systemPrevious = [
    "It must follow the same style as the previous commit messages.",
    "Use the same word choice and style as the previous commit messages: Do they use commas? full stops? hyphens? single line or multiline?",
    "Use same case (lower/upper/camel/snake/capital/title) as the previous commit messages: Do the messages start with upper or lower case, or a symbol?",
    "Use same prefix (or none) as previous commits: Do they say 'Refactor:' or 'fix -' before the message, or do they just put the message?",
  ].join("\n");
  const userPrevious = [
    "Previous commit messages:",
    ...previousMessages.map((m) => "```" + m + "```"),
  ].join("\n");

  const systemPrompt = [
    "Write a concise and informative commit message based on the following diff.",
    "The commit message should be suitable for a git commit.",
    previousMessages.length
      ? systemPrevious
      : "Keep it short and to the point, summarizing the changes, in a single line/sentence, no full stop at the end.",
  ].join("\n");
  const userPrompt = [
    previousMessages.length ? userPrevious : "",
    "Here is the diff:",
    diffText,
  ].join("\n\n");

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
            tools: [],
          },
          [],
          { logger: log, signal: new AbortController().signal }
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
      progress.report({ increment: 100 });
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
