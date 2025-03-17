import { ToolDef } from "./ToolTypes";
import {
  askUser,
  readDir,
  readFile,
  runShellCommand,
  writeFile,
} from "./functions";

export const readDirTool: ToolDef = {
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

export const readFileTool: ToolDef = {
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

export const writeFileTool: ToolDef = {
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

const runShellCommandTool: ToolDef = {
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

const askUserTool: ToolDef = {
  function: (...v) => (console.log("askUserTool1", ...v), askUser(...v)),
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
