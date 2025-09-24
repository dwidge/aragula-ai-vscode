import { TaskLogger, TaskRunner } from "@/utils/Logger";

export const runTaskWithCatch = <T>(
  logTask: TaskLogger,
  summary: string,
  task: TaskRunner<T>
) =>
  logTask({ summary, type: "task" }, (progress, logTask, ...abc) =>
    task(progress, logTask, ...abc).catch((error) => {
      const [message, ...details] = `${error}`.split("\n");
      logTask({
        summary: `${message}`,
        detail: `${details.join("\n")}`,
      });
    })
  );
