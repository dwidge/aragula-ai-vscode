import { OpenAI } from "openai";
import * as vscode from "vscode";
import { callOpenAi } from "./aiTools/callOpenAi";
import { askAiWithTools } from "./aiTools/functions";

export async function sendToOpenAI(
  prompt: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  validateApiKey(apiKey);
  vscode.window.showInformationMessage(`asking ai...`);
  console.log("sendToOpenAI1");
  return await askAiWithTools(
    { promptAi: callOpenAi(new OpenAI({ apiKey })) },
    {
      user: prompt,
      system: systemPrompt,
    }
  ).catch(handleError);
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
