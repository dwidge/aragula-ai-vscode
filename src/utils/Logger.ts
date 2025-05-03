export type Logger = (message: string, type?: string) => void;

export type TaskLog = {
  type?: string;
  /** Message caption */
  summary?: string;
  /** Expand the message to see details */
  detail?: string;
  /** 0 pending, 0..1 busy, 1 complete, -1..0 failed */
  progress?: number;
};

type LogCommand = {
  command: "log";
  id: string;
  parentId?: string;
  message?: TaskLog;
};

/**
 * A runner function for a task.
 * @template R The return type of the runner.
 * @param setLog Function to update the log entry.
 * @param subLog TaskLogger for creating nested tasks.
 * @param signal AbortSignal to check for cancellation.
 * @returns A Promise resolving with the result of the task.
 */
export type TaskRunner<R> = (
  setLog: (message: TaskLog) => Promise<void>,
  subLog: TaskLogger,
  signal: AbortSignal
) => Promise<R>;

/**
 * The TaskLogger function type.
 * It can initiate a log entry, optionally associated with an async task runner function.
 * If a runner is provided, the log entry becomes a "task" entry with progress/cancel capabilities.
 * @template T The return type of the optional runner function.
 * @param message The main log message or summary for the task.
 * @param runner Optional async function to run. If provided, the log entry becomes a task.
 *               It receives a progress reporter (to update the task entry), a child logger, and an AbortSignal.
 * @returns A Promise that resolves with the return value of the runner function if provided, otherwise resolves with void.
 */
export type TaskLogger = <R>(
  message: TaskLog,
  runner?: TaskRunner<R>
) => Promise<R>;

export type ActiveTasks = Map<string, [AbortController, string | undefined]>;

export const createTask =
  (
    postMessage: (v: object) => Promise<void>,
    activeTasks: ActiveTasks,
    parentId?: string
  ): TaskLogger =>
  async <R>(message: TaskLog, runner?: TaskRunner<R>): Promise<R> => {
    const id = randId();

    const setLog: (message: TaskLog) => Promise<void> = (message) =>
      postMessage({
        command: "log",
        id,
        parentId,
        message,
      } as LogCommand);

    await setLog(message);

    if (runner) {
      const abort = new AbortController();
      activeTasks.set(id, [abort, parentId]);

      try {
        await setLog({ progress: 0 });
        const subLogger = createTask(postMessage, activeTasks, id);
        const result = await runner(setLog, subLogger, abort.signal);
        await setLog({ progress: 1 });
        return result;
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") {
          await setLog({ detail: `Task cancelled.`, progress: -1 });
        } else {
          await setLog({ detail: `${e}`, progress: -1 });
        }
        throw e;
      } finally {
        activeTasks.delete(id);
      }
    } else {
      return undefined as R;
    }
  };

const randId = (length = 5): string => Math.random().toFixed(length).slice(2);

export const createMessageLogger =
  (taskLogger: TaskLogger): Logger =>
  (msg: string, type?: string) => {
    const [firstLine, ...rest] = msg.split("\n");
    return taskLogger({
      summary: firstLine.trim(),
      detail: rest.join("\n").trim(),
      type: type || "log",
    });
  };

export const createErrorLogger =
  (taskLogger: TaskLogger): Logger =>
  (e: unknown) =>
    taskLogger({
      type: "error",
      summary: "An error occurred",
      detail: `${e instanceof Error ? e.message : String(e)}`,
    });

export function cancelTask(taskId: string, activeTasks: ActiveTasks) {
  const taskEntry = activeTasks.get(taskId);
  if (taskEntry) {
    const [controller] = taskEntry;
    controller.abort();
    activeTasks.delete(taskId);
  }

  for (const [childId, [, parentId]] of activeTasks.entries()) {
    if (parentId === taskId) {
      cancelTask(childId, activeTasks);
    }
  }
}

export function cancelAllTasks(activeTasks: ActiveTasks) {
  activeTasks.forEach(([controller]) => controller.abort());
  activeTasks.clear();
}

