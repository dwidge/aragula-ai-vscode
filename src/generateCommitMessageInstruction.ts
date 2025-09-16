import * as vscode from "vscode";
import { getCommitMessages, GitExtension, Repository } from "./diff";

export async function getCommitMessageInstruction({
  useConventionalCommits,
  filePaths,
}: {
  useConventionalCommits: boolean;
  filePaths: string[];
}): Promise<string> {
  const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!gitExtension) {
    return ""; // No Git extension, so no commit message
  }
  await gitExtension.activate();
  const git = gitExtension.exports.getAPI(1);
  if (git.repositories.length === 0) {
    return ""; // No repositories, so no commit message
  }

  const relevantRepos = new Set<Repository>();
  for (const filePath of filePaths) {
    const repo = git.getRepository(vscode.Uri.file(filePath));
    if (repo) {
      relevantRepos.add(repo);
    }
  }

  if (relevantRepos.size === 0) {
    return "";
  }

  const instruction = [
    "When you provide code changes, you must also provide a commit message.",
    "The commit message must be in a markdown block with the language set to 'commit'.",
  ];

  if (relevantRepos.size > 1) {
    instruction.push(
      "Inside the commit block, the first line must be a comment containing the relative path to the repository root from the workspace root."
    );
    instruction.push("The relevant repository paths are:");
    instruction.push(...Array.from(relevantRepos).map((repo) => `- ${vscode.workspace.asRelativePath(repo.rootUri)}`));
    instruction.push("Example:");
    instruction.push("```commit");
    instruction.push("// packages/my-lib");
    instruction.push("feat: Add a new feature");
    instruction.push("");
    instruction.push("- Add a new feature to the project.");
    instruction.push("- Also fix a bug.");
    instruction.push("```");
  } else {
    instruction.push("Example:");
    instruction.push("```commit");
    instruction.push("feat: Add a new feature");
    instruction.push("");
    instruction.push("- Add a new feature to the project.");
    instruction.push("- Also fix a bug.");
    instruction.push("```");
  }

  if (useConventionalCommits) {
    instruction.push(
      "You must use the Conventional Commits specification for the commit message."
    );
  } else {
    const repo = Array.from(relevantRepos)[0];
    const previousMessages = await getCommitMessages(repo.rootUri);
    if (previousMessages.length > 0) {
      const systemPrevious = [
        "It must follow the same style as the previous commit messages.",
        "Use the same word choice and style as the previous commit messages: Do they use commas? full stops? hyphens? single line or multiline?",
        "Use same case (lower/upper/camel/snake/capital/title) as the previous commit messages: Do the messages start with upper or lower case, or a symbol?",
        "Use same prefix (or none) as previous commits: Do they say 'Refactor:' or 'fix -' before the message, or do they just put the message?",
      ].join("\n");
      const userPrevious = [
        "Previous commit messages:",
        ...previousMessages.map((m) => "```" + m + "```"),
      ].join("\n");
      instruction.push(systemPrevious);
      instruction.push(userPrevious);
    }
  }

  return instruction.join("\n");
}