import * as vscode from "vscode";
import {
  availableToolNames,
  availableVendors,
} from "./aiTools/availableToolNames";
import { chatPanels } from "./extension";
import { getTextAsset } from "./getTextAsset";
import { handleWebviewMessage } from "./handleWebviewMessage";
import { newPostMessage } from "./PostMessage";
import { sendSettingsToWebview } from "./sendSettingsToWebview";
import {
  GetterSetter,
  useProviderByName,
  useSettingsObject,
} from "./settingsObject";
import { getAvailableShells } from "./utils/getShells";
import {
  ActiveTasks,
  PendingFormRequests,
  cancelAllTasks,
} from "./utils/Logger";

export async function openChatWindow(
  context: vscode.ExtensionContext,
  openedFilePaths: string[],
  tabId: string,
  globalSettings: GetterSetter
) {
  const panel = vscode.window.createWebviewPanel(
    "askAIChat",
    `Ask AI - ${tabId}`,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  const activeTasks: ActiveTasks = new Map<
    string,
    [AbortController, string | undefined]
  >();
  const pendingFormRequests: PendingFormRequests = new Map();
  chatPanels.set(tabId, { panel, activeTasks, pendingFormRequests });

  panel.onDidDispose(() => {
    try {
      cancelAllTasks(activeTasks);
      pendingFormRequests.forEach(({ reject }) =>
        reject(new Error("Form request cancelled: Webview panel closed."))
      );
      pendingFormRequests.clear();
    } catch (e) {
      console.log("onDidDisposeE1", e);
    }
    chatPanels.delete(tabId);
  });

  const htmlContent = await getTextAsset(
    context.extensionPath,
    "chatview.html"
  );
  panel.webview.html = htmlContent.replace("${tabId}", tabId);

  const postMessage = newPostMessage(panel);

  postMessage({
    command: "addFiles",
    filePaths: openedFilePaths,
  });

  panel.webview.onDidReceiveMessage(
    (message) =>
      handleWebviewMessage(
        context,
        postMessage,
        message,
        openedFilePaths,
        tabId,
        globalSettings
      ),
    undefined,
    context.subscriptions
  );

  const [settings, setSettings] = useSettingsObject(globalSettings);
  const currentProviderSetting = useProviderByName(
    settings,
    settings.providerName
  );
  const availableShells = getAvailableShells();

  await sendSettingsToWebview(
    postMessage,
    settings,
    currentProviderSetting,
    availableVendors,
    availableToolNames,
    availableShells
  );
}