/**
 * Creates a runner function that executes multiple sub-runners concurrently.
 * The main task's progress is updated based on the number of completed sub-tasks.
 * @template T The array of return types for the runners.
 * @param runners An array of runner functions to execute concurrently.
 * @returns A runner function suitable for `TaskLogger`, which returns a promise resolving with an array of results from the sub-runners.
 */
export const createMultiTask =
  <T extends readonly unknown[]>(runners: {
    [K in keyof T]: TaskRunner<T[K]>;
  }) =>
  async (
    setLog: (message: TaskLog) => Promise<void>,
    subLog: TaskLogger,
    signal: AbortSignal
  ): Promise<T> => {
    const total = runners.length;
    let completed = 0;

    if (signal.aborted) {
      throw new Error("AbortError");
    }

    const taskPromises = runners.map(async (runner, index) =>
      subLog({ summary: `Task ${index + 1}`, type: "task" }, runner).finally(
        async () => {
          completed++;
          await setLog({ progress: completed / total });
        }
      )
    );

    return Promise.all(taskPromises) as unknown as Promise<T>;
  };

/**
 * A runner function for a task that can depend on the results of preceding tasks in an array.
 * @template R The return type of this runner.
 * @template PrevResults A tuple type representing the return types of the runners preceding this one in the array.
 * @param setLog Function to update the log entry for this specific task.
 * @param subLog TaskLogger for creating nested tasks within this task.
 * @param signal AbortSignal to check for cancellation.
 * @param prevResults An array of Promises, where the i-th promise resolves with the result of the i-th runner in the original array (for i < this runner's index).
 * @returns A Promise resolving with the result of this task.
 */
export type DependentTaskRunner<R, PrevResults extends readonly unknown[]> = (
  setLog: (message: TaskLog) => Promise<void>,
  subLog: TaskLogger,
  signal: AbortSignal,
  prevResults: { [K in keyof PrevResults]: Promise<PrevResults[K]> }
) => Promise<R>;

/**
 * Creates a runner function that executes multiple sub-runners concurrently,
 * allowing each runner to depend on the results of preceding runners in the array.
 * The main task's progress is updated based on the number of completed sub-tasks.
 *
 * Note: All runners are started concurrently by `createMultiTask`. Dependencies are managed by
 * awaiting the promises in the `prevResults` array within each `DependentTaskRunner`.
 * Each `DependentTaskRunner` is responsible for setting its own initial summary/detail
 * and updating its status (e.g., using checkboxes in the summary) as it progresses
 * and when it completes.
 *
 * @template T The array of return types for the runners.
 * @param runners An array of dependent runner functions to execute.
 *                The i-th runner receives promises for the results of runners 0 through i-1.
 * @returns A runner function suitable for `TaskLogger`, which returns a promise resolving with an array of results from the sub-runners.
 */
export const createDependentTasks =
  <T extends readonly unknown[]>(runners: {
    [K in keyof T]: DependentTaskRunner<T[K], any>;
  }) =>
  async (
    setLog: (message: TaskLog) => Promise<void>,
    subLog: TaskLogger,
    signal: AbortSignal
  ): Promise<T> => {
    const total = runners.length;
    if (total === 0) {
      return [] as unknown as T;
    }

    const resultPromises: Promise<any>[] = [];
    const resolveFns: ((value: any) => void)[] = [];
    const rejectFns: ((reason?: any) => void)[] = [];

    for (let i = 0; i < total; i++) {
      let resolve!: (value: any) => void;
      let reject!: (reason?: any) => void;
      const p = new Promise<any>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      resultPromises.push(p);
      resolveFns.push(resolve);
      rejectFns.push(reject);
    }

    const wrappedRunners: TaskRunner<any>[] = runners.map(
      (originalRunner, index) => {
        return async (multiSetLog, multiSubLog, multiSignal) => {
          const prevResultsPromises = resultPromises.slice(0, index) as any;

          try {
            const result = await originalRunner(
              multiSetLog,
              multiSubLog,
              multiSignal,
              prevResultsPromises
            );
            resolveFns[index](result);
            return result;
          } catch (e) {
            rejectFns[index](e);
            throw e;
          }
        };
      }
    );

    return createMultiTask(wrappedRunners)(
      setLog,
      subLog,
      signal
    ) as unknown as Promise<T>;
  };
