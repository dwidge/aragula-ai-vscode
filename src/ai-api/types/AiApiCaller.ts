import { Logger } from "../../utils/Logger";
import { ToolCall } from "./ToolCall";
import { ToolDefinition } from "./ToolDefinition";

export type AiPrompt = {
  user: string;
  system?: string;
  tools?: ToolCall[];
};

/**
 * Vendor-agnostic AI API caller interface.
 */
export interface AiApiCaller {
  (
    prompt: AiPrompt,
    tools?: ToolDefinition[],
    options?: {
      logger?: Logger;
      signal?: AbortSignal;
      onChunk?: (chunk: { text?: string }) => void;
    }
  ): Promise<{ assistant: string; tools: ToolCall[] }>;
}
