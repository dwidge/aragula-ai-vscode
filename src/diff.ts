import { exec } from "child_process";
import * as os from "os";
import { promisify } from "util";
import * as vscode from "vscode";
import { Logger } from "./utils/Logger";

export interface GitExtension {
  getAPI(version: 1): API;
}

export interface API {
  repositories: Repository[];
  getRepository(uri: vscode.Uri): Repository | null;
}

type Diff = {
  originalUri: vscode.Uri;
  renameUri: vscode.Uri;
  uri: vscode.Uri;
  status: number;
};

export interface Repository {
  rootUri: vscode.Uri;
  inputBox: { value: string };
  state: { workingTreeChanges: Diff[] };
  diff(path?: string, other?: string): Promise<string>;
  diffWithHEAD(path?: string): Promise<string>;
  diffIndexWithHEAD(): Promise<Diff[]>;
  add(paths: string | string[]): Promise<void>;
  commit(message: string): Promise<void>;
}

/**
 * Gets the Git API.
 *
 * @returns {API} The Git API, or throws if not found.
 */
export async function getGitAPI(): Promise<API> {
  const gitExtension =
    vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!gitExtension) {
    throw new Error(
      "Git extension not found. Please ensure Git extension is installed and enabled."
    );
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

const execAsync = promisify(exec);

/**
 * Gets the most recent commit messages of the repository.
 *
 * @param {vscode.Uri} rootUri The root URI of the repository.
 * @param {number} limit The max number of commits.
 * @returns {Promise<string[]>} A promise that resolves to an array of formatted commit message strings.
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
      encoding: "utf8",
    };

    const { stdout, stderr } = await execAsync(
      `git log --pretty=format:"%h %s" -n ${limit}`,
      options
    );

    if (stderr) {
      throw new Error(`Error running git log: ${stderr}`);
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
  } catch (error: unknown) {
    throw new Error(`Failed to get commit messages: ${error}`);
  }
}

export async function getDiffContext(log: Logger) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const gitApi = await getGitAPI();
    const repository: Repository | null | undefined = gitApi?.getRepository(
      workspaceFolder.uri
    );
    if (repository) {
      try {
        const diff = await getDiffs(workspaceFolder.uri);
        if (diff) {
          return "\n\n```diff\n" + diff + "\n```\n";
        }
      } catch (diffError: any) {
        log(`Failed to get git diff: ${diffError.message}`, "warning");
      }
    } else {
      log(
        "Git repository not found in workspace. Skipping diff context.",
        "warning"
      );
    }
  } else {
    log("No workspace folder found. Skipping diff context.", "warning");
  }
}
