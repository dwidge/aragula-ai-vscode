import { cancellableTimeout } from "@/utils/cancellableTimeout";
import { TaskLogger, createMultiTask } from "@/utils/Logger";

export async function runTestMultiTask(logTask: TaskLogger) {
  await logTask(
    { summary: "Simulating Multi-Task Test", type: "task" },
    createMultiTask([
      async (setLog, subLog, signal) => {
        await setLog({
          summary: "☐ Task 1: Instant step (2s)",
          detail: "Starting Task 1 (2s)...",
        });
        await cancellableTimeout(2000, signal);
        await setLog({
          summary: "☑ Task 1: Instant step (2s)",
          detail: "Task 1 complete.",
        });
        return "Result 1";
      },
      async (setLog, subLog, signal) => {
        await setLog({
          summary: "☐ Task 2: Delayed step (3s)",
          detail: "Starting Task 2 (3s)...",
        });
        await cancellableTimeout(3000, signal);
        await setLog({
          summary: "☑ Task 2: Delayed step (3s)",
          detail: "Task 2 complete.",
        });
        return 2;
      },
      async (setLog, subLog, signal) => {
        await setLog({
          summary: "☐ Task 3: Quick step (1s)",
          detail: "Starting Task 3 (1s)...",
        });
        await cancellableTimeout(1000, signal);
        await setLog({
          summary: "☑ Task 3: Quick step (1s)",
          detail: "Task 3 complete.",
        });
        return { success: true };
      },
      async (setLog, subLog, signal) => {
        await setLog({
          summary: "☐ Task 4: Nested task",
          detail: "Starting Task 4 (nested)...",
        });
        await subLog(
          { summary: "☐ Nested Task A", type: "task" },
          async (nestedSetLog, nestedSubLog, nestedSignal) => {
            await nestedSetLog({ detail: "Running nested A (1.5s)..." });
            await cancellableTimeout(1500, nestedSignal);
            await nestedSetLog({
              summary: "☑ Nested Task A",
              detail: "Nested A complete.",
            });
            return "Nested A Result";
          }
        );
        await setLog({
          summary: "☑ Task 4: Nested task",
          detail: "Task 4 complete.",
        });
        return ["Result 4a"];
      },
    ])
  );
}
