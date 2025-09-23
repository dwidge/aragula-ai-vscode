import { ToolDefinition } from "@/ai-api/types/ToolDefinition";
import { readDirTool, readFileTool, writeFileTool } from "./aiTools/tools";

export const availableToolsDefinitions: ToolDefinition[] = [
  readDirTool,
  readFileTool,
  writeFileTool,
];
export const availableToolNames = availableToolsDefinitions.map(
  (tool) => tool.name
);
export const availableVendors: string[] = [
  "openai",
  "gemini",
  "groq",
  "cerebras",
  "claude",
  "manual",
];
