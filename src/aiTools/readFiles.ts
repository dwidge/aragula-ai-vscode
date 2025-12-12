import { readFileSafe } from "@/file/readFileSafe";
import { ReadFileToolCall } from "@/readFileMap";
import { getWorkspaceAbsolutePath } from "@/vscode/getWorkspaceAbsolutePath";

export const readFiles = async (
  relativePaths: string[]
): Promise<ReadFileToolCall[]> =>
  Promise.all(
    relativePaths.map(async (k) => ({
      name: "readFile",
      parameters: { path: k },
      response: { content: await readFileSafe(getWorkspaceAbsolutePath(k)) },
      type: "backtick",
    }))
  );
