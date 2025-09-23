import * as vscode from "vscode";

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
  inputBox: { value: string };
  state: { workingTreeChanges: Diff[] };
  diff(path?: string, other?: string): Promise<string>;
  diffWithHEAD(path?: string): Promise<string>;
  diffIndexWithHEAD(): Promise<Diff[]>;
  add(paths: string | string[]): Promise<void>;
  commit(message: string): Promise<void>;
}
