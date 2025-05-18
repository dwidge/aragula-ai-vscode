import { AiApiSettings } from "./aiTools/AiApi";

const SETTINGS_STORAGE_KEY = "settings";

export type GetState = <T>(key: string, defaultValue: T) => T;
export type SetState = <T>(key: string, value: T) => Promise<T>;

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
};

export function getSettingsObject(
  getState: GetState,
  defaultValue: Partial<SettingsObject> = defaultSettings
): SettingsObject {
  const storedSettings = getState<Partial<SettingsObject>>(
    SETTINGS_STORAGE_KEY,
    defaultValue
  );
  return { ...defaultValue, ...storedSettings } as SettingsObject;
}

export const setSettingsObject = async (
  getState: GetState,
  setState: SetState,
  value: Partial<SettingsObject>
): Promise<SettingsObject> =>
  await setState(SETTINGS_STORAGE_KEY, {
    ...getSettingsObject(getState),
    ...value,
  });

export type SetSettings = (
  setter: (prev: SettingsObject) => SettingsObject
) => Promise<SettingsObject>;

export const useSettingsObject = (
  getState: GetState,
  setState: SetState
): [SettingsObject, SetSettings] => {
  const getSettings = () => getSettingsObject(getState);
  const setSettings = (setter: (prev: SettingsObject) => SettingsObject) =>
    setSettingsObject(getState, setState, setter(getSettings()));
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
