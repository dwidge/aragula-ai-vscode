import { Json } from "@dwidge/xml-parser";
import { ToolCall, ToolDefinition } from "./aiTools/AiApi";

export type ToolCallResult = {
  name: string;
  parameters?: Json;
  response?: Json;
  error?: string;
};

export const executeToolCalls = async (
  toolCalls: ToolCall[],
  availableTools: ToolDefinition[]
): Promise<ToolCallResult[]> =>
  Promise.all(
    toolCalls.map(async (tool) => {
      try {
        const toolFunction = availableTools.find((t) => t.name === tool.name);
        if (!toolFunction) {
          throw new Error(`Unknown tool: ${tool.name}`);
        }
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
