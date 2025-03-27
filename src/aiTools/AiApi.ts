import Anthropic from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";
import CerebrasServiceClient from "@cerebras/cerebras_cloud_sdk";
import { ChatCompletion } from "@cerebras/cerebras_cloud_sdk/resources/index.mjs";
import { parseXml } from "@dwidge/xml-parser";
import {
  FunctionCall,
  GenerateContentRequest,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import Groq from "groq-sdk";
import { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions.mjs";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { toXml } from "./toXml";

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
  items?: JsonSchema;
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
  response?: Json; // Add response to ToolCall
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
    prompt: {
      user: string;
      system?: string;
      tools?: ToolCall[];
    },
    tools?: ToolDefinition[],
    options?: { logger?: Logger; signal?: AbortSignal }
  ): Promise<{ assistant: string; tools: ToolCall[] }>;
}

export type Logger = (message: string, type?: string) => void;

/**
 * Settings for the AI API caller.
 */
export interface AiApiSettings {
  apiKey: string;
  baseURL?: string;
  model: string;
  max_tokens?: number;
  vendor: "openai" | "gemini" | "groq" | "cerebras" | "claude" | string;
}

/* ============================================================================
   Common Functions for Formatted Tool Calls (XML and JSON)
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
    .map(({ name, ...toolCall }) => toXml(toolCall, name))
    .join("\n\n");
}

/**
 * Decodes tool calls from a response string, auto-detecting format (XML or JSON).
 */
export const decodeToolCalls = (response: string): ToolCall[] => [
  ...decodeJsonToolCalls(response),
  ...decodeXmlToolCalls(response),
];

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
        if (typeof child !== "string" && child.name !== "response") {
          // Ignore response tag during decoding AI call
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
      parameters: item.parameters || {},
    }));
  } catch (e) {
    return [];
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
    return Array.isArray(json);
  }
  return false;
}

/* ============================================================================
   Vendor-Specific API Implementations
   ========================================================================== */

/* ----------------------- OpenAI Implementation ----------------------- */
interface OpenAiSpecificSettings extends AiApiSettings {}

export function newOpenAiApi(settings: OpenAiSpecificSettings): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens } = settings;

  return async (prompt, tools, options) =>
    callOpenAi(
      new OpenAI({ apiKey, baseURL }),
      { model, max_tokens },
      prompt,
      tools,
      options
    );
}

/**
 * Helper function to build tool call messages for OpenAI.
 */
const buildToolCallMessagesOpenAi = (
  prompt: { tools?: ToolCall[] },
  tools?: ToolDefinition[]
): ChatCompletionMessageParam[] => {
  const messages: ChatCompletionMessageParam[] = [];

  for (const toolCall of prompt.tools ?? []) {
    const toolDefinition = tools?.find(
      (toolDef) => toolDef.name === toolCall.name
    );
    const callType = toolDefinition?.type || "native";

    if (callType === "native") {
      const toolCallId = `tool_call_${toolCall.name}_${Math.random()
        .toString(36)
        .substring(7)}`;
      // Assistant message for tool call request
      messages.push({
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: toolCallId,
            type: "function",
            function: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.parameters || {}),
            },
          },
        ],
      });
      // Tool message for tool call response
      messages.push({
        role: "tool",
        tool_call_id: toolCallId,
        content: JSON.stringify(toolCall.response) || "No response",
      });
    } else if (callType === "xml") {
      const xmlMessage = encodeToolCallsWithResultsToXml([toolCall]);
      messages.push({
        role: "assistant",
        content: xmlMessage,
      });
    } else if (callType === "json") {
      const jsonMessage = encodeToolCallsWithResultsToJson([toolCall]);
      messages.push({
        role: "assistant",
        content: jsonMessage,
      });
    }
  }
  return messages;
};

/**
 * Helper function to build prompt messages (user and system) for OpenAI.
 */
