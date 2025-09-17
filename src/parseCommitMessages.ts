const commitRegex = /```commit\n(?:\/\/\s*(.*)\n)?([\s\S]*?)\n```/g;

export function parseCommitMessages(
  responseText: string
): { repoPath: string; message: string }[] {
  const commitMessages: { repoPath: string; message: string }[] = [];
  let match;
  while ((match = commitRegex.exec(responseText)) !== null) {
    const repoPath = match[1]?.trim() || "";
    const message = match[2].trim();
    if (message) {
      commitMessages.push({ repoPath, message });
    }
  }
  return commitMessages;
}

export function omitCommitMessages(responseText: string) {
  return responseText.replace(commitRegex, "").trim();
}
