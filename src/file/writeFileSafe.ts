import { writeFile } from "fs/promises";
import { sleep } from "openai/core.mjs";

export async function writeFileSafe(path: string, content: string) {
  await writeFile(path, content, "utf8");
  await sleep(300);
}
