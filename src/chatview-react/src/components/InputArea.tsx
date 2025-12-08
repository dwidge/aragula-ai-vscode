import React, { useState } from "react";
import { useSettings } from "../contexts/SettingsContext";
import { useChatActions } from "../hooks/useChatActions";
import ActionButtons from "./ActionButtons";
import "./InputArea.css";
import PromptSection from "./PromptSection";
import RunCommandSection from "./RunCommandSection";

const InputArea: React.FC = () => {
  const settings = useSettings();
  const actions = useChatActions();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const toggleAdvanced = () => setAdvancedOpen((prev) => !prev);

  return (
    <div className="input-area">
      <PromptSection
        type="user"
        value={settings.currentUserPrompt}
        onInput={settings.updateUserPrompt}
        inputRef={settings.userInputRef}
        prompts={settings.userPrompts}
        popupVisible={settings.userPromptsPopupVisible}
        setPopupVisible={settings.setUserPromptsPopupVisible}
        onSave={settings.saveUserPrompt}
        onLoad={settings.loadUserPrompt}
        onDelete={settings.deleteUserPrompt}
        rows={4}
        placeholder="Type your message here..."
      />
      <div className="compact-input-actions">
        <ActionButtons variant="compact" />
        <button className="toggle-advanced" onClick={toggleAdvanced}>
          {advancedOpen ? "▲" : "⚙️"}
        </button>
      </div>
      {advancedOpen && (
        <div className="advanced-panel">
          <PromptSection
            type="system"
            value={settings.currentSystemPrompt}
            onInput={settings.updateSystemPrompt}
            inputRef={settings.systemPromptRef}
            prompts={settings.systemPrompts}
            popupVisible={settings.systemPromptsPopupVisible}
            setPopupVisible={settings.setSystemPromptsPopupVisible}
            onSave={settings.saveSystemPrompt}
            onLoad={settings.loadSystemPrompt}
            onDelete={settings.deleteSystemPrompt}
            rows={2}
            placeholder="Edit system prompt here..."
          />
          <RunCommandSection
            value={settings.currentRunCommand}
            shell={settings.currentSelectedShell}
            onInput={settings.updateRunCommand}
            onShellChange={settings.updateSelectedShell}
            inputRef={settings.runCommandInputRef}
            shellRef={settings.shellSelectorRef}
          />
          <ActionButtons variant="advanced" />
        </div>
      )}
    </div>
  );
};

export default InputArea;
