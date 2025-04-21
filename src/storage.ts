import * as vscode from "vscode";
import { AiApiSettings } from "./aiTools/AiApi";

export const ENABLED_TOOLS_STORAGE_KEY = "enabledTools"; // Global storage key for enabled tools
export const CURRENT_PROVIDER_SETTING_STORAGE_KEY =
  "currentProviderSettingName"; // Global storage key for current provider setting name
export const AUTO_REMOVE_COMMENTS_STORAGE_KEY = "autoRemoveComments";
export const AUTO_FORMAT_STORAGE_KEY = "autoFormat";

/** Retrieves the API key from configuration. */
function getApiKey(): string | null {
  const apiKey = vscode.workspace.getConfiguration("aragula-ai").get("apiKey");
  if (typeof apiKey !== "string") {
    vscode.window.showErrorMessage("API key is not configured properly.");
    return null;
  }
  return apiKey;
}
/** Retrieves the default system prompt from configuration. */
export function getSystemPrompt(): string | undefined {
  const prompt = vscode.workspace
    .getConfiguration("aragula-ai")
    .get("systemPrompt");
  return typeof prompt === "string" ? prompt : undefined;
}
/** Retrieves system prompts from global storage, MRU order */
export function getSystemPromptsFromStorage(
  context: vscode.ExtensionContext
): string[] {
  return context.globalState.get<string[]>("systemPrompts", []) || [];
}
/** Retrieves user prompts from global storage, MRU order */
export function getUserPromptsFromStorage(
  context: vscode.ExtensionContext
): string[] {
  return context.globalState.get<string[]>("userPrompts", []) || []; // New storage for user prompts
}
/** Retrieves provider settings from global storage */

export function getProviderSettingsFromStorage(
  context: vscode.ExtensionContext
): AiApiSettings[] {
  return (
    context.globalState.get<AiApiSettings[]>("providerSettingsList", []) || []
  );
}
/** Retrieves enabled tool names from global state */
export function getEnabledToolNamesFromGlobalState(
  context: vscode.ExtensionContext
): string[] {
  return context.globalState.get<string[]>(ENABLED_TOOLS_STORAGE_KEY, []) || [];
}
/** Retrieves current provider setting name from global state */

