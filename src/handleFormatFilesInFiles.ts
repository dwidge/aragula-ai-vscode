import { Logger } from "./aiTools/AiApi";
import { formatCodeWithVscode } from "./aiTools/formatCodeWithVscode";
import { getWorkspaceAbsolutePath } from "./getWorkspaceAbsolutePath";

export async function handleFormatFilesInFiles(
  filePaths: string[],
  log: Logger
) {
  log(`Formatting files...\n\n${filePaths}`, "info");
  for (const filePath of filePaths) {
    try {
      await formatCodeWithVscode(getWorkspaceAbsolutePath(filePath));
      log(`Formatted file: ${filePath}`, "info");
    } catch (error: any) {
      log(`Error formatting file ${filePath}: ${error.message}`, "error");
    }
  }
}