function buildPromptMessagesOpenAi(prompt: {
  user: string;
  system?: string;
}): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  if (prompt.system) {
    messages.push({
      role: "system",
      content: prompt.system,
    });
  }
  if (prompt.user) {
    messages.push({
      role: "user",
      content: prompt.user,
    });
  }

  return messages;
}

/**
 * Helper function to build tool def messages for OpenAi.
 */
const buildToolDefMessagesOpenAi = (
  tools?: ToolDefinition[]
): ChatCompletionMessageParam[] => {
  const messages: ChatCompletionMessageParam[] = [];
  for (const tool of tools ?? []) {
    if (tool.type === "xml") {
      messages.push({
        role: "system",
        content: encodeToolToXml(tool),
      });
    }
    if (tool.type === "json") {
      messages.push({
        role: "system",
        content: encodeToolToJson(tool),
      });
    }
  }
  return messages;
};

const callOpenAi = async (
  openaiInstance: OpenAI,
  apiSettings: {
    model: string;
    max_tokens?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  const toolcallMessages = buildToolCallMessagesOpenAi(prompt, tools);
  const promptMessages = buildPromptMessagesOpenAi(prompt);
  const tooldefMessages = buildToolDefMessagesOpenAi(tools);

  const apiCallParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
    {
      model: apiSettings.model,
      max_tokens: apiSettings.max_tokens,
      messages: [...toolcallMessages, ...promptMessages, ...tooldefMessages],
      tools: tools
        ?.filter((t) => t.type === "native")
        ?.map(convertToOpenAiTool),
      tool_choice: "auto",
    };

  logger(
    "apiCallParams\n\n" + JSON.stringify(apiCallParams, null, 2),
    "prompt"
  );

  const response = await openaiInstance.chat.completions.create(apiCallParams, {
    signal,
  });

  const responseMessage = response.choices[0]?.message;
  const messageContent = responseMessage?.content?.trim() ?? "";
  const toolCalls = [
    ...(responseMessage?.tool_calls?.map(convertFromOpenAiToolCall) ?? []),
    ...decodeToolCalls(messageContent),
  ];

  logger("messageContent\n\n" + messageContent, "prompt");
  logger("toolCalls\n\n" + JSON.stringify(toolCalls, null, 2), "prompt");

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
interface GeminiSpecificSettings extends AiApiSettings {}

export function newGeminiApi(settings: GeminiSpecificSettings): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens } = settings;
  const genAI = new GoogleGenerativeAI(apiKey);

  return async (prompt, tools, options) =>
    callGemini(genAI, { model, max_tokens }, prompt, tools, options);
}

/**
 * Helper function to build prompt messages (user and system) for Gemini.
 */
function buildPromptMessagesGemini(prompt: {
  user: string;
  system?: string;
}): GenerateContentRequest["contents"] {
  const messages: GenerateContentRequest["contents"] = [];

  if (prompt.system) {
    messages.push({ role: "user", parts: [{ text: prompt.system }] });
  }
  if (prompt.user) {
    messages.push({ role: "user", parts: [{ text: prompt.user }] });
  }
  return messages;
}

/**
 * Helper function to build tool call messages for Gemini.
 */
const buildToolCallMessagesGemini = (prompt: {
  tools?: ToolCall[];
}): GenerateContentRequest["contents"] => {
  const messages: GenerateContentRequest["contents"] = [];
  if (prompt.tools) {
    messages.push(
      ...prompt.tools.map((toolCall) => ({
        role: "user",
        parts: [{ text: `${JSON.stringify(toolCall)}` }],
      }))
    );
  }
  return messages;
};

/**
 * Helper function to build tool def messages for Gemini.
 */
const buildToolDefMessagesGemini = (
  tools?: ToolDefinition[]
): GenerateContentRequest["contents"] => {
  const messages: GenerateContentRequest["contents"] = [];
  for (const tool of tools ?? []) {
    if (tool.type === "xml") {
      messages.push({
        role: "user",
        parts: [{ text: encodeToolToXml(tool) }],
      });
    }
    if (tool.type === "json") {
      messages.push({
        role: "user",
        parts: [{ text: encodeToolToJson(tool) }],
      });
    }
  }
  return messages;
};

