import React from "react";
import "./PromptSection.css";
import PromptsPopup from "./PromptsPopup";

interface PromptSectionProps {
  type: "system" | "user";
  value: string;
  onInput: (value: string) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  prompts: string[];
  popupVisible: boolean;
  setPopupVisible: React.Dispatch<React.SetStateAction<boolean>>;
  onSave: () => void;
  onLoad: (prompt: string) => void;
  onDelete: (prompt: string) => void;
  rows: number;
  placeholder: string;
}

const PromptSection: React.FC<PromptSectionProps> = ({
  type,
  value,
  onInput,
  inputRef,
  prompts,
  popupVisible,
  setPopupVisible,
  onSave,
  onLoad,
  onDelete,
  rows,
  placeholder,
}) => {
  const togglePopup = () => setPopupVisible((prev) => !prev);
  const closePopup = () => setPopupVisible(false);

  return (
    <>
      <div className="input-row">
        <textarea
          ref={inputRef}
          rows={rows}
          placeholder={placeholder}
          onInput={(e) => onInput(e.currentTarget.value)}
          value={value}
        />
        <div className="prompt-buttons">
          <button onClick={togglePopup}>Load</button>
          <button onClick={onSave}>Save</button>
        </div>
      </div>
      <PromptsPopup
        prompts={prompts}
        type={type}
        visible={popupVisible}
        onClose={closePopup}
        onLoadPrompt={onLoad}
        onDeletePrompt={onDelete}
      />
    </>
  );
};

export default PromptSection;
