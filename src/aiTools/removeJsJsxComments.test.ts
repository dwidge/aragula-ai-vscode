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

test("should preserve comments within strings", () => {
  const code = `
    const str1 = "This is a string // with a comment";
    const str2 = 'Another string /* with a block comment */';
    const str3 = \`Template literal {/* with a jsx comment */}\`;
  `;
  const expected = `
    const str1 = "This is a string // with a comment";
    const str2 = 'Another string /* with a block comment */';
    const str3 = \`Template literal {/* with a jsx comment */}\`;
  `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Comments within strings should be preserved"
  );
});

test("should preserve comments within regex literals and remove trailing comments", () => {
  const code = `
    const regex1 = /\\/\\/comment/g; // Matches "//comment"
    const regex2 = /\\/\\*comment\\*\\//g; // Matches "/*comment*/"
    const regex3 = /\\{\\/\\*comment\\*\\/\\}/g; // Matches "{/*comment*/}"
  `;
  const expected = `
    const regex1 = /\\/\\/comment/g; 
    const regex2 = /\\/\\*comment\\*\\//g; 
    const regex3 = /\\{\\/\\*comment\\*\\/\\}/g; 
  `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Comments within regex literals should be preserved, trailing comments should be removed"
  );
});

test("should handle division operator vs regex correctly", () => {
  const code = `
        const a = 10 / 2; // division
        const b = 10 / /2/; // division by regex literal
        const c = 10 / /* block comment */ 2;
        const d = 10 / // single line comment
                     2;
        const regex = /\\//; // regex containing //
    `;
  const expected = `
        const a = 10 / 2; 
        const b = 10 / /2/; 
        const c = 10 /  2;
        const d = 10 / 
                     2;
        const regex = /\\//; 
    `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Division vs Regex handled incorrectly"
  );
});

test("should handle nested comments (TS scanner flattens)", () => {
  // Standard JS/TS doesn't have nested block comments. The scanner finds the first '*/'
  const code = `
    /* outer /* inner */ outer */
    // outer // inner
    {/* outer {/* inner */} outer */}
  `;
  const expected = `
     outer */
    
     outer */}
  `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Nested comment handling failed"
  );
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

test("should handle comments spanning multiple lines correctly", () => {
  const code = `
    const a = 1; // comment line 1
                   // comment line 2 is separate
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
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Multiline comment span incorrect"
  );
});

test("should preserve shebang", () => {
  const code = `#!/usr/bin/env node
    // comment
    const a = 1;
    /** JSDoc */
    function x() {}
    /* block */
  `;
  const expected = `#!/usr/bin/env node
    
    const a = 1;
    /** JSDoc */
    function x() {}
    
  `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Shebang was removed"
  );
});

test("should preserve shebang with leading whitespace", () => {
  const code = `
#!/usr/bin/env node
    // comment
    const a = 1;
  `;
  const expected = `
#!/usr/bin/env node
    
    const a = 1;
  `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Shebang with leading whitespace failed"
  );
});

test("should handle empty input", () => {
  const code = "";
  const expected = "";
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should handle input with only whitespace", () => {
  const code = "   \n \t ";
  const expected = "   \n \t ";
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should handle input with only comments", () => {
  const code = `
    // line 1
    /* block 1 */
    // line 2
    {/* jsx 1 */}
  `;
  const expected = `
    
    
    
    
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should handle input with only JSDoc", () => {
  const code = `
    /** JSDoc 1 */
    /**
     * JSDoc 2
     */
  `;
  const expected = `
    /** JSDoc 1 */
    /**
     * JSDoc 2
     */
  `;
  assert.strictEqual(removeJsJsxComments(code), expected);
});

test("should remove empty block comments", () => {
  const code = `const a = 1; /**/ const b = 2;`;
  const expected = `const a = 1;  const b = 2;`;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Empty block comment /**/ failed"
  );
});

test("should remove '/***/' block comments", () => {
  const code = `const a = 1; /***/ const b = 2;`;
  const expected = `const a = 1;  const b = 2;`;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Empty block comment /***/ failed"
  );
});

test("should NOT remove '/** */' if treated as JSDoc edge case (length 5)", () => {
  const code = `const a = 1; /** */ const b = 2;`;
  const expected = `const a = 1; /** */ const b = 2;`;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "JSDoc /** */ failed"
  );
});

test("should handle comments adjacent to JSX elements", () => {
  const code = `
        <div>// Not a valid place, but test scanner
            <span>{/* Inner */}</span>/* Also not valid */
        </div>// Trailing
    `;
  const expected = `
        <div>
            <span></span>
        </div>
    `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Comments adjacent JSX failed"
  );
});

test("should handle unterminated block comment (scanner stops)", () => {
  const code = `
        const a = 1;
        /* This comment never ends
        const b = 2;
    `;
  const expected = `
        const a = 1;
        `;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Unterminated block comment failed"
  );
});

test("should handle unterminated JSX comment (scanner stops)", () => {
  const code = `
        <div>
            {/* Never ends
        </div>
    `;
  const expected = `
        <div>
            {`;
  assert.strictEqual(
    removeJsJsxComments(code),
    expected,
    "Unterminated JSX comment failed"
  );
});
