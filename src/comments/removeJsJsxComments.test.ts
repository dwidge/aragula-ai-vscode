import assert from "node:assert";
import { describe, test } from "node:test";
import {
  CommentReplacer,
  keepOnlyJsDocAndRemoveEmptyLinesReplacer,
  removeJsJsxComments,
} from "./removeJsJsxComments.js";

describe("removeJsJsxCommentsDefault", () => {
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
    const str3 = \`Template literal {/* with a jsx comment */} \${ /* expr comment */ 1}\`; // template literal with comment in expression
  `;
    const expected = `
    const str1 = "This is a string // with a comment";
    const str2 = 'Another string /* with a block comment */';
    const str3 = \`Template literal {/* with a jsx comment */} \${  1}\`; 
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments within strings preserved, comments in template expr removed"
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
    assert.strictEqual(removeJsJsxComments(""), "");
  });

  test("should handle input with only whitespace", () => {
    const code = "   \n \t ";
    assert.strictEqual(removeJsJsxComments(code), code);
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

  test("should remove empty block comments '/**/' and '/***/'", () => {
    const code = `const a = 1; /**/ const b = 2; /***/ const c = 3;`;
    const expected = `const a = 1;  const b = 2;  const c = 3;`;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Empty block comments /**/ and /***/ failed"
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
            <span>{/* Inner */}</span>{/* Also not valid */}
        </div>// Trailing
    `;
    const expected = `
        <div>
            <span></span>{/* Also not valid */}
        </div>// Trailing
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
            `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Unterminated JSX comment failed"
    );
  });

  test("should remove comments inside lambda functions", () => {
    const code = `
    const func = (a, b) => {
      // This is a comment inside the lambda
      const sum = a + b;
      /* Another comment */ return sum;
    };
  `;
    const expected = `
    const func = (a, b) => {
      
      const sum = a + b;
       return sum;
    };
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments inside lambda failed"
    );
  });

  test("should remove comments after try-catch blocks", () => {
    const code = `
    try {
      // Do something
    } catch (e) {
      // Handle error
    } // Comment after catch
    
    const result = 1; /* Another comment */
  `;
    const expected = `
    try {
      
    } catch (e) {
      
    } 
    
    const result = 1; 
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments after try-catch failed"
    );
  });

  test("should remove comments after multiple if blocks", () => {
    const code = `
    if (condition1) {
      // block 1
    }
    if (condition2) {
      // block 2
    } // Comment after if
    
    if (condition3) {
      /* block 3 */
    } /* Another comment */
  `;
    const expected = `
    if (condition1) {
      
    }
    if (condition2) {
      
    } 
    
    if (condition3) {
      
    } 
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments after multiple if blocks failed"
    );
  });

  test("should remove comments within test file structure (describe, test, try-catch)", () => {
    const code = `
    import { test } from "node:test";
    import assert from "node:assert";
    
    describe("My feature", () => { // Describe comment
      test("should do something", () => {
        // Test comment
        try {
          const a = 1; // Inside try
          /* Another inside try */
          assert.strictEqual(a, 1);
        } catch (e) {
          // Inside catch
          console.error(e); // Log error
        } // After catch
      }); // After test
      
      test("should do something else", () => { /* Another test comment */ });
    }); // After describe
  `;
    const expected = `
    import { test } from "node:test";
    import assert from "node:assert";
    
    describe("My feature", () => { 
      test("should do something", () => {
        
        try {
          const a = 1; 
          
          assert.strictEqual(a, 1);
        } catch (e) {
          
          console.error(e); 
        } 
      }); 
      
      test("should do something else", () => {  });
    }); 
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments within test structure failed"
    );
  });

  test("should remove comments immediately after closing braces or parentheses", () => {
    const code = `
    if (x > 0) {
      console.log("positive");
    } // comment after if block
    
    try {
      doSomething();
    } catch (e) {
      handleError(e);
    } /* comment after catch block */
    
    const func = (a, b) => {
      return a + b;
    }; {/* comment after lambda */}
    
    function myFunc() {
      return 1;
    } // comment after function
    
    class MyClass {
      constructor() {
        // inside constructor
      } // comment after constructor
    } // comment after class
  `;
    const expected = `
    if (x > 0) {
      console.log("positive");
    } 
    
    try {
      doSomething();
    } catch (e) {
      handleError(e);
    } 
    
    const func = (a, b) => {
      return a + b;
    }; 
    
    function myFunc() {
      return 1;
    } 
    
    class MyClass {
      constructor() {
        
      } 
    } 
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments immediately after closing braces/parentheses failed"
    );
  });

  test("should remove comments on empty lines within blocks", () => {
    const code = `
    if (condition) {
      // comment on empty line 1
      /* comment on empty line 2 */
      
      {/* comment on empty line 3 */}
      const data = 1;
    }
    
    try {
      // comment inside try
      
      doWork();
    } catch (e) {
      /* comment inside catch */
      
      handle(e);
    }
    
    const lambda = () => {
      {/* comment inside lambda */}
      
      return true;
    };
  `;
    const expected = `
    if (condition) {
      
      
      
      
      const data = 1;
    }
    
    try {
      
      
      doWork();
    } catch (e) {
      
      
      handle(e);
    }
    
    const lambda = () => {
      
      
      return true;
    };
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments on empty lines within blocks failed"
    );
  });

  test("should handle complex nested structure with various comments", () => {
    const code = `
    describe("Complex scenario", () => { // Outer describe comment
      test("should handle nested blocks", () => {
        // Test start comment
        try {
          // Try block comment
          if (someCondition) {
            /* If block comment */
            const process = () => {
              // Lambda comment 1
              return 1; /* Lambda comment 2 */
            }; // Comment after lambda
            process();
          } // Comment after if
        } catch (error) {
          // Catch block comment
          console.error(error); {/* JSX-like comment in catch */}
        } // Comment after catch
        // Test end comment
      }); // Comment after test
    }); // Comment after describe
  `;
    const expected = `
    describe("Complex scenario", () => { 
      test("should handle nested blocks", () => {
        
        try {
          
          if (someCondition) {
            
            const process = () => {
              
              return 1; 
            }; 
            process();
          } 
        } catch (error) {
          
          console.error(error); 
        } 
        
      }); 
    }); 
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Complex nested structure comment removal failed"
    );
  });

  test("should remove comments after various statements", () => {
    const code = `
    import { func } from './module'; // import comment
    const x = 10; // declaration comment
    x = 20; // assignment comment
    func(); // function call comment
    if (x > 10) { // if condition comment
      return x; // return comment
    } else {
      throw new Error("Error"); // throw comment
    }
    const arr = [1, 2]; // array comment
    const obj = { a: 1 }; // object comment
    console.log(obj.a); // property access comment
  `;
    const expected = `
    import { func } from './module'; 
    const x = 10; 
    x = 20; 
    func(); 
    if (x > 10) { 
      return x; 
    } else {
      throw new Error("Error"); 
    }
    const arr = [1, 2]; 
    const obj = { a: 1 }; 
    console.log(obj.a); 
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments after various statements failed"
    );
  });

  test("should remove comments after closing tokens on same line", () => {
    const code = `
    const arr = [1, 2]; // comment after array literal
    callFunc(arg1, arg2); // comment after function call
    const obj = { a: 1 }; /* comment after object literal */
    if (cond) { // comment after if condition
      // inside block
    } {/* comment after block */}
    while(true) { break; } // comment after while
    for(;;) { break; } /* comment after for */
  `;
    const expected = `
    const arr = [1, 2]; 
    callFunc(arg1, arg2); 
    const obj = { a: 1 }; 
    if (cond) { 
      
    } 
    while(true) { break; } 
    for(;;) { break; } 
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments after closing tokens on same line failed"
    );
  });

  test("should handle comments within a sequence of statements", () => {
    const code = `
    function processData(data) {
      // Start processing
      let result = data + 10; // Add offset
      if (result > 100) { // Check threshold
        result = 100; /* Cap the result */
      }
      console.log("Processed:", result); // Log final result
      return result; // Return value
    }
  `;
    const expected = `
    function processData(data) {
      
      let result = data + 10; 
      if (result > 100) { 
        result = 100; 
      }
      console.log("Processed:", result); 
      return result; 
    }
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comments within a sequence of statements failed"
    );
  });

  test("should handle complex block structure", () => {
    const code = `
    test("complex block test", () => {
      let data = null; // Initial data
      try {
        // Attempt to fetch data
        data = fetchData(); // Fetch data call
        if (data) { // Check if data exists
          process(data); /* Process the data */
          console.log("Success"); // Log success
        } else {
          console.warn("No data"); // Log warning
        } // End if
      } catch (e) { // Catch error
        // Handle error
        console.error("Error:", e); // Log error
        throw new Error("Failed"); // Re-throw
      } // End try-catch
      // After try-catch
      const final = data ? "ok" : "fail"; // Final status
      expect(final).toBe("ok"); // Assertion
    }); // End test
  `;
    const expected = `
    test("complex block test", () => {
      let data = null; 
      try {
        
        data = fetchData(); 
        if (data) { 
          process(data); 
          console.log("Success"); 
        } else {
          console.warn("No data"); 
        } 
      } catch (e) { 
        
        console.error("Error:", e); 
        throw new Error("Failed"); 
      } 
      
      const final = data ? "ok" : "fail"; 
      expect(final).toBe("ok"); 
    }); 
  `;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Complex block structure mimicking test case failed"
    );
  });

  test("should remove comment immediately after template literal with expression", () => {
    const code = `
// comment
console.log(\`\${1}\`);
// comment
`;
    const expected = `

console.log(\`\${1}\`);

`;
    assert.strictEqual(
      removeJsJsxComments(code),
      expected,
      "Comment after template literal with expression failed"
    );
  });
});

