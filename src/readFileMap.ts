import { ToolCall } from "./ai-api/types/ToolCall";

export const readFileMap = (fileMap: Record<string, string>): ToolCall[] =>
  Object.entries(fileMap).map(([k, c]) => ({
    name: "readFile",
    parameters: { path: k },
    response: { content: c },
    type: "backtick",
  }));
