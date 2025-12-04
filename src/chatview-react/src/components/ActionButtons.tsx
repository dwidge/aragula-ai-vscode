import React from "react";
import { useChatActions } from "../hooks/useChatActions";
import "./ActionButtons.css";

const ActionButtons: React.FC = () => {
  const {
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
  } = useChatActions();

  return (
    <div className="button-row">
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
