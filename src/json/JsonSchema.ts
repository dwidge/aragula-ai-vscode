/**
 * JSON Schema definition.
 */
export type JsonSchema = {
  type: "string" | "number" | "boolean" | "object" | "array" | "null";
  properties?: { [propertyName: string]: JsonSchema };
  items?: JsonSchema;
  description?: string;
  example?: string;
  enum?: string[];
  format?: string;
  required?: string[];
};
