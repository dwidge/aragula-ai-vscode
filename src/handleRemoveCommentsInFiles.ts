import { Logger } from "./aiTools/AiApi";
import { readFileSafe, writeFileSafe } from "./aiTools/file";
import { formatCodeWithVscode } from "./aiTools/formatCodeWithVscode";
import {
  removeJsJsxComments,
  keepOnlyJsDocAndRemoveEmptyLinesReplacer,
} from "./aiTools/removeJsJsxComments";
import { getWorkspaceAbsolutePath } from "./getWorkspaceAbsolutePath";

export async function handleRemoveCommentsInFiles(
  filePaths: string[],
  log: Logger
) {
  log(`Removing comments...\n\n${filePaths}`, "info");
  for (const filePath of filePaths) {
    const fullPath = getWorkspaceAbsolutePath(filePath);
    try {
      const originalContent = await readFileSafe(fullPath);

      const cleanedContent = removeJsJsxComments(
        originalContent,
        keepOnlyJsDocAndRemoveEmptyLinesReplacer
      );
      if (originalContent !== cleanedContent) {
        await writeFileSafe(fullPath, cleanedContent);
        try {
          await formatCodeWithVscode(fullPath);
          log(`Removed comments and formatted ${filePath}`, "info");
        } catch (error: any) {
          await writeFileSafe(fullPath, originalContent);
          throw new Error(
            `Failed to format ${filePath} after removing comments: ${error.message}`
          );
        }
      } else {
        log(`No comments to remove in ${filePath}`, "info");
      }
    } catch (error: any) {
      log(
        `Error processing file ${filePath} for comment removal: ${error.message}`,
        "error"
      );
    }
  }
}
