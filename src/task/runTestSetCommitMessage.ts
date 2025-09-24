import { TaskRunner } from "@/utils/Logger";
import { getGitAPI } from "@/vscode/git/getGitAPI";
import { setCommitMessage } from "@/vscode/git/setCommitMessage";

export const runTestSetCommitMessage: TaskRunner<void> = async (
  parentLog,
  log
) => {
  await log({ summary: "Starting set commit message task..." });

  const gitApi = await getGitAPI();
  if (gitApi.repositories.length === 0) {
    throw new Error("No git repositories found in the workspace.");
  }
  const repo =
    gitApi.repositories[Math.floor(Math.random() * gitApi.repositories.length)];
  const repoPath = repo.rootUri.fsPath;
  await log({
    summary: `Found repo: ${repoPath}`,
  });
  const testMessage = `test: Commit ${new Date().toISOString()}`;
  await setCommitMessage(repoPath, testMessage);
  await log({
    summary: `Set commit message to: "${testMessage}"`,
  });
};
