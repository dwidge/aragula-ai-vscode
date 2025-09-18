import { getGitAPI } from "./diff";
import { toRelativePath } from "./git/toRelativePath";
import { toUnixPath } from "./git/toUnixPath";

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
      `setCommitMessageE2: Repository not found for path: ${repoPath}. Available repositories: ${git.repositories
        .map((r) => r.rootUri.path)
        .join(", ")}`
    );
  }
}
