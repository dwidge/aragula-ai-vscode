import { test } from "node:test";
import assert from "node:assert";
import { removeJsJsxComments } from "./removeJsJsxComments.js";

test("should remove single-line comments", () => {
  const code = `
    const a = 1; // This is a comment
    const b = 2; // Another comment
  `;
  const expected = `
    const a = 1; 
    const b = 2; 
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should remove multi-line block comments", () => {
  const code = `
    /*
     * This is a block comment
     */
    const c = 3;
    /* Another block comment */
    const d = 4;
  `;
  const expected = `
    
    const c = 3;
    
    const d = 4;
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should remove JSX/TSX comments", () => {
  const code = `
    <div>
      {/* This is a JSX comment */}
      <span>Hello</span>
      {/* Another one */}
    </div>
  `;
  const expected = `
    <div>
      
      <span>Hello</span>
      
    </div>
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should preserve JSDoc comments", () => {
  const code = `
    /**
     * This is a JSDoc comment.
     * @param {string} name - The name.
     */
    function greet(name: string) {
      // This is a regular comment
      console.log(\`Hello, \${name}\`);
    }
  `;
  const expected = `
    /**
     * This is a JSDoc comment.
     * @param {string} name - The name.
     */
    function greet(name: string) {
      
      console.log(\`Hello, \${name}\`);
    }
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should handle mixed comment types", () => {
  const code = `
    // Single line comment
    const x = 10; /* Block comment */
    /** JSDoc comment */
    const y = 20; {/* JSX comment */}
  `;
  const expected = `
    
    const x = 10; 
    /** JSDoc comment */
    const y = 20; 
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should handle comments at the beginning and end of lines", () => {
  const code = `
    // Start comment
    const a = 1; // End comment
    /* Block comment */ const b = 2; /* Another block */
    {/* JSX comment */} const c = 3; {/* Another JSX */}
  `;
  const expected = `
    
    const a = 1; 
     const b = 2; 
     const c = 3; 
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should handle comments on empty lines", () => {
  const code = `
    //
    /* */
    {/* */}
    const z = 5;
  `;
  const expected = `
    
    
    
    const z = 5;
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should handle code with no comments", () => {
  const code = `
    const a = 1;
    const b = 2;
    function sum(x, y) {
      return x + y;
    }
  `;
  const expected = `
    const a = 1;
    const b = 2;
    function sum(x, y) {
      return x + y;
    }
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

// Note: The current implementation does not handle comments within strings or regex literals.
// These tests demonstrate the current behavior, which is incorrect for these cases.
// A more robust implementation would require parsing the code more carefully.
test("should incorrectly remove comments within strings (limitation)", () => {
  const code = `
    const str1 = "This is a string // with a comment";
    const str2 = 'Another string /* with a block comment */';
    const str3 = \`Template literal {/* with a jsx comment */}\`;
  `;
  // The current regex will remove these.
  const expected = `
    const str1 = "This is a string 
    const str2 = 'Another string ';
    const str3 = \`Template literal \`;
  `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Current implementation incorrectly removes comments in strings"
  );
});

test("should incorrectly remove comments within regex literals (limitation)", () => {
  const code = `
    const regex1 = /\\/\\/comment/g; // Matches "//comment"
    const regex2 = /\\/\\*comment\\*\\//g; // Matches "/*comment*/"
    const regex3 = /\\{\\/\\*comment\\*\\/\\}/g; // Matches "{/*comment*/}"
  `;
  // The current regex will remove these.
  const expected = `
    const regex1 = /\\/\\/comment/g; 
    const regex2 = /\\/\\*comment\\*\\
    const regex3 = /\\{\\/\\*comment\\*\\/\\}/g; 
  `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Current implementation incorrectly removes comments in regex literals"
  );
});

test("should handle nested comments (though not standard)", () => {
  const code = `
    /* outer /* inner */ outer */
    // outer // inner
    {/* outer {/* inner */} outer */}
  `;
  // The regex for block comments is non-greedy, so it should handle the first level.
  // The line comment regex is simple.
  // The JSX comment regex is non-greedy.
  const expected = `
     outer */
    
     outer */}
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should handle comments adjacent to code", () => {
  const code = `
    const a = 1;//comment
    const b = 2;/*comment*/
    const c = 3;{/*comment*/}
  `;
  const expected = `
    const a = 1;
    const b = 2;
    const c = 3;
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should handle comments spanning multiple lines", () => {
  const code = `
    const a = 1; // comment line 1
                   // comment line 2
    const b = 2; /* block comment
                   * line 2
                   */
    const c = 3; {/* jsx comment
                   * line 2
                   */}
  `;
  const expected = `
    const a = 1; 
                   
    const b = 2; 
    const c = 3; 
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});
