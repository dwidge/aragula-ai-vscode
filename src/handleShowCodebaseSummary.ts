import { getCodebaseSummary } from "@/codebase/getCodebaseSummary";
import { toRelativePath } from "@/git/toRelativePath";
import { TaskLogger } from "@/utils/Logger";
import { getWorkspaceRoot } from "@/vscode/getWorkspaceAbsolutePath";
import * as fsSync from "fs";
import path from "path";

export const handleShowCodebaseSummary = (log: TaskLogger, targetDir = "src") =>
  log(
    {
      summary: `Show Codebase Summary`,
      type: "task",
    },
    async (progress, log, signal) => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        throw new Error("No workspace root found");
      }

      const absDir = path.join(workspaceRoot.fsPath, targetDir);
      if (!fsSync.existsSync(absDir)) {
        throw new Error("Directory not found: " + absDir);
      }

      log({
        summary: `Compiling "${targetDir}" directory...`,
      });

      const codebaseSummary = getCodebaseSummary(absDir);

      log({
        summary: `Generated ${
          Object.keys(codebaseSummary).length
        } declaration files.`,
      });

      for (const [filePath, content] of Object.entries(codebaseSummary)) {
        log({
          summary: toRelativePath(path.join(targetDir, filePath)),
          detail: content,
          type: "info",
        });
      }
    }
  );
