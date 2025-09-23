import { ToolCall } from "@/ai-api/types/ToolCall";
import { StringProcessor, processJsonValue } from "./processJsonValue";
import { PrivacyPair } from "./settingsObject";

type ContentProcessor = (content: string, settings: PrivacyPair[]) => string;

export const applyPrivacyReplacements: ContentProcessor = (
  content: string,
  privacySettings: PrivacyPair[]
): string => {
  let modifiedContent = content;
  for (const pair of privacySettings) {
    const escapedSearch = pair.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    modifiedContent = modifiedContent.replace(
      new RegExp(escapedSearch, "g"),
      pair.replace
    );
  }
  return modifiedContent;
};

export const reversePrivacyReplacements: ContentProcessor = (
  content: string,
  privacySettings: PrivacyPair[]
): string => {
  let modifiedContent = content;
  for (let i = privacySettings.length - 1; i >= 0; i--) {
    const pair = privacySettings[i];
    const escapedReplace = pair.replace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    modifiedContent = modifiedContent.replace(
      new RegExp(escapedReplace, "g"),
      pair.search
    );
  }
  return modifiedContent;
};

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
