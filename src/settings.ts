import * as vscode from "vscode";
import { AiApiSettings } from "./aiTools/AiApi";
import { getSettingsObject, setSettingsObject } from "./settingsObject";
import { setWorkspaceState } from "./storage";

export const AUTO_REMOVE_COMMENTS_STORAGE_KEY = "autoRemoveComments";
export const AUTO_FORMAT_STORAGE_KEY = "autoFormat";
export const AUTO_FIX_ERRORS_STORAGE_KEY = "autoFixErrors";
export const WORKSPACE_SYSTEM_PROMPT_STORAGE_KEY_PREFIX =
  "workspaceSystemPrompt";
export const WORKSPACE_USER_PROMPT_STORAGE_KEY_PREFIX = "workspaceUserPrompt";

/** Retrieves system prompts from global storage, MRU order */
export function getSystemPromptsFromStorage(
  context: vscode.ExtensionContext
): string[] {
  return getSettingsObject(context).systemPrompLists;
}

/** Retrieves user prompts from global storage, MRU order */
export function getUserPromptsFromStorage(
  context: vscode.ExtensionContext
): string[] {
  return getSettingsObject(context).userPromptList;
}

/** Retrieves provider settings from global storage */
export function getProviderSettingsFromStorage(
  context: vscode.ExtensionContext
): AiApiSettings[] {
  return getSettingsObject(context).providerList;
}

/** Retrieves enabled tool names from global state */
export function getEnabledToolNamesFromGlobalState(
  context: vscode.ExtensionContext
): string[] {
  return getSettingsObject(context).enabledTools;
}

/** Retrieves current provider setting from global state */
export function getCurrentProviderSettingFromGlobalState(
  context: vscode.ExtensionContext
): AiApiSettings | undefined {
  const globalSettings = getSettingsObject(context);
  if (globalSettings.providerName) {
    return globalSettings.providerList.find(
      (p) => p.name === globalSettings.providerName
    );
  }
  return undefined;
}

/** Saves system prompt to global storage, MRU at top */
export async function saveSystemPromptToStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  const globalSettings = getSettingsObject(context);
  const prompts = globalSettings.systemPrompLists.filter((p) => p !== prompt);
  prompts.unshift(prompt);
  await setSettingsObject(context, { systemPrompts: prompts });
}

/** Saves user prompt to global storage, MRU at top */
export async function saveUserPromptToStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  const globalSettings = getSettingsObject(context);
  const prompts = globalSettings.userPromptList.filter((p) => p !== prompt);
  prompts.unshift(prompt);
  await setSettingsObject(context, { userPrompts: prompts });
}

/** Saves provider setting to global storage */
export async function saveProviderSettingToStorage(
  context: vscode.ExtensionContext,
  providerSetting: AiApiSettings
): Promise<void> {
  const globalSettings = getSettingsObject(context);
  const settingsList = globalSettings.providerList.filter(
    (p) => p.name !== providerSetting.name
  );
  settingsList.push(providerSetting);
  await setSettingsObject(context, {
    providerSettingsList: settingsList,
  });
}

/** Updates provider setting in global storage */
export async function updateProviderSettingInStorage(
  context: vscode.ExtensionContext,
  oldProviderSettingName: string,
  providerSetting: AiApiSettings
): Promise<void> {
  const globalSettings = getSettingsObject(context);
  const settingsList = globalSettings.providerList.map((p) =>
    p.name === oldProviderSettingName ? providerSetting : p
  );
  await setSettingsObject(context, {
    providerSettingsList: settingsList,
  });
}

/** Saves current provider setting name to global state */
export async function useProviderSettingInGlobalState(
  context: vscode.ExtensionContext,
  providerSettingName: string
): Promise<void> {
  await setSettingsObject(context, {
    currentProviderSettingName: providerSettingName,
  });
}

/** Use system prompt, move to top in MRU list */
export async function useSystemPromptInStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  await saveSystemPromptToStorage(context, prompt);
}

/** Use user prompt, move to top in MRU list */
export async function useUserPromptInStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  await saveUserPromptToStorage(context, prompt);
}

/** Deletes system prompt from global storage */
export async function deleteSystemPromptFromStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  const globalSettings = getSettingsObject(context);
  const prompts = globalSettings.systemPrompLists.filter((p) => p !== prompt);
  await setSettingsObject(context, { systemPrompts: prompts });
}

/** Deletes user prompt from global storage */
export async function deleteUserPromptFromStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  const globalSettings = getSettingsObject(context);
  const prompts = globalSettings.userPromptList.filter((p) => p !== prompt);
  await setSettingsObject(context, { userPrompts: prompts });
}

/** Deletes provider setting from global storage */
export async function deleteProviderSettingFromStorage(
  context: vscode.ExtensionContext,
  providerSettingName: string
): Promise<void> {
  const globalSettings = getSettingsObject(context);
  const settingsList = globalSettings.providerList.filter(
    (p) => p.name !== providerSettingName
  );
  await setSettingsObject(context, {
    providerSettingsList: settingsList,
  });
}

/** Set current system prompt to workspace state */
export async function setCurrentSystemPromptToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  prompt: string
): Promise<void> {
  // FIX: Pass tabId as the 4th argument
  await setWorkspaceState(
    context,
    WORKSPACE_SYSTEM_PROMPT_STORAGE_KEY_PREFIX,
    prompt,
    tabId
  );
}

/** Set current user prompt to workspace state */
export async function setCurrentUserPromptToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  prompt: string
): Promise<void> {
  // FIX: Pass tabId as the 4th argument
  await setWorkspaceState(
    context,
    WORKSPACE_USER_PROMPT_STORAGE_KEY_PREFIX,
    prompt,
    tabId
  );
}

export const getCurrentProviderSetting = (context: vscode.ExtensionContext) => {
  const providerSettingsList = getProviderSettingsFromStorage(context);
  const currentProviderSetting =
    getCurrentProviderSettingFromGlobalState(context) ||
    providerSettingsList[0];

  if (!currentProviderSetting) {
    throw new Error("Please select an AI Provider in 'Providers' popup.");
  }

  return currentProviderSetting;
};
