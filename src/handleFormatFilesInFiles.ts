import { formatCodeWithVscode } from "@/vscode/formatCodeWithVscode";
import { getWorkspaceAbsolutePath } from "./getWorkspaceAbsolutePath";
import { Logger } from "./utils/Logger";

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
