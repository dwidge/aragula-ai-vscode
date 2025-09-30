import * as vscode from "vscode";
import { useTextAi } from "./ai-api/useTextAi";
import {
  availableToolNames,
  availableVendors,
} from "./aiTools/availableToolNames";
import { chatPanels } from "./chat/chatPanels";
import { openFilesDialog } from "./handleRemoveFile";
import { handleSendMessage } from "./handleSendMessage";
import { PostMessage } from "./PostMessage";
import {
  sendSettingsToWebview,
  sendWorkspaceSettingsToWebview,
} from "./sendSettingsToWebview";
import {
  GetterSetter,
  useProviderByName,
  useSettingsObject,
  useWorkspaceSettings,
  WorkspaceSettings,
} from "./settingsObject";
import { checkAndFixErrors } from "./task/checkAndFixErrors";
import { handleCommitFiles } from "./task/handleCommitFiles";
import { handleFormatFilesInFiles } from "./task/handleFormatFilesInFiles";
import { handleRemoveCommentsInFiles } from "./task/handleRemoveCommentsInFiles";
import { handleShowCodebaseSummary } from "./task/handleShowCodebaseSummary";
import { handlePlanAndExecute } from "./task/plan/planTool";
import { runShellTask } from "./task/runShellTask";
import { runTaskWithCatch } from "./task/runTaskWithCatch";
import { runTestFormTask } from "./task/runTestFormTask";
import { runTestMultiTask } from "./task/runTestMultiTask";
import { runTestSerialTask } from "./task/runTestSerialTask";
import { runTestSetCommitMessage } from "./task/runTestSetCommitMessage";
import { runTestTask } from "./task/runTestTask";
import { getAvailableShells } from "./utils/getShells";
import {
  cancelTask,
  createMessageLogger,
  createTask,
  Logger,
  TaskLogger,
} from "./utils/Logger";

export async function handleWebviewMessage(
  context: vscode.ExtensionContext,
  postMessage: PostMessage,
  message: any,
  tabId: string,
  globalSettings: GetterSetter,
  workspaceSettingsState: GetterSetter
) {
  const [settings, setSettings] = useSettingsObject(globalSettings);
  const [, setWorkspaceSettings] = useWorkspaceSettings(workspaceSettingsState);

  const panelInfo = chatPanels.get(tabId);
  if (!panelInfo) {
    throw new Error(`Panel info not found for tabId: ${tabId}`);
  }
  const activeTasks = panelInfo.activeTasks;
  const pendingFormRequests = panelInfo.pendingFormRequests;

  const logTask: TaskLogger = createTask(
    async (v) => {
      await postMessage({ ...v, tabId });
    },
    activeTasks,
    undefined,
    pendingFormRequests
  );

  const log: Logger = createMessageLogger(logTask);

  switch (message.command) {
    case "cancelTask":
      const taskIdToCancel = message.id;
      cancelTask(taskIdToCancel, activeTasks);
      break;
    case "formResponse":
      const formResponse = message.formResponse;
      const pending = pendingFormRequests.get(formResponse.id);
      if (pending) {
        if (formResponse.isCancelled) {
          const abortError = new Error("Form submission cancelled by user.");
          abortError.name = "AbortError";
          pending.reject(abortError);
        } else {
          pending.resolve({
            button: formResponse.button,
            formData: formResponse.formData,
          });
        }
        pendingFormRequests.delete(formResponse.id);
      }
      break;
    case "sendMessage":
      try {
        await handleSendMessage(
          context,
          postMessage,
          {
            ...message,
            privacySettings: settings.privacySettings,
          },
          tabId,
          logTask
        );
      } catch (e) {
        console.error("handleSendMessage error:", e);
        log("Error during send message: " + e);
      } finally {
        postMessage({ command: "resetSendButton" });
      }
      break;
    case "runCommand":
      runShellTask(message.runCommand, message.shell, logTask)
        .catch((e) => console.log("runCommandE1", e))
        .finally(() => {
          postMessage({ command: "resetRunCommandButton" });
        });
      break;
    case "checkErrorsInFiles":
      logTask(
        {
          summary: `Check and fix errors`,
          detail: `Files: ${message.filePaths.join(", ")}`,
          type: "task",
        },
        async (progress, log, signal) =>
          checkAndFixErrors(
            message.filePaths,
            message.providerSetting,
            createMessageLogger(log)
          )
      );
      break;
    case "clearMessages":
      postMessage({ command: "clearMessages" });
      break;
    case "setWorkspaceSettings":
      const partial = message.data as Partial<WorkspaceSettings>;
      const updated = await setWorkspaceSettings((prev) => ({
        ...prev,
        ...partial,
      }));
      await sendWorkspaceSettingsToWebview(postMessage, updated);
      break;
    case "openFilesDialog":
      await openFilesDialog(postMessage, workspaceSettingsState);
      break;
    case "updateSettings":
      {
        const updatedSettings = await setSettings((prev) => ({
          ...prev,
          ...message.settings,
        }));
        const currentProviderSetting = useProviderByName(
          updatedSettings,
          updatedSettings.providerName
        );
        const availableShells = getAvailableShells();
        await sendSettingsToWebview(
          postMessage,
          updatedSettings,
          currentProviderSetting,
          availableVendors,
          availableToolNames,
          availableShells
        );
      }
      break;
    case "removeCommentsInFiles":
      handleRemoveCommentsInFiles(message.filePaths, log);
      break;
    case "formatFilesInFiles":
      handleFormatFilesInFiles(message.filePaths, log);
      break;
    case "commitFiles":
      handleCommitFiles(useTextAi(globalSettings), message.fileNames, logTask);
      break;
    case "planAndExecute":
      handlePlanAndExecute(message, logTask)
        .catch((e) => {
          console.error("handlePlanAndExecute error:", e);
          log("Error during plan and execute: " + e, "error");
        })
        .finally(() => {
          postMessage({ command: "resetPlanButton" });
        });
      break;
    case "runTestTask":
      runTestTask(logTask);
      break;
    case "runTestMultiTask":
      runTestMultiTask(logTask);
      break;
    case "runTestSerialTask":
      runTestSerialTask(logTask);
      break;
    case "runTestFormTask":
      runTestFormTask(logTask);
      break;
    case "runTestSetCommitMessage":
      runTaskWithCatch(
        logTask,
        "Simulating Set Commit Message",
        runTestSetCommitMessage
      );
      break;
    case "runShowCodebaseSummary":
      handleShowCodebaseSummary(logTask);
      break;
    default:
      console.warn("Unknown command from webview:", message.command);
  }
}
