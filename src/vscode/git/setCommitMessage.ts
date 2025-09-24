import { toRelativePath } from "@/git/toRelativePath";
import { getGitAPI } from "./getGitAPI";
import { getGitRepoMap } from "./getGitRepoMap";

export async function setCommitMessage(
  repoPath: string,
  message: string
): Promise<void> {
  const repoMap = getGitRepoMap(await getGitAPI());
  const targetKey = toRelativePath(repoPath);
  const targetRepo = repoMap.get(targetKey);

  if (targetRepo) {
    targetRepo.inputBox.value = message;
  } else {
    throw new Error(
      `setCommitMessageE1: Repository not found\nPath:\n  ${repoPath}\nAvailable repositories:\n${[
        ...repoMap.keys(),
      ]
        .map((p) => "  " + p)
        .join("\n")}`
    );
  }
}
