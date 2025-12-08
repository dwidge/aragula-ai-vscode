import React from "react";
import { useChat } from "../contexts/ChatContext";
import { useSettings } from "../contexts/SettingsContext";
import { ChatMessage } from "../types";

export const useChatActions = () => {
  const {
    openFiles,
    enabledTools,
    currentProviderSetting,
    autoRemoveComments,
    setAutoRemoveComments,
    autoFormat,
    setAutoFormat,
    autoFixErrors,
    setAutoFixErrors,
    autoGenerateCommit,
    setAutoGenerateCommit,
    useConventionalCommits,
    setUseConventionalCommits,
    includeCodebaseSummary,
    setIncludeCodebaseSummary,
    sendSettingsUpdate,
    userInputRef,
    systemPromptRef,
    privacySettings,
    isPrivacyMaskingEnabled,
    postMessage,
    updateUserPrompt,
    toggleToolPopup,
    toggleProviderSettingsPopup,
    togglePrivacySettingsPopup,
  } = useSettings();

  const { setChatHistory, scrollToBottom, clearChatHistory } = useChat();

  const isFileActionDisabled = openFiles.length === 0;
  const isFixErrorsDisabled = isFileActionDisabled || !currentProviderSetting;

  const addUserMessageToChat = (user: string) => {
    const messageId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: messageId,
      summary: user,
      detail: user,
      sender: "user",
      messageType: "user",
      isCollapsed: false,
    };
    setChatHistory((prev) => {
      const collapsedPrev = prev.map((m) => ({ ...m, isCollapsed: true }));
      return [...collapsedPrev, userMsg];
    });
    scrollToBottom();
    return messageId;
  };

  const handleSendMessage = React.useCallback(() => {
    const user = userInputRef.current?.value.trim() || "";
    const system = systemPromptRef.current?.value.trim() || "";
    if (!user || !currentProviderSetting) return;

    const messageId = addUserMessageToChat(user);

    postMessage({
      command: "sendMessage",
      user,
      system,
      fileNames: openFiles,
      toolNames: enabledTools,
      providerSetting: currentProviderSetting,
      messageId,
      autoRemoveComments,
      autoFormat,
      autoFixErrors,
      autoGenerateCommit,
      useConventionalCommits,
      privacySettings,
      isPrivacyMaskingEnabled,
      includeCodebaseSummary,
    });
  }, [
    currentProviderSetting,
    openFiles,
    enabledTools,
    autoRemoveComments,
    autoFormat,
    autoFixErrors,
    autoGenerateCommit,
    useConventionalCommits,
    privacySettings,
    isPrivacyMaskingEnabled,
    includeCodebaseSummary,
    scrollToBottom,
    setChatHistory,
    userInputRef,
    systemPromptRef,
    postMessage,
  ]);

  const handlePlanAndExecute = React.useCallback(() => {
    const user = userInputRef.current?.value.trim() || "";
    const system = systemPromptRef.current?.value.trim() || "";
    if (!user || !currentProviderSetting) return;

    const messageId = addUserMessageToChat(user);

    postMessage({
      command: "planAndExecute",
      user,
      system,
      fileNames: openFiles,
      providerSetting: currentProviderSetting,
      autoRemoveComments,
      autoFormat,
      autoFixErrors,
      privacySettings,
      isPrivacyMaskingEnabled,
      messageId,
    });

    if (userInputRef.current) userInputRef.current.value = "";
    updateUserPrompt("");
  }, [
    currentProviderSetting,
    openFiles,
    autoRemoveComments,
    autoFormat,
    autoFixErrors,
    privacySettings,
    isPrivacyMaskingEnabled,
    updateUserPrompt,
    scrollToBottom,
    setChatHistory,
    userInputRef,
    systemPromptRef,
    postMessage,
  ]);

  const addFiles = React.useCallback(() => {
    postMessage({ command: "openFilesDialog" });
  }, [postMessage]);

  const handleRemoveComments = React.useCallback(() => {
    if (isFileActionDisabled) return;
    postMessage({
      command: "removeCommentsInFiles",
      filePaths: openFiles,
    });
  }, [openFiles, postMessage, isFileActionDisabled]);

  const handleFormat = React.useCallback(() => {
    if (isFileActionDisabled) return;
    postMessage({
      command: "formatFilesInFiles",
      filePaths: openFiles,
    });
  }, [openFiles, postMessage, isFileActionDisabled]);

  const handleFixErrors = React.useCallback(() => {
    if (isFixErrorsDisabled) return;
    postMessage({
      command: "checkErrorsInFiles",
      filePaths: openFiles,
      providerSetting: currentProviderSetting,
    });
  }, [openFiles, currentProviderSetting, postMessage, isFixErrorsDisabled]);

  const handleCommitFiles = React.useCallback(() => {
    if (isFileActionDisabled) return;
    postMessage({ command: "commitFiles", fileNames: openFiles });
  }, [openFiles, postMessage, isFileActionDisabled]);

  const handleTestTask = React.useCallback(() => {
    postMessage({ command: "runTestTask" });
  }, [postMessage]);

  const handleTestMultiTask = React.useCallback(() => {
    postMessage({ command: "runTestMultiTask" });
  }, [postMessage]);

  const handleTestSerialTask = React.useCallback(() => {
    postMessage({ command: "runTestSerialTask" });
  }, [postMessage]);

  const handleTestFormTask = React.useCallback(() => {
    postMessage({ command: "runTestFormTask" });
  }, [postMessage]);

  const handleTestSetCommitMessage = React.useCallback(() => {
    postMessage({ command: "runTestSetCommitMessage" });
  }, [postMessage]);

  const handleShowCodebaseSummary = React.useCallback(() => {
    postMessage({ command: "runShowCodebaseSummary" });
  }, [postMessage]);

  const handleAutoGenerateCommitChange = React.useCallback(
    (checked: boolean) => {
      setAutoGenerateCommit(checked);
      if (!checked) {
        setUseConventionalCommits(false);
        sendSettingsUpdate({
          autoGenerateCommit: checked,
          useConventionalCommits: false,
        });
      } else {
        sendSettingsUpdate({ autoGenerateCommit: checked });
      }
    },
    [setAutoGenerateCommit, setUseConventionalCommits, sendSettingsUpdate]
  );

  const handleUseConventionalCommitsChange = React.useCallback(
    (checked: boolean) => {
      setUseConventionalCommits(checked);
      sendSettingsUpdate({ useConventionalCommits: checked });
    },
    [setUseConventionalCommits, sendSettingsUpdate]
  );

  const handleIncludeCodebaseSummaryChange = React.useCallback(
    (checked: boolean) => {
      setIncludeCodebaseSummary(checked);
      sendSettingsUpdate({ includeCodebaseSummary: checked });
    },
    [setIncludeCodebaseSummary, sendSettingsUpdate]
  );

  return {
    handleSendMessage,
    handlePlanAndExecute,
    clearChatHistory,
    addFiles,
    toggleToolPopup,
    toggleProviderSettingsPopup,
    autoRemoveComments,
    setAutoRemoveComments,
    sendSettingsUpdate,
    handleRemoveComments,
    autoFormat,
    setAutoFormat,
    handleFormat,
    autoFixErrors,
    setAutoFixErrors,
    handleFixErrors,
    autoGenerateCommit,
    handleAutoGenerateCommitChange,
    useConventionalCommits,
    handleUseConventionalCommitsChange,
    handleCommitFiles,
    handleTestTask,
    handleTestMultiTask,
    handleTestSerialTask,
    handleTestFormTask,
    handleTestSetCommitMessage,
    handleShowCodebaseSummary,
    includeCodebaseSummary,
    handleIncludeCodebaseSummaryChange,
    togglePrivacySettingsPopup,
    isFileActionDisabled,
    isFixErrorsDisabled,
  };
};
