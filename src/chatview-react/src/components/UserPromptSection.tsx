import React from "react";
import { useSettings } from "../contexts/SettingsContext";
import PromptsPopup from "./PromptsPopup";
import "./UserPromptSection.css";

interface UserPromptSectionProps {
  value: string;
  onInput: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

const UserPromptSection: React.FC<UserPromptSectionProps> = ({
  value,
  onInput,
  inputRef,
}) => {
  const {
    userPrompts,
    userPromptsPopupVisible,
    setUserPromptsPopupVisible,
    saveUserPrompt,
    loadUserPrompt,
    deleteUserPrompt,
  } = useSettings();

  const togglePopup = () => setUserPromptsPopupVisible((prev) => !prev);
  const closePopup = () => setUserPromptsPopupVisible(false);

  return (
    <>
      <div className="input-row">
        <textarea
          ref={inputRef}
          rows={4}
          placeholder="Type your message here..."
          onInput={(e) => onInput(e.currentTarget.value)}
          value={value}
        />
        <div className="prompt-buttons">
          <button onClick={togglePopup}>Load</button>
          <button onClick={saveUserPrompt}>Save</button>
        </div>
      </div>
      <PromptsPopup
        prompts={userPrompts}
        type="user"
        visible={userPromptsPopupVisible}
        onClose={closePopup}
        onLoadPrompt={loadUserPrompt}
        onDeletePrompt={deleteUserPrompt}
      />
    </>
  );
};

export default UserPromptSection;
