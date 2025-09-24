import { toShortRelativePath } from "@/git/toRelativePath";
import { getWorkspaceAbsolutePath } from "@/vscode/getWorkspaceAbsolutePath";
import { createProjectSync, ts } from "@ts-morph/bootstrap";
import * as fs from "fs";
import * as fsSync from "fs";
import * as path from "path";

export function getCodebaseSummary(relDir: string): Record<string, string> {
  const dirPath = getWorkspaceAbsolutePath(relDir);
  if (!fsSync.existsSync(dirPath)) {
    throw new Error("Directory not found: " + dirPath);
  }

  const filesOnDisk: Record<string, string> = {};
  const codebaseSummary: Record<string, string> = {};

  // 1. Traverse the directory and collect all relevant file paths and contents
  function collectFiles(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        // Store path relative to dirPath for cleaner virtual paths
        const relativePath = path
          .relative(dirPath, fullPath)
          .replace(/\\/g, "/");
        filesOnDisk[relativePath] = fs.readFileSync(fullPath, "utf8");
      }
    }
  }
  collectFiles(dirPath);

  // 2. Set up Compiler Options
  const compilerOptions: ts.CompilerOptions = {
    allowJs: true, // Allow JavaScript files to be processed
    declaration: true, // Generate .d.ts files
    emitCodebaseOnly: true, // Only emit .d.ts files
    // Adjust other options as needed for your project context
    lib: ["lib.es2020.d.ts", "lib.dom.d.ts"],
    jsx: ts.JsxEmit.React, // If you have JSX files
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    baseUrl: ".",
  };

  // 3. Create a project with an in-memory file system
  const project = createProjectSync({
    compilerOptions,
    useInMemoryFileSystem: true,
  });

  // Add all collected files to the project's source files.
  // This is important because we need to explicitly add the files for compilation.
  Object.keys(filesOnDisk).forEach((relativePath) => {
    const existing = project.getSourceFile(relativePath);
    if (existing) {
      project.removeSourceFile(existing);
    }
    project.createSourceFile(relativePath, filesOnDisk[relativePath]);
  });

  // 4. Emit declarations by providing a writeFile callback to capture .d.ts files
  const program = project.createProgram();
  const writeFileCallback = (
    fileName: string,
    data: string,
    writeByteOrderMark?: boolean
  ): void => {
    if (fileName.endsWith(".d.ts")) {
      // Normalize path to be consistent (e.g., replace backslashes on Windows)
      codebaseSummary[toShortRelativePath(path.join(relDir, fileName))] = data;
    }
  };
  const emitResult = program.emit(undefined, writeFileCallback);

  // Optional: Check for diagnostics
  const diagnostics = emitResult.diagnostics;
  if (diagnostics.length > 0) {
    // You might want to log these or handle them based on your needs
    // console.warn("Compiler diagnostics:", project.formatDiagnosticsWithColorAndContext(diagnostics));
  }

  return codebaseSummary;
}
