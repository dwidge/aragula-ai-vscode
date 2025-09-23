export async function cancellableTimeout(
  ms: number,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Aborted"));
      return;
    }

    const timeoutId = setTimeout(() => {
      resolve();
    }, ms);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(new Error("Aborted"));
      },
      { once: true }
    );
  });
}
