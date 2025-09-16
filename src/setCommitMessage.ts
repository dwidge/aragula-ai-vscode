import * as vscode from "vscode";
import { GitExtension } from "./diff";

export async function setCommitMessage(
  repoPath: string,
  message: string
): Promise<void> {
  const gitExtension =
    vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!gitExtension) {
    console.warn("Git extension not found.");
    return;
  }
  const git = gitExtension.exports.getAPI(1);

  const targetRepo = git.repositories.find((repo) => {
    const repoRoot = repo.rootUri.path.toLowerCase();
    const targetPath = `/${repoPath.toLowerCase()}`;
    return repoRoot.endsWith(targetPath);
  });

  if (targetRepo) {
    targetRepo.inputBox.value = message;
  } else {
    console.warn(`Repository not found for path: ${repoPath}`);
  }
}
