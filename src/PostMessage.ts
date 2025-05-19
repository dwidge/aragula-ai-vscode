import * as vscode from "vscode";

export type PostMessage = (message: unknown) => Promise<void>;

export const newPostMessage =
  (panel: vscode.WebviewPanel): PostMessage =>
  async (message: unknown) => {
    await panel.webview.postMessage(message);
  };
