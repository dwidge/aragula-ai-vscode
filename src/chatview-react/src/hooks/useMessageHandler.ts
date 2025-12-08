import { useEffect } from "react";
import { SettingsContextType } from "../contexts/SettingsContext";
import { ChatMessage } from "../types";

type Setters = Omit<SettingsContextType, "postMessage" | "tabId">;

interface UseMessageHandlerProps extends Partial<Setters> {
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  systemPromptRef?: React.RefObject<HTMLTextAreaElement | null>;
  userInputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

function updateHistoryWithParentExpanded(
  prev: ChatMessage[],
  newMsg: ChatMessage
): ChatMessage[] {
  const newHistory = [...prev, newMsg];

  return newHistory;
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
      if (message.command === "log") {
        const { id, parentId, message: taskLog } = message;
        setChatHistory((prev) => {
          const msgId = String(id);
          const msgParentId = parentId ? String(parentId) : undefined;
          const newMsg: ChatMessage = {
            id: msgId,
            parentId: msgParentId,
            summary: taskLog.summary || "",
            detail: taskLog.detail || "",
            messageType: taskLog.type || "log",
            isCollapsed: false,
          };
          if (prev.find((m) => m.id === msgId)) {
            return prev.map((m) => (m.id === msgId ? { ...m, ...newMsg } : m));
          } else {
            return [...prev, newMsg];
          }
        });
        return;
      }
      switch (message.command) {
        case "promptForm":
          const formId = String(message.formRequest.id);
          const formParentId = message.formRequest.parentId
            ? String(message.formRequest.parentId)
            : undefined;
          setChatHistory((prev) => {
            const newMsg: ChatMessage = {
              id: formId,
              parentId: formParentId,
              summary: message.formRequest.message,
              detail: "",
              messageType: "form-prompt",
              isCollapsed: false,
            };
            return updateHistoryWithParentExpanded(prev, newMsg);
          });
          break;
        case "updateMessage":
          const updateId = String(message.messageId);
          setChatHistory((prev) => {
            const existingIndex = prev.findIndex((m) => m.id === updateId);

            let text = message.text ?? message.detail ?? "";
            let summary = message.summary ?? text;
            if (message.messageType === "error") {
              const errorMessage = text || summary;
              text = errorMessage;
              summary = errorMessage;
            }

            const newMsg: ChatMessage = {
              id: updateId,
              summary,
              detail: text,
              sender: message.sender || "",
              messageType: message.messageType || "log",
              isCollapsed: false,
            };

            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                ...newMsg,
              };
              return updated;
            } else {
              return updateHistoryWithParentExpanded(prev, newMsg);
            }
          });
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
