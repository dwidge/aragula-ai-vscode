import { toRelativePath } from "../../git/toRelativePath";
import { toUnixPath } from "../../git/toUnixPath";
import { getGitAPI } from "./getGitAPI";

export async function setCommitMessage(
  repoPath: string,
  message: string
): Promise<void> {
  const targetPath = toUnixPath(repoPath);

  const git = await getGitAPI();

  const targetRepo = git.repositories.find((repo) => {
    const repoRoot = toRelativePath(repo.rootUri.path);
    return repoRoot.endsWith(targetPath);
  });

  if (targetRepo) {
    targetRepo.inputBox.value = message;
  } else {
    throw new Error(
      `setCommitMessageE1: Repository not found\nPath:\n  ${repoPath}\nAvailable repositories:\n${git.repositories
        .map((r) => "  " + r.rootUri.path)
        .join("\n")}`
    );
  }
}
