import { ContentProcessor } from "./ContentProcessor";
import { PrivacyPair } from "./PrivacyPair";

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
