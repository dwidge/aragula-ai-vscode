import { Json } from "@/json/Json";

/**
 * Vendor-agnostic tool call.
 */
export interface ToolCall {
  type?: "xml" | "json" | "native" | "backtick";
  name: string;
  parameters?: Json;
  response?: Json;
}
