import * as assert from "assert";
import * as vscode from "vscode";

suite("Commands", () => {
  test("should register aragula-ai.askAI command", async () => {
    const command = vscode.commands.getCommands(true).then((commands) => {
      return commands.find((cmd) => cmd === "aragula-ai.askAI");
    });
    assert.ok(command, "Command aragula-ai.askAI should be registered");
  });
});
