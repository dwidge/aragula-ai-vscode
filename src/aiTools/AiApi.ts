import Anthropic from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources/index.mjs";
import CerebrasServiceClient from "@cerebras/cerebras_cloud_sdk";
import { ChatCompletion } from "@cerebras/cerebras_cloud_sdk/resources/index.mjs";
import {
  FunctionCall,
  FunctionDeclaration,
  GenerateContentParameters,
  GoogleGenAI,
  PartUnion,
} from "@google/genai";
import Groq from "groq-sdk";
import { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions.mjs";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { Logger } from "../utils/Logger";
import { decodeToolCalls } from "./decodeToolCalls";
import {
  encodeToolCallsWithResultsToBacktick,
  encodeToolCallsWithResultsToJson,
  encodeToolCallsWithResultsToXml,
  encodeToolToBacktick,
  encodeToolToJson,
  encodeToolToXml,
} from "./encodeToolCalls";

/**
 * Valid JSON.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

/**
 * JSON Schema definition.
 */
export type JsonSchema = {
  type: "string" | "number" | "boolean" | "object" | "array" | "null";
  properties?: { [propertyName: string]: JsonSchema };
  items?: JsonSchema;
  description?: string;
  example?: string;
  enum?: string[];
  format?: string;
  required?: string[];
};

/**
 * Vendor-agnostic tool definition.
 * The `type` property indicates the tool call format:
 * - "native" (default) uses the vendor’s built-in tool calling,
 * - "xml", "json", or "backtick" uses manual encoding/decoding.
 */
export interface ToolDefinition {
  type?: "xml" | "json" | "native" | "backtick";
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
  type?: "xml" | "json" | "native" | "backtick";
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
    prompt: {
      user: string;
      system?: string;
      tools?: ToolCall[];
    },
    tools?: ToolDefinition[],
    options?: { logger?: Logger; signal?: AbortSignal }
  ): Promise<{ assistant: string; tools: ToolCall[] }>;
}

/**
 * Settings for the AI API caller.
 */
export interface AiApiSettings {
  name: string;
  apiKey: string;
  baseURL?: string;
  model: string;
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

interface OpenAiSpecificSettings extends AiApiSettings {}

export function newOpenAiApi(settings: OpenAiSpecificSettings): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens, temperature } = settings;

  return async (prompt, tools, options) =>
    callOpenAi(
      new OpenAI({ apiKey, baseURL }),
      { model, max_tokens, temperature },
      prompt,
      tools,
      options
    );
}

/**
 * Helper function to build tool call messages for OpenAI.
 */
