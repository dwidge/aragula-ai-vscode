import { spawn } from "child_process";
import { getWorkspaceRoot } from "./getWorkspaceAbsolutePath";
import { TaskLogger } from "./utils/Logger";

export const handleRunCommand = (command: string, logTask: TaskLogger) =>
  logTask(
    {
      summary: `Running command: ${command}`,
      type: "task",
      progress: 0,
    },
    async (progress, log, signal) => {
      const workspaceRoot = getWorkspaceRoot();

      let output = "";
      let interval: NodeJS.Timeout | null = null;
      let elapsedSeconds = 0;

      return new Promise<string>((resolve, reject) => {
        const process = spawn(command, [], {
          cwd: workspaceRoot.fsPath,
          shell: true,
        });

        signal.onabort = () => {
          process.kill();
          if (interval) {
            clearInterval(interval);
          }
          reject(new Error("Task aborted"));
        };

        process.stdout.on("data", (data) => {
          output += data.toString();
          progress({ detail: output });
        });

        process.stderr.on("data", (data) => {
          output += data.toString();
          progress({ detail: output });
        });

        process.on("error", (err) => {
          if (interval) {
            clearInterval(interval);
          }
          reject(err);
        });

        process.on("close", (code) => {
          if (interval) {
            clearInterval(interval);
          }
          if (code === 0) {
            resolve(output);
          } else {
            reject(
              new Error(`Command exited with code ${code}\nOutput:\n${output}`)
            );
          }
        });

        interval = setInterval(() => {
          elapsedSeconds += 2;
          progress({ progress: Math.min(0.99, elapsedSeconds / 60) });
        }, 2000);
      });
    }
  );
