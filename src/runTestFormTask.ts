import { TaskLogger } from "./utils/Logger";

export async function runTestFormTask(logTask: TaskLogger) {
  await logTask(
    { summary: "Simulating Form Request Task", type: "task" },
    async (setLog, subLog, signal, requestForm) => {
      await setLog({ detail: "Starting form request test..." });

      try {
        const formData = await requestForm("Please enter your details:", {
          type: "object",
          properties: {
            name: { type: "string", title: "Your Name" },
            email: { type: "string", title: "Your Email", format: "email" },
            age: { type: "number", title: "Your Age" },
          },
          required: ["name", "email"],
        });
        await setLog({
          summary: "Form Submitted!",
          detail: `Received form data: ${JSON.stringify(formData, null, 2)}`,
          type: "info",
        });
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") {
          await setLog({
            summary: "Form Request Cancelled",
            detail: "User cancelled the form submission.",
            type: "warning",
          });
        } else {
          await setLog({
            summary: "Form Request Failed",
            detail: `An unexpected error occurred: ${e}`,
            type: "error",
          });
        }
      }

      await setLog({ detail: "Form request test complete." });
    }
  );
}
