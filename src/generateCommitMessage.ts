import { AiApiSettings } from "@/ai-api/types/AiApiSettings";
import * as vscode from "vscode";
import { newAiApi } from "./aiTools/AiApi";
import { getCommitMessages } from "./vscode/git/getCommitMessages";
import { getDiffs } from "./vscode/git/getDiffs";

/**
 * Options for generating a commit message.
 */
interface TaskOptions {
  /** Optional AbortSignal to cancel the operation. */
  signal?: AbortSignal;
  /** Optional progress reporter. */
  progress?: (message: string) => void;
}

/**
 * Generates a git commit message based on staged changes using an AI model.
 *
 * @param rootUri The file system path of the git repository root.
 * @param aiProviderSettings The settings for the AI provider to use.
 * @param options Optional options for the generation process.
 * @returns A promise that resolves with the generated commit message string.
 * @throws An error if generation fails (e.g., no staged changes, API key missing, API call error).
 */
export const generateCommitMessage = async (
  rootUri: string,
  aiProviderSettings: AiApiSettings,
  options: TaskOptions = {}
): Promise<string> => {
  const { progress, signal } = options;

  if (!rootUri) {
    throw new Error("No rootUri provided.");
  }

  progress?.("Initializing AI API...");

  const callAiApi = newAiApi(
    aiProviderSettings.vendor === "gemini"
      ? {
          ...aiProviderSettings,
          model: "gemini-2.0-flash-lite",
        }
      : aiProviderSettings
  );

  const rootUriObject = vscode.Uri.file(rootUri);

  progress?.("Getting staged changes...");
  const diffText = await getDiffs(rootUriObject);
  if (diffText.length === 0) {
    throw new Error("No staged changes to generate commit message for.");
  }

  progress?.("Getting previous commit messages...");
  const previousMessages: string[] = await getCommitMessages(rootUriObject);

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

  progress?.("Calling AI model...");
  try {
    const response = await callAiApi(
      {
        user: userPrompt,
        system: systemPrompt,
        tools: [],
      },
      [],
      { logger: progress, signal }
    );
    progress?.("Parsing response...");
    return parseCommitMessage(response.assistant.trim());
  } catch (error: unknown) {
    throw new Error(`Commit message API call failed: ${error}`);
  }
};

export const parseCommitMessage = (rawMessage: string): string => {
  const trimmedMessage = rawMessage.trim();
  if (trimmedMessage.startsWith("```") && trimmedMessage.endsWith("```")) {
    const messageContent = trimmedMessage.slice(3, -3).trim();
    if (!messageContent) {
      throw new Error("Could not parse commit message.");
    }
    return messageContent;
  }
  if (!trimmedMessage) {
    throw new Error("Could not parse commit message.");
  }
  return trimmedMessage;
};
