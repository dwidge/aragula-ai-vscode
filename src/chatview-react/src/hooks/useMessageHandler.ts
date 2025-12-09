import { useEffect } from "react";
import { SettingsContextType } from "../contexts/SettingsContext";
import { ChatMessage } from "../types";

type Setters = Omit<SettingsContextType, "postMessage" | "tabId">;

interface UseMessageHandlerProps extends Partial<Setters> {
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  systemPromptRef?: React.RefObject<HTMLTextAreaElement | null>;
  userInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function updateHistory(
  prev: ChatMessage[],
  newMsg: ChatMessage
): ChatMessage[] {
  if (prev.find((m) => m.id === newMsg.id)) {
    return prev.map((m) =>
      m.id === newMsg.id
        ? (console.log("Updating history with message:", m, newMsg, {
            ...m,
            ...newMsg,
            message: { ...m.message, ...newMsg.message },
          }),
          {
            ...m,
            ...newMsg,
            message: { ...m.message, ...newMsg.message },
          })
        : m
    );
  } else {
    console.log("Add history with message:", prev, newMsg);
    return [...prev, newMsg];
  }
}

export const useMessageHandler = (props: UseMessageHandlerProps) => {
  const {
    setChatHistory,
    setOpenFiles,
    setCurrentSystemPrompt,
    setCurrentUserPrompt,
    setSystemPrompts,
    setUserPrompts,
    setProviderSettingsList,
    setEnabledTools,
    setAutoRemoveComments,
    setAutoFormat,
    setAutoFixErrors,
    setPrivacySettings,
    setIsPrivacyMaskingEnabled,
    setCurrentProviderSetting,
    setAvailableVendors,
    setAvailableTools,
    setAvailableShells,
    setAutoGenerateCommit,
    setUseConventionalCommits,
    setIncludeCodebaseSummary,
    systemPromptRef,
    userInputRef,
  } = props;

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      console.log("message1", message.command, message);

      switch (message.command) {
        case "log":
          setChatHistory((prev) =>
            updateHistory(prev, {
              ...message,
              isCollapsed: false,
            })
          );
          break;
        case "promptForm":
          const formId = String(message.formRequest.id);
          const formParentId = message.formRequest.parentId
            ? String(message.formRequest.parentId)
            : undefined;
          setChatHistory((prev) =>
            updateHistory(prev, {
              id: formId,
              parentId: formParentId,
              message: {
                summary: message.formRequest.message,
                detail: "",
                type: "form-prompt",
              },
              isCollapsed: false,
            })
          );
          break;
        case "clearMessages":
          setChatHistory([]);
          break;
        case "setWorkspaceSettings":
          if (message.data?.openFiles) {
            setOpenFiles?.(message.data?.openFiles);
          }
          break;
        case "settingsUpdated":
          setCurrentSystemPrompt?.(message.settings.systemPrompt || "");
          setCurrentUserPrompt?.(message.settings.userPrompt || "");
          setSystemPrompts?.(message.settings.systemPromptList || []);
          setUserPrompts?.(message.settings.userPromptList || []);
          setProviderSettingsList?.(message.settings.providerList || []);
          setEnabledTools?.(message.settings.enabledTools || []);
          setAutoRemoveComments?.(message.settings.autoRemoveComments ?? true);
          setAutoFormat?.(message.settings.autoFormat ?? true);
          setAutoFixErrors?.(message.settings.autoFixErrors ?? true);
          setPrivacySettings?.(message.settings.privacySettings || []);
          setIsPrivacyMaskingEnabled?.(
            message.settings.isPrivacyMaskingEnabled ?? false
          );
          setCurrentProviderSetting?.(message.currentProviderSetting);
          setAvailableVendors?.(message.availableVendors || []);
          setAvailableTools?.(message.availableTools || []);
          setAvailableShells?.(message.availableShells || []);
          setAutoGenerateCommit?.(message.settings.autoGenerateCommit ?? false);
          setUseConventionalCommits?.(
            message.settings.useConventionalCommits ?? false
          );
          setIncludeCodebaseSummary?.(
            message.settings.includeCodebaseSummary ?? false
          );
          break;
        case "resetSendButton":
          break;
        default:
          console.warn("Unknown command:", message.command);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [
    setChatHistory,
    setOpenFiles,
    setCurrentSystemPrompt,
    setCurrentUserPrompt,
    setSystemPrompts,
    setUserPrompts,
    setProviderSettingsList,
    setEnabledTools,
    setAutoRemoveComments,
    setAutoFormat,
    setAutoFixErrors,
    setPrivacySettings,
    setIsPrivacyMaskingEnabled,
    setCurrentProviderSetting,
    setAvailableVendors,
    setAvailableTools,
    setAvailableShells,
    setAutoGenerateCommit,
    setUseConventionalCommits,
    setIncludeCodebaseSummary,
    systemPromptRef,
    userInputRef,
  ]);
};
