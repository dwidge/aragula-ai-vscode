import { toRelativePath } from "@/git/toRelativePath";
import { GitAPI } from "./getGitAPI";

export const getGitRepoMap = (git: GitAPI) =>
  new Map(
    git.repositories.map((repo) => [toRelativePath(repo.rootUri.path), repo])
  );
