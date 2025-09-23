import { Logger } from "@/utils/Logger";
import * as vscode from "vscode";
import { getDiffs } from "./getDiffs";
import { getGitAPI } from "./getGitAPI";

export async function getDiffContext(log: Logger) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const gitApi = await getGitAPI();
    const repository = gitApi?.getRepository(workspaceFolder.uri);
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
