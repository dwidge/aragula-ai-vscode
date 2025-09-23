import { JsonSchema } from "@/json/JsonSchema";

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
