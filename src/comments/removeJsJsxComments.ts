/**
 * Defines the types of comments that can be identified.
 */
type CommentType = "single-line" | "multi-line" | "jsx" | "jsdoc";

/**
 * Contains information about a detected comment.
 */
interface CommentInfo {
  /** The type of the comment ('single-line', 'multi-line', 'jsx', 'jsdoc'). */
  type: CommentType;
  /** The full text content of the comment, including delimiters (e.g., '// text'). */
  content: string;
  /** The starting index of the comment in the original code string. */
  start: number;
  /** The ending index (exclusive) of the comment in the original code string. */
  end: number;
}

/**
 * A function that receives information about a found comment and returns a string
 * to replace it with, or null to remove the comment potentially including its line.
 *
 * @param commentInfo - An object containing details about the comment.
 * @returns The string to replace the original comment with.
 *          Return an empty string "" to remove the comment but keep the line/whitespace structure.
 *          Return `null` to remove the comment; if the comment was the only non-whitespace
 *          content on its line, the entire line (including the line break) will be removed.
 */
export type CommentReplacer = (commentInfo: CommentInfo) => string | null;

/**
 * The default replacer function used when no custom replacer is provided.
 * It removes single-line, multi-line (non-JSDoc), and JSX comments by returning "",
 * preserving the line structure. It preserves JSDoc comments by returning their content.
 * @param commentInfo - Information about the detected comment.
 * @returns The original comment content if it's JSDoc, otherwise an empty string "".
 */
const defaultReplacer: CommentReplacer = (commentInfo: CommentInfo): string => {
  return commentInfo.type === "jsdoc" ? commentInfo.content : "";
};

export const keepOnlyJsDocAndRemoveEmptyLinesReplacer: CommentReplacer = (
  commentInfo
) => {
  return commentInfo.type === "jsdoc" ? commentInfo.content : null;
};

/**
 * Removes or replaces JavaScript/JSX comments from code using a configurable replacer function.
 * Handles single-line, multi-line, JSX comments, preserving strings, template literals,
 * and regex literals by default (or based on the replacer).
 * Handles comments inside template literal expressions recursively.
 * Allows replacer to return `null` to remove the entire line if it becomes empty.
 *
 * @param code The input code string.
 * @param replacer An optional function to call for each found comment. It receives
 *   comment details and returns the replacement string or null.
 *   - String (including ""): Replaces the comment with the string.
 *   - null: Removes the comment. If the line becomes empty, removes the line too.
 *   If omitted, uses the default replacer (removes non-JSDoc, keeps JSDoc, preserves lines).
 * @returns The code string with comments removed or replaced according to the replacer.
 */
