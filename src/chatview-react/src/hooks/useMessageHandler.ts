import { useEffect } from "react";
import { SettingsContextType } from "../contexts/SettingsContext";
import { ChatMessage } from "../types";

type Setters = Omit<SettingsContextType, "postMessage" | "tabId">;

interface UseMessageHandlerProps extends Partial<Setters> {
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  systemPromptRef: React.RefObject<HTMLTextAreaElement | null>;
  userInputRef: React.RefObject<HTMLTextAreaElement | null>;
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
        const msgId = String(id);
        const parent = parentId ? String(parentId) : undefined;
        setChatHistory((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === msgId);

          let summary = taskLog.summary;
          let detail = taskLog.detail;
          if (taskLog.type === "error") {
            const errorMessage =
              taskLog.detail || taskLog.summary || "An unknown error occurred";
            detail = errorMessage;
            summary = errorMessage;
          }

          const newMsg: ChatMessage = {
            id: msgId,
            parentId: parent,
            summary: summary || detail,
            detail: detail,
            messageType: taskLog.type,
            isCollapsed: [
              "prompt",
              "tool",
              "log",
              "info",
              "warning",
              "error",
            ].includes(taskLog.type || "log"),
          };
          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...newMsg };
            return updated;
          } else {
            const collapsedPrev = prev.map((m) => ({
              ...m,
              isCollapsed: true,
            }));
            return [...collapsedPrev, { ...newMsg, isCollapsed: false }];
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
            const collapsedPrev = prev.map((m) => ({
              ...m,
              isCollapsed: true,
            }));
            return [
              ...collapsedPrev,
              {
                id: formId,
                parentId: formParentId,
                summary: message.formRequest.message,
                detail: "",
                messageType: "form-prompt",
                isCollapsed: false,
              },
            ];
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

            if (existingIndex !== -1) {
              const updated = [...prev];
              updated[existingIndex] = {
                ...updated[existingIndex],
                detail: text,
                summary: summary,
                messageType: message.messageType,
                sender: message.sender,
              };
              return updated;
            } else {
              const collapsedPrev = prev.map((m) => ({
                ...m,
                isCollapsed: true,
              }));
              return [
                ...collapsedPrev,
                {
                  id: updateId,
                  summary: summary,
                  detail: text,
                  sender: message.sender || "",
                  messageType: message.messageType || "log",
                  isCollapsed: false,
                },
              ];
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
          if (systemPromptRef?.current)
            systemPromptRef.current.value = message.settings.systemPrompt || "";
          if (userInputRef?.current)
            userInputRef.current.value = message.settings.userPrompt || "";
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
