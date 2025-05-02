export type Logger = (message: string, type?: string) => void;

export type TaskLog = {
  type?: string;
  /** message caption */
  summary?: string;
  /** expand the message to see details */
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
 * The TaskLogger function type.
 * It can initiate a log entry, optionally associated with an async runner function.
 * If a runner is provided, the log entry becomes a "task" entry with progress/cancel capabilities.
 * @template T The return type of the optional runner function.
 * @param message The main log message or summary for the task.
 * @param runner Optional async function to run. If provided, the log entry becomes a task.
 *               It receives a progress reporter (to update the task entry), a child logger, and an AbortSignal.
 * @returns A Promise that resolves with the return value of the runner function if provided, otherwise resolves with void.
 */
export type TaskLogger = <R>(
  message: TaskLog,
  runner?: (
    setLog: (message: TaskLog) => Promise<void>,
    subLog: TaskLogger,
    signal: AbortSignal
  ) => Promise<R>
) => Promise<R>;

export const createTask =
  (
    postMessage: (v: object) => Promise<void>,
    activeTasks: Map<string, AbortController>,
    parentId?: string
  ): TaskLogger =>
  async <R>(
    message: TaskLog,
    runner?: (
      setLog: (message: TaskLog) => Promise<void>,
      subLog: TaskLogger,
      signal: AbortSignal
    ) => Promise<R>
  ): Promise<R> => {
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
      activeTasks.set(id, abort);

      try {
        await setLog({ progress: 0 });
        const subLogger = createTask(postMessage, activeTasks, id);
        const result = await runner(setLog, subLogger, abort.signal);
        await setLog({ progress: 1 });
        return result;
      } catch (e: unknown) {
        await setLog({ detail: `${e}`, progress: -1 });
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