const callGemini = async (
  genAI: GoogleGenerativeAI,
  apiSettings: {
    model: string;
    max_tokens?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};
  logger("Calling Gemini API...");

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  const geminiModel = genAI.getGenerativeModel({ model: apiSettings.model });

  const toolcallMessages = buildToolCallMessagesGemini(prompt);
  // Build prompt messages
  const promptMessages = buildPromptMessagesGemini(prompt);
  const tooldefMessages = buildToolDefMessagesGemini(tools);

  const geminiPrompt: GenerateContentRequest = {
    contents: [...toolcallMessages, ...promptMessages, ...tooldefMessages],
    tools: tools?.filter((t) => t.type === "native")?.map(convertToGeminiTool),
  };

  logger(JSON.stringify(geminiPrompt, null, 2), "prompt");

  const response = await geminiModel.generateContent(geminiPrompt, {
    signal: signal,
  });

  logger(JSON.stringify(response, null, 2), "prompt");

  let messageContent = "";
  let geminiToolCalls: FunctionCall[] = [];

  if (
    response.response.candidates &&
    response.response.candidates[0]?.content
  ) {
    for (const part of response.response.candidates[0].content.parts || []) {
      if ("text" in part) {
        messageContent += part.text;
      } else if ("functionCall" in part) {
        geminiToolCalls.push(part.functionCall!);
      }
    }
  }
  messageContent = messageContent.trim();

  const toolCalls = [
    ...convertFromGeminiToolCalls(geminiToolCalls),
    ...decodeToolCalls(messageContent),
  ];

  return { assistant: messageContent, tools: toolCalls };
};

function convertToGeminiTool(tool: ToolDefinition): any {
  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: "OBJECT",
      properties: tool.parameters.properties || {},
      required: tool.parameters.required || [],
    },
  };
}

function convertFromGeminiToolCalls(geminiToolCalls: any[]): ToolCall[] {
  if (!geminiToolCalls) {
    return [];
  }
  return geminiToolCalls.map((geminiToolCall) => ({
    name: geminiToolCall.name,
    parameters: geminiToolCall.args || {},
  }));
}

/* ----------------------- Groq Implementation ----------------------- */
interface GroqSpecificSettings extends AiApiSettings {}

export function newGroqApi(settings: GroqSpecificSettings): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens } = settings;
  const groq = new Groq({ apiKey: apiKey });

  return async (prompt, tools, options) => {
    return callGroq(groq, { model, max_tokens }, prompt, tools, options);
  };
}

/**
 * Helper function to build prompt messages (user and system) for Groq.
 */
function buildPromptMessagesGroq(prompt: {
  user: string;
  system?: string;
}): ChatCompletionCreateParamsNonStreaming["messages"] {
  const messages: ChatCompletionCreateParamsNonStreaming["messages"] = [];

  if (prompt.system) {
    messages.push({ content: prompt.system, role: "system" as const });
  }
  if (prompt.user) {
    messages.push({ content: prompt.user, role: "user" as const });
  }
  return messages;
}

/**
 * Helper function to build tool call messages for Groq.
 */
const buildToolMessagesGroq = (prompt: {
  tools?: ToolCall[];
}): ChatCompletionCreateParamsNonStreaming["messages"] => {
  const messages: ChatCompletionCreateParamsNonStreaming["messages"] = [];
  if (prompt.tools) {
    messages.push(
      ...prompt.tools.map((toolCall) => ({
        content: `${JSON.stringify(toolCall)}`,
        role: "assistant" as const,
      }))
    );
  }
  return messages;
};

