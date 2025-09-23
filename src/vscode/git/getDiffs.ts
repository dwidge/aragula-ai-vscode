import * as vscode from "vscode";
import { getGitAPI } from "./getGitAPI";

/**
 * Gets the diffs for a given repository and formats the output separately for each file.
 *
 * @param {vscode.Uri} rootUri The root URI of the repository.
 * @returns {Promise<string>} A promise that resolves to the combined formatted diff string.
 * @throws {Error} If the Git extension is not found, the repository is not found, or there are no staged changes.
 */
export async function getDiffs(rootUri: vscode.Uri): Promise<string> {
  const git = await getGitAPI();
  if (!git) {
    throw new Error("Git extension not found.");
  }

  const repository = git.getRepository(rootUri);
  if (!repository) {
    throw new Error(`Repository not found: ${rootUri}`);
  }

  try {
    const diffIndex = await repository.diffIndexWithHEAD();

    if (!diffIndex || diffIndex.length === 0) {
      throw new Error(`No staged changes found for repository: ${rootUri}.`);
    }

    const formattedDiffsArray: string[] = [];
    for (const diffItem of diffIndex) {
      try {
        const fileDiff = await repository.diff(diffItem.uri.fsPath, "--cached");
        if (fileDiff) {
          const relativeFilePath = vscode.workspace.asRelativePath(
            diffItem.uri,
            true
          );
          formattedDiffsArray.push(`// ./${relativeFilePath}\n${fileDiff}`);
        }
      } catch (error: unknown) {
        throw new Error(
          `Error getting diff for ${diffItem.uri.fsPath}: ${error}`
        );
      }
    }

    return formattedDiffsArray.join("\n\n");
  } catch (error: unknown) {
    throw new Error(`Failed to get staged diffs: ${error}`);
  }
}
