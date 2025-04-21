/**
 * Removes JS/JSX/TS/TSX comments from a string, preserving JSDoc comments.
 * Basic implementation: removes non-JSDoc block comments /* ... *\/, line comments // ..., and JSX/TSX comments {/* ... *\/}.
 * Does not handle comments within strings or regex literals robustly.
 */
export const removeJsJsxComments = (code: string): string => {
  let cleanedCode = code;

  // Remove JSX/TSX comments {/* ... */}
  cleanedCode = cleanedCode.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  // Remove multi-line comments /* ... */ but preserve JSDoc comments /** ... */
  // This regex matches /* followed by anything that is NOT * immediately, then any character non-greedily until */
  cleanedCode = cleanedCode.replace(/\/\*(?!\*)[\s\S]*?\*\//g, "");

  // Remove single-line comments // ...
  // Use gm flag for multiline and global
  cleanedCode = cleanedCode.replace(/\/\/.*$/gm, "");

  return cleanedCode;
};
