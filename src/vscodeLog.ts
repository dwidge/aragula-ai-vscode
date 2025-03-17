import * as vscode from "vscode";
import { Webview } from "vscode";

export const vscodeLog = (webview: Webview, message: string, tabId: string) => {
  // vscode.window.showInformationMessage(message);
  webview.postMessage({ command: "logMessage", text: message, tabId: tabId });
};
