import * as assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
import * as fs from "fs";
import * as myExtension from "../extension";

suite("Selection", () => {
  test("should read selected file content correctly", async () => {
    const uri = vscode.Uri.file(__filename);
    const readFileStub = sinon.stub(fs, "readFileSync").returns("file content");
    const files = [uri];
    myExtension.activate({ subscriptions: [] } as any);
    await vscode.commands.executeCommand("aragula-ai.askAI", uri);
    assert.strictEqual(readFileStub.called, true);
    readFileStub.restore();
  });
});
