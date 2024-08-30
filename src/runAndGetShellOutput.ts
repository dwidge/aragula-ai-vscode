import { execPromiseWithTimeout } from "./execPromiseWithTimeout";

export const runAndGetShellOutput = async (command: string) => {
  try {
    const { stdout, stderr } = await execPromiseWithTimeout(command, 10000);
    return removeAnsiColors(stdout + "\n" + stderr);
  } catch (err) {
    console.log("runAndGetShellOutput1", err);
    return removeAnsiColors((err as Error).message);
  }
};

const removeAnsiColors = (text: string): string => {
  const ansiRegex = /\x1B\[[0-9;]*m/g;
  return text.replace(ansiRegex, "");
};
