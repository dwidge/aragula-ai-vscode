import { exec } from "child_process";
import * as os from "os";
import { promisify } from "util";
import * as vscode from "vscode";

interface GitExtension {
  getAPI(version: 1): API;
}

interface API {
  repositories: Repository[];
  getRepository(uri: vscode.Uri): Repository | null;
}

type Diff = {
  originalUri: vscode.Uri;
  renameUri: vscode.Uri;
  uri: vscode.Uri;
  status: number;
};

interface Repository {
  rootUri: vscode.Uri;
  state: { workingTreeChanges: Diff[] };
  diff(path?: string, other?: string): Promise<string>;
  diffWithHEAD(path?: string): Promise<string>;
  diffIndexWithHEAD(): Promise<Diff[]>;
}

/**
 * Gets the Git API.
 *
 * @returns {API | undefined} The Git API, or undefined if not found.
 */
async function getGitAPI(): Promise<API | undefined> {
  const gitExtension =
    vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!gitExtension) {
    vscode.window.showErrorMessage(
      "Git extension not found. Please ensure Git extension is installed and enabled."
    );
    return undefined;
  }
  if (!gitExtension.isActive) {
    await gitExtension.activate();
  }
  return gitExtension.exports.getAPI(1);
}

/**
 * Gets the diffs for a given repository and formats the output separately for each file.
 *
 * @param {vscode.Uri} rootUri The root URI of the repository.
 * @returns {Promise<string>} A promise that resolves to the combined formatted diff string.
 */
export async function getDiffs(rootUri: vscode.Uri): Promise<string> {
  const git = await getGitAPI();
  if (!git) {
    return "";
  }

  const repository = git.getRepository(rootUri);
  if (!repository) {
    vscode.window.showErrorMessage(`Repository not found: ${rootUri}`);
    return "";
  }

  try {
    const diffIndex = await repository.diffIndexWithHEAD();

    if (!diffIndex || diffIndex.length === 0) {
      vscode.window.showWarningMessage(
        `No staged changes found for repository: ${rootUri}.`
      );
      return "";
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
      } catch (error) {
        console.error(
          `Error getting diff for ${diffItem.uri.fsPath}: ${error}`
        );
      }
    }

    return formattedDiffsArray.join("\n\n");
  } catch (error) {
    vscode.window.showErrorMessage(`Error getting diff: ${error}`);
    return "";
  }
}

const execAsync = promisify(exec);

/**
 * Gets the most recent commit messages of the repository.
 *
 * @param {vscode.Uri} rootUri The root URI of the repository.
 * @param {number} limit The max number of commits.
 * @returns {Promise<string>} A promise that resolves to a string containing the commit messages.
 */
export async function getCommitMessages(
  rootUri: vscode.Uri,
  limit: number = 5
): Promise<string[]> {
  try {
    const shellPath =
      os.platform() === "win32"
        ? "C:\\Program Files\\Git\\bin\\bash.exe"
        : undefined;

    const options = {
      cwd: rootUri.fsPath,
      shell: shellPath,
    };

    const { stdout, stderr } = await execAsync(
      `git log --pretty=format:"%h %s" -n ${limit}`,
      options
    );
    if (stderr) {
      console.error("Error running git log:", stderr);
      return [];
    }

    const commitLines = stdout.trim().split("\n");
    const formattedMessages: string[] = [];

    for (const line of commitLines) {
      if (line) {
        const parts = line.split(" ");
        const shortHash = parts[0];
        const message = parts.slice(1).join(" ");
        formattedMessages.push(`commit_${shortHash}\n${message}`);
      }
    }

    return formattedMessages;
  } catch (error) {
    console.error("Failed to execute git log:", error);
    return [];
  }
}
