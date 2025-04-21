import * as vscode from "vscode";

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
      // Position line is beyond the actual number of lines
      return content.length; // Clamp to end
    }
    offset = nextNewline + 1; // Move offset past the newline
    line++;
  }

  // Now 'offset' is at the beginning of the correct line
  // Add the character offset, ensuring we don't go past the next newline or end of string
  const lineStartOffset = offset;
  const nextNewline = content.indexOf("\n", lineStartOffset);
  const lineEndOffset = nextNewline === -1 ? content.length : nextNewline;

  // Calculate the final offset, clamping it to the line end and content length
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
 */
function applyEdits(content: string, edits: SimpleTextEdit[]): string {
  let result = content;

  // Create a mutable copy of edits and sort them in reverse order based on range end.
  // If end positions are the same, sort by start position descending.
  // This ensures that later edits don't invalidate the offsets of earlier edits.
  const sortedEdits = [...edits].sort((a, b) => {
    if (b.range.end.line !== a.range.end.line) {
      return b.range.end.line - a.range.end.line;
    }
    if (b.range.end.character !== a.range.end.character) {
      return b.range.end.character - a.range.end.character;
    }
    if (b.range.start.line !== a.range.start.line) {
      return b.range.start.line - a.range.start.line;
    }
    return b.range.start.character - a.range.start.character;
  });

  // Apply edits from the end of the document backwards
  for (const edit of sortedEdits) {
    try {
      // Get offsets based on the *original* content's structure,
      // as the edits are defined relative to that.
      // However, we apply them to the potentially *modified* result string.
      // The reverse sorting makes this work.
      const startOffset = positionToOffset(result, edit.range.start);
      const endOffset = positionToOffset(result, edit.range.end);

      // Check if offsets are valid before slicing
      if (
        startOffset > result.length ||
        endOffset > result.length ||
        startOffset > endOffset
      ) {
        console.warn(
          `Skipping invalid edit: Range [${startOffset}, ${endOffset}] out of bounds for content length ${result.length}. Edit:`,
          edit
        );
        continue; // Skip this invalid edit
      }

      result =
        result.substring(0, startOffset) +
        edit.newText +
        result.substring(endOffset);
    } catch (e) {
      console.error(`Error applying single edit: ${e}. Edit:`, edit);
      // Optionally decide if one error should stop all formatting
      // For now, we try to continue with other edits
    }
  }

  return result;
}

/**
 * Formats the given file content using VS Code's registered formatters
 * based on the file path (to determine language and formatter).
 *
 * @param filePath The absolute path to the file (used to determine language/formatter).
 *                 The file doesn't necessarily need to exist on disk if content is provided.
 * @param fileContent The content of the file to format.
 * @returns A Promise resolving to the formatted content, or the original content if formatting fails.
 */
export const formatCodeWithVscode = async (
  filePath: string,
  fileContent: string
): Promise<string> => {
  const uri = vscode.Uri.file(filePath); // Create a Uri for VS Code APIs

  try {
    console.log(`Attempting to format: ${uri.fsPath}`);

    // Execute the command that triggers document formatting providers.
    // VS Code figures out the correct formatter based on the URI (language association).
    // It returns an array of TextEdit objects representing the changes.
    // Important: Set specific formatting options if needed, otherwise defaults are used.
    const formattingOptions: vscode.FormattingOptions = {
      insertSpaces: true,
      tabSize: 4,
    };

    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
      "vscode.executeFormatDocumentProvider",
      uri,
      formattingOptions
    );

    if (!edits || edits.length === 0) {
      console.log(
        `No formatting changes needed or no formatter found for: ${uri.fsPath}`
      );
      return fileContent; // No edits returned, return original content
    }

    console.log(`Applying ${edits.length} formatting edits for: ${uri.fsPath}`);

    // Apply the edits to the original string content
    const formattedContent = applyEdits(fileContent, edits);
    return formattedContent;
  } catch (error) {
    console.error(`Failed to format file ${filePath}:`, error);
    // On any error (command failed, formatter crashed, edit application failed), return original
    return fileContent;
  }
};
