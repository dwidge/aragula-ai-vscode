import { OpenAI } from "openai";
import * as vscode from "vscode";
import { runAiTools } from "./runAiTools";

export async function sendToOpenAI(
  prompt: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  validateApiKey(apiKey);
  const openai = new OpenAI({ apiKey });

  try {
    vscode.window.showInformationMessage(`asking ai...`);
    return (await runAiTools(openai, prompt, systemPrompt)) ?? "";
  } catch (error) {
    handleError(error);
  }
}

function validateApiKey(apiKey: string): void {
  if (!apiKey) {
    throw new Error("API key is required.");
  }
}

function handleError(error: unknown): never {
  throw new Error(
    `Failed to get a response from OpenAI` +
      (error instanceof Error ? ": " + error.message : ""),
    {
      cause: error,
    }
  );
}
