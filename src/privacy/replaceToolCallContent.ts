import { ToolCall } from "@/ai-api/types/ToolCall";
import { StringProcessor, processJsonValue } from "@/json/processJsonValue";
import { PrivacyPair } from "./PrivacyPair";
import { applyPrivacyReplacements } from "./applyPrivacyReplacements";

export const replaceToolCallContent =
  (privacySettings: PrivacyPair[]) =>
  (toolcall: ToolCall): ToolCall => {
    const applyStringProcessor: StringProcessor = (content: string) =>
      applyPrivacyReplacements(content, privacySettings);

    const newParameters =
      toolcall.parameters === undefined
        ? undefined
        : processJsonValue(toolcall.parameters, applyStringProcessor);

    const newResponse =
      toolcall.response === undefined
        ? undefined
        : processJsonValue(toolcall.response, applyStringProcessor);

    return {
      ...toolcall,
      parameters: newParameters,
      response: newResponse,
    };
  };
