import { ToolName } from "./tools";
import { ToolDef } from "./ToolTypes";

export const filterToolsByName = (
  tools: ToolDef[],
  names: string[]
): ToolDef[] =>
  Object.entries(tools)
    .filter(([k]) => names.includes(k as ToolName))
    .map(([k, v]) => v);
