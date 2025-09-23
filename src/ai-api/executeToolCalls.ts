import { ToolCall } from "@/ai-api/types/ToolCall";
import { ToolDefinition } from "@/ai-api/types/ToolDefinition";
import { Logger } from "../utils/Logger";
import { ToolCallResult } from "./types/ToolCallResult";

export const executeToolCalls = async (
  toolCalls: ToolCall[],
  availableTools: ToolDefinition[],
  log: Logger
): Promise<ToolCallResult[]> =>
  Promise.all(
    toolCalls.map(async (tool) => {
      try {
        const toolFunction = availableTools.find((t) => t.name === tool.name);
        if (!toolFunction) {
          throw new Error(`Unknown tool: ${tool.name}`);
        }
        log(tool.name, "tools");
        if (toolFunction.function) {
          const toolResult: any = await toolFunction.function(
            {},
            tool.parameters
          );
          return { ...tool, response: toolResult };
        } else {
          return tool;
        }
      } catch (error: any) {
        return { ...tool, error: error.message || "Tool execution failed" };
      }
    })
  );
