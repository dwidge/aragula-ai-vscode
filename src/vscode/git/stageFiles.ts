import {
  getWorkspaceAbsolutePath,
  getWorkspaceRoot,
} from "../getWorkspaceAbsolutePath";
import { getGitAPI } from "./getGitAPI";

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
