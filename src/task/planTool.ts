import { AiApiSettings } from "@/ai-api/types/AiApiSettings";
import { AIPlan, PlanStep } from "@/extension";
import { callAI, CallAiProps } from "@/handleSendMessage";
import {
  createDependentTasks,
  createMessageLogger,
  TaskLog,
  TaskLogger,
} from "@/utils/Logger";
import { commitStaged } from "@/vscode/git/commitStaged";
import { getDiffContext } from "@/vscode/git/getDiffContext";
import { stageFiles } from "@/vscode/git/stageFiles";

/**
 * Initiates the plan generation and execution process.
 * @param context Extension context.
 * @param panel Webview panel.
 * @param aiSettings Message from the webview containing plan parameters.
 * @param tabId Current tab ID.
 * @param log Main logger function (TaskLogger).
 */
export async function handlePlanAndExecute(
  aiSettings: CallAiProps,
  logTask: TaskLogger
) {
  const userPrompt = aiSettings.user;
  const systemPrompt = aiSettings.system;
  const providerSetting: AiApiSettings = aiSettings.providerSetting;
  const filePaths = aiSettings.fileNames;
  const includeDiff: boolean = false;

  const diffs = includeDiff
    ? await getDiffContext(createMessageLogger(logTask))
    : undefined;

  const plan = await logTask(
    {
      summary: "Generate plan",
      type: "task",
    },
    generatePlan(userPrompt, diffs, filePaths, systemPrompt, providerSetting)
  );

  await logTask(
    {
      summary: "Execute plan",
      type: "task",
    },
    executePlanSteps(aiSettings, plan)
  );
}

/**
 * Executes the plan steps using createDependentTasks.
 * This function is called after a plan is generated or resumed.
 * @param context Extension context.
 * @param panel Webview panel.
 * @param tabId Current tab ID.
 * @param logTask Main logger function (TaskLogger).
 * @param plan The AI plan to execute.
 * @param startStepIndex The index of the step to start execution from.
 */
const executePlanSteps = (aiSettings: CallAiProps, plan: AIPlan) =>
  createDependentTasks(
    plan.steps.map(
      (step, index) =>
        async (
          setLog: (log: TaskLog) => Promise<void>,
          subLog: TaskLogger,
          signal: AbortSignal,
          allResults: Promise<void>[]
        ) => {
          const stepNumber = index + 1;
          await setLog({
            summary: `Step ${stepNumber}: ${step.description}`,
            type: "task",
          });

          if (index > 0) {
            await allResults[index - 1];
          }

          const stepResponse = await callAI(
            {
              ...aiSettings,
              user: step.subPrompt,
              system: "",
              toolNames: ["writeFile"],
            },
            createMessageLogger(subLog)
          );

          const modifiedFiles = stepResponse.modifiedFiles || [];

          if (!modifiedFiles.length) {
            throw new Error(`No files were modified by the AI tool calls.`);
          }

          await subLog(
            {
              summary: "Stage and Commit changes",
              detail: `${modifiedFiles.length} file(s)`,
              type: "task",
            },
            async (
              status: (log: TaskLog) => Promise<void>,
              task: TaskLogger,
              commitSignal: AbortSignal
            ) => {
              await task({ summary: "Stage files" });
              await stageFiles(modifiedFiles);

              const message = step.description;

              await task({ summary: `Commit changes`, detail: `${message}` });
              await commitStaged(message);

              await status({ type: "success" });
            }
          );

          await setLog({
            summary: `Step ${stepNumber} Completed`,
            type: "success",
            detail: step.description,
          });
        }
    )
  );

