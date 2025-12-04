import React, { Suspense, useCallback, useEffect } from "react";
import "./App.css";
import EnabledTools from "./components/EnabledTools";
import ErrorBoundary from "./components/ErrorBoundary";
import InputArea from "./components/InputArea";
import MessageList from "./components/MessageList";
import PrivacySettingsPopup from "./components/PrivacySettingsPopup";
import ProviderSettingsPopup from "./components/ProviderSettingsPopup";
import SelectedFiles from "./components/SelectedFiles";
import SelectedProvider from "./components/SelectedProvider";
import ToolPopup from "./components/ToolPopup";
import { ChatProvider } from "./contexts/ChatContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { useChatManager } from "./hooks/useChatManager";
import { useMessageHandler } from "./hooks/useMessageHandler";
import { useSettingsManager } from "./hooks/useSettingsManager";

interface AppProps {
  tabId: string;
}

const InnerApp: React.FC<AppProps> = ({ tabId }) => {
  const chatManager = useChatManager(tabId);
  const settingsManager = useSettingsManager(tabId);

  useMessageHandler({
    setChatHistory: chatManager.setChatHistory,
    setOpenFiles: settingsManager.setOpenFiles,
    setCurrentSystemPrompt: settingsManager.setCurrentSystemPrompt,
    setCurrentUserPrompt: settingsManager.setCurrentUserPrompt,
    setSystemPrompts: settingsManager.setSystemPrompts,
    setUserPrompts: settingsManager.setUserPrompts,
    setProviderSettingsList: settingsManager.setProviderSettingsList,
    setEnabledTools: settingsManager.setEnabledTools,
    setAutoRemoveComments: settingsManager.setAutoRemoveComments,
    setAutoFormat: settingsManager.setAutoFormat,
    setAutoFixErrors: settingsManager.setAutoFixErrors,
    setPrivacySettings: settingsManager.setPrivacySettings,
    setIsPrivacyMaskingEnabled: settingsManager.setIsPrivacyMaskingEnabled,
    setCurrentProviderSetting: settingsManager.setCurrentProviderSetting,
    setAvailableVendors: settingsManager.setAvailableVendors,
    setAvailableTools: settingsManager.setAvailableTools,
    setAvailableShells: settingsManager.setAvailableShells,
    setAutoGenerateCommit: settingsManager.setAutoGenerateCommit,
    setUseConventionalCommits: settingsManager.setUseConventionalCommits,
    setIncludeCodebaseSummary: settingsManager.setIncludeCodebaseSummary,
    systemPromptRef: settingsManager.systemPromptRef,
    userInputRef: settingsManager.userInputRef,
  });

  useEffect(() => {
    settingsManager.sendSettingsUpdate({});
  }, []);

  const allowDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const dropHandler = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  return (
    <main onDragOver={allowDrop} onDrop={dropHandler}>
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorBoundary>
          <ChatProvider value={chatManager}>
            <SettingsProvider value={settingsManager}>
              <SelectedProvider
                provider={settingsManager.currentProviderSetting}
              />
              <EnabledTools
                tools={settingsManager.enabledTools}
                onRemoveTool={settingsManager.removeTool}
              />
              <SelectedFiles
                files={settingsManager.openFiles}
                onRemoveFile={settingsManager.removeFile}
              />
              <MessageList />
              <InputArea />
              <ToolPopup />
              <ProviderSettingsPopup />
              <PrivacySettingsPopup />
            </SettingsProvider>
          </ChatProvider>
        </ErrorBoundary>
      </Suspense>
    </main>
  );
};

export const App: React.FC<AppProps> = ({ tabId }) => (
  <InnerApp tabId={tabId} />
);
