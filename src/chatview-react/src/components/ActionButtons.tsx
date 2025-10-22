import React from "react";
import { useChat } from "../contexts/ChatContext";
import { useSettings } from "../contexts/SettingsContext";
import { ChatMessage } from "../types";
import "./ActionButtons.css";
import EnabledTools from "./EnabledTools";
import SelectedFiles from "./SelectedFiles";
import SelectedProvider from "./SelectedProvider";

const ActionButtons: React.FC = () => {
  const {
    openFiles,
    enabledTools,
    removeTool,
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
    setIsPrivacyMaskingEnabled,
    vscode,
    updateUserPrompt,
    toggleToolPopup,
    toggleProviderSettingsPopup,
    togglePrivacySettingsPopup,
  } = useSettings();

  const { setChatHistory, scrollToBottom, clearChatHistory } = useChat();

  const handleSendMessage = React.useCallback(() => {
    const user = userInputRef.current?.value.trim() || "";
    const system = systemPromptRef.current?.value.trim() || "";
    if (!user) return;
    if (!currentProviderSetting) return;

    const messageId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: messageId,
      summary: user,
      detail: user,
      sender: "user",
      messageType: "user",
      isCollapsed: false,
    };
    setChatHistory((prev) => [...prev, userMsg]);
    scrollToBottom();

    vscode.postMessage({
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

    if (userInputRef.current) userInputRef.current.value = "";
    updateUserPrompt("");
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
    updateUserPrompt,
    scrollToBottom,
    setChatHistory,
    userInputRef,
    systemPromptRef,
    vscode,
  ]);

  const handlePlanAndExecute = React.useCallback(() => {
    const user = userInputRef.current?.value.trim() || "";
    const system = systemPromptRef.current?.value.trim() || "";
    if (!user) return;
    if (!currentProviderSetting) return;

    const messageId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: messageId,
      summary: user,
      detail: user,
      sender: "user",
      messageType: "user",
      isCollapsed: false,
    };
    setChatHistory((prev) => [...prev, userMsg]);
    scrollToBottom();

    vscode.postMessage({
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
    vscode,
  ]);

  const addFiles = React.useCallback(() => {
    vscode.postMessage({ command: "openFilesDialog" });
  }, [vscode]);

  const handleRemoveComments = React.useCallback(() => {
    if (openFiles.length === 0) return;
    vscode.postMessage({
      command: "removeCommentsInFiles",
      filePaths: openFiles,
    });
  }, [openFiles, vscode]);

  const handleFormat = React.useCallback(() => {
    if (openFiles.length === 0) return;
    vscode.postMessage({
      command: "formatFilesInFiles",
      filePaths: openFiles,
    });
  }, [openFiles, vscode]);

  const handleFixErrors = React.useCallback(() => {
    if (openFiles.length === 0 || !currentProviderSetting) return;
    vscode.postMessage({
      command: "checkErrorsInFiles",
      filePaths: openFiles,
      providerSetting: currentProviderSetting,
    });
  }, [openFiles, currentProviderSetting, vscode]);

  const handleCommitFiles = React.useCallback(() => {
    if (openFiles.length === 0) return;
    vscode.postMessage({ command: "commitFiles", fileNames: openFiles });
  }, [openFiles, vscode]);

  const handleTestTask = React.useCallback(() => {
    vscode.postMessage({ command: "runTestTask" });
  }, [vscode]);

  const handleTestMultiTask = React.useCallback(() => {
    vscode.postMessage({ command: "runTestMultiTask" });
  }, [vscode]);

  const handleTestSerialTask = React.useCallback(() => {
    vscode.postMessage({ command: "runTestSerialTask" });
  }, [vscode]);

  const handleTestFormTask = React.useCallback(() => {
    vscode.postMessage({ command: "runTestFormTask" });
  }, [vscode]);

  const handleTestSetCommitMessage = React.useCallback(() => {
    vscode.postMessage({ command: "runTestSetCommitMessage" });
  }, [vscode]);

  const handleShowCodebaseSummary = React.useCallback(() => {
    vscode.postMessage({ command: "runShowCodebaseSummary" });
  }, [vscode]);

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

  const handlePrivacyMaskingChange = React.useCallback(
    (checked: boolean) => {
      setIsPrivacyMaskingEnabled(checked);
      sendSettingsUpdate({ isPrivacyMaskingEnabled: checked });
    },
    [setIsPrivacyMaskingEnabled, sendSettingsUpdate]
  );

  return (
    <div className="button-row">
      <SelectedProvider provider={currentProviderSetting} />
      <EnabledTools tools={enabledTools} onRemoveTool={removeTool} />
      <SelectedFiles files={openFiles} onRemoveFile={removeTool} />{" "}
      <button onClick={handleSendMessage}>Send</button>
      <button onClick={handlePlanAndExecute}>Plan & Execute</button>
      <button onClick={clearChatHistory}>Clear</button>
      <button onClick={addFiles}>Add Files</button>
      <button onClick={toggleToolPopup}>Add Tool</button>
      <button onClick={toggleProviderSettingsPopup}>Providers</button>
      <div className="auto-checkbox">
        <input
          type="checkbox"
          checked={autoRemoveComments}
          onChange={(e) => {
            setAutoRemoveComments(e.target.checked);
            sendSettingsUpdate({ autoRemoveComments: e.target.checked });
          }}
        />
        <label>Auto Remove Comments</label>
      </div>
      <button onClick={handleRemoveComments}>Remove Comments</button>
      <div className="auto-checkbox">
        <input
          type="checkbox"
          checked={autoFormat}
          onChange={(e) => {
            setAutoFormat(e.target.checked);
            sendSettingsUpdate({ autoFormat: e.target.checked });
          }}
        />
        <label>Auto Format</label>
      </div>
      <button onClick={handleFormat}>Format</button>
      <div className="auto-checkbox">
        <input
          type="checkbox"
          checked={autoFixErrors}
          onChange={(e) => {
            setAutoFixErrors(e.target.checked);
            sendSettingsUpdate({ autoFixErrors: e.target.checked });
          }}
        />
        <label>Auto Fix Errors</label>
      </div>
      <button onClick={handleFixErrors}>Fix Errors</button>
      <div className="auto-checkbox">
        <input
          type="checkbox"
          checked={autoGenerateCommit}
          onChange={(e) => handleAutoGenerateCommitChange(e.target.checked)}
        />
        <label>Generate Commit Message</label>
      </div>
      <div className="auto-checkbox">
        <input
          type="checkbox"
          checked={useConventionalCommits}
          disabled={!autoGenerateCommit}
          onChange={(e) => handleUseConventionalCommitsChange(e.target.checked)}
        />
        <label>Use Conventional Commits</label>
      </div>
      <button onClick={handleCommitFiles}>Commit Files</button>
      <button onClick={handleTestTask}>Test Task Logger</button>
      <button onClick={handleTestMultiTask}>Test Multi Task</button>
      <button onClick={handleTestSerialTask}>Test Serial Task</button>
      <button onClick={handleTestFormTask}>Test Form Task</button>
      <button onClick={handleTestSetCommitMessage}>
        Test Set Commit Message
      </button>
      <button onClick={handleShowCodebaseSummary}>Show Codebase Summary</button>
      <div className="auto-checkbox">
        <input
          type="checkbox"
          checked={includeCodebaseSummary}
          onChange={(e) => handleIncludeCodebaseSummaryChange(e.target.checked)}
        />
        <label>Include Codebase Summary</label>
      </div>
      <button onClick={togglePrivacySettingsPopup}>Privacy</button>
    </div>
  );
};

export default ActionButtons;
