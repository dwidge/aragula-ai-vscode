import * as vscode from "vscode";
import { useTextAi } from "../ai-api/useTextAi";
import { generateCommitMessage } from "../generateCommitMessage";
import { GetterSetter } from "../settingsObject";
import { withProgress } from "../vscode/withProgress";

export const generateCommitMessageCommand = async (
  globalSettings: GetterSetter,
  sourceControl: vscode.SourceControl
) => {
  const repoPath = sourceControl.rootUri?.fsPath;
  if (!repoPath) {
    throw new Error("No rootUri found for the source control");
  }

  const textAi = useTextAi(globalSettings);

  const commitMessage = await withProgress(
    vscode.ProgressLocation.SourceControl,
    (signal, progress) =>
      generateCommitMessage(repoPath, textAi, {
        signal,
        progress,
      })
  );
  if (!commitMessage) {
    throw new Error("Generated commit message was empty");
  }

  sourceControl.inputBox.value = commitMessage;
};
