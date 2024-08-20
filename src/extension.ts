import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { sendToOpenAI } from "./openai";
import chatview from "./chatview";
import { extractFilesFromAIResponse } from "@dwidge/llm-file-diff";

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "aragula-ai" active');

  const disposable = vscode.commands.registerCommand(
    "aragula-ai.askAI",
    async (single: vscode.Uri, multi: vscode.Uri[]) => {
      const openFiles = await readOpenFiles(multi);
      await openChatWindow(context, openFiles);
    }
  );

  context.subscriptions.push(disposable);
}

async function readOpenFiles(
  uris: vscode.Uri[]
): Promise<{ [key: string]: string }> {
  const openFiles: { [key: string]: string } = {};

  for (const uri of uris) {
    if (!uri.fsPath) {
      continue;
    }

    try {
      const content = await fs.readFile(uri.fsPath, "utf8");
      const relativePath = vscode.workspace.asRelativePath(uri);
      openFiles[relativePath] = content;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to read file: ${uri.fsPath}`);
    }
  }

  return openFiles;
}

async function openChatWindow(
  context: vscode.ExtensionContext,
  openedFiles: { [key: string]: string }
) {
  const panel = vscode.window.createWebviewPanel(
    "askAIChat",
    "Ask AI",
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = chatview;

  const message = generateInitialMessage(openedFiles);
  if (message) {
    panel.webview.postMessage({ command: "receiveMessage", text: message });
  }

  panel.webview.onDidReceiveMessage(
    async (message) => handleMessage(context, panel, message, openedFiles),
    undefined,
    context.subscriptions
  );
}

function generateInitialMessage(openedFiles: {
  [key: string]: string;
}): string {
  return "using:\n" + Object.keys(openedFiles).join("\n");
}

async function handleMessage(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  message: any,
  openedFiles: { [key: string]: string }
) {
  if (message.command === "sendMessage") {
    const apiKey = getApiKey();
    if (!apiKey) {
      return;
    }

    const prompt = createPrompt(openedFiles, message.text);
    const response = await sendToOpenAI(prompt, apiKey);
    panel.webview.postMessage({ command: "receiveMessage", text: response });

    await applyChanges(response, openedFiles);
  }
}

function getApiKey(): string | null {
  const apiKey = vscode.workspace.getConfiguration("aragula-ai").get("apiKey");
  if (typeof apiKey !== "string") {
    throw new Error("API key is not configured properly.");
  }
  return apiKey;
}

function createPrompt(
  openedFiles: { [key: string]: string },
  userText: string
): string {
  const fileContent = Object.entries(openedFiles)
    .map(([file, content]) => `${file}\n\`\`\`\n${content}\n\`\`\`\n`)
    .join("\n\n");
  return fileContent + userText;
}

async function applyChanges(
  response: string,
  openedFiles: { [key: string]: string }
) {
  const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!root) {
    return;
  }

  const extractedFiles = extractFilesFromAIResponse(response, openedFiles);

  for (const [filePath, content] of Object.entries(extractedFiles)) {
    await saveFile(root, filePath, content);
  }
}

async function saveFile(root: string, filePath: string, content: string) {
  try {
    const absolutePath = path.join(root, filePath);
    await fs.writeFile(absolutePath, content);
    vscode.window.showInformationMessage(`File saved: ${filePath}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to save file: ${filePath}`);
  }
}

export function deactivate() {}