const callGroq = async (
  groq: Groq,
  apiSettings: {
    model: string;
    max_tokens?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};

  logger("Calling Groq API...");

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  // Build prompt messages
  const promptMessages = buildPromptMessagesGroq(prompt);
  // Build tool messages
  const toolMessages = buildToolMessagesGroq(prompt);

  const messages: ChatCompletionCreateParamsNonStreaming["messages"] = [
    ...toolMessages,
    ...promptMessages,
  ];

  const groqPrompt: ChatCompletionCreateParamsNonStreaming = {
    model: apiSettings.model,
    max_tokens: apiSettings.max_tokens,
    messages,
    tools:
      tools && (tools[0].type || "native") === "native"
        ? tools.map(convertToGroqTool)
        : undefined,
  };

  const response = await groq.chat.completions.create(groqPrompt, {
    signal: signal,
  });
  const messageContent = response.choices[0]?.message?.content?.trim() ?? "";
  const toolCalls =
    tools && (tools[0].type || "native") === "native"
      ? convertFromGroqToolCalls(response.choices[0]?.message?.tool_calls)
      : decodeToolCalls(messageContent);
  return { assistant: messageContent, tools: toolCalls };
};

function convertToGroqTool(tool: ToolDefinition): any {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function convertFromGroqToolCalls(groqToolCalls: any): ToolCall[] {
  if (!groqToolCalls) {
    return [];
  }
  return groqToolCalls.map((groqToolCall: any) => ({
    name: groqToolCall.function.name,
    parameters: JSON.parse(groqToolCall.function.arguments),
  }));
}

/* ----------------------- Cerebras Implementation ----------------------- */
interface CerebrasSpecificSettings extends AiApiSettings {}

export function newCerebrasApi(
  settings: CerebrasSpecificSettings
): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens } = settings;
  const cerebrasApi = new CerebrasServiceClient({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  return async (prompt, tools, options) => {
    return callCerebras(
      cerebrasApi,
      { model, max_tokens },
      prompt,
      tools,
      options
    );
  };
}

/**
 * Helper function to build prompt messages (user and system) for Cerebras.
 */
function buildPromptMessagesCerebras(prompt: {
  user: string;
  system?: string;
}): CerebrasServiceClient.Chat.Completions.ChatCompletionCreateParamsNonStreaming["messages"] {
  const messages: CerebrasServiceClient.Chat.Completions.ChatCompletionCreateParamsNonStreaming["messages"] =
    [];

  if (prompt.system) {
    messages.push({ role: "system" as const, content: prompt.system });
  }
  if (prompt.user) {
    messages.push({ role: "user" as const, content: prompt.user });
  }
  return messages;
}

/**
 * Helper function to build tool call messages for Cerebras.
 */
const buildToolMessagesCerebras = (prompt: {
  tools?: ToolCall[];
}): CerebrasServiceClient.Chat.Completions.ChatCompletionCreateParamsNonStreaming["messages"] => {
  const messages: CerebrasServiceClient.Chat.Completions.ChatCompletionCreateParamsNonStreaming["messages"] =
    [];
  if (prompt.tools) {
    messages.push(
      ...prompt.tools.map((toolCall) => ({
        role: "assistant" as const,
        content: `${JSON.stringify(toolCall)}`,
      }))
    );
  }
  return messages;
};

const callCerebras = async (
  cerebrasApi: CerebrasServiceClient,
  apiSettings: {
    model: string;
    max_tokens?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};

  logger("Calling Cerebras API...");

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  // Build prompt messages
  const promptMessages = buildPromptMessagesCerebras(prompt);
  // Build tool messages
  const toolMessages = buildToolMessagesCerebras(prompt);

  const messages: CerebrasServiceClient.Chat.Completions.ChatCompletionCreateParamsNonStreaming["messages"] =
    [...toolMessages, ...promptMessages];

  const cerebrasPrompt: CerebrasServiceClient.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
    {
      model: apiSettings.model,
      max_tokens: apiSettings.max_tokens,
      messages,
      tool_choice:
        tools && (tools[0].type || "native") === "native" ? "auto" : "none",
      tools:
        tools && (tools[0].type || "native") === "native"
          ? tools.map(convertToCerebrasTool)
          : undefined,
    };

  const response: ChatCompletion.ChatCompletionResponse =
    (await cerebrasApi.chat.completions.create(cerebrasPrompt, {
      signal: signal,
    })) as any;
  const messageContent = response.choices?.[0]?.message?.content?.trim() ?? "";
  const toolCalls =
    tools && (tools[0].type || "native") === "native"
      ? convertFromCerebrasToolCalls(response.choices?.[0]?.message?.tool_calls)
      : decodeToolCalls(messageContent);
  return { assistant: messageContent, tools: toolCalls };
};

function convertToCerebrasTool(tool: ToolDefinition): any {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

function convertFromCerebrasToolCalls(cerebrasToolCalls: any): ToolCall[] {
  if (!cerebrasToolCalls) {
    return [];
  }
  return cerebrasToolCalls.map((cerebrasToolCall: any) => ({
    name: cerebrasToolCall.function.name,
    parameters: JSON.parse(cerebrasToolCall.function.arguments),
  }));
}

/* ----------------------- Claude Implementation ----------------------- */
interface ClaudeSpecificSettings extends AiApiSettings {}

export function newClaudeApi(settings: ClaudeSpecificSettings): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens } = settings;
  const anthropic = new Anthropic({ apiKey });

  return async (prompt, tools, options) => {
    return callClaude(anthropic, { model, max_tokens }, prompt, tools, options);
  };
}

