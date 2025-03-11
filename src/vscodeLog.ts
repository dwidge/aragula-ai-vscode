import * as vscode from "vscode";

export const vscodeLog = (message: string) => {
  vscode.window.showInformationMessage(message);
};
