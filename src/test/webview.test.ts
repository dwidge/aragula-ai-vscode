import * as assert from "assert";
import * as vscode from "vscode";

suite("Webview", () => {
  test("should open webview panel when aragula-ai.askAI command is executed", async () => {
    // Register a command to open the webview
    await vscode.commands.executeCommand("aragula-ai.askAI");

    // Check if a webview panel is opened
    const webviewPanel = vscode.window.activeTextEditor?.viewColumn;
    assert.ok(webviewPanel, "Webview panel should be opened");

    // Ensure the panel has the correct title
    const panels = vscode.window.visibleTextEditors;
    const aiChatPanel = panels.find(
      (panel) => panel.document.fileName === "Ask AI"
    );
    assert.ok(aiChatPanel, "AI Chat panel should be opened");

    // Wait for the webview content to be initialized
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the HTML content of the webview
    const webviewHtml = aiChatPanel?.document.getText();
    assert.ok(
      webviewHtml.includes('textarea id="userInput"'),
      "Webview should contain user input area"
    );
    assert.ok(
      webviewHtml.includes('id="response"'),
      "Webview should contain response area"
    );

    // Simulate sending a message to the webview
    // aiChatPanel?.webview.postMessage({
    //   command: "sendMessage",
    //   text: "Test message",
    // });

    // Wait for the message to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the response
    const responseDiv = aiChatPanel?.document.getText();
    assert.ok(
      responseDiv.includes("Test message"),
      "Webview should display the sent message"
    );
  });
});
