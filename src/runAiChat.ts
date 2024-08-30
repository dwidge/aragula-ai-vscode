import { OpenAI } from "openai";
import { getConfig } from "./config";

export async function runAiChat(
  openai: OpenAI,
  prompt: string,
  systemPrompt: string
) {
  const response = await openai.chat.completions.create({
    ...getConfig(),
    messages: [
      { content: systemPrompt, role: "system" },
      { content: prompt, role: "user" },
    ],
  });
  return response.choices[0]?.message?.content?.trim();
}
