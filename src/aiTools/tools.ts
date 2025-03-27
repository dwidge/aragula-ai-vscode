import { ToolDefinition } from "./AiApi";
import {
  askUser,
  readDir,
  readFile,
  runShellCommand,
  writeFile,
} from "./functions";

export const readDirTool: ToolDefinition = {
  function: readDir,
  name: "readDir",
  description: "readDir",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
    },
  },
};

export const readFileTool: ToolDefinition = {
  function: readFile,
  name: "readFile",
  description: "readFile",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
    },
  },
};

export const writeFileTool: ToolDefinition = {
  type: "xml",
  function: writeFile,
  name: "writeFile",
  description: "writeFile",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: {
        type: "string",
        description: `
multiline
content
here
`,
      },
    },
  },
};

const runShellCommandTool: ToolDefinition = {
  function: runShellCommand,
  name: "runShellCommand",
  description: "runShellCommand",
  parameters: {
    type: "object",
    properties: {
      command: { type: "string" },
      workingDir: { type: "string" },
    },
  },
};

const askUserTool: ToolDefinition = {
  function: askUser,
  name: "askUser",
  description: "Prompts the user with a set of options.",
  parameters: {
    type: "object",
    properties: {
      message: { type: "string" },
      options: { type: "array", items: { type: "string" } },
    },
  },
};

export const allTools = {
  readDir: readDirTool,
  readFile: readFileTool,
  writeFile: writeFileTool,
  // runShellCommand: runShellCommandTool,
  // askUser: askUserTool,
};
export type ToolName = keyof typeof allTools;
export const allToolNames = Object.keys(allTools) as ToolName[];
