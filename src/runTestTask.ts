import { cancellableTimeout } from "./cancellableTimeout";
import { TaskLogger } from "./utils/Logger";

export async function runTestTask(logTask: TaskLogger) {
  await logTask(
    { summary: "Simulating Main Task", type: "task" },
    async (setLog, subLog, signal) => {
      await setLog({ detail: "Starting main task..." });

      await subLog(
        { summary: "Subtask 1: Instant step", type: "task" },
        async (setLog, subLog, signal) => {
          await setLog({ detail: "Performing instant action..." });
          await cancellableTimeout(100, signal);
          await setLog({ detail: "Instant action complete." });
        }
      );
      await setLog({ progress: 0.3 });

      await subLog(
        { summary: "Subtask 2: Delayed step (5s)", type: "task" },
        async (setLog, subLog, signal) => {
          await setLog({ detail: "Starting delayed action..." });
          for (let i = 0; i <= 10; i++) {
            await cancellableTimeout(500, signal);
            await setLog({ progress: i / 10, detail: `Progress: ${i * 10}%` });
          }
          await setLog({ detail: "Delayed action complete." });
        }
      );
      await setLog({ progress: 0.7 });

      await subLog(
        { summary: "Subtask 3: Nested task", type: "task" },
        async (setLog, subLog, signal) => {
          await setLog({ detail: "Starting nested task..." });

          await subLog(
            { summary: "Nested Subtask A", type: "task" },
            async (setLog, subLog, signal) => {
              await setLog({ detail: "Running nested subtask A..." });
              await cancellableTimeout(2000, signal);
              await setLog({ detail: "Nested subtask A complete." });
            }
          );
          await setLog({ progress: 0.5, detail: "Nested task progress: 50%" });

          await subLog(
            { summary: "Nested Subtask B", type: "task" },
            async (setLog, subLog, signal) => {
              await setLog({ detail: "Running nested subtask B..." });
              await cancellableTimeout(5000, signal);
              await setLog({ detail: "Nested subtask B complete." });
            }
          );
          await setLog({ detail: "Nested task complete." });
        }
      );
      await setLog({ progress: 0.9 });

      await subLog({ summary: "Subtask 4: Final step", type: "task" });
      await setLog({ detail: "Main task complete." });
    }
  );
}
