import { AiApiSettings } from "./ai-api/types/AiApiSettings";
import { PostMessage } from "./PostMessage";
import { SettingsObject, WorkspaceSettings } from "./settingsObject";
import { ShellProfile } from "./utils/getShells";

/**
 * Sends the full settings object and related state to the webview.
 * @param postMessage Function to post message to webview.
 * @param settings The settings object to send.
 * @param currentProviderSetting The currently selected provider settings.
 * @param availableVendors List of available AI vendors.
 * @param availableTools List of available AI tools.
 * @param availableShells
 */
export const sendSettingsToWebview = (
  postMessage: PostMessage,
  settings: SettingsObject,
  currentProviderSetting: AiApiSettings | undefined,
  availableVendors: string[],
  availableTools: string[],
  availableShells: ShellProfile[]
) =>
  postMessage({
    command: "settingsUpdated",
    settings,
    currentProviderSetting,
    availableVendors,
    availableTools,
    availableShells,
  });

/**
 * Sends the workspace settings to the webview.
 * @param postMessage Function to post message to webview.
 * @param workspaceSettings The full workspaceSettings object.
 */
export const sendWorkspaceSettingsToWebview = (
  postMessage: PostMessage,
  workspaceSettings: WorkspaceSettings
) =>
  postMessage({
    command: "setWorkspaceSettings",
    data: workspaceSettings,
  });
