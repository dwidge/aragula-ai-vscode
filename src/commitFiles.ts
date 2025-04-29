import { getGitAPI } from "./diff";
import { getWorkspaceRoot } from "./getWorkspaceAbsolutePath";

export async function commitFiles(message: string, fileNames: string[]) {
  const workspaceFolder = getWorkspaceRoot();
  const gitApi = await getGitAPI();
  const repository = gitApi?.getRepository(workspaceFolder);
  if (!repository) {
    throw new Error(`Repository not found: ${workspaceFolder}`);
  }
  try {
    await repository.add(fileNames);
    await repository.commit(message);
  } catch (e) {
    throw new Error(`Could not commit: ${e}`);
  }
}
