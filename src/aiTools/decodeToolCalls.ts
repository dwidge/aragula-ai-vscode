import { ToolCall } from "@/ai-api/types/ToolCall.js";
import { ToolDefinition } from "@/ai-api/types/ToolDefinition.js";
import {
  defaultFileTypeMap,
  extractFilesFromAIResponse,
} from "@dwidge/llm-file-diff";
import { parseXmlSchema } from "@dwidge/xml-parser";

/**
 * Decodes tool calls from a response string, auto-detecting format (XML or JSON).
 */
export const decodeToolCalls = (
  response: string,
  tools: ToolDefinition[]
): ToolCall[] => [
  ...decodeJsonToolCalls(
    response,
    tools.filter((t) => t.type === "json")
  ),
  ...decodeXmlToolCalls(
    response,
    tools.filter((t) => t.type === "xml")
  ),
  ...decodeBacktickToolCalls(
    response,
    tools.filter((t) => t.type === "backtick")
  ),
];

/**
 * Decodes JSON formatted tool calls from a response string into ToolCall objects.
 */
export function decodeJsonToolCalls(
  response: string,
  tools: ToolDefinition[]
): ToolCall[] {
  try {
    const arr = JSON.parse(response);
    if (!Array.isArray(arr)) {
      return [];
    }
    return arr.map((item: any) => ({
      name: item.name,
      parameters: item.parameters || {},
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Decodes XML formatted tool calls from a response string into ToolCall objects.
 */
export function decodeXmlToolCalls(
  response: string,
  tools: ToolDefinition[]
): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  for (const tool of tools.filter((t) => t.parameters)) {
    const schema = {
      type: "object",
      properties: { [tool.name]: tool.parameters },
    } as const;
    const parsedToolCalls = parseXmlSchema(response, schema);

    if (Array.isArray(parsedToolCalls) && parsedToolCalls.length > 0) {
      parsedToolCalls.forEach((parsedToolCall) => {
        if (
          typeof parsedToolCall === "object" &&
          !Array.isArray(parsedToolCall)
        ) {
          const parameters = parsedToolCall?.[tool.name];
          if (typeof parameters === "object") {
            toolCalls.push({
              type: "xml",
              name: tool.name,
              parameters,
            });
          }
        }
      });
    }
  }
  return toolCalls;
}

/**
 * Decodes backtick formatted tool calls from a response string into ToolCall objects.
 */
export function decodeBacktickToolCalls(
  response: string,
  tools: ToolDefinition[]
): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  const extractedFiles = extractFilesFromAIResponse(
    response,
    {},
    { ...defaultFileTypeMap, commit: null }
  );

  const name = tools[0]?.name;
  if (!name) {
    return [];
  }

  for (const [path, content] of Object.entries(extractedFiles)) {
    toolCalls.push({
      type: "backtick",
      name: name,
      parameters: { path, content },
    });
  }

  return toolCalls;
}
