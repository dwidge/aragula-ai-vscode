import { getWorkspaceRoot } from "../getWorkspaceAbsolutePath";
import { getGitAPI } from "./getGitAPI";

/**
 * Commits the currently staged files with the given message.
 * @param message - The commit message.
 * @throws Error if the repository is not found or committing fails.
 */
export async function commitStaged(message: string): Promise<void> {
  if (!message.trim()) {
    throw new Error(`No commit message`);
  }
  const workspaceFolder = getWorkspaceRoot();
  const gitApi = await getGitAPI();
  const repository = gitApi?.getRepository(workspaceFolder);
  if (!repository) {
    throw new Error(`Repository not found: ${workspaceFolder}`);
  }
  try {
    await repository.commit(message);
  } catch (e) {
    throw new Error(`Could not commit staged files: ${e}`);
  }
}
