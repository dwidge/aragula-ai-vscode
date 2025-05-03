import { cancellableTimeout } from "./cancellableTimeout";
import { createMultiTask, TaskLogger, TaskRunner } from "./utils/Logger";

export async function runTestSerialTask(logTask: TaskLogger) {
  let resolveStep1: (value: { count: number; message: string }) => void;
  let rejectStep1: (reason?: any) => void;
  const step1ResultP = new Promise<{ count: number; message: string }>(
    (resolve, reject) => {
      resolveStep1 = resolve;
      rejectStep1 = reject;
    }
  );

  let resolveStep2: (value: { count: number; message: string }) => void;
  let rejectStep2: (reason?: any) => void;
  const step2ResultP = new Promise<{ count: number; message: string }>(
    (resolve, reject) => {
      resolveStep2 = resolve;
      rejectStep2 = reject;
    }
  );

  let resolveStep3: (value: {
    count: number;
    message: string;
    final: boolean;
  }) => void;
  let rejectStep3: (reason?: any) => void;
  const step3ResultP = new Promise<{
    count: number;
    message: string;
    final: boolean;
  }>((resolve, reject) => {
    resolveStep3 = resolve;
    rejectStep3 = reject;
  });

  let resolveStep4: (value: string) => void;
  let rejectStep4: (reason?: any) => void;
  const step4ResultP = new Promise<string>((resolve, reject) => {
    resolveStep4 = resolve;
    rejectStep4 = reject;
  });

  const multiTaskRunners: TaskRunner<any>[] = [
    async (setLog, subLog, signal) => {
      try {
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
        resolveStep1(result);
        return result;
      } catch (e) {
        rejectStep1(e);
        throw e;
      }
    },

    async (setLog, subLog, signal) => {
      try {
        await setLog({
          summary: "☐ Step 2: Process data (1s)",
        });
        const prevResult = await step1ResultP;
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
        resolveStep2(nextResult);
        return nextResult;
      } catch (e) {
        rejectStep2(e);
        throw e;
      }
    },

    async (setLog, subLog, signal) => {
      try {
        await setLog({
          summary: "☐ Step 3: Nested step (3s)",
        });
        const prevResult = await step2ResultP;

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
        resolveStep3(nextResult);
        return nextResult;
      } catch (e) {
        rejectStep3(e);
        throw e;
      }
    },

    async (setLog, subLog, signal) => {
      try {
        await setLog({
          summary: "☐ Step 4: Final step (0.5s)",
        });
        const prevResult = await step3ResultP;
        await setLog({
          detail: `Starting Step 4 (0.5s). Received final flag: ${prevResult.final}`,
        });
        await cancellableTimeout(500, signal);
        const result = `Final Result: ${prevResult.message} (Count: ${prevResult.count})`;
        await setLog({
          summary: "☑ Step 4: Final step (0.5s)",
          detail: "Step 4 complete. Sequence finished.",
        });
        resolveStep4(result);
        return result;
      } catch (e) {
        rejectStep4(e);
        throw e;
      }
    },
  ];

  await logTask(
    { summary: "Simulating Flexible Multi-Task Test", type: "task" },
    createMultiTask(multiTaskRunners)
  );
}
