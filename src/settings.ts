import * as vscode from "vscode";
import { AiApiSettings } from "./aiTools/AiApi";
import {
  deleteFromGlobalStateStringArray,
  deleteGlobalStateObject,
  getGlobalState,
  getGlobalStateObjects,
  getGlobalStateStringArray,
  getWorkspaceState,
  saveGlobalStateObject,
  saveToGlobalStateStringArray,
  setGlobalState,
  setWorkspaceState,
  useInGlobalStateStringArray,
} from "./storage";

export const ENABLED_TOOLS_STORAGE_KEY = "enabledTools";
export const CURRENT_PROVIDER_SETTING_STORAGE_KEY =
  "currentProviderSettingName";
export const AUTO_REMOVE_COMMENTS_STORAGE_KEY = "autoRemoveComments";
export const AUTO_FORMAT_STORAGE_KEY = "autoFormat";
export const AUTO_FIX_ERRORS_STORAGE_KEY = "autoFixErrors";

export const SYSTEM_PROMPTS_STORAGE_KEY = "systemPrompts";
export const USER_PROMPTS_STORAGE_KEY = "userPrompts";
export const PROVIDER_SETTINGS_STORAGE_KEY = "providerSettingsList";

export const WORKSPACE_SYSTEM_PROMPT_STORAGE_KEY_PREFIX =
  "workspaceSystemPrompt";
export const WORKSPACE_RUN_COMMAND_STORAGE_KEY_PREFIX = "workspaceRunCommand";
export const WORKSPACE_USER_PROMPT_STORAGE_KEY_PREFIX = "workspaceUserPrompt";

/** Retrieves system prompts from global storage, MRU order */
export function getSystemPromptsFromStorage(
  context: vscode.ExtensionContext
): string[] {
  return getGlobalStateStringArray(context, SYSTEM_PROMPTS_STORAGE_KEY);
}

/** Retrieves user prompts from global storage, MRU order */
export function getUserPromptsFromStorage(
  context: vscode.ExtensionContext
): string[] {
  return getGlobalStateStringArray(context, USER_PROMPTS_STORAGE_KEY);
}

/** Retrieves provider settings from global storage */
export function getProviderSettingsFromStorage(
  context: vscode.ExtensionContext
): AiApiSettings[] {
  return getGlobalStateObjects<AiApiSettings>(
    context,
    PROVIDER_SETTINGS_STORAGE_KEY
  );
}

/** Retrieves enabled tool names from global state */
export function getEnabledToolNamesFromGlobalState(
  context: vscode.ExtensionContext
): string[] {
  return getGlobalState<string[]>(context, ENABLED_TOOLS_STORAGE_KEY, []);
}

/** Retrieves current provider setting from global state */
export function getCurrentProviderSettingFromGlobalState(
  context: vscode.ExtensionContext
): AiApiSettings | undefined {
  const providerSettingName = getGlobalState<string | undefined>(
    context,
    CURRENT_PROVIDER_SETTING_STORAGE_KEY,
    undefined
  );
  if (providerSettingName) {
    return getProviderSettingsFromStorage(context).find(
      (p) => p.name === providerSettingName
    );
  }
  return undefined;
}

/** Saves system prompt to global storage, MRU at top */
export async function saveSystemPromptToStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  await saveToGlobalStateStringArray(
    context,
    SYSTEM_PROMPTS_STORAGE_KEY,
    prompt
  );
}

/** Saves user prompt to global storage, MRU at top */
export async function saveUserPromptToStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  await saveToGlobalStateStringArray(context, USER_PROMPTS_STORAGE_KEY, prompt);
}

/** Saves provider setting to global storage */
export async function saveProviderSettingToStorage(
  context: vscode.ExtensionContext,
  providerSetting: AiApiSettings
): Promise<void> {
  await saveGlobalStateObject<AiApiSettings>(
    context,
    PROVIDER_SETTINGS_STORAGE_KEY,
    providerSetting
  );
}

/** Updates provider setting in global storage */
export async function updateProviderSettingInStorage(
  context: vscode.ExtensionContext,
  oldProviderSettingName: string,
  providerSetting: AiApiSettings
): Promise<void> {
  await saveGlobalStateObject<AiApiSettings>(
    context,
    PROVIDER_SETTINGS_STORAGE_KEY,
    providerSetting,
    oldProviderSettingName
  );
}

/** Saves enabled tool names to global state */
export async function setEnabledToolNamesToGlobalState(
  context: vscode.ExtensionContext,
  toolNames: string[]
): Promise<void> {
  await setGlobalState(context, ENABLED_TOOLS_STORAGE_KEY, toolNames);
}

