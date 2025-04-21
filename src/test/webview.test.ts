import * as assert from "assert";
import * as vscode from "vscode";

suite("Webview", () => {
  test("should open webview panel when aragula-ai.askAI command is executed", async () => {
    await vscode.commands.executeCommand("aragula-ai.askAI");

    const webviewPanel = vscode.window.activeTextEditor?.viewColumn;
    assert.ok(webviewPanel, "Webview panel should be opened");

    const panels = vscode.window.visibleTextEditors;
    const aiChatPanel = panels.find(
      (panel) => panel.document.fileName === "Ask AI"
    );
    assert.ok(aiChatPanel, "AI Chat panel should be opened");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const webviewHtml = aiChatPanel?.document.getText();
    assert.ok(
      webviewHtml.includes('textarea id="userInput"'),
      "Webview should contain user input area"
    );
    assert.ok(
      webviewHtml.includes('id="response"'),
      "Webview should contain response area"
    );

    // aiChatPanel?.webview.postMessage({
    //   command: "sendMessage",
    //   text: "Test message",
    // });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const responseDiv = aiChatPanel?.document.getText();
    assert.ok(
      responseDiv.includes("Test message"),
      "Webview should display the sent message"
    );
  });
});
