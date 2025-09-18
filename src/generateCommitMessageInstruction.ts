import * as vscode from "vscode";
import { getCommitMessages } from "./diff";
import { getRepoRoots } from "./git/getRepoRoots";
import { isDirContainingSomeFile } from "./git/isDirContainingSomeFile";
import { toRelativePath } from "./git/toRelativePath";

export async function getCommitMessageInstruction({
  useConventionalCommits,
  filePaths,
}: {
  useConventionalCommits: boolean;
  filePaths: string[];
}): Promise<string> {
  const allRepoRoots = await getRepoRoots();
  const relativeRepoRoots = allRepoRoots.map(toRelativePath);
  const relativeFilePaths = filePaths.map(toRelativePath);
  const matchingRoots = relativeRepoRoots.filter(
    isDirContainingSomeFile(relativeFilePaths)
  );

  if (matchingRoots.length === 0) {
    return "";
  }

  const instruction = [
    "When you provide code changes, you must also provide a commit message.",
    "The commit message must be in a markdown block with the language set to 'commit'.",
  ];

  if (matchingRoots.length > 1) {
    instruction.push(
      "For each repo you modify, you must give a separate commit message block. Inside each commit block, the first line must be a comment containing the relative path to the repo root."
    );
    instruction.push("The available repository root paths are:");
    instruction.push(...Array.from(matchingRoots).map((p) => `- ${p}`));
    instruction.push("Example:");
    instruction.push("```commit");
    instruction.push("// ./packages/my-lib");
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
    const repo = Array.from(matchingRoots)[0];
    const previousMessages = await getCommitMessages(vscode.Uri.file(repo));
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
