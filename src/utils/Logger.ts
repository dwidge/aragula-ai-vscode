import { JsonSchema } from "../aiTools/JsonSchema";

export type Logger = (message: string, type?: string) => void;

export type TaskLog = {
  type?: string;
  /** Message caption */
  summary?: string;
  /** Expand the message to see details */
  detail?: string;
  /** 0 pending, 0..1 busy, 1 complete, -1..0 failed */
  progress?: number;
  /** JSON schema for a form to render, or null to remove an existing form */
  formSchema?: JsonSchema | null;
  /** Data for a form to render, or null to clear it */
  formData?: object | null;
  /** Buttons to show in task */
  buttons?: string[];
};

export type FormRequest = {
  id: string;
  parentId: string;
  message: string;
  schema: object;
};

export type FormResponse = {
  id: string;
  isCancelled: boolean;
  formData?: object;
};

type LogCommand = {
  command: "log";
  id: string;
  parentId?: string;
  message?: TaskLog;
};

type FormCommand = {
  command: "promptForm";
  formRequest: FormRequest;
};

type FormResponseCommand = {
  command: "formResponse";
  formResponse: FormResponse;
};

/**
 * A runner function for a task.
 * @template R The return type of the runner.
 * @param setLog Function to update the log entry.
 * @param subLog TaskLogger for creating nested tasks.
 * @param signal AbortSignal to check for cancellation.
 * @param requestForm Function to prompt the user for form input.
 * @returns A Promise resolving with the result of the task.
 */
export type TaskRunner<R> = (
  setLog: (message: TaskLog) => Promise<void>,
  subLog: TaskLogger,
  signal: AbortSignal,
  requestForm: <T extends object>(message: string, schema: object) => Promise<T>
) => Promise<R>;

/**
 * The TaskLogger function type.
 * It can initiate a log entry, optionally associated with an async task runner function.
 * If a runner is provided, the log entry becomes a "task" entry with progress/cancel capabilities.
 * @template T The return type of the optional runner function.
 * @param message The main log message or summary for the task.
 * @param runner Optional async function to run. If provided, the log entry becomes a task.
 *               It receives a progress reporter (to update the task entry), a child logger, an AbortSignal, and a form request function.
 * @returns A Promise that resolves with the return value of the runner function if provided, otherwise resolves with void.
 */
export type TaskLogger = <R>(
  message: TaskLog,
  runner?: TaskRunner<R>
) => Promise<R>;

export type ActiveTasks = Map<string, [AbortController, string | undefined]>;
export type PendingFormRequests = Map<
  string,
  { resolve: (value: any) => void; reject: (reason?: any) => void }
>;

export const createTask =
  (
    postMessage: (v: object) => Promise<void>,
    activeTasks: ActiveTasks,
    parentId?: string,
    pendingFormRequests?: PendingFormRequests
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

    const requestForm = async <T extends object>(
      formMessage: string,
      schema: object
    ): Promise<T> => {
      if (!pendingFormRequests) {
        throw new Error("Form requests not supported in this context.");
      }
      const formId = randId();
      return new Promise<T>((resolve, reject) => {
        pendingFormRequests.set(formId, { resolve, reject });
        postMessage({
          command: "promptForm",
          formRequest: {
            id: formId,
            parentId: id,
            message: formMessage,
            schema,
          },
        } as FormCommand);
      });
    };

    await setLog(message);

    if (runner) {
      const abort = new AbortController();
      activeTasks.set(id, [abort, parentId]);

      try {
        await setLog({ progress: 0 });
        const subLogger = createTask(
          postMessage,
          activeTasks,
          id,
          pendingFormRequests
        );
        const result = await runner(
          setLog,
          subLogger,
          abort.signal,
          requestForm
        );
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
    signal: AbortSignal,
    requestForm: <T extends object>(
      message: string,
      schema: object
    ) => Promise<T>
  ): Promise<T> => {
    const total = runners.length;
    let completed = 0;

    if (signal.aborted) {
      const abortError = new Error("Task aborted");
      abortError.name = "AbortError";
      throw abortError;
    }

    const taskPromises = runners.map(async (runner, index) =>
      subLog({ summary: `Task ${index + 1}`, type: "task" }, runner).then(
        async (r) => {
          completed++;
          await setLog({ progress: completed / total });
          return r;
        }
      )
    );

    return Promise.all(taskPromises) as unknown as Promise<T>;
  };

/**
 * A runner function for a task that can depend on the results of preceding tasks in an array.
 * It receives promises for the results of ALL tasks in the sequence.
 * @template R The return type of this specific runner.
 * @template AllResults A tuple type representing the return types of ALL runners in the sequence.
 * @param setLog Function to update the log entry for this specific task.
 * @param subLog TaskLogger for creating nested tasks within this task.
 * @param signal AbortSignal to check for cancellation.
 * @param allResultPromises A tuple of Promises, where the i-th promise resolves with the result of the i-th runner. The runner should typically only await promises with indices less than its own if strict serial dependency is required, but the type allows accessing any promise.
 * @param requestForm Function to prompt the user for form input.
 * @returns A Promise resolving with the result of this task (type R).
 */
export type DependentRunner<R, AllResults extends readonly unknown[]> = (
  setLog: (message: TaskLog) => Promise<void>,
  subLog: TaskLogger,
  signal: AbortSignal,
  allResultPromises: { [K in keyof AllResults]: Promise<AllResults[K]> },
  requestForm: <T extends object>(message: string, schema: object) => Promise<T>
) => Promise<R>;

/**
 * Creates a runner function that executes multiple sub-runners concurrently,
 * allowing each runner to depend on the results of preceding runners in the array
 * by providing promises for ALL results to each runner.
 * The main task's progress is updated based on the number of completed sub-tasks.
 *
 * @template T The array of return types for the runners.
 * @param runners An array of dependent runner functions. Each receives promises for all results and returns its specific result type.
 * @returns A runner function suitable for `TaskLogger`, which returns a promise resolving with an array of results from the sub-runners.
 */
export const createDependentTasks =
  <T extends readonly unknown[]>(runners: {
    [K in keyof T]: DependentRunner<T[K], T>;
  }) =>
  async (
    setLog: (message: TaskLog) => Promise<void>,
    subLog: TaskLogger,
    signal: AbortSignal,
    requestForm: <T extends object>(
      message: string,
      schema: object
    ) => Promise<T>
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

    const wrappedRunners: { [K in keyof T]: TaskRunner<T[K]> } = runners.map(
      (originalRunner, index) =>
        async (taskSetLog, taskSubLog, taskSignal, _requestForm) => {
          const allResultPromises = resultPromises as {
            [K in keyof T]: Promise<T[K]>;
          };

          try {
            const result = await originalRunner(
              taskSetLog,
              taskSubLog,
              taskSignal,
              allResultPromises,
              requestForm
            );
            resolveFns[index](result);
            return result;
          } catch (e) {
            rejectFns[index](e);
            throw e;
          }
        }
    ) as { [K in keyof T]: TaskRunner<T[K]> };

    return createMultiTask(wrappedRunners)(setLog, subLog, signal, requestForm);
  };
