import * as vscode from "vscode";
import { getRepoRoots } from "./git/getRepoRoots";
import { isDirContainingSomeFile } from "./git/isDirContainingSomeFile";
import { toRelativePath } from "./git/toRelativePath";
import { getCommitMessages } from "./vscode/git/getCommitMessages";

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
      "For each repo you modify, you must give a separate commit message block. You can only give one commit message block per repo. Inside each commit block, the first line must be a comment containing the relative path to the repo root."
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
    instruction.push(
      "The optional scope can be a noun describing the area of the code affected (e.g., 'api', 'cli', 'ui') or a sub package name in monorepos, and a specific component or function name (if this commit is limited to that specific item), and these can be combined with a forward slash."
    );
    instruction.push("Example: feat(api/MyComponent): Improve performance");
    instruction.push(
      "Always capitalize the first letter of the subject, and do not end it with a full stop."
    );
    instruction.push("Example: feat(api): Add a new endpoint to the API");
    instruction.push("Not: feat(api): add a new endpoint to the API.");
    instruction.push(
      "If the item name is already in the scope, do not repeat it unnecessarily in the subject."
    );
    instruction.push("Example: feat(MyComponent): Improve performance");
    instruction.push(
      "Not: feat(MyComponent): Improve performance of MyComponent"
    );
    instruction.push("The body should include a summary list of changes made.");
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
