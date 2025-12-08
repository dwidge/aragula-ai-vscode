import React from "react";
import { useChatActions } from "../hooks/useChatActions";
import "./ActionButtons.css";
import ActionWithCheckbox from "./ActionWithCheckbox";

interface ActionButtonsProps {
  variant?: "compact" | "advanced";
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  variant = "compact",
}) => {
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
    isFileActionDisabled,
    isFixErrorsDisabled,
  } = useChatActions();

  const showCompactButtons = variant === "compact";
  const showUtilityButtons = variant !== "compact";
  const showAdvancedSections = variant === "advanced";

  return (
    <div className="button-row">
      <div className="main-actions">
        {showCompactButtons && (
          <>
            <button onClick={handleSendMessage}>Send</button>
            <button onClick={handlePlanAndExecute}>Plan & Execute</button>
            <button onClick={clearChatHistory}>Clear</button>
          </>
        )}
        {showUtilityButtons && (
          <>
            <button onClick={addFiles}>Add Files</button>
            <button onClick={toggleToolPopup}>Add Tool</button>
            <button onClick={toggleProviderSettingsPopup}>Providers</button>
            <button onClick={togglePrivacySettingsPopup}>Privacy</button>
          </>
        )}
      </div>

      {showAdvancedSections && (
        <>
          <div className="file-actions">
            <ActionWithCheckbox
              label="Auto Remove Comments"
              actionLabel="Remove Comments"
              autoChecked={autoRemoveComments}
              onAutoChange={(checked) => {
                setAutoRemoveComments(checked);
                sendSettingsUpdate({ autoRemoveComments: checked });
              }}
              onActionClick={handleRemoveComments}
              actionDisabled={isFileActionDisabled}
            />
            <ActionWithCheckbox
              label="Auto Format"
              actionLabel="Format"
              autoChecked={autoFormat}
              onAutoChange={(checked) => {
                setAutoFormat(checked);
                sendSettingsUpdate({ autoFormat: checked });
              }}
              onActionClick={handleFormat}
              actionDisabled={isFileActionDisabled}
            />
            <ActionWithCheckbox
              label="Auto Fix Errors"
              actionLabel="Fix Errors"
              autoChecked={autoFixErrors}
              onAutoChange={(checked) => {
                setAutoFixErrors(checked);
                sendSettingsUpdate({ autoFixErrors: checked });
              }}
              onActionClick={handleFixErrors}
              actionDisabled={isFixErrorsDisabled}
            />
          </div>
          <div className="commit-actions">
            <div className="auto-checkbox">
              <input
                type="checkbox"
                id="auto-generate-commit"
                checked={autoGenerateCommit}
                onChange={(e) =>
                  handleAutoGenerateCommitChange(e.target.checked)
                }
              />
              <label htmlFor="auto-generate-commit">
                Generate Commit Message
              </label>
            </div>
            <div className="auto-checkbox">
              <input
                type="checkbox"
                id="use-conventional-commits"
                checked={useConventionalCommits}
                disabled={!autoGenerateCommit}
                onChange={(e) =>
                  handleUseConventionalCommitsChange(e.target.checked)
                }
              />
              <label htmlFor="use-conventional-commits">
                Use Conventional Commits
              </label>
            </div>
            <button onClick={handleCommitFiles} disabled={isFileActionDisabled}>
              Commit Files
            </button>
          </div>
          <div className="summary-actions">
            <div className="auto-checkbox">
              <input
                type="checkbox"
                id="include-codebase-summary"
                checked={includeCodebaseSummary}
                onChange={(e) =>
                  handleIncludeCodebaseSummaryChange(e.target.checked)
                }
              />
              <label htmlFor="include-codebase-summary">
                Include Codebase Summary
              </label>
            </div>
            <button onClick={handleShowCodebaseSummary}>
              Show Codebase Summary
            </button>
          </div>
          <div className="test-actions">
            <button onClick={handleTestTask}>Test Task Logger</button>
            <button onClick={handleTestMultiTask}>Test Multi Task</button>
            <button onClick={handleTestSerialTask}>Test Serial Task</button>
            <button onClick={handleTestFormTask}>Test Form Task</button>
            <button onClick={handleTestSetCommitMessage}>
              Test Set Commit Message
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ActionButtons;
