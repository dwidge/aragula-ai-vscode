export type ToolContext = { promptAi: PromptAi };

export type ToolFunction = (c: ToolContext, args: any) => any;

export type ToolSchema = {
  type: "object" | "string" | "number" | "array";
  description?: string;
  properties?: Record<string, ToolSchema>;
  items?: ToolSchema;
};

export type ToolDef = {
  type?: "xml" | "json";
  name: string;
  description: string;
  function: ToolFunction;
  parameters: ToolSchema;
};

export type PromptAi = (
  c: ToolContext,
  args: {
    user: string;
    system?: string;
    tools?: ToolDef[];
  }
) => Promise<string>;