/** Saves current provider setting name to global state */
export async function useProviderSettingInGlobalState(
  context: vscode.ExtensionContext,
  providerSettingName: string
): Promise<void> {
  await setGlobalState(
    context,
    CURRENT_PROVIDER_SETTING_STORAGE_KEY,
    providerSettingName
  );
}

/** Use system prompt, move to top in MRU list */
export async function useSystemPromptInStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  await useInGlobalStateStringArray(
    context,
    SYSTEM_PROMPTS_STORAGE_KEY,
    prompt
  );
}

/** Use user prompt, move to top in MRU list */
export async function useUserPromptInStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  await useInGlobalStateStringArray(context, USER_PROMPTS_STORAGE_KEY, prompt);
}

/** Deletes system prompt from global storage */
export async function deleteSystemPromptFromStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  await deleteFromGlobalStateStringArray(
    context,
    SYSTEM_PROMPTS_STORAGE_KEY,
    prompt
  );
}

/** Deletes user prompt from global storage */
export async function deleteUserPromptFromStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  await deleteFromGlobalStateStringArray(
    context,
    USER_PROMPTS_STORAGE_KEY,
    prompt
  );
}

/** Deletes provider setting from global storage */
export async function deleteProviderSettingFromStorage(
  context: vscode.ExtensionContext,
  providerSettingName: string
): Promise<void> {
  await deleteGlobalStateObject<AiApiSettings>(
    context,
    PROVIDER_SETTINGS_STORAGE_KEY,
    providerSettingName
  );
}

/** Get current system prompt from workspace state */
export function getCurrentSystemPromptFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): string | undefined {
  return getWorkspaceState<string | undefined>(
    context,
    WORKSPACE_SYSTEM_PROMPT_STORAGE_KEY_PREFIX,
    tabId,
    undefined
  );
}

/** Set current system prompt to workspace state */
export async function setCurrentSystemPromptToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  prompt: string
): Promise<void> {
  await setWorkspaceState(
    context,
    WORKSPACE_SYSTEM_PROMPT_STORAGE_KEY_PREFIX,
    tabId,
    prompt
  );
}

/** Get current run command from workspace state */
export function getCurrentRunCommandFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): string | undefined {
  return getWorkspaceState<string | undefined>(
    context,
    WORKSPACE_RUN_COMMAND_STORAGE_KEY_PREFIX,
    tabId,
    undefined
  );
}

/** Set current run command to workspace state */
export async function setCurrentRunCommandToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  command: string
): Promise<void> {
  await setWorkspaceState(
    context,
    WORKSPACE_RUN_COMMAND_STORAGE_KEY_PREFIX,
    tabId,
    command
  );
}

/** Get current user prompt from workspace state */
export function getCurrentUserPromptFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): string | undefined {
  return getWorkspaceState<string | undefined>(
    context,
    WORKSPACE_USER_PROMPT_STORAGE_KEY_PREFIX,
    tabId,
    undefined
  );
}

/** Set current user prompt to workspace state */
export async function setCurrentUserPromptToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  prompt: string
): Promise<void> {
  await setWorkspaceState(
    context,
    WORKSPACE_USER_PROMPT_STORAGE_KEY_PREFIX,
    tabId,
    prompt
  );
}

/** Get autoRemoveComments state from workspace state */
export function getAutoRemoveCommentsFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): boolean | undefined {
  return getWorkspaceState<boolean | undefined>(
    context,
    AUTO_REMOVE_COMMENTS_STORAGE_KEY,
    tabId,
    undefined
  );
}

/** Set autoRemoveComments state to workspace state */
export async function setAutoRemoveCommentsToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  state: boolean
): Promise<void> {
  await setWorkspaceState(
    context,
    AUTO_REMOVE_COMMENTS_STORAGE_KEY,
    tabId,
    state
  );
}

/** Get autoFormat state from workspace state */
export function getAutoFormatFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): boolean | undefined {
  return getWorkspaceState<boolean | undefined>(
    context,
    AUTO_FORMAT_STORAGE_KEY,
    tabId,
    undefined
  );
}

/** Set autoFormat state to workspace state */
export async function setAutoFormatToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  state: boolean
): Promise<void> {
  await setWorkspaceState(context, AUTO_FORMAT_STORAGE_KEY, tabId, state);
}

/** Get autoFixErrors state from workspace state */
export function getAutoFixErrorsFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): boolean | undefined {
  return getWorkspaceState<boolean | undefined>(
    context,
    AUTO_FIX_ERRORS_STORAGE_KEY,
    tabId,
    undefined
  );
}

/** Set autoFixErrors state to workspace state */
export async function setAutoFixErrorsToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  state: boolean
): Promise<void> {
  await setWorkspaceState(context, AUTO_FIX_ERRORS_STORAGE_KEY, tabId, state);
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
