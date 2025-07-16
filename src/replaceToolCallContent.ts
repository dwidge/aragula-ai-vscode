import { ToolCall } from "./aiTools/AiApi";
import { PrivacyPair } from "./settingsObject";

export function applyPrivacyReplacements(
  content: string,
  privacySettings: PrivacyPair[]
): string {
  let modifiedContent = content;
  for (const pair of privacySettings) {
    const escapedSearch = pair.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    modifiedContent = modifiedContent.replace(
      new RegExp(escapedSearch, "g"),
      pair.replace
    );
  }
  return modifiedContent;
}

export function reversePrivacyReplacements(
  content: string,
  privacySettings: PrivacyPair[]
): string {
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
}

export const replaceToolCallContent =
  (privacySettings: PrivacyPair[]) =>
  (toolcall: ToolCall): ToolCall => {
    if (
      toolcall.name === "readFile" &&
      typeof toolcall.parameters === "object" &&
      toolcall.parameters !== null &&
      "content" in toolcall.parameters &&
      typeof toolcall.parameters.path === "string" &&
      typeof toolcall.response === "object" &&
      toolcall.response !== null &&
      "content" in toolcall.response &&
      typeof toolcall.response.content === "string"
    ) {
      return {
        ...toolcall,
        parameters: {
          ...toolcall.parameters,
          path: applyPrivacyReplacements(
            toolcall.parameters.path,
            privacySettings
          ),
        },
        response: {
          ...toolcall.response,
          content: applyPrivacyReplacements(
            toolcall.response.content,
            privacySettings
          ),
        },
      };
    }
    return toolcall;
  };

export const restoreToolCallContent =
  (privacySettings: PrivacyPair[]) =>
  (toolcall: ToolCall): ToolCall => {
    if (
      toolcall.name === "readFile" &&
      typeof toolcall.parameters === "object" &&
      toolcall.parameters !== null &&
      "content" in toolcall.parameters &&
      typeof toolcall.parameters.path === "string" &&
      typeof toolcall.response === "object" &&
      toolcall.response !== null &&
      "content" in toolcall.response &&
      typeof toolcall.response.content === "string"
    ) {
      return {
        ...toolcall,
        parameters: {
          ...toolcall.parameters,
          path: reversePrivacyReplacements(
            toolcall.parameters.path,
            privacySettings
          ),
        },
        response: {
          ...toolcall.response,
          content: reversePrivacyReplacements(
            toolcall.response.content,
            privacySettings
          ),
        },
      };
    }
    return toolcall;
  };
