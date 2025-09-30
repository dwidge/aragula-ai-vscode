declare const IS_PROD: boolean;

import { AiApiSettings } from "@/ai-api/types/AiApiSettings";
import { PrivacyPair } from "./privacy/PrivacyPair";

export const SETTINGS_STORAGE_KEY = IS_PROD ? "settings" : "settings-dev";

export type GetState = <T>(defaultValue: T) => T;
export type SetState = <T>(value: T) => Promise<T>;

export interface GetterSetter {
  get: <T>(defaultValue: T) => T;
  set: <T>(value: T) => Promise<T>;
}

export interface SettingsObject {
  systemPromptList: string[];
  userPromptList: string[];
  providerList: AiApiSettings[];

  enabledTools: string[];
  providerName: string | null;
  systemPrompt: string;
  userPrompt: string;
  runCommand: string;

  autoRemoveComments: boolean;
  autoFormat: boolean;
  autoFixErrors: boolean;
  autoGenerateCommit: boolean;
  useConventionalCommits: boolean;
  privacySettings?: PrivacyPair[];
}

export interface WorkspaceSettings {
  openFiles: string[];
}

const defaultSettings: SettingsObject = {
  systemPromptList: [],
  userPromptList: [],
  providerList: [],

  enabledTools: [],
  providerName: null,
  systemPrompt: "",
  userPrompt: "",
  runCommand: "",

  autoRemoveComments: true,
  autoFormat: true,
  autoFixErrors: true,
  autoGenerateCommit: false,
  useConventionalCommits: false,
  privacySettings: [],
};

const defaultWorkspaceSettings: WorkspaceSettings = {
  openFiles: [],
};

export function getSettingsObject(
  getState: GetState,
  defaultValue: Partial<SettingsObject> = defaultSettings
): SettingsObject {
  const storedSettings = getState<Partial<SettingsObject>>(defaultValue);
  return { ...defaultValue, ...storedSettings } as SettingsObject;
}

export function getWorkspaceSettings(
  getState: GetState,
  defaultValue: Partial<WorkspaceSettings> = defaultWorkspaceSettings
): WorkspaceSettings {
  const storedSettings = getState<Partial<WorkspaceSettings>>(defaultValue);
  return { ...defaultValue, ...storedSettings } as WorkspaceSettings;
}

export const setSettingsObject = async (
  getState: GetState,
  setState: SetState,
  value: Partial<SettingsObject>
): Promise<SettingsObject> =>
  await setState({
    ...getSettingsObject(getState),
    ...value,
  });

export const setWorkspaceSettings = async (
  getState: GetState,
  setState: SetState,
  value: Partial<WorkspaceSettings>
): Promise<WorkspaceSettings> =>
  await setState({
    ...getWorkspaceSettings(getState),
    ...value,
  });

export type SetSettings = (
  setter: (prev: SettingsObject) => SettingsObject
) => Promise<SettingsObject>;

export const useSettingsObject = ({
  get,
  set,
}: GetterSetter): [SettingsObject, SetSettings] => {
  const getSettings = () => getSettingsObject(get);
  const setSettings = (setter: (prev: SettingsObject) => SettingsObject) =>
    setSettingsObject(get, set, setter(getSettings()));
  return [getSettings(), setSettings];
};

export type SetWorkspaceSettings = (
  setter: (prev: WorkspaceSettings) => WorkspaceSettings
) => Promise<WorkspaceSettings>;

export const useWorkspaceSettings = ({
  get,
  set,
}: GetterSetter): [WorkspaceSettings, SetWorkspaceSettings] => {
  const getSettings = () => getWorkspaceSettings(get);
  const setSettings = (
    setter: (prev: WorkspaceSettings) => WorkspaceSettings
  ) => setWorkspaceSettings(get, set, setter(getSettings()));
  return [getSettings(), setSettings];
};

export const useProviderByName = (
  settings: SettingsObject,
  name: string | null
): AiApiSettings | undefined =>
  settings.providerList.find((p) => p.name === name);

/** Helper to delete a string from an array */
export const deleteStringFromArray = (arr: string[], str: string): string[] =>
  arr.filter((item) => item !== str);

export const newVsCodeState = (
  m: import("vscode").Memento,
  key = "data"
): GetterSetter => ({
  get: <T>(defaultValue: T): T => m.get<T>(key, defaultValue),
  set: async <T>(value: T): Promise<T> =>
    m.update(key, value).then(() => value),
});
