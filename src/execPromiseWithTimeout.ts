import { exec } from "node:child_process";

export async function execPromiseWithTimeout(
  command: string,
  timeout: number
): Promise<{ stdout: string; stderr: string }> {
  const execPromiseWithTimeout = new Promise<{
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const process = exec(
      command,
      { timeout, shell: determineShell() },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      }
    );

    // Uncomment the following lines if you want to enforce a timeout
    // setTimeout(() => {
    //   process.kill();
    //   reject(new Error("Command timed out"));
    // }, timeout);
  });

  return execPromiseWithTimeout;
}

const determineShell = (): string => {
  return process.platform === "win32" ? "powershell.exe" : "bash";
};
