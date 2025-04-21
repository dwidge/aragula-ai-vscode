/**
 * Removes JS/JSX/TS/TSX comments from a string.
 * Basic implementation: removes block comments /* ... *\/ and line comments // ...
 * Does not handle comments within strings or regex literals robustly.
 */
export const removeJsJsxComments = (code: string): string => {
  // Remove multi-line comments /* ... */
  let cleanedCode = code.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove single-line comments // ...
  cleanedCode = cleanedCode.replace(/\/\/.*$/gm, ""); // Use gm flag for multiline and global
  return cleanedCode;
};
