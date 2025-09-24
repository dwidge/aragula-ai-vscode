import * as vscode from "vscode";

export const withProgress = async <R>(
  location: vscode.ProgressLocation,
  callback: (
    signal: AbortSignal,
    progress: (message: string) => void
  ) => Promise<R>
) => {
  let result: R;
  const abortController = new AbortController();

  await vscode.window.withProgress(
    {
      location,
      title: "Generating Commit Message...",
      cancellable: true,
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        abortController.abort();
      });

      try {
        result = await callback(abortController.signal, (message) =>
          progress.report({ message })
        );
      } catch (error: unknown) {
        if (!abortController.signal.aborted) {
          throw error;
        }
      } finally {
        progress.report({ increment: 100 });
      }
    }
  );

  return result!;
};
