
import { OpenAI } from "openai";

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 4000;

export async function sendToOpenAI(
  prompt: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  validateApiKey(apiKey);
  const openai = new OpenAI({ apiKey });

  try {
    const response = await fetchChatCompletion(openai, prompt, systemPrompt);
    return extractContent(response);
  } catch (error) {
    handleError(error);
  }
}

function validateApiKey(apiKey: string): void {
  if (!apiKey) {
    throw new Error("API key is required.");
  }
}

async function fetchChatCompletion(openai: OpenAI, prompt: string, systemPrompt: string) {
  return openai.chat.completions.create({
    model: MODEL,
    messages: [
      { content: systemPrompt, role: "system" },
      { content: prompt, role: "user" },
    ],
    max_tokens: MAX_TOKENS,
  });
}

function extractContent(response: any): string {
  return response.choices[0]?.message?.content?.trim() || "No response from OpenAI.";
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
