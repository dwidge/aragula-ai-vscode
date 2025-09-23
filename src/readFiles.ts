import { ToolCall } from "@/ai-api/types/ToolCall";
import { readFileSafe } from "./aiTools/file";
import { getWorkspaceAbsolutePath } from "./getWorkspaceAbsolutePath";

export const readFiles = async (relativePaths: string[]): Promise<ToolCall[]> =>
  Promise.all(
    relativePaths.map(async (k) => ({
      name: "readFile",
      parameters: { path: k },
      response: { content: await readFileSafe(getWorkspaceAbsolutePath(k)) },
      type: "backtick",
    }))
  );
