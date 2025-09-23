import * as vscode from "vscode";

/**
 * Gets code errors (diagnostics with severity Error) for a given file using VS Code's diagnostics API.
 *
 * @param filePath The absolute path to the file.
 * @returns A Promise resolving to an array of error objects, each containing line, character, and message.
 */
export const getCodeErrorsWithVscode = async (
  filePath: string
): Promise<{ line: number; message: string }[]> => {
  const diagnostics = vscode.languages.getDiagnostics(
    vscode.Uri.file(filePath)
  );
  console.log(`getCodeErrorsWithVscode1: ${filePath}`, diagnostics);
  const errors = diagnostics.filter(
    (d) => d.severity === vscode.DiagnosticSeverity.Error
  );

  return errors.map((e) => ({
    line: e.range.start.line + 1,
    message: e.message,
  }));
};