export function getCurrentProviderSettingFromGlobalState(
  context: vscode.ExtensionContext
): AiApiSettings | undefined {
  const providerSettingName = context.globalState.get<string>(
    CURRENT_PROVIDER_SETTING_STORAGE_KEY
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
  let prompts = getSystemPromptsFromStorage(context);
  if (!prompts.includes(prompt)) {
    prompts.unshift(prompt); // Add to the beginning for MRU
    await context.globalState.update("systemPrompts", prompts);
  }
}
/** Saves user prompt to global storage, MRU at top */
export async function saveUserPromptToStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getUserPromptsFromStorage(context);
  if (!prompts.includes(prompt)) {
    prompts.unshift(prompt); // Add to the beginning for MRU
    await context.globalState.update("userPrompts", prompts); // Save to user prompts storage
  }
}
/** Saves provider setting to global storage */
export async function saveProviderSettingToStorage(
  context: vscode.ExtensionContext,
  providerSetting: AiApiSettings
): Promise<void> {
  let providerSettingsList = getProviderSettingsFromStorage(context);
  const existingIndex = providerSettingsList.findIndex(
    (p) => p.name === providerSetting.name
  );
  if (existingIndex > -1) {
    providerSettingsList[existingIndex] = providerSetting; // Update existing
  } else {
    providerSettingsList.push(providerSetting); // Add new
  }
  await context.globalState.update(
    "providerSettingsList",
    providerSettingsList
  );
}
/** Updates provider setting in global storage */
export async function updateProviderSettingInStorage(
  context: vscode.ExtensionContext,
  oldProviderSettingName: string,
  providerSetting: AiApiSettings
): Promise<void> {
  let providerSettingsList = getProviderSettingsFromStorage(context);
  const existingIndex = providerSettingsList.findIndex(
    (p) => p.name === oldProviderSettingName
  );
  if (existingIndex > -1) {
    providerSettingsList[existingIndex] = providerSetting; // Update existing
  } else {
    providerSettingsList.push(providerSetting); // Add
  }
  await context.globalState.update(
    "providerSettingsList",
    providerSettingsList
  );
}
/** Saves enabled tool names to global state */
export async function setEnabledToolNamesToGlobalState(
  context: vscode.ExtensionContext,
  toolNames: string[]
): Promise<void> {
  await context.globalState.update(ENABLED_TOOLS_STORAGE_KEY, toolNames);
}
/** Saves current provider setting name to global state */
export async function useProviderSettingInGlobalState(
  context: vscode.ExtensionContext,
  providerSettingName: string
): Promise<void> {
  await context.globalState.update(
    CURRENT_PROVIDER_SETTING_STORAGE_KEY,
    providerSettingName
  );
}
/** Use system prompt, move to top in MRU list */
export async function useSystemPromptInStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getSystemPromptsFromStorage(context);
  const filteredPrompts = prompts.filter((p) => p !== prompt); // Remove existing
  filteredPrompts.unshift(prompt); // Add to the beginning for MRU
  await context.globalState.update("systemPrompts", filteredPrompts);
}
/** Use user prompt, move to top in MRU list */
export async function useUserPromptInStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getUserPromptsFromStorage(context);
  const filteredPrompts = prompts.filter((p) => p !== prompt); // Remove existing
  filteredPrompts.unshift(prompt); // Add to the beginning for MRU
  await context.globalState.update("userPrompts", filteredPrompts);
}
/** Deletes system prompt from global storage */
export async function deleteSystemPromptFromStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getSystemPromptsFromStorage(context);
  const updatedPrompts = prompts.filter((p) => p !== prompt);
  await context.globalState.update("systemPrompts", updatedPrompts);
}
/** Deletes user prompt from global storage */
export async function deleteUserPromptFromStorage(
  context: vscode.ExtensionContext,
  prompt: string
): Promise<void> {
  let prompts = getUserPromptsFromStorage(context);
  const updatedPrompts = prompts.filter((p) => p !== prompt);
  await context.globalState.update("userPrompts", updatedPrompts); // Delete from user prompts storage
}
/** Deletes provider setting from global storage */
export async function deleteProviderSettingFromStorage(
  context: vscode.ExtensionContext,
  providerSettingName: string
): Promise<void> {
  let providerSettingsList = getProviderSettingsFromStorage(context);
  const updatedProviderSettings = providerSettingsList.filter(
    (p) => p.name !== providerSettingName
  );
  await context.globalState.update(
    "providerSettingsList",
    updatedProviderSettings
  );
}
/** Get current system prompt from workspace state */
export function getCurrentSystemPromptFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): string | undefined {
  return context.workspaceState.get<string>(`workspaceSystemPrompt-${tabId}`);
}
/** Set current system prompt to workspace state */
export async function setCurrentSystemPromptToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  prompt: string
): Promise<void> {
  await context.workspaceState.update(`workspaceSystemPrompt-${tabId}`, prompt);
}
/** Get current user prompt from workspace state */
export function getCurrentUserPromptFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): string | undefined {
  return context.workspaceState.get<string>(`workspaceUserPrompt-${tabId}`);
}
/** Set current user prompt to workspace state */
export async function setCurrentUserPromptToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  prompt: string
): Promise<void> {
  await context.workspaceState.update(`workspaceUserPrompt-${tabId}`, prompt);
}

/** Get autoRemoveComments state from workspace state */
export function getAutoRemoveCommentsFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): boolean | undefined {
  return context.workspaceState.get<boolean>(
    `${AUTO_REMOVE_COMMENTS_STORAGE_KEY}-${tabId}`
  );
}

/** Set autoRemoveComments state to workspace state */
export async function setAutoRemoveCommentsToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  state: boolean
): Promise<void> {
  await context.workspaceState.update(
    `${AUTO_REMOVE_COMMENTS_STORAGE_KEY}-${tabId}`,
    state
  );
}

/** Get autoFormat state from workspace state */
export function getAutoFormatFromWorkspace(
  context: vscode.ExtensionContext,
  tabId: string
): boolean | undefined {
  return context.workspaceState.get<boolean>(
    `${AUTO_FORMAT_STORAGE_KEY}-${tabId}`
  );
}

/** Set autoFormat state to workspace state */
export async function setAutoFormatToWorkspace(
  context: vscode.ExtensionContext,
  tabId: string,
  state: boolean
): Promise<void> {
  await context.workspaceState.update(
    `${AUTO_FORMAT_STORAGE_KEY}-${tabId}`,
    state
  );
}