/**
 * Helper function to build prompt messages (user and system) for Claude.
 */
function buildPromptMessagesClaude(prompt: {
  user: string;
  system?: string;
}): MessageParam[] {
  const messages: MessageParam[] = [];

  if (prompt.system) {
    messages.push({ role: "user" as const, content: prompt.system });
  }
  if (prompt.user) {
    messages.push({ role: "user" as const, content: prompt.user });
  }
  return messages;
}

/**
 * Helper function to build tool call messages for Claude.
 */
const buildToolMessagesClaude = (prompt: {
  tools?: ToolCall[];
}): MessageParam[] => {
  const messages: MessageParam[] = [];
  if (prompt.tools) {
    messages.push(
      ...prompt.tools.map((toolCall) => ({
        role: "user" as const, // In Claude API, tool call result is user message
        content: `${JSON.stringify(toolCall)}`,
      }))
    );
  }
  return messages;
};

const callClaude = async (
  anthropic: Anthropic,
  apiSettings: {
    model: string;
    max_tokens?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};
  logger("Calling Claude API...");

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  // Build prompt messages
  const promptMessages = buildPromptMessagesClaude(prompt);
  // Build tool messages
  const toolMessages = buildToolMessagesClaude(prompt);

  const claudePromptMessages: MessageParam[] = [
    ...toolMessages,
    ...promptMessages,
  ];

  const claudePrompt: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model: apiSettings.model,
    max_tokens: apiSettings.max_tokens ?? 8192,
    messages: claudePromptMessages,
    tools:
      tools && (tools[0].type || "native") === "native"
        ? tools.map(convertToClaudeTool)
        : undefined,
  };

  const response: Anthropic.Messages.Message = await anthropic.messages.create(
    claudePrompt,
    {
      signal: signal,
    }
  );
  let messageContent = "";
  let claudeToolCalls: any[] = [];

  if (response.content) {
    for (const block of response.content) {
      if (block.type === "text") {
        messageContent += block.text;
      } else if (block.type === "tool_use") {
        claudeToolCalls.push(block);
      }
    }
  }
  messageContent = messageContent.trim();

  const toolCalls =
    tools && (tools[0].type || "native") === "native"
      ? convertFromClaudeToolCalls(claudeToolCalls)
      : decodeToolCalls(messageContent);
  return { assistant: messageContent, tools: toolCalls };
};

function convertToClaudeTool(tool: ToolDefinition): any {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  };
}

function convertFromClaudeToolCalls(claudeToolCalls: any[]): ToolCall[] {
  if (!claudeToolCalls) {
    return [];
  }
  return claudeToolCalls.map((claudeToolCall) => ({
    name: claudeToolCall.name,
    parameters: claudeToolCall.input,
  }));
}
