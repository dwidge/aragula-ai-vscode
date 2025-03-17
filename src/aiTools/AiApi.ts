import { OpenAI } from "openai";
import { parseXml } from "@dwidge/xml-parser";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

/**
 * Type representing valid JSON values.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

/**
 * JSON Schema type definition for parameters/responses.
 */
export type JsonSchema = {
  type: "string" | "number" | "boolean" | "object" | "array" | "null";
  properties?: { [propertyName: string]: JsonSchema };
  description?: string;
  enum?: string[];
  format?: string;
  required?: string[];
};

/**
 * Vendor-agnostic tool definition.
 * The `type` property indicates the tool call format:
 * - "native" (default) uses the vendor’s built-in tool calling,
 * - "xml" or "json" uses manual encoding/decoding.
 */
export interface ToolDefinition {
  type?: "xml" | "json" | "native"; // native by default if supported by vendor, else xml
  name: string;
  description?: string;
  parameters: JsonSchema;
  response?: JsonSchema;
  function?: Function;
}

/**
 * Vendor-agnostic tool call.
 */
export interface ToolCall {
  name: string;
  parameters?: Json;
  response?: Json;
}

type AiMessage = {
  user?: string;
  system?: string;
  assistant?: string;
  tools?: ToolCall[];
};

/**
 * Vendor-agnostic AI API caller interface.
 */
export interface AiApiCaller {
  (
    prompt: { user: string; system?: string; tools?: ToolCall[] }, // accept tool call results in the prompt
    tools?: ToolDefinition[]
  ): Promise<{ assistant: string; tools: ToolCall[] }>;
}

type Logger = (message: string) => void;

/**
 * Settings for the AI API caller.
 */
export interface AiApiSettings {
  apiKey: string;
  baseURL?: string;
  model: string;
  max_tokens?: number;
  logger?: Logger;
  vendor: "openai" | "gemini" | "groq" | "cerebras" | "claude" | string;
}

/* ============================================================================
   Common Functions for Formatted Tool Calls (XML and JSON)
   ========================================================================== */

/**
 * Encodes an array of tools into an XML string.
 */
export function encodeToolsToXml(tools: ToolDefinition[]): string {
  return tools
    .map((tool) => {
      const props = tool.parameters.properties;
      const inner = props
        ? Object.entries(props)
            .map(([k, v]) => `<${k}>${v.description || v.type}</${k}>`)
            .join("\n")
        : "";
      return `<${tool.name}>\n${inner}\n</${tool.name}>`;
    })
    .join("\n\n");
}

/**
 * Decodes XML formatted tool calls from a response string into ToolCall objects.
 */
