import * as vscode from "vscode";
import { GitExtension } from "./diff";

export async function setCommitMessage(
  repoPath: string,
  message: string
): Promise<void> {
  const targetPath = `${repoPath.toLowerCase().replaceAll("\\", "/")}`;

  const gitExtension =
    vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!gitExtension) {
    console.warn("Git extension not found.");
    throw new Error("setCommitMessageE1: Git extension not found.");
  }
  const git = gitExtension.exports.getAPI(1);

  const targetRepo = git.repositories.find((repo) => {
    const repoRoot = repo.rootUri.path.toLowerCase();
    return repoRoot.endsWith(targetPath);
  });

  if (targetRepo) {
    targetRepo.inputBox.value = message;
  } else {
    throw new Error(
      `setCommitMessageE2: Repository not found for path: ${repoPath}. Available repositories: ${git.repositories
        .map((r) => r.rootUri.path)
        .join(", ")}`
    );
  }
}
