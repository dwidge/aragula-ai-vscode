import { AiApiSettings } from "./aiTools/AiApi";

export const SETTINGS_STORAGE_KEY = "settings";

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
  privacySettings?: PrivacyPair[];
}

export interface PrivacyPair {
  search: string;
  replace: string;
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
  privacySettings: [],
};

export function getSettingsObject(
  getState: GetState,
  defaultValue: Partial<SettingsObject> = defaultSettings
): SettingsObject {
  const storedSettings = getState<Partial<SettingsObject>>(defaultValue);
  return { ...defaultValue, ...storedSettings } as SettingsObject;
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
