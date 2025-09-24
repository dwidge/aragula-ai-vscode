import { getCodebaseSummary } from "@/codebase/getCodebaseSummary";
import { TaskLogger } from "@/utils/Logger";
import { getWorkspaceRoot } from "@/vscode/getWorkspaceAbsolutePath";

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

      log({
        summary: `Compiling "${targetDir}" directory...`,
      });

      const codebaseSummary = getCodebaseSummary(targetDir);

      log({
        summary: `Generated ${
          Object.keys(codebaseSummary).length
        } declaration files.`,
      });

      for (const [filePath, content] of Object.entries(codebaseSummary)) {
        log({
          summary: filePath,
          detail: content,
          type: "info",
        });
      }
    }
  );
