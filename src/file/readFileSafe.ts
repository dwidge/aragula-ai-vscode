import { readFile } from "fs/promises";

export async function readFileSafe(path: string) {
  return readFile(path, "utf8");
}
