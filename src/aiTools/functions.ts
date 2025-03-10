import * as fs from "fs/promises";
import * as vscode from "vscode";
import { z } from "zod";
import { runAndGetShellOutput } from "../runAndGetShellOutput";
import { workspaceRelativePathToAbsolutePath } from "../workspaceRelativePathToAbsolutePath";
import { ToolContext } from "./ToolTypes";
import { allToolNames, allTools, ToolName } from "./tools";
import { parseXml, XmlItem } from "@dwidge/xml-parser";

export const askAiBasic = (
  c: ToolContext,
  {
    user,
    system,
  }: {
    user: string;
    system: string;
  }
) => c.promptAi(c, { user, system });

export const askAiWithTools = async (
  c: ToolContext,
  {
    user,
    system,
    toolNames = allToolNames,
  }: {
    user: string;
    system: string;
    toolNames?: ToolName[];
  }
) => {
  const r = await c.promptAi(c, {
    user,
    system,
    tools: Object.entries(allTools)
      .filter(([k]) => toolNames.includes(k as ToolName))
      .map(([k, v]) => v),
  });

  // example r=
  `<writeFile>
<path>bb.txt</path>
<content>
Rays of dawn break through the night,  
Whispers of dreams take graceful flight.  
The world awakens, colors arise,  
Painting the canvas of sprawling skies.  

Branches sway with the morning breeze,  
Nature dances, joyful and free.  
Petals unfurl, vibrant and bright,  
A symphony of life in the soft daylight.  

Stars fade gently in the morning hue,  
As the sun spreads warmth, fresh and new.  
Each moment a treasure, a gift to behold,  
The poetry of life, forever told.  
</content>
</writeFile>`;

  console.log("askAiWithTools1: output", r);
  console.log("askAiWithTools2: need to run the tools here");

  // Parse the response to identify tools and their parameters
  const toolsToRun: (string | XmlItem)[] = parseXml(r);

  for (const item of toolsToRun) {
    console.log(`askAiWithTools3: Scan text:`, item);
    if (typeof item === "string") {
      continue;
    }
    const { name, children } = item;
    const params = Object.fromEntries(
      children
        .filter((v) => typeof v !== "string")
        .map(({ name, children }) => [name, children[0]])
    );
    console.log("toolsToRun1", {
      name,
      params,
    });
    // Execute the tool if it exists in allTools
    const tool = (allTools as Record<string, { function: Function }>)[name];
    if (tool) {
      console.log(`askAiWithTools31: Call tool ${name}:`, params);
      const toolFunction = tool.function;
      const result = await toolFunction(c, params);
      console.log(`askAiWithTools32: Result from tool ${name}:`, result);
    } else {
      console.log(`askAiWithTools4: No tool: ${name}`);
    }
  }
  // add tool running here

  console.log("askAiWithTools2: done running tools");
  return r;
};

export async function readDir(
  c: ToolContext,
  args: {
    path: string;
  }
): Promise<string[] | { error: string }> {
  const { path } = z.object({ path: z.string() }).parse(args);
  try {
    const absolutePath = workspaceRelativePathToAbsolutePath(path);
    const files = await fs.readdir(absolutePath);
    vscode.window.showInformationMessage(`readDir: ${path}`);
    return files;
  } catch (error) {
    return handleFileError(error, `readDir: ${path}`);
  }
}

export async function readFile(
  c: ToolContext,
  args: {
    path: string;
  }
): Promise<string | { error: string }> {
  const { path } = z.object({ path: z.string() }).parse(args);

  try {
    const absolutePath = workspaceRelativePathToAbsolutePath(path);
    const content = await fs.readFile(absolutePath, "utf8");
    vscode.window.showInformationMessage(`readFile: ${path}`);
    return content;
  } catch (error) {
    return handleFileError(error, `readFile: ${path}`);
  }
}

export async function writeFile(
  c: ToolContext,
  args: {
    path: string;
    content: string;
  }
): Promise<{ success: string } | { error: string }> {
  const { path, content } = z
    .object({ path: z.string(), content: z.string() })
    .parse(args);
  console.log("writeFile1", path, content);

  try {
    const absolutePath = workspaceRelativePathToAbsolutePath(path);
    await fs.writeFile(absolutePath, content);
    vscode.window.showInformationMessage(`writeFile: ${path}`);
  } catch (error) {
    return handleFileError(error, `writeFile: ${path}`);
  }
  return { success: content.length + " bytes written to " + path };
}

export async function runShellCommand(
  c: ToolContext,
  { command = "", workingDir = "." }
): Promise<string | { error: string }> {
  const workspacePath = workspaceRelativePathToAbsolutePath(workingDir);
  const fullCommand = `cd '${workspacePath}'; ${command}`;

  const userResponse = await askUser(c, {
    message: `Do you want to run the following command?\n${workingDir}$ ${command}`,
    options: ["Yes", "No"],
  });

  if (userResponse === "Yes") {
    const rawOutput = await runAndGetShellOutput(fullCommand);
    const output =
      (await c.promptAi(c, {
        user: rawOutput,
        system: "cleanup and output only the main message(s)",
      })) ?? rawOutput;
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

export const askUser = async (
  c: ToolContext,
  { message = "", options = ["Yes", "No"] }
): Promise<string> =>
  (await vscode.window.showInformationMessage(
    message,
    { modal: true },
    ...options
  )) ?? "";
