import { getGitAPI } from "../diff";
import {
  getWorkspaceAbsolutePath,
  getWorkspaceRoot,
} from "../getWorkspaceAbsolutePath";

/**
 * Stages the specified files in the Git repository.
 * @param relativeFileNames - An array of file paths relative to the workspace root.
 * @throws Error if the repository is not found or staging fails.
 */
export async function stageFiles(relativeFileNames: string[]): Promise<void> {
  const workspaceFolder = getWorkspaceRoot();
  const gitApi = await getGitAPI();
  const repository = gitApi?.getRepository(workspaceFolder);
  if (!repository) {
    throw new Error(`Repository not found: ${workspaceFolder}`);
  }
  try {
    await repository.add(relativeFileNames.map(getWorkspaceAbsolutePath));
  } catch (e) {
    throw new Error(`Could not stage files: ${e}`);
  }
}

/**
 * Commits the currently staged files with the given message.
 * @param message - The commit message.
 * @throws Error if the repository is not found or committing fails.
 */
export async function commitStaged(message: string): Promise<void> {
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
