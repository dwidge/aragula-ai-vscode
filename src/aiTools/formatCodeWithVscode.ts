import * as vscode from "vscode";
import { readFileSafe, writeFileSafe } from "./file";

/**
 * Represents a simple text edit operation.
 * Mirrors vscode.TextEdit but avoids pulling in the entire vscode types
 * if used in a context where that's not directly available (though here it is).
 */
interface SimpleTextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

/**
 * Converts a VS Code Position to a character offset in the given string content.
 * IMPORTANT: Assumes LF line endings (\n) for offset calculation. VS Code handles
 * line endings internally more robustly, but for string manipulation, this is
 * a common approach. Be aware of potential off-by-one errors with CRLF (\r\n)
 * if the formatter produces edits sensitive to that difference.
 *
 * @param content The full string content.
 * @param position The VS Code position (line, character).
 * @returns The 0-based character offset.
 */
function positionToOffset(
  content: string,
  position: { line: number; character: number }
): number {
  let line = 0;
  let offset = 0;
  while (line < position.line && offset < content.length) {
    const nextNewline = content.indexOf("\n", offset);
    if (nextNewline === -1) {
      return content.length;
    }
    offset = nextNewline + 1;
    line++;
  }

  const lineStartOffset = offset;
  const nextNewline = content.indexOf("\n", lineStartOffset);
  const lineEndOffset = nextNewline === -1 ? content.length : nextNewline;

  const targetOffset = lineStartOffset + position.character;
  return Math.min(targetOffset, lineEndOffset, content.length);
}

/**
 * Applies an array of text edits to a string.
 * Edits are applied in reverse order of their end position to avoid offset issues.
 *
 * @param content The original string content.
 * @param edits An array of SimpleTextEdit objects.
 * @returns The content string after applying all edits.
 * @throws Error if an edit range is invalid.
 */
function applyEdits(content: string, edits: SimpleTextEdit[]): string {
  let result = content;

  const sortedEdits = [...edits].sort((a, b) => {
    const endComparison = b.range.end.line - a.range.end.line;
    if (endComparison !== 0) {
      return endComparison;
    }
    const endCharComparison = b.range.end.character - a.range.end.character;
    if (endCharComparison !== 0) {
      return endCharComparison;
    }
    const startComparison = b.range.start.line - a.range.start.line;
    if (startComparison !== 0) {
      return startComparison;
    }
    return b.range.start.character - a.range.start.character;
  });

  for (const edit of sortedEdits) {
    const startOffset = positionToOffset(result, edit.range.start);
    const endOffset = positionToOffset(result, edit.range.end);

    if (
      startOffset > result.length ||
      endOffset > result.length ||
      startOffset > endOffset
    ) {
      throw new Error(
        `Invalid edit range provided by formatter: [${edit.range.start.line}:${edit.range.start.character}] to [${edit.range.end.line}:${edit.range.end.character}] (Offsets: ${startOffset} to ${endOffset}) in content length ${result.length}.`
      );
    }

    result =
      result.substring(0, startOffset) +
      edit.newText +
      result.substring(endOffset);
  }

  return result;
}

/**
 * Formats the given file using VS Code's registered formatters
 * based on the file path (to determine language and formatter).
 *
 * Adds a few newlines to the start of the content before formatting as a potential workaround
 * for formatters that don't throw on error.
 *
 * @param filePath The absolute path to the file (used to determine language/formatter).
 *                 The file doesn't necessarily need to exist on disk if content is provided,
 *                 but the path is needed for VS Code to select the correct formatter.
 * @returns A Promise.
 * @throws Error if formatting fails (e.g., no formatter found, formatter returns no edits, or applying edits fails).
 */
export const formatCodeWithVscode = async (filePath: string): Promise<void> => {
  const originalContent = await readFileSafe(filePath);
  const contentWithNewlines = "\n\n\n" + originalContent;
  await writeFileSafe(filePath, contentWithNewlines);
  try {
    const edits = await vscode.commands.executeCommand<
      vscode.TextEdit[] | null
    >("vscode.executeFormatDocumentProvider", vscode.Uri.file(filePath));
    if (!edits) {
      throw new Error(`formatCodeWithVscodeE1`);
    }

    const formattedContent = applyEdits(contentWithNewlines, edits);
    if (formattedContent === contentWithNewlines) {
      throw new Error(`formatCodeWithVscodeE2`);
    }

    await writeFileSafe(filePath, formattedContent);
  } catch (error) {
    await writeFileSafe(filePath, originalContent);
    throw new Error(`Failed to format file: ${filePath}: ${error}`);
  }
};

export const getCodeErrorsWithVscode = async (
  filePath: string
): Promise<string[]> => {
  const diagnostics = vscode.languages.getDiagnostics(
    vscode.Uri.file(filePath)
  );
  console.log(`diagnostics1: ${filePath}`, diagnostics);
  const errors = diagnostics.filter(
    (d) => d.severity === vscode.DiagnosticSeverity.Error
  );
  return errors.map((e) => e.message);
};
