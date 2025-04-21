/**
 * Removes JS/JSX/TS/TSX comments from a string, preserving JSDoc comments.
 * Basic implementation: removes non-JSDoc block comments /* ... *\/, line comments // ..., and JSX/TSX comments {/* ... *\/}.
 * Does not handle comments within strings or regex literals robustly.
 */
export const removeJsJsxComments = (code: string): string => {
  let cleanedCode = code;
  cleanedCode = cleanedCode.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  cleanedCode = cleanedCode.replace(/\/\*(?!\*)[\s\S]*?\*\//g, "");
  cleanedCode = cleanedCode.replace(/\/\/.*$/gm, "");
  return cleanedCode;
};
