import { OpenAI } from "openai";
import { ChatModel } from "openai/resources/index.mjs";

export interface AiApiCaller {
  (prompt: { user: string; system: string }): Promise<string>;
}

export interface AiApiSettings {
  apiKey: string;
  baseURL?: string;
  model: ChatModel;
  max_tokens?: number;
  logger?: (message: string) => void;
}

export function newAiApi(settings: AiApiSettings): AiApiCaller {
  validateApiKey(settings.apiKey);

  const { logger = () => {}, apiKey, baseURL, model, max_tokens } = settings;
  const openai = new OpenAI({ apiKey, baseURL });

  return async function (prompt) {
    logger(`Asking Ai...`);

    return await callOpenAi(openai, { model, max_tokens }, prompt).catch(
      (error: unknown) => {
        throw new Error(
          `Failed to get a response from AiApi` +
            (error instanceof Error ? ": " + (error as Error).message : ""),
          {
            cause: error,
          }
        );
      }
    );
  };
}

function validateApiKey(apiKey: string): void {
  if (!apiKey) {
    throw new Error("API key is required.");
  }
}

const callOpenAi = async (
  openai: OpenAI,
  settings: { model: ChatModel; max_tokens?: number },
  {
    user,
    system,
  }: {
    user: string;
    system?: string;
  }
): Promise<string> =>
  (
    await openai.chat.completions.create({
      ...settings,
      messages: system
        ? [
            { content: system, role: "system" },
            { content: user, role: "user" },
          ]
        : [{ content: user, role: "user" }],
    })
  ).choices[0]?.message?.content?.trim() ?? "";
