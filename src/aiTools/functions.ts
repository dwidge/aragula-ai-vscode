import { runAndGetShellOutput } from "@/shell/runAndGetShellOutput";
import { workspaceRelativePathToAbsolutePath } from "@/vscode/workspaceRelativePathToAbsolutePath";
import * as fs from "fs/promises";
import * as Path from "path";
import * as vscode from "vscode";
import { z } from "zod";
import { ToolContext } from "./ToolTypes";

/**
 * Reads the directory at the given path.
 */
export async function readDir(
  c: ToolContext,
  args: { path: string }
): Promise<string[] | { error: string }> {
  const { path } = z.object({ path: z.string() }).parse(args);
  try {
    const absolutePath = workspaceRelativePathToAbsolutePath(path);
    const files = await fs.readdir(absolutePath);

    return files;
  } catch (error) {
    return handleFileError(error, `readDir: ${path}`);
  }
}

/**
 * Reads the file content at the given path.
 */
export async function readFile(
  c: ToolContext,
  args: { path: string }
): Promise<string | { error: string }> {
  const { path } = z.object({ path: z.string() }).parse(args);
  try {
    const absolutePath = workspaceRelativePathToAbsolutePath(path);
    const content = await fs.readFile(absolutePath, "utf8");

    return content;
  } catch (error) {
    return handleFileError(error, `readFile: ${path}`);
  }
}

/**
 * Writes content to a file at the given path.
 */
export async function writeFile(
  c: ToolContext,
  args: { path: string; content: string }
): Promise<{ success: string } | { error: string }> {
  const { path, content } = z
    .object({ path: z.string(), content: z.string() })
    .parse(args);
  try {
    const absolutePath = workspaceRelativePathToAbsolutePath(path);
    const dir = Path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(absolutePath, content);

    return { success: `${content.length} bytes written to ${path}` };
  } catch (error) {
    return handleFileError(error, `writeFile: ${path}`);
  }
}

/**
 * Runs a shell command in the specified working directory.
 */
export async function runShellCommand(
  c: ToolContext,
  { command = "", workingDir = "." }: { command?: string; workingDir?: string }
): Promise<string | { error: string }> {
  const workspacePath = workspaceRelativePathToAbsolutePath(workingDir);
  const fullCommand = `cd '${workspacePath}'; ${command}`;

  const userResponse = await askUser(c, {
    message: `Do you want to run the following command?\n${workingDir}$ ${command}`,
    options: ["Yes", "No"],
  });

  if (userResponse === "Yes") {
    const rawOutput = await runAndGetShellOutput(fullCommand);
    const output = Object.hasOwn(c, "promptAi")
      ? await c.promptAi(c, {
          user: rawOutput,
          system: "cleanup and output only the main message(s)",
        })
      : rawOutput;
    const userResponseOutput = await askUser(c, {
      message: `Output for:\n${command}\n###\n${output}\n###\n${rawOutput}`,
      options: ["Yes", "No"],
    });
    if (userResponseOutput === "Yes") {
      return output || "Command executed with no output.";
    } else {
      return { error: "User declined" };
    }
  }

  return {
    error:
      "User declined, try another command or just tell the user what to do",
  };
}

const handleFileError = (
  error: unknown,
  context: string
): { error: string } => {
  vscode.window.showErrorMessage(context);
  return { error: error instanceof Error ? error.message : "Unknown error" };
};

/**
 * Prompts the user with a modal message and options.
 */
export const askUser = async (
  c: ToolContext,
  {
    message = "",
    options = ["Yes", "No"],
  }: { message?: string; options?: string[] }
): Promise<string> =>
  (await vscode.window.showInformationMessage(
    message,
    { modal: true },
    ...options
  )) ?? "";
