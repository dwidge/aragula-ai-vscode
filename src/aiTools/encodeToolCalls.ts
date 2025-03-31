import { ToolDefinition, ToolCall, JsonSchema } from "./AiApi";
import { toXml } from "./toXml";
import assert from "assert";

/* ============================================================================
   Common Functions for Formatted Tool Calls (XML, JSON, and Backtick)
   ========================================================================== */

/**
 * Encodes an array of tools into an XML string.
 */
export const encodeToolsToXml = (tools: ToolDefinition[]): string =>
  tools.map(encodeToolToXml).join("\n\n");

export const encodeToolToXml = (tool: ToolDefinition): string =>
  "Use this format for this tool:\n" +
  toXml(
    Object.fromEntries(
      Object.entries(tool.parameters.properties ?? {}).map(([k, v]) => [
        k,
        `${v.type} - ${v.description ?? "value"}`,
      ])
    ),
    tool.name
  );

/**
 * Encodes an array of tool calls (with results) into an XML string for prompt using recursive toXml.
 */
export function encodeToolCallsWithResultsToXml(toolCalls: ToolCall[]): string {
  return toolCalls
    .map(({ name, ...toolCall }) =>
      toXml(
        {
          ...(typeof toolCall.parameters === "object"
            ? toolCall.parameters
            : {}),
          ...(typeof toolCall.response === "object" ? toolCall.response : {}),
        },
        name
      )
    )
    .join("\n\n");
}

/**
 * Encodes an array of tools into a JSON string.
 */
export function encodeToolsToJson(tools: ToolDefinition[]): string {
  const arr = tools.map((tool) => {
    const params: Record<string, string> = {};
    if (tool.parameters.properties) {
      for (const [key, schema] of Object.entries(tool.parameters.properties)) {
        params[key] = schema.description || schema.type;
      }
    }
    return {
      name: tool.name,
      parameters: params,
    };
  });
  return JSON.stringify(arr, null, 2);
}

export function encodeToolToJson(tool: ToolDefinition): string {
  const params: Record<string, string> = {};
  if (tool.parameters.properties) {
    for (const [key, schema] of Object.entries(tool.parameters.properties)) {
      params[key] = schema.description || schema.type;
    }
  }
  return (
    "Use this format for this tool:\n" +
    JSON.stringify(
      {
        name: tool.name,
        parameters: params,
      },
      null,
      2
    )
  );
}

/**
 * Encodes an array of tool calls (with results) into a JSON string for prompt.
 */
export function encodeToolCallsWithResultsToJson(
  toolCalls: ToolCall[]
): string {
  const arr = toolCalls.map((toolCall) => {
    return {
      name: toolCall.name,
      parameters: toolCall.parameters || {},
      response: toolCall.response,
    };
  });
  return JSON.stringify(arr, null, 2);
}

/**
 * Encodes an array of tools into a backtick string.
 */
export const encodeToolsToBacktick = (tools: ToolDefinition[]): string =>
  tools.map(encodeToolToBacktick).join("\n\n");

const encodeParamBacktick = ([k, v]: [string, JsonSchema]) =>
  `// ${v.example ?? k ?? v.description ?? v.type}`;

export const encodeToolToBacktick = (tool: ToolDefinition): string => {
  const { content, ...parameters } = tool.parameters.properties ?? {};
  const paramsString = Object.entries(parameters)
    .map(encodeParamBacktick)
    .join("\n");
  return `Output separately like this:\n\n\`\`\`\n${paramsString}\n${"content"}\n\`\`\`\n\n\`\`\`\n${paramsString}\n${"content"}\n\`\`\``;
};

/**
 * Encodes an array of tool calls (with results) into a backtick string for prompt.
 */
export function encodeToolCallsWithResultsToBacktick(
  toolCalls: ToolCall[]
): string {
  return toolCalls
    .map(({ name, parameters = {}, response = {} }) => {
      assert(typeof parameters === "object");
      assert(typeof response === "object");
      const { content = "", ...rest } = {
        content: "",
        ...parameters,
        ...response,
      };

      const paramsString = Object.entries(rest)
        .map(([k, v]: [string, any]) => `// ${v}`)
        .join("\n");

      return `\`\`\`\n${paramsString}\n${content}\n\`\`\``;
    })
    .join("\n\n");
}
