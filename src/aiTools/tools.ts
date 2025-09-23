import { ToolDefinition } from "@/ai-api/types/ToolDefinition";
import {
  askUser,
  readDir,
  readFile,
  runShellCommand,
  writeFile,
} from "./functions";

export const readDirTool: ToolDefinition = {
  type: "native",
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
  type: "backtick",
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
  type: "backtick",
  function: writeFile,
  name: "writeFile",
  description: "Write contents of a file to a path",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", example: "./path/to/file.ext" },
      content: {
        type: "string",
        description: `\nmultiline\ncontent\nhere\n`,
      },
    },
  },
};

const runShellCommandTool: ToolDefinition = {
  type: "xml",
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
  type: "xml",
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
};
export type ToolName = keyof typeof allTools;
export const allToolNames = Object.keys(allTools) as ToolName[];
