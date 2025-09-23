import { getGitAPI } from "@/vscode/git/getGitAPI";

export const getRepoRoots = async () =>
  (await getGitAPI()).repositories.map((repo) => repo.rootUri);
