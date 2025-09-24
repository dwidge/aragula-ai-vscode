import { TextAi } from "../ai-api/types/TextAi";
import { generateCommitMessage } from "../generateCommitMessage";
import { TaskLogger } from "../utils/Logger";
import { getWorkspaceRoot } from "../vscode/getWorkspaceAbsolutePath";
import { commitStaged } from "../vscode/git/commitStaged";
import { stageFiles } from "../vscode/git/stageFiles";

export const handleCommitFiles = (
  textAi: TextAi,
  fileNames: string[],
  log: TaskLogger
) =>
  log(
    {
      summary: `Commit files`,
      detail: `Files: ${fileNames.join(", ")}`,
      type: "task",
    },
    async (progress, log, signal) => {
      if (!fileNames || fileNames.length === 0) {
        throw new Error("No files selected to commit.");
      }

      const workspaceRoot = getWorkspaceRoot();

      log({ summary: "Stage files" });
      await stageFiles(fileNames);

      log({ summary: "Generate commit message" });
      const commitMessage = await log({}, (progress, log, signal) =>
        generateCommitMessage(workspaceRoot.fsPath, textAi, {
          signal,
          progress: (message) =>
            log({
              summary: message,
            }),
        })
      );

      log({ summary: "Commit staged files" });
      await commitStaged(commitMessage);

      log({
        summary: `Successfully committed ${fileNames.length} file(s).`,
        detail: `Commit message: "${commitMessage}"`,
        type: "success",
      });
    }
  );
