import { PrivacyPair } from "./PrivacyPair";

export type ContentProcessor = (
  content: string,
  settings: PrivacyPair[]
) => string;
