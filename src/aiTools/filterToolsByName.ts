import { ToolDefinition } from "@/ai-api/types/ToolDefinition";

export const filterToolsByName = (
  tools: ToolDefinition[],
  names: string[]
): ToolDefinition[] => tools.filter((t) => names.includes(t.name));
