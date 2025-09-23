import { newAiApi } from "../aiTools/AiApi";
import {
  GetterSetter,
  useProviderByName,
  useSettingsObject,
} from "../settingsObject";
import { TextAi } from "./types/TextAi";

export function useTextAi(globalSettings: GetterSetter): TextAi {
  const [settings, setSettings] = useSettingsObject(globalSettings);

  const currentProviderSetting = useProviderByName(
    settings,
    settings.providerName
  );
  if (!currentProviderSetting) {
    throw new Error("No provider selected");
  }

  const callAiApi = newAiApi(
    currentProviderSetting.vendor === "gemini"
      ? {
          ...currentProviderSetting,
          model: "gemini-2.0-flash-lite",
        }
      : currentProviderSetting
  );

  const aiCall = async (
    user: string,
    system: string,
    options?: {
      signal?: AbortSignal;
      logger?: (message: string) => void;
    }
  ) => {
    const response = await callAiApi(
      {
        user,
        system,
        tools: [],
      },
      [],
      { logger: options?.logger, signal: options?.signal }
    );
    return response.assistant.trim();
  };
  return aiCall;
}