const generatePlan =
  (
    userPrompt: string,
    diffs: string | undefined,
    filePaths: string[],
    systemPrompt: string,
    providerSetting: AiApiSettings
  ) =>
  async (
    setLog: (log: TaskLog) => Promise<void>,
    subLog: TaskLogger,
    signal: AbortSignal
  ) => {
    await subLog({ summary: "Call AI to generate plan" });

    if (!userPrompt) {
      throw new Error(`Please enter a user prompt describing the task.`);
    }

    const planningPrompt = `
    You are an AI assistant capable of breaking down complex coding tasks into a sequence of 1-5 safe steps.
    Each step must leave the code in a working state.
    For each step, you must provide:
    1.  A brief description of the step. This description will also be used as the Git commit message for this step.
    2.  A "Sub-Prompt" that can be sent to another AI instance to execute *only* that specific step. This sub-prompt should be detailed enough for the AI to understand the required code changes, potentially including only very small relevant code snippets or context.
    Each step should be significant and self contained. Prefer to use fewer steps. If the task is simple, use 1-2 steps. If some parts of the task are more complex than others, or likely to break the app, use more steps. The amount of work done by each step can vary, depending on risk and complexity.
    Your response MUST be formatted exactly as follows, using markdown code blocks for the Sub-Prompt:
    
    \`\`\`markdown
    ## AI Plan
    
    **Overall Goal:** [Brief description of the overall task based on the user's request]
    
    ### Step 1: [Short description of step 1]
    
    **Sub-Prompt:**
    \`\`\`markdown
    [Markdown block containing the prompt for the AI to execute this step. Include necessary context like file name paths involved or specific instructions.]
    \`\`\`
    
    ### Step 2: [Short description of step 2]
    
    **Sub-Prompt:**
    \`\`\`markdown
    [Markdown block containing the prompt for the AI to execute this step. Include necessary context like file name paths involved or specific instructions.]
    \`\`\`
    
    ... and so on for subsequent steps.
    \`\`\`
    
    Do not include any other text outside of this structure, except for the plan itself.
    Ensure the steps are granular and safe, allowing for intermediate commits.
    
    User Request: ${userPrompt}
    
    ${diffs ?? ""}
    
    Current open files (provide context from these in sub-prompts if needed): ${filePaths.join(
      ", "
    )}
    `;

    const { assistant } = await callAI(
      {
        user: planningPrompt,
        system: systemPrompt,
        fileNames: filePaths,
        toolNames: [],
        providerSetting: providerSetting,
        autoRemoveComments: false,
        autoFormat: false,
        autoFixErrors: false,
        privacySettings: [],
      },
      createMessageLogger(subLog)
    );

    if (!assistant.trim()) {
      throw new Error("Failed to get a valid plan response from the AI.");
    }

    await subLog({ summary: "Plan received. Parsing..." });
    const plan = parseAIPlan(assistant);

    if (!plan || !plan.steps || plan.steps.length === 0) {
      throw new Error(
        "Failed to parse a valid plan from the AI response. Please check the AI output format."
      );
    }

    await setLog({
      summary: `Generate plan with ${plan.steps.length} steps`,
      detail: plan.overallGoal,
    });

    return plan;
  };

/**
 * Parses the AI's response to extract the plan structure.
 * Assumes a specific markdown format.
 * @param responseText The raw text response from the AI.
 * @returns The parsed AIPlan object or null if parsing fails.
 */
function parseAIPlan(responseText: string): AIPlan | null {
  try {
    const plan: AIPlan = { overallGoal: "", steps: [] };
    const lines = responseText.split("\n");
    let currentStep: Partial<PlanStep> | null = null;
    let parsingState: "none" | "subprompt" = "none";
    let subPromptContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith("## AI Plan")) {
        const goalMatch = responseText.match(/\*\*Overall Goal:\*\*\s*(.*)/);
        if (goalMatch && goalMatch[1]) {
          plan.overallGoal = goalMatch[1].trim();
        }
        continue;
      }

      const stepMatch = line.match(/^### Step \d+: (.*)/);
      if (stepMatch) {
        if (
          currentStep &&
          currentStep.description &&
          currentStep.subPrompt !== undefined
        ) {
          plan.steps.push(currentStep as PlanStep);
        }
        currentStep = { description: stepMatch[1].trim() };
        parsingState = "none";
        subPromptContent = [];
        continue;
      }

      if (currentStep) {
        if (line.trim() === "**Sub-Prompt:**") {
          parsingState = "subprompt";
          continue;
        }

        if (line.trim() === "```markdown" && parsingState === "subprompt") {
          subPromptContent = [];
          continue;
        }
        if (line.trim() === "```" && parsingState === "subprompt") {
          currentStep.subPrompt = subPromptContent.join("\n").trim();
          parsingState = "none";
          continue;
        }

        if (parsingState === "subprompt") {
          subPromptContent.push(line);
        }
      }
    }

    if (
      currentStep &&
      currentStep.description &&
      currentStep.subPrompt !== undefined
    ) {
      plan.steps.push(currentStep as PlanStep);
    }

    if (!plan.overallGoal || plan.steps.length === 0) {
      console.error("Parsed plan is incomplete (missing goal or steps):", plan);
      return null;
    }
    for (const step of plan.steps) {
      if (!step.description || step.subPrompt === undefined) {
        console.error("Parsed plan step is incomplete:", step);
        return null;
      }
    }

    return plan;
  } catch (error) {
    console.error("Error parsing AI plan:", error);
    return null;
  }
}
