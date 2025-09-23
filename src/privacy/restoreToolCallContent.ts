import { ToolCall } from "@/ai-api/types/ToolCall";
import { StringProcessor, processJsonValue } from "@/json/processJsonValue";
import { PrivacyPair } from "./PrivacyPair";
import { reversePrivacyReplacements } from "./reversePrivacyReplacements";

export const restoreToolCallContent =
  (privacySettings: PrivacyPair[]) =>
  (toolcall: ToolCall): ToolCall => {
    const reverseStringProcessor: StringProcessor = (content: string) =>
      reversePrivacyReplacements(content, privacySettings);

    const newParameters =
      toolcall.parameters === undefined
        ? undefined
        : processJsonValue(toolcall.parameters, reverseStringProcessor);

    const newResponse =
      toolcall.response === undefined
        ? undefined
        : processJsonValue(toolcall.response, reverseStringProcessor);

    return {
      ...toolcall,
      parameters: newParameters,
      response: newResponse,
    };
  };
