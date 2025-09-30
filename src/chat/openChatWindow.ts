import { sleep } from "openai/core.mjs";
import * as vscode from "vscode";
import {
  availableToolNames,
  availableVendors,
} from "../aiTools/availableToolNames";
import { handleWebviewMessage } from "../handleWebviewMessage";
import { newPostMessage } from "../PostMessage";
import {
  sendSettingsToWebview,
  sendWorkspaceSettingsToWebview,
} from "../sendSettingsToWebview";
import {
  GetterSetter,
  useProviderByName,
  useSettingsObject,
} from "../settingsObject";
import { getAvailableShells } from "../utils/getShells";
import {
  ActiveTasks,
  PendingFormRequests,
  cancelAllTasks,
} from "../utils/Logger";
import { addChatFiles } from "./addChatFiles";
import { chatPanels } from "./chatPanels";

export async function openChatWindow(
  context: vscode.ExtensionContext,
  openedFilePaths: string[],
  globalSettings: GetterSetter,
  workspaceSettingsState: GetterSetter,
  tabId = Date.now().toString()
) {
  const panel = vscode.window.createWebviewPanel(
    "askAIChat",
    `Ask AI - ${tabId}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist")],
    }
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

  const workspaceSettings = await addChatFiles(
    workspaceSettingsState,
    openedFilePaths
  );

  const htmlPath = vscode.Uri.joinPath(
    context.extensionUri,
    "dist",
    "chatview",
    "index.html"
  );
  const htmlContent = await vscode.workspace.fs
    .readFile(htmlPath)
    .then((buffer) => new TextDecoder().decode(buffer));

  const scriptUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      "dist",
      "chatview",
      "assets",
      "main.js"
    )
  );
  const styleUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      "dist",
      "chatview",
      "assets",
      "style.css"
    )
  );

  panel.webview.html = htmlContent
    .replace(/\/assets\/main\.js/, scriptUri.toString())
    .replace(/\/assets\/style\.css/, styleUri.toString())
    .replace(/\$\{tabId\}/g, tabId);

  const postMessage = newPostMessage(panel);

  panel.webview.onDidReceiveMessage(
    (message) =>
      handleWebviewMessage(
        context,
        postMessage,
        message,
        tabId,
        globalSettings,
        workspaceSettingsState
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

  await sleep(100);
  await sendSettingsToWebview(
    postMessage,
    settings,
    currentProviderSetting,
    availableVendors,
    availableToolNames,
    availableShells
  );
  await sendWorkspaceSettingsToWebview(postMessage, workspaceSettings);
}
