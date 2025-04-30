import * as vscode from "vscode";
import { AiApiSettings } from "./aiTools/AiApi";
import { findErrors } from "./checkAndFixErrors";
import { getDiffContext } from "./diff";
import { AIPlan, PLAN_STATE_KEY, PlanState, PlanStep } from "./extension";
import { generateCommitMessage } from "./generateCommitMessage";
import { getWorkspaceRoot } from "./getWorkspaceAbsolutePath";
import { callAI, cancelActiveRequest } from "./handleSendMessage";
import { commitStaged, stageFiles } from "./utils/git";
import { Logger } from "./utils/Logger";

export async function handlePlanAndExecute(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  message: {
    user: string;
    system: string;
    fileNames: string[];
    toolNames: string[];
    providerSetting: AiApiSettings;
    autoRemoveComments: boolean;
    autoFormat: boolean;
    autoFixErrors: boolean;
  },
  tabId: string,
  log: Logger
) {
  const userPrompt = message.user;
  const systemPrompt = message.system;
  const providerSetting: AiApiSettings = message.providerSetting;
  const filePaths = message.fileNames;
  const autoRemoveComments: boolean = message.autoRemoveComments;
  const autoFormat: boolean = message.autoFormat;
  const autoFixErrors: boolean = message.autoFixErrors;
  const includeDiff: boolean = false;

  const getState = () => loadPlanState(context, tabId);
  const setState = (updateFn: (currentState: PlanState) => PlanState) =>
    updateAndPostPlanState(context, tabId, panel, updateFn);
  const postMessage = (msg: any) => panel.webview.postMessage(msg);

  if (!providerSetting) {
    log(
      "Please select an AI Provider in 'Providers' popup before planning.",
      "error"
    );
    setState((currentState) => ({
      ...currentState,
      status: "failed",
      currentStepIndex: -1,
      plan: null,
      error: "No provider selected",
      filePaths,
      providerSetting: null,
      autoRemoveComments,
      autoFormat,
      autoFixErrors,
    }));
    postMessage({
      command: "planExecutionFailed",
      error: "No provider selected",
    });
    return;
  }
  if (!userPrompt) {
    log("Please enter a user prompt describing the task.", "error");
    setState((currentState) => ({
      ...currentState,
      status: "failed",
      currentStepIndex: -1,
      plan: null,
      error: "No user prompt",
      filePaths: filePaths,
      providerSetting,
      autoRemoveComments,
      autoFormat,
      autoFixErrors,
    }));
    postMessage({
      command: "planExecutionFailed",
      error: "No user prompt",
    });
    return;
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

${(includeDiff && (await getDiffContext(log))) || ""}

Current open files (provide context from these in sub-prompts if needed): ${filePaths.join(
    ", "
  )}
`;

  log("Generating plan...", "info");
  setState((currentState) => ({
    ...currentState,
    status: "planning",
    currentStepIndex: -1,
    plan: null,
    error: null,
    filePaths: filePaths,
    providerSetting,
    autoRemoveComments,
    autoFormat,
    autoFixErrors,
  }));

  try {
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
      },
      log
    );

    if (!assistant.trim()) {
      throw new Error("Failed to get a valid plan response from the AI.");
    }

    log("Plan received. Parsing...", "info");
    const plan = parseAIPlan(assistant);

    if (!plan || !plan.steps || plan.steps.length === 0) {
      throw new Error(
        "Failed to parse a valid plan from the AI response. Please check the AI output format."
      );
    }

    log(`Plan parsed successfully with ${plan.steps.length} steps.`, "info");

    setState((currentState) => ({
      ...currentState,
      status: "executing",
      currentStepIndex: 0,
      plan: plan,
      error: null,
      filePaths,
      providerSetting,
      autoRemoveComments,
      autoFormat,
      autoFixErrors,
    }));
    postMessage({ command: "displayPlan", plan: plan });

    executePlan(getState, setState, postMessage, log, tabId);
  } catch (error: any) {
    log(`Plan generation failed: ${error.message}`, "error");
    setState((currentState) => ({
      ...currentState,
      status: "failed",
      currentStepIndex: -1,
      plan: null,
      error: error.message,
      filePaths: filePaths,
      providerSetting,
      autoRemoveComments,
      autoFormat,
      autoFixErrors,
    }));
    postMessage({
      command: "planExecutionFailed",
      error: error.message,
    });
  }
}

export async function handlePausePlan(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  tabId: string,
  log: Logger
) {
  const getState = () => loadPlanState(context, tabId);
  const updateAndPostState = (
    updateFn: (currentState: PlanState) => PlanState
  ) => updateAndPostPlanState(context, tabId, panel, updateFn);

  const planState = getState();
  if (planState.status === "executing") {
    log("Pausing plan execution...", "info");
    updateAndPostState((currentState) => ({
      ...currentState,
      status: "paused",
    }));
    const currentMessageId = `step-${tabId}-${planState.currentStepIndex}`;
    cancelActiveRequest(currentMessageId, log);
  }
}

export async function handleResumePlan(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  tabId: string,
  log: Logger
) {
  const getState = () => loadPlanState(context, tabId);
  const setState = (updateFn: (currentState: PlanState) => PlanState) =>
    updateAndPostPlanState(context, tabId, panel, updateFn);
  const postMessage = (msg: any) => panel.webview.postMessage(msg);

  const planState = getState();
  if (planState.status === "paused" || planState.status === "failed") {
    log("Resuming plan execution...", "info");
    setState((currentState) => ({
      ...currentState,
      status: "executing",
      error: null,
    }));

    executePlan(getState, setState, postMessage, log, tabId);
  }
}

export async function handleStopPlan(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  tabId: string,
  log: Logger
) {
  const getState = () => loadPlanState(context, tabId);
  const updateAndPostState = (
    updateFn: (currentState: PlanState) => PlanState
  ) => updateAndPostPlanState(context, tabId, panel, updateFn);
  const postMessage = (msg: any) => panel.webview.postMessage(msg);

  const planState = getState();
  if (
    planState.status === "executing" ||
    planState.status === "paused" ||
    planState.status === "planning"
  ) {
    log("Stopping plan execution...", "info");
    updateAndPostState((currentState) => ({
      ...currentState,
      status: "idle",
      currentStepIndex: -1,
      plan: null,
      error: "Execution stopped by user.",
    }));
    postMessage({ command: "planExecutionStopped" });
    const currentMessageId =
      planState.status === "planning"
        ? `plan-${tabId}`
        : `step-${tabId}-${planState.currentStepIndex}`;
    cancelActiveRequest(currentMessageId, log);
  }
}

export async function handleRequestPlanState(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel,
  tabId: string
) {
  const getState = () => loadPlanState(context, tabId);
  const postMessage = (msg: any) => panel.webview.postMessage(msg);

  const planState = getState();
  postMessage({
    command: "updatePlanState",
    planState: planState,
  });
  if (planState.plan) {
    postMessage({ command: "displayPlan", plan: planState.plan });
  }
}

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

/**
 * Executes a single step of the plan.
 * @param step The plan step to execute.
 * @param stepIndex The index of the step in the plan.
 * @param planState The current state of the plan execution (read-only).
 * @param postMessage Function to post messages to the webview.
 * @param log Logger function.
 * @param tabId Current tab ID (for cancellation).
 * @returns A promise resolving to an object indicating success/failure and any error message.
 */
async function executeSinglePlanStep(
  step: PlanStep,
  stepIndex: number,
  planState: PlanState,
  postMessage: (msg: any) => void,
  log: Logger,
  tabId: string
): Promise<{ success: boolean; error?: string; modifiedFiles?: string[] }> {
  const stepNumber = stepIndex + 1;
  log(`Executing Step ${stepNumber}: ${step.description}`, "info");
  postMessage({
    command: "updateStepStatus",
    stepIndex: stepIndex,
    status: "executing",
  });

  const stepMessageId = `step-${tabId}-${stepIndex}`;

  try {
    const stepResponse = await callAI(
      {
        user: step.subPrompt,
        system: "",
        fileNames: planState.filePaths,
        toolNames: ["writeFile"],
        providerSetting: planState.providerSetting!,
        autoRemoveComments: planState.autoRemoveComments,
        autoFormat: planState.autoFormat,
        autoFixErrors: planState.autoFixErrors,
      },
      log
    );

    const modifiedFiles = stepResponse.modifiedFiles || [];

    if (modifiedFiles.length > 0) {
      if (planState.autoFixErrors) {
        log("Checking for errors after auto-fix...", "info");
        const errorsFoundAfterAutoFix = (await findErrors(modifiedFiles, log))
          .length;
        if (errorsFoundAfterAutoFix > 0) {
          const errorMsg = `${errorsFoundAfterAutoFix} errors detected after auto-fix. Stopping plan.`;
          log(errorMsg, "error");
          postMessage({
            command: "updateStepStatus",
            stepIndex: stepIndex,
            status: "failed",
          });
          return { success: false, error: errorMsg };
        } else {
          log("No errors detected after auto-fix.", "info");
        }
      }
    } else {
      log(`No files were modified by the AI tool calls.`, "warning");
    }

    try {
      log("Staging modified files...", "info");
      await stageFiles(modifiedFiles);

      log("Generating commit message...", "info");
      const message =
        step.description ||
        (await generateCommitMessage(
          getWorkspaceRoot().fsPath,
          planState.providerSetting!
        ));

      log(`Committing changes: "${message}"`, "info");
      await commitStaged(message);
    } catch (e: any) {
      const errorMsg = `Failed to commit changes: ${e.message}`;
      log(errorMsg, "error");
      postMessage({
        command: "updateStepStatus",
        stepIndex: stepIndex,
        status: "failed",
      });
      return { success: false, error: errorMsg };
    }

    postMessage({
      command: "updateStepStatus",
      stepIndex: stepIndex,
      status: "completed",
    });
    return { success: true, modifiedFiles };
  } catch (error: any) {
    const errorMsg = `Execution failed: ${error.message}`;
    log(errorMsg, "error");
    postMessage({
      command: "updateStepStatus",
      stepIndex: stepIndex,
      status: "failed",
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Executes the plan step by step iteratively.
 * @param getState Function to get the current plan state.
 * @param setState Function to update and post the plan state.
 * @param postMessage Function to post messages to the webview.
 * @param log Logger function.
 * @param tabId Current tab ID (for cancellation).
 */
async function executePlan(
  getState: () => PlanState,
  setState: (updateFn: (prev: PlanState) => PlanState) => void,
  postMessage: (msg: any) => void,
  log: Logger,
  tabId: string
) {
  let planState = getState();

  if (planState.status !== "executing" || !planState.plan) {
    log(
      "Plan execution called when not in 'executing' state or plan is missing.",
      "warning"
    );
    postMessage({
      command: "updatePlanState",
      planState: planState,
    });
    return;
  }

  while (
    planState.status === "executing" &&
    planState.plan &&
    planState.currentStepIndex < planState.plan.steps.length
  ) {
    const currentStepIndex = planState.currentStepIndex;
    const step = planState.plan.steps[currentStepIndex];
    const stepNumber = currentStepIndex + 1;

    const stepLogger: Logger = (msg: string, type: string = "log") => {
      postMessage({
        command: "logMessage",
        text: msg,
        messageType: type,
        stepIndex: currentStepIndex,
        tabId: tabId,
      });
    };

    const result = await executeSinglePlanStep(
      step,
      currentStepIndex,
      planState,
      postMessage,
      stepLogger,
      tabId
    );

    planState = getState();

    if (planState.status !== "executing") {
      log(`Plan execution interrupted. Status: ${planState.status}`, "info");
      break;
    }

    if (!result.success) {
      const errorMsg = `Plan execution failed at Step ${
        currentStepIndex + 1
      }: ${result.error}`;
      log(errorMsg, "error");
      setState((currentState) => ({
        ...currentState,
        status: "failed",
        error: errorMsg,
      }));
      postMessage({
        command: "planExecutionFailed",
        error: errorMsg,
      });
      break;
    } else {
      setState((currentState) => ({
        ...currentState,
        currentStepIndex: currentStepIndex + 1,
      }));
      planState = getState();
    }
  }

  planState = getState();

  if (planState.status === "executing") {
    const currentPlan = planState.plan;
    if (currentPlan && planState.currentStepIndex >= currentPlan.steps.length) {
      log("Plan execution completed successfully!", "info");
      setState((currentState) => ({
        ...currentState,
        status: "completed",
      }));
      postMessage({ command: "planExecutionComplete" });
    } else {
      log(
        "Plan execution loop finished unexpectedly while still in 'executing' state.",
        "warning"
      );
      log("Correcting state to failed due to unexpected loop exit.", "error");
      setState((currentState) => ({
        ...currentState,
        status: "failed",
        error: "Plan execution loop exited unexpectedly.",
      }));
      postMessage({
        command: "planExecutionFailed",
        error: getState().error,
      });
    }
  } else {
    log(
      `Plan execution loop finished with status: ${planState.status}`,
      "info"
    );
  }
}

/**
 * Retrieves the current plan state from workspace state.
 * @param context Extension context.
 * @param tabId Current tab ID.
 * @returns The current PlanState.
 */
export function loadPlanState(
  context: vscode.ExtensionContext,
  tabId: string,
  defaultState: PlanState = {
    status: "idle",
    currentStepIndex: -1,
    plan: null,
    error: null,
    filePaths: [],
    providerSetting: null,
    autoRemoveComments: false,
    autoFormat: false,
    autoFixErrors: false,
    tabId: tabId,
  }
): PlanState {
  const state = context.workspaceState.get(PLAN_STATE_KEY(tabId), defaultState);
  state.tabId = tabId;
  return state;
}

/**
 * Saves the current plan state to workspace state.
 * @param context Extension context.
 * @param tabId Current tab ID.
 * @param state The PlanState to save.
 */
export function savePlanState(
  context: vscode.ExtensionContext,
  tabId: string,
  state: PlanState
) {
  state.tabId = tabId;
  context.workspaceState.update(PLAN_STATE_KEY(tabId), state);
}

/**
 * Updates the plan state and posts the new state to the webview.
 * @param context Extension context.
 * @param tabId Current tab ID.
 * @param panel Webview panel.
 * @param updateFn Function to update the current state.
 */
function updateAndPostPlanState(
  context: vscode.ExtensionContext,
  tabId: string,
  panel: vscode.WebviewPanel,
  updateFn: (currentState: PlanState) => PlanState
) {
  const currentState = loadPlanState(context, tabId);
  const newState = updateFn(currentState);
  savePlanState(context, tabId, newState);
  panel.webview.postMessage({
    command: "updatePlanState",
    planState: newState,
  });
}