export function removeJsJsxComments(
  code: string,
  replacer: CommentReplacer = defaultReplacer
): string {
  let result = "";
  let lastAppendIndex = 0;
  let i = 0;
  const n = code.length;

  function findPrevNonWhitespaceIndex(startIndex: number): number {
    let idx = startIndex - 1;
    while (idx >= 0 && /\s/.test(code[idx])) {
      idx--;
    }
    return idx;
  }

  function isWhitespace(str: string): boolean {
    return /^\s*$/.test(str);
  }

  while (i < n) {
    const scanStart = i;
    const char = code[i];
    const nextChar = i + 1 < n ? code[i + 1] : "";

    if (i === 0 && char === "#" && nextChar === "!") {
      const newlineIndex = code.indexOf("\n", i);
      const shebangEnd = newlineIndex === -1 ? n : newlineIndex + 1;
      result += code.substring(lastAppendIndex, shebangEnd);
      i = shebangEnd;
      lastAppendIndex = i;
      continue;
    }

    let commentInfo: CommentInfo | null = null;
    let commentEndIndex = -1;

    if (char === "/" && nextChar === "/") {
      let end = code.indexOf("\n", i + 2);
      commentEndIndex = end === -1 ? n : end;
      const commentContent = code.substring(i, commentEndIndex);
      commentInfo = {
        type: "single-line",
        content: commentContent,
        start: i,
        end: commentEndIndex,
      };
    } else if (char === "/" && nextChar === "*") {
      let end = code.indexOf("*/", i + 2);
      if (end === -1) {
        commentEndIndex = n;
      } else {
        commentEndIndex = end + 2;
      }
      const commentContent = code.substring(i, commentEndIndex);

      const isPotentiallyJsDoc = commentContent.startsWith("/**");

      const isDegenerateJsDoc =
        commentContent === "/**/" || commentContent === "/***/";
      const isJsDoc =
        isPotentiallyJsDoc && !isDegenerateJsDoc && commentContent.length > 4;

      const commentType: CommentType = isJsDoc ? "jsdoc" : "multi-line";
      commentInfo = {
        type: commentType,
        content: commentContent,
        start: i,
        end: commentEndIndex,
      };
    } else if (char === "{" && nextChar === "/" && code[i + 2] === "*") {
      let end = code.indexOf("*/}", i + 3);
      if (end === -1) {
        commentEndIndex = n;
      } else {
        commentEndIndex = end + 3;
      }
      const commentContent = code.substring(i, commentEndIndex);
      commentInfo = {
        type: "jsx",
        content: commentContent,
        start: i,
        end: commentEndIndex,
      };
    }

    if (commentInfo) {
      const replacement = replacer(commentInfo);

      if (replacement === null) {
        let lineStartIndex = commentInfo.start;
        while (lineStartIndex > 0 && code[lineStartIndex - 1] !== "\n") {
          lineStartIndex--;
        }

        const effectiveLineStartIndex = lineStartIndex > 0 ? lineStartIndex : 0;

        let lineEndIndex = commentInfo.end;
        while (lineEndIndex < n && code[lineEndIndex] !== "\n") {
          lineEndIndex++;
        }

        const contentBeforeComment = code.substring(
          effectiveLineStartIndex,
          commentInfo.start
        );
        const contentAfterComment = code.substring(
          commentInfo.end,
          lineEndIndex
        );

        if (
          isWhitespace(contentBeforeComment) &&
          isWhitespace(contentAfterComment)
        ) {
          result += code.substring(lastAppendIndex, effectiveLineStartIndex);

          i =
            lineEndIndex < n && code[lineEndIndex] === "\n"
              ? lineEndIndex + 1
              : n;
          lastAppendIndex = i;
        } else {
          result += code.substring(lastAppendIndex, commentInfo.start);
          i = commentInfo.end;
          lastAppendIndex = i;
        }
      } else {
        result += code.substring(lastAppendIndex, commentInfo.start);
        result += replacement;
        i = commentInfo.end;
        lastAppendIndex = i;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      const quote = char;
      let current = i + 1;
      while (current < n) {
        const strChar = code[current];
        if (strChar === "\\") {
          current++;
          if (current < n) {
            current++;
          }
        } else if (strChar === quote) {
          current++;
          break;
        } else {
          current++;
        }
      }

      i = current;
      continue;
    }

    if (char === "`") {
      result += code.substring(lastAppendIndex, i);
      result += "`";
      let current = i + 1;
      let templateEnd = -1;

      while (current < n) {
        const tlChar = code[current];

        if (tlChar === "\\") {
          result += tlChar;
          if (current + 1 < n) {
            result += code[current + 1];
            current++;
          }
          current++;
        } else if (
          tlChar === "$" &&
          current + 1 < n &&
          code[current + 1] === "{"
        ) {
          result += "${";
          current += 2;
          const expressionStart = current;
          let openBraces = 1;
          let expressionEnd = -1;

          let exprScannerPos = current;
          while (exprScannerPos < n) {
            const exprChar = code[exprScannerPos];
            if (exprChar === "{") {
              openBraces++;
            } else if (exprChar === "}") {
              openBraces--;
              if (openBraces === 0) {
                expressionEnd = exprScannerPos;
                break;
              }
            } else if (exprChar === "`") {
              let nestedEnd = code.indexOf("`", exprScannerPos + 1);
              if (nestedEnd !== -1) {
                exprScannerPos = nestedEnd;
              } else {
                exprScannerPos = n - 1;
              }
            } else if (exprChar === "'" || exprChar === '"') {
              const quoteType = exprChar;
              exprScannerPos++;
              while (exprScannerPos < n) {
                if (code[exprScannerPos] === "\\") {
                  exprScannerPos++;
                } else if (code[exprScannerPos] === quoteType) {
                  break;
                }
                exprScannerPos++;
              }
            } else if (
              exprChar === "/" &&
              exprScannerPos + 1 < n &&
              code[exprScannerPos + 1] === "/"
            ) {
              let lineEnd = code.indexOf("\n", exprScannerPos + 2);
              exprScannerPos = (lineEnd === -1 ? n : lineEnd) - 1;
            } else if (
              exprChar === "/" &&
              exprScannerPos + 1 < n &&
              code[exprScannerPos + 1] === "*"
            ) {
              let commentEnd = code.indexOf("*/", exprScannerPos + 2);
              exprScannerPos = commentEnd === -1 ? n : commentEnd + 1;
            }
            exprScannerPos++;
          }

          if (expressionEnd === -1) {
            const remainingExpression = code.substring(expressionStart, n);
            result += removeJsJsxComments(remainingExpression, replacer);
            current = n;
            templateEnd = n;
            break;
          } else {
            const expression = code.substring(expressionStart, expressionEnd);
            result += removeJsJsxComments(expression, replacer);
            result += "}";
            current = expressionEnd + 1;
          }
        } else if (tlChar === "`") {
          result += "`";
          templateEnd = current + 1;
          break;
        } else {
          result += tlChar;
          current++;
        }
      }

      i = templateEnd === -1 ? n : templateEnd;
      lastAppendIndex = i;
      continue;
    }

    if (char === "/") {
      if (nextChar !== "/" && nextChar !== "*") {
        const prevNonWsIdx = findPrevNonWhitespaceIndex(i);
        const prevChar = prevNonWsIdx >= 0 ? code[prevNonWsIdx] : null;
        let isLikelyRegex = false;

        if (
          prevChar === null ||
          /[(,=:;{[?!&|+\-*/%<>]/.test(prevChar) ||
          /(?:return|yield|throw|case|instanceof|typeof|void|delete|await|new|extends|of|in)$/.test(
            code.substring(0, prevNonWsIdx + 1).trimEnd()
          )
        ) {
          isLikelyRegex = true;
        }

        if (isLikelyRegex) {
          let current = i + 1;
          let inCharSet = false;
          let escaped = false;
          let closed = false;

          while (current < n) {
            const regexChar = code[current];
            if (escaped) {
              escaped = false;
            } else {
              if (regexChar === "\\") {
                escaped = true;
              } else if (regexChar === "[") {
                inCharSet = true;
              } else if (regexChar === "]") {
                inCharSet = false;
              } else if (regexChar === "/" && !inCharSet) {
                current++;
                closed = true;
                break;
              } else if (regexChar === "\n") {
                break;
              }
            }
            current++;
          }

          if (closed) {
            let flagsStart = current;
            while (current < n && /[gimsuy]/.test(code[current])) {
              current++;
            }

            i = current;
            continue;
          }
        }
      }
    }

    if (i === scanStart) {
      i++;
    }
  }

  result += code.substring(lastAppendIndex);

  return result;
}
