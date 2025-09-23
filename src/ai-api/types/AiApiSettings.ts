/**
 * Settings for the AI API caller.
 */
export interface AiApiSettings {
  name: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  provider?: string;
  max_tokens?: number;
  temperature?: number;
  vendor:
    | "openai"
    | "gemini"
    | "groq"
    | "cerebras"
    | "claude"
    | "manual"
    | string;
}
