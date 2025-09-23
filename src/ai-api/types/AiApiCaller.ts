import { Logger } from "../../utils/Logger";
import { ToolCall } from "./ToolCall";
import { ToolDefinition } from "./ToolDefinition";

/**
 * Vendor-agnostic AI API caller interface.
 */
export interface AiApiCaller {
  (
    prompt: {
      user: string;
      system?: string;
      tools?: ToolCall[];
    },
    tools?: ToolDefinition[],
    options?: {
      logger?: Logger;
      signal?: AbortSignal;
      onChunk?: (chunk: { text?: string }) => void;
    }
  ): Promise<{ assistant: string; tools: ToolCall[] }>;
}
