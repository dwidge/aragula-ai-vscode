import ts from "typescript";

/**
 * Removes JS/JSX/TS/TSX comments from a string, preserving JSDoc comments and shebangs.
 */
export const removeJsJsxComments = (code: string): string => {
  if (code.trim() === "") {
    return code;
  }

  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.JSX
  );
  scanner.setText(code);

  const rangesToRemove: { pos: number; end: number }[] = [];
  let token = scanner.scan();
  let shebang: string | null = null;

  if (token === ts.SyntaxKind.ShebangTrivia) {
    const pos = scanner.getTokenPos();
    const end = scanner.getTextPos();
    shebang = code.substring(pos, end);
    token = scanner.scan();
  }

  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const pos = scanner.getTokenPos();
    const end = scanner.getTextPos();

    if (token === ts.SyntaxKind.SingleLineCommentTrivia) {
      rangesToRemove.push({ pos, end });
    } else if (token === ts.SyntaxKind.MultiLineCommentTrivia) {
      const commentText = code.substring(pos, end);

      if (
        commentText.startsWith("/**") &&
        commentText.length > 4 &&
        !commentText.endsWith("**/")
      ) {
        if (commentText.length === 4 && commentText === "/**/") {
          rangesToRemove.push({ pos, end });
        }
      } else {
        const isJsxComment =
          pos > 0 &&
          end < code.length &&
          code[pos - 1] === "{" &&
          code[end] === "}";

        if (isJsxComment) {
          rangesToRemove.push({
            pos: Math.max(0, pos - 1),
            end: Math.min(code.length, end + 1),
          });
        } else {
          rangesToRemove.push({ pos, end });
        }
      }
    }

    token = scanner.scan();
  }

  rangesToRemove.sort((a, b) => b.pos - a.pos);

  let result = code;
  for (const range of rangesToRemove) {
    if (
      range.pos >= 0 &&
      range.end >= range.pos &&
      range.end <= result.length
    ) {
      result = result.substring(0, range.pos) + result.substring(range.end);
    } else {
      console.warn(
        `Skipping invalid range during removal: pos=${range.pos}, end=${range.end}, original code length=${code.length}, current result length=${result.length}`
      );
    }
  }

  if (shebang && !result.startsWith(shebang)) {
    const firstCharIndex = result.search(/\S/);
    if (firstCharIndex === -1) {
      return shebang + result;
    } else {
      return (
        result.slice(0, firstCharIndex) + shebang + result.slice(firstCharIndex)
      );
    }
  }

  return result;
};
