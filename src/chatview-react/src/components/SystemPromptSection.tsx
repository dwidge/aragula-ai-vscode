import React from "react";
import { useSettings } from "../contexts/SettingsContext";
import PromptsPopup from "./PromptsPopup";
import "./SystemPromptSection.css";

interface SystemPromptSectionProps {
  value: string;
  onInput: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

const SystemPromptSection: React.FC<SystemPromptSectionProps> = ({
  value,
  onInput,
  inputRef,
}) => {
  const {
    systemPrompts,
    systemPromptsPopupVisible,
    setSystemPromptsPopupVisible,
    saveSystemPrompt,
    loadSystemPrompt,
    deleteSystemPrompt,
  } = useSettings();

  const togglePopup = () => setSystemPromptsPopupVisible((prev) => !prev);
  const closePopup = () => setSystemPromptsPopupVisible(false);

  return (
    <>
      <div className="input-row">
        <textarea
          ref={inputRef}
          rows={2}
          placeholder="Edit system prompt here..."
          onInput={(e) => onInput(e.currentTarget.value)}
          value={value}
        />
        <div className="prompt-buttons">
          <button onClick={togglePopup}>Load</button>
          <button onClick={saveSystemPrompt}>Save</button>
        </div>
      </div>
      <PromptsPopup
        prompts={systemPrompts}
        type="system"
        visible={systemPromptsPopupVisible}
        onClose={closePopup}
        onLoadPrompt={loadSystemPrompt}
        onDeletePrompt={deleteSystemPrompt}
      />
    </>
  );
};

export default SystemPromptSection;
