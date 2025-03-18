import { ToolDefinition } from "./AiApi";
import { ToolDef } from "./ToolTypes";

export const filterToolsByName = (
  tools: ToolDefinition[],
  names: string[]
): ToolDefinition[] => tools.filter((t) => names.includes(t.name));
