import { OpenAI } from "openai";

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 4000;

export async function sendToOpenAI(
  prompt: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new Error("sendToOpenAI1: API key is required.");
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ content: prompt, role: "user" }],
      max_tokens: MAX_TOKENS,
    });

    const content = response.choices[0]?.message?.content?.trim();
    return content || "No response from OpenAI.";
  } catch (error) {
    throw new Error(
      `sendToOpenAI2: Failed to get a response from OpenAI` +
        (error instanceof Error ? ": " + error.message : ""),
      {
        cause: error,
      }
    );
  }
}
