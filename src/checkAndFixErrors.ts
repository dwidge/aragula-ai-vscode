import {
  AiApiSettings,
  ToolCall,
  ToolDefinition,
  newAiApi,
} from "./aiTools/AiApi";
import { getCodeErrorsWithVscode } from "./aiTools/formatCodeWithVscode";
import { writeFileTool } from "./aiTools/tools";
import { executeToolCalls } from "./executeToolCalls";
import { getWorkspaceAbsolutePath } from "./getWorkspaceAbsolutePath";
import { readFiles } from "./readFiles";
import { Logger } from "./utils/Logger";

/**
 * Checks for errors in files, constructs a prompt with errors and file content,
 * calls the AI to fix them, and applies the changes.
 */
export const checkAndFixErrors = async (
  filePaths: string[],
  providerSetting: AiApiSettings,
  log: Logger
) => {
  log("Checking for errors...", "info");
  const allErrors = await findErrors(filePaths, log);

  if (allErrors.length === 0) {
    log("No errors found.", "info");
    return;
  }

  log(`Found ${allErrors.length} errors. Attempting to fix...`, "warning");

  const system =
    "You are an AI assistant specialized in fixing code errors based on provided diagnostics. You will receive a list of errors and the corresponding file contents. Your task is to provide the corrected file contents in the specified format.";
  let user =
    "Please fix the following errors in the provided files.\n\nErrors:\n";
  allErrors.forEach((err) => {
    user += `- file: ${err.filePath}, line: ${err.line}: ${err.message}\n`;
  });

  const abortController = new AbortController();
  const readFileToolResponse: ToolCall[] = await readFiles(filePaths);
  const enabledTools: ToolDefinition[] = [writeFileTool];
  const response = await newAiApi(providerSetting)(
    {
      user: user,
      system: system,
      tools: readFileToolResponse,
    },
    enabledTools,
    { logger: log, signal: abortController.signal }
  );
  await executeToolCalls(response.tools, enabledTools, log);

  log("Checking for errors...", "info");
  const moreErrors = await findErrors(filePaths, log);
  if (moreErrors.length) {
    throw new Error("Could not fix all errors");
  }
};

export const findErrors = async (filePaths: string[], log: Logger) => {
  let allErrors: {
    filePath: string;
    line: number;
    message: string;
  }[] = [];
  for (const filePath of filePaths) {
    try {
      const errors = await getCodeErrorsWithVscode(
        getWorkspaceAbsolutePath(filePath)
      );
      allErrors.push(...errors.map((err) => ({ filePath, ...err })));
    } catch (error: any) {
      log(`Error checking errors in ${filePath}: ${error.message}`, "error");
    }
  }
  return allErrors;
};
