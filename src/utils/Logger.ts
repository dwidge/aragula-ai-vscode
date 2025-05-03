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
      throw new Error("Aborted");
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