describe("removeJsJsxCommentsNullReplacer", () => {
  const removeAllCommentsAndEmptyLinesReplacer: CommentReplacer = (
    commentInfo
  ) => {
    return null;
  };

  test("should remove single-line comment AND line if only comment", () => {
    const code = `
    const a = 1;
    // This line should be removed
    const b = 2; // This comment should be removed, line stays
  `;
    const expected = `
    const a = 1;
    const b = 2; 
  `;
    assert.strictEqual(
      removeJsJsxComments(code, removeAllCommentsAndEmptyLinesReplacer),
      expected
    );
  });

  test("should handle mixed comments with line removal", () => {
    const code = `
    // Remove this line
    const x = 10; /* Remove comment, keep line */
    // Remove this line too
    const y = 20; {/* Remove comment, keep line */}
    // Last line to remove
  `;
    const expected = `
    const x = 10; 
    const y = 20; 
  `;
    assert.strictEqual(
      removeJsJsxComments(code, removeAllCommentsAndEmptyLinesReplacer),
      expected
    );
  });

  test("should handle comments on lines with only whitespace", () => {
    const code = `
    const a = 1;
      // remove this indented line
      /* remove this block */   \t
 \t {/* remove jsx */}
    const b = 2;
  `;
    const expected = `
    const a = 1;
    const b = 2;
  `;
    assert.strictEqual(
      removeJsJsxComments(code, removeAllCommentsAndEmptyLinesReplacer),
      expected
    );
  });

  test("should keep JSDoc but remove other comment lines (custom null replacer)", () => {
    const code = `
    /**
     * Keep this JSDoc block.
     */
    // Remove this line
    function greet(name: string) {
      // Remove this line
      /* Remove this block comment line */
      console.log(\`Hello, \${name}\`); // Remove comment, keep line
    }
    // Remove this line
  `;
    const expected = `
    /**
     * Keep this JSDoc block.
     */
    function greet(name: string) {
      console.log(\`Hello, \${name}\`); 
    }
  `;
    assert.strictEqual(
      removeJsJsxComments(code, keepOnlyJsDocAndRemoveEmptyLinesReplacer),
      expected
    );
  });

  test("should remove comment line even with leading/trailing whitespace", () => {
    const code = `
    Keep this line;
    \t // Remove this line with leading tab
    Keep this line too;
        /* Remove this line with leading spaces */ \t
    And this one;
      {/* Remove this line with surrounding space */}  \nKeep final line;
  `;
    const expected = `
    Keep this line;
    Keep this line too;
    And this one;
Keep final line;
  `;
    assert.strictEqual(
      removeJsJsxComments(code, removeAllCommentsAndEmptyLinesReplacer),
      expected
    );
  });

  test("should handle file starting with removable comment line", () => {
    const code = `// Remove this first line
const a = 1;
// Remove this line too
const b = 2;`;
    const expected = `const a = 1;
const b = 2;`;
    assert.strictEqual(
      removeJsJsxComments(code, removeAllCommentsAndEmptyLinesReplacer),
      expected
    );
  });

  test("should handle file ending with removable comment line", () => {
    const code = `const a = 1;
// Remove this last line`;
    const expected = `const a = 1;
`;
    assert.strictEqual(
      removeJsJsxComments(code, removeAllCommentsAndEmptyLinesReplacer),
      expected
    );
  });

  test("should handle file ending with removable comment line and no preceding newline", () => {
    const code = `const a = 1;// Remove this only line`;
    const expected = `const a = 1;`;
    assert.strictEqual(
      removeJsJsxComments(code, removeAllCommentsAndEmptyLinesReplacer),
      expected
    );
  });
});
