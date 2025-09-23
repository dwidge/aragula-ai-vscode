import { ContentProcessor } from "./ContentProcessor";
import { PrivacyPair } from "./PrivacyPair";

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