const buildToolCallMessagesOpenAi = (prompt: {
  tools?: ToolCall[];
}): ChatCompletionMessageParam[] => {
  const messages: ChatCompletionMessageParam[] = [];

  for (const toolCall of prompt.tools ?? []) {
    const callType = toolCall.type || "native";

    if (callType === "native") {
      const toolCallId = `tool_call_${toolCall.name}_${Math.random()
        .toString(36)
        .substring(7)}`;

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
    } else if (callType === "backtick") {
      const backtickMessage = encodeToolCallsWithResultsToBacktick([toolCall]);
      messages.push({
        role: "assistant",
        content: backtickMessage,
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
    if (tool.type === "backtick") {
      messages.push({
        role: "system",
        content: encodeToolToBacktick(tool),
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
    temperature?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  const toolcallMessages = buildToolCallMessagesOpenAi(prompt);
  const promptMessages = buildPromptMessagesOpenAi(prompt);
  const tooldefMessages = buildToolDefMessagesOpenAi(tools);

  const openaiPrompt: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
    {
      model: apiSettings.model,
      max_tokens: apiSettings.max_tokens,
      temperature: apiSettings.temperature,
      messages: [...toolcallMessages, ...promptMessages, ...tooldefMessages],
      tools: tools
        ?.filter((t) => t.type === "native")
        ?.map(convertToOpenAiTool),
      tool_choice: "auto",
    };

  logger(
    "Calling OpenAi " +
      apiSettings.model +
      "\n\n" +
      JSON.stringify(openaiPrompt, null, 2),
    "prompt"
  );

  const response = await openaiInstance.chat.completions.create(openaiPrompt, {
    signal,
  });

  const responseMessage = response.choices[0]?.message;
  const messageContent = responseMessage?.content?.trim() ?? "";
  const toolCalls = [
    ...(responseMessage?.tool_calls?.map(convertFromOpenAiToolCall) ?? []),
    ...decodeToolCalls(messageContent, tools ?? []),
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

interface GeminiSpecificSettings extends AiApiSettings {}

export function newGeminiApi(settings: GeminiSpecificSettings): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens, temperature } = settings;
  const genAI = new GoogleGenAI({ apiKey });

  return async (prompt, tools, options) =>
    callGemini(
      genAI,
      { model, max_tokens, temperature },
      prompt,
      tools,
      options
    );
}

/**
 * Helper function to build prompt messages (user and system) for Gemini.
 */
function buildPromptMessagesGemini(prompt: {
  user: string;
  system?: string;
}): PartUnion[] {
  const messages: PartUnion[] = [];

  if (prompt.system) {
    messages.push({ text: prompt.system });
  }
  if (prompt.user) {
    messages.push({ text: prompt.user });
  }
  return messages;
}

/**
 * Helper function to build tool call messages for Gemini.
 */
const buildToolCallMessagesGemini = (prompt: {
  tools?: ToolCall[];
}): PartUnion[] => {
  const messages: PartUnion[] = [];

  for (const toolCall of prompt.tools ?? []) {
    const callType = toolCall.type || "native";

    if (callType === "native" && toolCall.response) {
      messages.push({
        functionCall: {
          name: toolCall.name,
          args: toolCall.parameters as any,
        },
      });
      messages.push({
        functionResponse: {
          name: toolCall.name,
          response: toolCall.response as any,
        },
      });
    } else if (callType === "xml") {
      const xmlMessage = encodeToolCallsWithResultsToXml([toolCall]);
      messages.push({ text: xmlMessage });
    } else if (callType === "json") {
      const jsonMessage = encodeToolCallsWithResultsToJson([toolCall]);
      messages.push({ text: jsonMessage });
    } else if (callType === "backtick") {
      const backtickMessage = encodeToolCallsWithResultsToBacktick([toolCall]);
      messages.push({ text: backtickMessage });
    }
  }

  return messages;
};

/**
 * Helper function to build tool def messages for Gemini.
 */
const buildToolDefMessagesGemini = (tools?: ToolDefinition[]): PartUnion[] => {
  const messages: PartUnion[] = [];
  for (const tool of tools ?? []) {
    if (tool.type === "xml") {
      messages.push({ text: encodeToolToXml(tool) });
    }
    if (tool.type === "json") {
      messages.push({ text: encodeToolToJson(tool) });
    }
    if (tool.type === "backtick") {
      messages.push({ text: encodeToolToBacktick(tool) });
    }
  }
  return messages;
};

const callGemini = async (
  genAI: GoogleGenAI,
  apiSettings: {
    model: string;
    max_tokens?: number;
    temperature?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  const toolcallMessages = buildToolCallMessagesGemini(prompt);

  const promptMessages = buildPromptMessagesGemini({ user: prompt.user });
  const tooldefMessages = buildToolDefMessagesGemini(tools);
  const toolsNative = tools
    ?.filter((t) => t.type === "native")
    ?.map(convertToGeminiTool);

  const geminiPrompt: GenerateContentParameters = {
    model: apiSettings.model,
    contents: [...toolcallMessages, ...promptMessages, ...tooldefMessages],
    config: {
      systemInstruction: prompt.system,
      maxOutputTokens: apiSettings.max_tokens,
      temperature: apiSettings.temperature,
      tools: toolsNative?.length
        ? [
            {
              functionDeclarations: toolsNative,
            },
          ]
        : undefined,
    },
  };

  logger(
    "Calling Gemini " +
      apiSettings.model +
      "\n\n" +
      JSON.stringify(geminiPrompt, null, 2),
    "prompt"
  );

  const response = await genAI.models.generateContent(geminiPrompt);

  logger(JSON.stringify(response, null, 2), "prompt");
  logger(
    "functionCalls\n" + JSON.stringify(response.functionCalls, null, 2),
    "prompt"
  );

  let messageContent = "";
  let geminiToolCalls: FunctionCall[] = [];

  if (response.candidates && response.candidates[0]?.content) {
    for (const part of response.candidates[0].content.parts || []) {
      if ("text" in part) {
        messageContent += part.text;
      } else if ("functionCall" in part) {
        geminiToolCalls.push(part.functionCall!);
      }
    }
  }
  messageContent = messageContent.trim();

  const toolCalls: ToolCall[] = [
    ...convertFromGeminiToolCalls(geminiToolCalls),
    ...decodeToolCalls(messageContent, tools ?? []),
  ];

  return { assistant: messageContent, tools: toolCalls };
};

function convertToGeminiTool(tool: ToolDefinition): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters as any,
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

interface GroqSpecificSettings extends AiApiSettings {}

export function newGroqApi(settings: GroqSpecificSettings): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens, temperature } = settings;
  const groq = new Groq({ apiKey: apiKey });

  return async (prompt, tools, options) => {
    return callGroq(
      groq,
      { model, max_tokens, temperature },
      prompt,
      tools,
      options
    );
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
    temperature?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  const promptMessages = buildPromptMessagesGroq(prompt);

  const toolMessages = buildToolMessagesGroq(prompt);

  const messages: ChatCompletionCreateParamsNonStreaming["messages"] = [
    ...toolMessages,
    ...promptMessages,
  ];

  const groqPrompt: ChatCompletionCreateParamsNonStreaming = {
    model: apiSettings.model,
    max_tokens: apiSettings.max_tokens,
    temperature: apiSettings.temperature,
    messages,
    tools:
      tools && (tools[0].type || "native") === "native"
        ? tools.map(convertToGroqTool)
        : undefined,
  };

  logger(
    "Calling Groq " +
      apiSettings.model +
      "\n\n" +
      JSON.stringify(groqPrompt, null, 2),
    "prompt"
  );

  const response = await groq.chat.completions.create(groqPrompt, {
    signal: signal,
  });
  const messageContent = response.choices[0]?.message?.content?.trim() ?? "";
  const toolCalls =
    tools && (tools[0].type || "native") === "native"
      ? convertFromGroqToolCalls(response.choices[0]?.message?.tool_calls)
      : decodeToolCalls(messageContent, tools ?? []);
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

interface CerebrasSpecificSettings extends AiApiSettings {}

export function newCerebrasApi(
  settings: CerebrasSpecificSettings
): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens, temperature } = settings;
  const cerebrasApi = new CerebrasServiceClient({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  return async (prompt, tools, options) => {
    return callCerebras(
      cerebrasApi,
      { model, max_tokens, temperature },
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
    temperature?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  const promptMessages = buildPromptMessagesCerebras(prompt);

  const toolMessages = buildToolMessagesCerebras(prompt);

  const messages: CerebrasServiceClient.Chat.Completions.ChatCompletionCreateParamsNonStreaming["messages"] =
    [...toolMessages, ...promptMessages];

  const cerebrasPrompt: CerebrasServiceClient.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
    {
      model: apiSettings.model,
      max_tokens: apiSettings.max_tokens,
      temperature: apiSettings.temperature,
      messages,
      tool_choice:
        tools && (tools[0].type || "native") === "native" ? "auto" : "none",
      tools:
        tools && (tools[0].type || "native") === "native"
          ? tools.map(convertToCerebrasTool)
          : undefined,
    };

  logger(
    "Calling Cerebras " +
      apiSettings.model +
      "\n\n" +
      JSON.stringify(cerebrasPrompt, null, 2),
    "prompt"
  );

  const response: ChatCompletion.ChatCompletionResponse =
    (await cerebrasApi.chat.completions.create(cerebrasPrompt, {
      signal: signal,
    })) as any;
  const messageContent = response.choices?.[0]?.message?.content?.trim() ?? "";
  const toolCalls =
    tools && (tools[0].type || "native") === "native"
      ? convertFromCerebrasToolCalls(response.choices?.[0]?.message?.tool_calls)
      : decodeToolCalls(messageContent, tools ?? []);
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

interface ClaudeSpecificSettings extends AiApiSettings {}

export function newClaudeApi(settings: ClaudeSpecificSettings): AiApiCaller {
  const { apiKey, baseURL, model, max_tokens, temperature } = settings;
  const anthropic = new Anthropic({ apiKey });

  return async (prompt, tools, options) => {
    return callClaude(
      anthropic,
      { model, max_tokens, temperature },
      prompt,
      tools,
      options
    );
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
        role: "user" as const,
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
    temperature?: number;
  },
  prompt: { user: string; system?: string; tools?: ToolCall[] },
  tools?: ToolDefinition[],
  options?: { signal?: AbortSignal; logger?: Logger }
): Promise<{ assistant: string; tools: ToolCall[] }> => {
  const { signal, logger = () => {} } = options || {};

  if (signal?.aborted) {
    throw new Error("AbortError: Request aborted by user.");
  }

  const promptMessages = buildPromptMessagesClaude(prompt);

  const toolMessages = buildToolMessagesClaude(prompt);

  const claudePromptMessages: MessageParam[] = [
    ...toolMessages,
    ...promptMessages,
  ];

  const claudePrompt: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model: apiSettings.model,
    max_tokens: apiSettings.max_tokens ?? 8192,
    temperature: apiSettings.temperature,
    messages: claudePromptMessages,
    tools:
      tools && (tools[0].type || "native") === "native"
        ? tools.map(convertToClaudeTool)
        : undefined,
  };

  logger(
    "Calling Claude " +
      apiSettings.model +
      "\n\n" +
      JSON.stringify(claudePrompt, null, 2),
    "prompt"
  );

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
      : decodeToolCalls(messageContent, tools ?? []);
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

/**
 * Helper function to format system and user prompts for manual input.
 */
function buildPromptMessagesManual(prompt: {
  user: string;
  system?: string;
}): string[] {
  const parts: string[] = [];
  if (prompt.system) {
    parts.push(`# System Prompt\n${prompt.system}`);
  }
  if (prompt.user) {
    parts.push(`# User Prompt\n${prompt.user}`);
  }
  return parts;
}

/**
 * Helper function to format tool call results (like file contents) for manual input.
 */
function buildToolCallMessagesManual(prompt: { tools?: ToolCall[] }): string[] {
  const parts: string[] = [];
  if (prompt.tools && prompt.tools.length > 0) {
    parts.push("# Tool Calls");
    // Todo: This seems to only support readFile tool calls in an adhoc way. We need to fix this to support any tool call and any type, except native which just fallbacks to json. It can reuse existing tool call encoders.
    for (const toolCall of prompt.tools) {
      if (
        toolCall.name === "readFile" &&
        toolCall.response !== undefined &&
        typeof toolCall.parameters === "object" &&
        toolCall.parameters !== null &&
        "path" in toolCall.parameters &&
        typeof (toolCall.parameters as { path?: string }).path === "string"
      ) {
        const filePath = (toolCall.parameters as { path: string }).path;
        parts.push(`// ./${filePath}\n${toolCall.response}`);
      }
    }
  }
  return parts;
}

/**
 * Helper function to format available tool definitions for manual input.
 */
function buildToolDefMessagesManual(tools?: ToolDefinition[]): string[] {
  const parts: string[] = [];
  if (tools && tools.length > 0) {
    parts.push("# Available Tools");
    for (const toolDef of tools) {
      const toolType = toolDef.type || "native";
      if (toolType === "xml") {
        parts.push(encodeToolToXml(toolDef));
      } else if (toolType === "json" || toolType === "native") {
        parts.push(encodeToolToJson(toolDef));
      } else if (toolType === "backtick") {
        parts.push(encodeToolToBacktick(toolDef));
      }
    }
  }
  return parts;
}

function newManualApi(settings: AiApiSettings): AiApiCaller {
  return async (prompt, tools, options) => {
    const logger = options?.logger || (() => {});

    const promptMessages = buildPromptMessagesManual(prompt);
    const toolcallMessages = buildToolCallMessagesManual(prompt);
    const tooldefMessages = buildToolDefMessagesManual(tools);

    const fullPrompt = [
      ...promptMessages,
      ...toolcallMessages,
      ...tooldefMessages,
    ].join("\n\n");

    logger(fullPrompt, "prompt");
    logger(
      "Copy the prompt above into your AI GUI, and paste the response below.",
      "info"
    );

    // Todo: We need to await the pasted reponse here. This await takes a long time, which is fine. When user pastes and clicks continue button, this promise resolves and we can parse the response here and return the assistant message and any tool calls.
    // So we need some mechanism/message handler that can keep track of the promise with an id, and resolve it when the chatview sends a message from the button.
    // Make it elegant with a helper async function that encapsulates this complexity.
    // Make an elegant resuable helper that takes a TaskLogger, createUserPrompter, so we can await a generic string feedback from user given a message string. It resolves to a string if user types/pastes into the textarea and clicks a button, or throws if user cancels.

    return {
      assistant: "",
      tools: [],
    };
  };
}

export const newAiApi = (providerSetting: AiApiSettings): AiApiCaller => {
  switch (providerSetting.vendor) {
    case "openai":
      return newOpenAiApi(providerSetting);
    case "gemini":
      return newGeminiApi(providerSetting);
    case "groq":
      return newGroqApi(providerSetting);
    case "cerebras":
      return newCerebrasApi(providerSetting);
    case "claude":
      return newClaudeApi(providerSetting);
    case "manual":
      return newManualApi(providerSetting);

    default:
      throw new Error(`Vendor "${providerSetting.vendor}" not supported.`);
  }
};
