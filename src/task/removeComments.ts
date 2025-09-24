import {
  keepOnlyJsDocAndRemoveEmptyLinesReplacer,
  removeJsJsxComments,
} from "@/comments/removeJsJsxComments";
import { readFileSafe } from "@/file/readFileSafe";
import { writeFileSafe } from "@/file/writeFileSafe";
import { formatCodeWithVscode } from "@/vscode/formatCodeWithVscode";
import { getWorkspaceAbsolutePath } from "@/vscode/getWorkspaceAbsolutePath";

export async function removeComments(filePath: string): Promise<boolean> {
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
        return true;
      } catch (cause) {
        await writeFileSafe(fullPath, originalContent);
        throw new Error(
          `removeCommentsE1: Failed to format ${filePath} after removing comments: ${cause}`
        );
      }
    } else {
      return false;
    }
  } catch (cause) {
    throw new Error(
      `removeCommentsE2: Error processing file ${filePath} for comment removal: ${cause}`,
      { cause }
    );
  }
}
