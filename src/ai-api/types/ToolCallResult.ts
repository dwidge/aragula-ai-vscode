import { Json } from "@dwidge/xml-parser";

export type ToolCallResult = {
  name: string;
  parameters?: Json;
  response?: Json;
  error?: string;
};
