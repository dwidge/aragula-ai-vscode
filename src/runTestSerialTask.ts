import { cancellableTimeout } from "./utils/cancellableTimeout";
import { createDependentTasks, TaskLogger } from "./utils/Logger";

export async function runTestSerialTask(logTask: TaskLogger) {
  await logTask(
    { summary: "Simulating Dependent Multi-Task Test", type: "task" },
    createDependentTasks<
      [
        {
          count: number;
          message: string;
        },
        {
          count: number;
          message: string;
        },
        {
          count: number;
          final: boolean;
          message: string;
        },
        string
      ]
    >([
      async (setLog, subLog, signal, allResults) => {
        await setLog({
          summary: "☐ Step 1: Initial step (2s)",
          detail: "Starting Step 1 (2s)...",
        });
        await cancellableTimeout(2000, signal);
        const result = { count: 1, message: "Hello" };
        await setLog({
          summary: "☑ Step 1: Initial step (2s)",
          detail: "Step 1 complete. Returning initial data.",
        });
        return result;
      },

      async (setLog, subLog, signal, allResults) => {
        await setLog({
          summary: "☐ Step 2: Process data (1s)",
        });
        const prevResult = await allResults[0];
        await setLog({
          detail: `Starting Step 2 (1s). Received: ${JSON.stringify(
            prevResult
          )}`,
        });
        await cancellableTimeout(1000, signal);
        const nextResult = {
          ...prevResult,
          count: prevResult.count + 1,
          message: prevResult.message + " World",
        };
        await setLog({
          summary: "☑ Step 2: Process data (1s)",
          detail: `Step 2 complete. Returning: ${JSON.stringify(nextResult)}`,
        });
        return nextResult;
      },

      async (setLog, subLog, signal, allResults) => {
        await setLog({
          summary: "☐ Step 3: Nested step (3s)",
        });
        const prevResult = await allResults[1];

        await subLog(
          { summary: "☐ Nested Serial Step A", type: "task" },
          async (nestedSetLog, nestedSubLog, nestedSignal) => {
            await nestedSetLog({ detail: "Running nested A (1.5s)..." });
            await cancellableTimeout(1500, nestedSignal);
            await nestedSetLog({
              summary: "☑ Nested Serial Step A",
              detail: "Nested A complete.",
            });
          }
        );
        await subLog(
          { type: "task" },
          async (nestedSetLog, nestedSubLog, nestedSignal) => {
            await nestedSetLog({
              summary: "☐ Nested Serial Step B",
              detail: "Running nested B (1.5s)...",
            });
            await nestedSetLog({
              detail: `Got ${JSON.stringify(
                prevResult
              )}. Starting nested B (1.5s)...`,
            });
            await cancellableTimeout(1500, nestedSignal);
            await nestedSetLog({
              summary: "☑ Nested Serial Step B",
              detail: "Nested B complete.",
            });
          }
        );

        await setLog({
          detail: `Starting Step 3 (main logic, 1.5s). Received count: ${prevResult.count}`,
        });
        await cancellableTimeout(1500, signal);
        const nextResult = {
          ...prevResult,
          count: prevResult.count + 1,
          final: true,
        };
        await setLog({
          summary: "☑ Step 3: Nested step (3s)",
          detail: `Step 3 complete. Returning final result.`,
        });
        return nextResult;
      },

      async (setLog, subLog, signal, allResults) => {
        await setLog({
          summary: "☐ Step 4: Final step (0.5s)",
        });
        const prevResult = await allResults[2];
        await setLog({
          detail: `Starting Step 4 (0.5s). Received final flag: ${prevResult.final}`,
        });
        await cancellableTimeout(500, signal);
        const result = `Final Result: ${prevResult.message} (Count: ${prevResult.count})`;
        await setLog({
          summary: "☑ Step 4: Final step (0.5s)",
          detail: "Step 4 complete. Sequence finished.",
        });
        return result;
      },
    ])
  );
}
