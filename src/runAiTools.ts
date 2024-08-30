import { OpenAI } from "openai";
import * as fs from "fs/promises";
import { z } from "zod";
import * as vscode from "vscode";
import { workspaceRelativePathToAbsolutePath } from "./workspaceRelativePathToAbsolutePath";
import { getConfig } from "./config";
import { runAiChat } from "./runAiChat";
import { runAndGetShellOutput } from "./runAndGetShellOutput";

export const runAiTools = (
  openai: OpenAI,
  prompt: string,
  systemPrompt: string
) =>
  openai.beta.chat.completions
    .runTools({
      ...getConfig(),
      messages: [
        { content: systemPrompt, role: "system" },
        { content: prompt, role: "user" },
      ],
      tools: [
        {
          type: "function",
          function: {
            strict: true,
            function: readDir,
            parse: JSON.parse,
            parameters: {
              type: "object",
              properties: {
                directory: { type: "string" },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            strict: true,
            function: readFile,
            parse: JSON.parse,
            parameters: {
              type: "object",
              properties: {
                filePath: { type: "string" },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            strict: true,
            function: writeFile,
            parse: JSON.parse,
            parameters: {
              type: "object",
              properties: {
                filePath: { type: "string" },
                content: { type: "string" },
              },
            },
          },
        },
        {
          type: "function",
          function: {
            strict: true,
            function: (args: { command: string; workingDir?: string }) =>
              runShellCommand(args, openai),
            parse: JSON.parse,
            parameters: {
              type: "object",
              properties: {
                command: { type: "string" },
                workingDir: { type: "string" },
              },
            },
          },
        },
      ],
    })
    .on("message", (message) => console.log(message))
    .finalContent();

async function readDir({
  directory = ".",
}: {
  directory: string;
}): Promise<string[] | { error: string }> {
  try {
    const absolutePath = workspaceRelativePathToAbsolutePath(directory);
    const files = await fs.readdir(absolutePath);
    vscode.window.showInformationMessage(`readDir: ${directory}`);
    return files;
  } catch (error) {
    return handleFileError(error, `readDir: ${directory}`);
  }
}

async function readFile({
  filePath,
}: {
  filePath: string;
}): Promise<string | { error: string }> {
  try {
    const absolutePath = workspaceRelativePathToAbsolutePath(filePath);
    const content = await fs.readFile(absolutePath, "utf8");
    vscode.window.showInformationMessage(`readFile: ${filePath}`);
    return content;
  } catch (error) {
    return handleFileError(error, `readFile: ${filePath}`);
  }
}

async function writeFile(a: {
  filePath: string;
  content: string;
}): Promise<void | { error: string }> {
  const { filePath, content } = z
    .object({ filePath: z.string(), content: z.string() })
    .parse(a);

  try {
    const absolutePath = workspaceRelativePathToAbsolutePath(filePath);
    await fs.writeFile(absolutePath, content);
    vscode.window.showInformationMessage(`writeFile: ${filePath}`);
  } catch (error) {
    return handleFileError(error, `writeFile: ${filePath}`);
  }
}

async function runShellCommand(
  {
    command,
    workingDir = ".",
  }: {
    command: string;
    workingDir?: string;
  },
  openai: OpenAI
): Promise<string | { error: string }> {
  const workspacePath = workspaceRelativePathToAbsolutePath(workingDir);
  const fullCommand = `cd '${workspacePath}'; ${command}`;

  const userResponse = await vscode.window.showInformationMessage(
    `Do you want to run the following command?\n${workingDir}$ ${command}`,
    { modal: true },
    "Yes",
    "No"
  );

  if (userResponse === "Yes") {
    const rawOutput = await runAndGetShellOutput(fullCommand);
    const output =
      (await runAiChat(
        openai,
        rawOutput,
        "cleanup and output only the main message(s)"
      )) ?? rawOutput;
    const userResponseOutput = await vscode.window.showInformationMessage(
      `Output for:\n${command}\n###\n${output}\n###\n${rawOutput}`,
      { modal: true },
      "Yes",
      "No"
    );
    if (userResponseOutput === "Yes") {
      return output || "Command executed with no output.";
    } else {
      return { error: "User declined" };
    }
  }

  return { error: "User declined" };
}

const handleFileError = (
  error: unknown,
  context: string
): { error: string } => {
  vscode.window.showErrorMessage(context);
  return { error: error instanceof Error ? error.message : "Unknown error" };
};
