import { removeComments } from "@/task/removeComments";
import { Logger } from "@/utils/Logger";

export async function handleRemoveCommentsInFiles(
  filePaths: string[],
  log: Logger
) {
  log(`Removing comments...\n\n${filePaths}`, "info");
  for (const filePath of filePaths) {
    try {
      const changed = await removeComments(filePath);
      if (changed) {
        log(`Removed comments and formatted ${filePath}`, "info");
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