export function decodeXmlToolCalls(response: string): ToolCall[] {
  const parsed = parseXml(response);
  const toolCalls: ToolCall[] = [];
  for (const item of parsed) {
    if (typeof item === "string") {
      continue;
    }
    const toolName = item.name;
    const params: Record<string, string> = {};
    if (item.children && Array.isArray(item.children)) {
      for (const child of item.children) {
        if (typeof child !== "string") {
          params[child.name] =
            typeof child.children[0] === "string" ? child.children[0] : "";
        }
      }
    }
    toolCalls.push({
      name: toolName,
      parameters: params,
    });
  }
  return toolCalls;
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

/**
 * Decodes JSON formatted tool calls from a response string into ToolCall objects.
 */
export function decodeJsonToolCalls(response: string): ToolCall[] {
  try {
    const arr = JSON.parse(response);
    if (!Array.isArray(arr)) {
      return [];
    }
    return arr.map((item: any) => ({
      name: item.name,
      arguments: item.parameters || {},
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Prepares a formatted system prompt by embedding tool call instructions.
 * Returns a decoding function to parse the AI’s response.
 */
export function prepareFormattedToolPrompt(
  prompt: { user: string; system?: string },
  tools?: ToolDefinition[]
): {
  prompt: { user: string; system: string };
  decodeToolCalls: (response: string) => ToolCall[];
} {
  if (!tools || tools.length === 0) {
    return {
      prompt: { user: prompt.user, system: prompt.system || "" },
      decodeToolCalls: () => [],
    };
  }
  const callType = tools[0].type || "native";
  // Ensure all tools share the same call type.
  for (const tool of tools) {
    if ((tool.type || "native") !== callType) {
      throw new Error("All tools must have the same call type");
    }
  }
  if (callType === "xml") {
    const toolsXml = encodeToolsToXml(tools);
    const combinedSystem = [
      prompt.system || "",
      "Output only xml.",
      "Call these tools:",
      toolsXml,
    ]
      .join("\n\n")
      .trim();
    return {
      prompt: { user: prompt.user, system: combinedSystem },
      decodeToolCalls: decodeXmlToolCalls,
    };
  } else if (callType === "json") {
    const toolsJson = encodeToolsToJson(tools);
    const combinedSystem = [
      prompt.system || "",
      "Output only JSON.",
      "Call these tools:",
      toolsJson,
    ]
      .join("\n\n")
      .trim();
    return {
      prompt: { user: prompt.user, system: combinedSystem },
      decodeToolCalls: decodeJsonToolCalls,
    };
  } else {
    // Native tool calling – no modifications needed.
    return {
      prompt: { user: prompt.user, system: prompt.system || "" },
      decodeToolCalls: () => [],
    };
  }
}

/* ============================================================================
   JSON Schema Validation
   ========================================================================== */

/**
 * Validates a JSON object against a JSON schema.
 */
export function validateJsonAgainstSchema(
  json: Json,
  schema: JsonSchema
): boolean {
  if (schema.type === "string") {
    return typeof json === "string";
  } else if (schema.type === "number") {
    return typeof json === "number";
  } else if (schema.type === "boolean") {
    return typeof json === "boolean";
  } else if (schema.type === "null") {
    return json === null;
  } else if (schema.type === "object") {
    if (typeof json !== "object" || json === null || Array.isArray(json)) {
      return false;
    }
    if (schema.properties) {
      for (const key in schema.properties) {
        if (schema.properties.hasOwnProperty(key)) {
          if (
            !validateJsonAgainstSchema(
              (json as any)[key],
              schema.properties[key]
            )
          ) {
            return false;
          }
        }
      }
    }
    if (schema.required) {
      for (const requiredKey of schema.required) {
        if (!(json as any).hasOwnProperty(requiredKey)) {
          return false;
        }
      }
    }
    return true;
  } else if (schema.type === "array") {
    return Array.isArray(json); // Basic array check, can be extended for items schema
  }
  return false; // Unknown type or validation failed
}

/* ============================================================================
   Vendor-Specific API Implementations
   ========================================================================== */

/* ----------------------- OpenAI Implementation ----------------------- */
interface OpenAiSpecificSettings {
  apiKey: string;
  baseURL?: string;
  model: string;
  max_tokens?: number;
  logger?: (message: string) => void;
}

export function newOpenAiApi(settings: OpenAiSpecificSettings): AiApiCaller {
  const { logger = () => {}, apiKey, baseURL, model, max_tokens } = settings;
  const openai = new OpenAI({ apiKey, baseURL });

  return async (prompt, tools) =>
    callOpenAi(openai, { model, max_tokens, tools, logger }, prompt);
}

const callOpenAi = async (
  openaiInstance: OpenAI,
  apiSettings: {
    model: string;
    max_tokens?: number;
    tools?: ToolDefinition[];
    logger: (msg: string) => void;
  },
  prompt: { user: string; system?: string }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  let messages: Array<ChatCompletionMessageParam>;
  let decodeToolCalls = (res: string) => [] as ToolCall[];

  if (
    apiSettings.tools &&
    apiSettings.tools.length > 0 &&
    (apiSettings.tools[0].type || "native") !== "native"
  ) {
    const prepared = prepareFormattedToolPrompt(prompt, apiSettings.tools);
    messages = [
      { content: prepared.prompt.system, role: "system" },
      { content: prepared.prompt.user, role: "user" },
    ];
    decodeToolCalls = prepared.decodeToolCalls;
  } else {
    messages = prompt.system
      ? [
          { content: prompt.system, role: "system" },
          { content: prompt.user, role: "user" },
        ]
      : [{ content: prompt.user, role: "user" }];
    apiSettings.logger("Using native tool calling for OpenAI.");
  }

  const response = await openaiInstance.chat.completions.create({
    model: apiSettings.model,
    max_tokens: apiSettings.max_tokens,
    messages,
    tools:
      apiSettings.tools && (apiSettings.tools[0].type || "native") === "native"
        ? apiSettings.tools.map(convertToOpenAiTool)
        : undefined,
    tool_choice:
      apiSettings.tools && (apiSettings.tools[0].type || "native") === "native"
        ? "auto"
        : undefined,
  });

  const messageContent = response.choices[0]?.message?.content?.trim() ?? "";
  const toolCalls =
    apiSettings.tools && (apiSettings.tools[0].type || "native") === "native"
      ? response.choices[0]?.message?.tool_calls?.map(
          convertFromOpenAiToolCall
        ) ?? []
      : decodeToolCalls(messageContent);

  return { assistant: messageContent, tools: toolCalls };
};

function convertToOpenAiTool(
  tool: ToolDefinition
): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function convertFromOpenAiToolCall(
  openAiToolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
): ToolCall {
  return {
    name: openAiToolCall.function.name,
    parameters: JSON.parse(openAiToolCall.function.arguments),
  };
}

/* ----------------------- Gemini Implementation ----------------------- */
interface GeminiSpecificSettings {
  apiKey: string;
  baseURL?: string;
  model: string;
  max_tokens?: number;
  logger?: (message: string) => void;
}

export function newGeminiApi(settings: GeminiSpecificSettings): AiApiCaller {
  const { logger = () => {}, apiKey, baseURL, model, max_tokens } = settings;
  // Placeholder Gemini API client – replace with actual Gemini SDK initialization.
  const geminiApi = {
    generateContent: async (request: any) => {
      logger("Calling Gemini API...");
      return {
        candidates: [
          {
            content: {
              parts: [{ text: "Gemini response" }],
              tool_calls: [],
            },
          },
        ],
      };
    },
  };

  return async (prompt, tools) => {
    let formattedPrompt = prompt;
    let decodeToolCalls = (res: string) => [] as ToolCall[];
    if (tools && tools.length > 0 && (tools[0].type || "native") !== "native") {
      const prepared = prepareFormattedToolPrompt(prompt, tools);
      formattedPrompt = prepared.prompt;
      decodeToolCalls = prepared.decodeToolCalls;
    }

    const geminiPrompt = {
      contents: [
        { role: "user", parts: [{ text: formattedPrompt.user }] },
        ...(formattedPrompt.system
          ? [{ role: "system", parts: [{ text: formattedPrompt.system }] }]
          : []),
      ],
      tools:
        tools && (tools[0].type || "native") === "native"
          ? tools.map(convertToGeminiTool)
          : undefined,
    };

    const response = await geminiApi.generateContent(geminiPrompt);
    const messageContent =
      response.candidates[0]?.content?.parts[0]?.text?.trim() ?? "";
    const toolCalls =
      tools && (tools[0].type || "native") === "native"
        ? convertFromGeminiToolCalls(
            response.candidates[0]?.content?.tool_calls
          )
        : decodeToolCalls(messageContent);
    return { assistant: messageContent, tools: toolCalls };
  };
}

function convertToGeminiTool(tool: ToolDefinition): any {
  console.warn(
    "Gemini native tool conversion not implemented. Returning raw tool."
  );
  return tool;
}

function convertFromGeminiToolCalls(geminiToolCalls: any): ToolCall[] {
  console.warn(
    "Gemini native tool call conversion not implemented. Returning empty tool calls."
  );
  return [];
}

/* ----------------------- Groq Implementation ----------------------- */
interface GroqSpecificSettings {
  apiKey: string;
  baseURL?: string;
  model: string;
  max_tokens?: number;
  logger?: (message: string) => void;
}

export function newGroqApi(settings: GroqSpecificSettings): AiApiCaller {
  const { logger = () => {}, apiKey, baseURL, model, max_tokens } = settings;
  // Placeholder Groq API client – replace with actual Groq SDK initialization.
  const groqApi = {
    chat: {
      completions: {
        create: async (request: any) => {
          logger("Calling Groq API...");
          return {
            choices: [
              {
                message: {
                  content: "Groq response",
                  tool_calls: [],
                },
              },
            ],
          };
        },
      },
    },
  };

  return async (prompt, tools) => {
    let formattedPrompt = prompt;
    let decodeToolCalls = (res: string) => [] as ToolCall[];
    if (tools && tools.length > 0 && (tools[0].type || "native") !== "native") {
      const prepared = prepareFormattedToolPrompt(prompt, tools);
      formattedPrompt = prepared.prompt;
      decodeToolCalls = prepared.decodeToolCalls;
    }

    const groqPrompt = {
      model: model,
      max_tokens: max_tokens,
      messages: [
        ...(formattedPrompt.system
          ? [{ content: formattedPrompt.system, role: "system" }]
          : []),
        { content: formattedPrompt.user, role: "user" },
      ],
      tools:
        tools && (tools[0].type || "native") === "native"
          ? tools.map(convertToGroqTool)
          : undefined,
    };

    const response = await groqApi.chat.completions.create(groqPrompt);
    const messageContent = response.choices[0]?.message?.content?.trim() ?? "";
    const toolCalls =
      tools && (tools[0].type || "native") === "native"
        ? convertFromGroqToolCalls(response.choices[0]?.message?.tool_calls)
        : decodeToolCalls(messageContent);
    return { assistant: messageContent, tools: toolCalls };
  };
}

function convertToGroqTool(tool: ToolDefinition): any {
  console.warn(
    "Groq native tool conversion not implemented. Returning raw tool."
  );
  return tool;
}

function convertFromGroqToolCalls(groqToolCalls: any): ToolCall[] {
  console.warn(
    "Groq native tool call conversion not implemented. Returning empty tool calls."
  );
  return [];
}

/* ----------------------- Cerebras Implementation ----------------------- */
interface CerebrasSpecificSettings {
  apiKey: string;
  baseURL?: string;
  model: string;
  max_tokens?: number;
  logger?: (message: string) => void;
}

export function newCerebrasApi(
  settings: CerebrasSpecificSettings
): AiApiCaller {
  const { logger = () => {}, apiKey, baseURL, model, max_tokens } = settings;
  // Placeholder Cerebras API client – replace with actual Cerebras SDK initialization.
  const cerebrasApi = {
    generate: async (request: any) => {
      logger("Calling Cerebras API...");
      return {
        text: "Cerebras response",
        tool_calls: [],
      };
    },
  };

  return async (prompt, tools) => {
    let formattedPrompt = prompt;
    let decodeToolCalls = (res: string) => [] as ToolCall[];
    if (tools && tools.length > 0 && (tools[0].type || "native") !== "native") {
      const prepared = prepareFormattedToolPrompt(prompt, tools);
      formattedPrompt = prepared.prompt;
      decodeToolCalls = prepared.decodeToolCalls;
    }

    const cerebrasPrompt = {
      model: model,
      max_tokens: max_tokens,
      prompt: `${
        formattedPrompt.system ? `System: ${formattedPrompt.system}\n` : ""
      }User: ${formattedPrompt.user}`,
      tools:
        tools && (tools[0].type || "native") === "native"
          ? tools.map(convertToCerebrasTool)
          : undefined,
    };

    const response = await cerebrasApi.generate(cerebrasPrompt);
    const messageContent = response.text?.trim() ?? "";
    const toolCalls =
      tools && (tools[0].type || "native") === "native"
        ? convertFromCerebrasToolCalls(response.tool_calls)
        : decodeToolCalls(messageContent);
    return { assistant: messageContent, tools: toolCalls };
  };
}

function convertToCerebrasTool(tool: ToolDefinition): any {
  console.warn(
    "Cerebras native tool conversion not implemented. Returning raw tool."
  );
  return tool;
}

function convertFromCerebrasToolCalls(cerebrasToolCalls: any): ToolCall[] {
  console.warn(
    "Cerebras native tool call conversion not implemented. Returning empty tool calls."
  );
  return [];
}

/* ----------------------- Claude Implementation ----------------------- */
interface ClaudeSpecificSettings {
  apiKey: string;
  baseURL?: string;
  model: string;
  max_tokens?: number;
  logger?: (message: string) => void;
}

export function newClaudeApi(settings: ClaudeSpecificSettings): AiApiCaller {
  const { logger = () => {}, apiKey, baseURL, model, max_tokens } = settings;
  // Placeholder Claude API client – replace with actual Claude SDK initialization.
  const claudeApi = {
    messages: {
      create: async (request: any) => {
        logger("Calling Claude API...");
        return {
          content: [{ type: "text", text: "Claude response" }],
          tool_calls: [],
        };
      },
    },
  };

  return async (prompt, tools) => {
    let formattedPrompt = prompt;
    let decodeToolCalls = (res: string) => [] as ToolCall[];
    if (tools && tools.length > 0 && (tools[0].type || "native") !== "native") {
      const prepared = prepareFormattedToolPrompt(prompt, tools);
      formattedPrompt = prepared.prompt;
      decodeToolCalls = prepared.decodeToolCalls;
    }

    const claudePrompt = {
      model: model,
      max_tokens: max_tokens,
      messages: [
        ...(formattedPrompt.system
          ? [{ role: "system", content: formattedPrompt.system }]
          : []),
        { role: "user", content: formattedPrompt.user },
      ],
      tools:
        tools && (tools[0].type || "native") === "native"
          ? tools.map(convertToClaudeTool)
          : undefined,
    };

    const response = await claudeApi.messages.create(claudePrompt);
    const messageContent = response.content?.[0]?.text?.trim() ?? "";
    const toolCalls =
      tools && (tools[0].type || "native") === "native"
        ? convertFromClaudeToolCalls(response.tool_calls)
        : decodeToolCalls(messageContent);
    return { assistant: messageContent, tools: toolCalls };
  };
}

function convertToClaudeTool(tool: ToolDefinition): any {
  console.warn(
    "Claude native tool conversion not implemented. Returning raw tool."
  );
  return tool;
}

function convertFromClaudeToolCalls(claudeToolCalls: any): ToolCall[] {
  console.warn(
    "Claude native tool call conversion not implemented. Returning empty tool calls."
  );
  return [];
}

/**
 * Enhances an AiApiCaller to handle function calls in a loop.
 */
export const withFunctionCalling =
  (
    apiCaller: AiApiCaller,
    { logger = () => {} }: { logger?: Logger } = {}
  ): AiApiCaller =>
  async (prompt, tools) => {
    let currentPrompt = { ...prompt };
    let currentTools = tools;
    let finalMessage = "";
    let finalToolCalls: ToolCall[] = [];
    let functionCallLoop = true;

    while (functionCallLoop) {
      const apiResponse = await apiCaller(currentPrompt, currentTools);
      finalMessage = apiResponse.assistant;
      finalToolCalls = apiResponse.tools;
      functionCallLoop = false; // Assume no function calls to process in this iteration

      if (apiResponse.tools && apiResponse.tools.length > 0 && tools) {
        const functionResults: string[] = [];
        for (const toolCall of apiResponse.tools) {
          const toolDefinition = tools.find((t) => t.name === toolCall.name);
          if (toolDefinition && toolDefinition.function) {
            functionCallLoop = true; // Set to true as we are processing a function call
            logger(
              `Calling function: ${toolCall.name} with params: ${JSON.stringify(
                toolCall.parameters
              )}`
            );

            // Validate arguments against schema if schema is provided
            if (toolDefinition.parameters && toolCall.parameters) {
              if (
                !validateJsonAgainstSchema(
                  toolCall.parameters,
                  toolDefinition.parameters
                )
              ) {
                throw new Error(
                  `Tool call arguments for ${
                    toolCall.name
                  } do not match schema: ${JSON.stringify(
                    toolDefinition.parameters
                  )}`
                );
              }
            }

            try {
              const functionResponse = await toolDefinition.function(
                toolCall.parameters
              );

              // Validate response against schema if schema is provided
              if (toolDefinition.response) {
                if (
                  !validateJsonAgainstSchema(
                    functionResponse,
                    toolDefinition.response
                  )
                ) {
                  throw new Error(
                    `Function response for ${
                      toolCall.name
                    } does not match schema: ${JSON.stringify(
                      toolDefinition.response
                    )}`
                  );
                }
              }
              logger(
                `Function ${toolCall.name} returned: ${JSON.stringify(
                  functionResponse
                )}`
              );
              functionResults.push(JSON.stringify(functionResponse)); // Consider how to format this for re-prompting
            } catch (error: any) {
              const errorMsg = `Function ${toolCall.name} failed: ${
                error.message || error
              }`;
              logger(errorMsg);
              functionResults.push(`Error: ${errorMsg}`); // Or handle error reporting differently
            }
          } else {
            // If tool is called but no function is defined, stop function calling loop
            functionCallLoop = false;
            break; // Stop processing functions if one is called without a function def
          }
        }

        if (functionCallLoop) {
          const systemMessage = [
            prompt.system,
            `Function call results:`,
            ...functionResults.map(
              (result, index) => `- Result ${index + 1}: ${result}`
            ), // Simple text format for now
            `Re-prompting based on function results.`,
          ]
            .filter(Boolean)
            .join("\n");

          currentPrompt = {
            user: prompt.user, // Keep original user prompt
            system: systemMessage,
          };
          currentTools = tools; // Re-use the same tools for the next call, important for native tools
        }
      }
    }

    return { assistant: finalMessage, tools: finalToolCalls };
  };
