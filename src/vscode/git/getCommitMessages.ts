import { exec } from "child_process";
import * as os from "os";
import { promisify } from "util";
import * as vscode from "vscode";

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
    ).catch((e) => {
      if (`${e}`.includes("does not have any commits yet")) {
        return { stderr: "No commits", stdout: "" };
      }
      throw e;
    });

    if (stderr === "No commits") {
      return [];
    }
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
