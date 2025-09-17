import { getGitAPI } from "../diff";

export const getRepoRoots = async () =>
  (await getGitAPI()).repositories.map((repo) => repo.rootUri);
