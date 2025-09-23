import { TaskLogger } from "./utils/Logger";
import { getGitAPI } from "./vscode/git/getGitAPI";
import { setCommitMessage } from "./vscode/git/setCommitMessage";

export async function runTestSetCommitMessage(logTask: TaskLogger) {
  await logTask(
    { summary: "Simulating Set Commit Message", type: "task" },
    async (setLog, logTask) => {
      await logTask({ summary: "Starting set commit message task..." });
      try {
        const gitApi = await getGitAPI();
        if (gitApi.repositories.length === 0) {
          throw new Error("No git repositories found in the workspace.");
        }
        const repo =
          gitApi.repositories[
            Math.floor(Math.random() * gitApi.repositories.length)
          ];
        const repoPath = repo.rootUri.fsPath;
        await logTask({
          summary: `Found repo: ${repoPath}`,
        });
        const testMessage = `test: Commit ${new Date().toISOString()}`;
        await setCommitMessage(repoPath, testMessage);
        await logTask({
          summary: `Set commit message to: "${testMessage}"`,
        });
      } catch (error: any) {
        await logTask({
          summary: `Error setting commit message: ${error.message}`,
        });
      }
    }
  );
}
