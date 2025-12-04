import React from "react";
import { useSettings } from "../contexts/SettingsContext";
import ActionButtons from "./ActionButtons";
import "./InputArea.css";
import PromptSection from "./PromptSection";
import RunCommandSection from "./RunCommandSection";

const InputArea: React.FC = () => {
  const {
    currentSystemPrompt,
    currentUserPrompt,
    currentRunCommand,
    currentSelectedShell,
    updateSystemPrompt,
    updateUserPrompt,
    updateRunCommand,
    updateSelectedShell,
    systemPromptRef,
    userInputRef,
    runCommandInputRef,
    shellSelectorRef,
    systemPrompts,
    systemPromptsPopupVisible,
    setSystemPromptsPopupVisible,
    saveSystemPrompt,
    loadSystemPrompt,
    deleteSystemPrompt,
    userPrompts,
    userPromptsPopupVisible,
    setUserPromptsPopupVisible,
    saveUserPrompt,
    loadUserPrompt,
    deleteUserPrompt,
  } = useSettings();

  return (
    <div className="input-area">
      <PromptSection
        type="system"
        value={currentSystemPrompt}
        onInput={updateSystemPrompt}
        inputRef={systemPromptRef}
        prompts={systemPrompts}
        popupVisible={systemPromptsPopupVisible}
        setPopupVisible={setSystemPromptsPopupVisible}
        onSave={saveSystemPrompt}
        onLoad={loadSystemPrompt}
        onDelete={deleteSystemPrompt}
        rows={2}
        placeholder="Edit system prompt here..."
      />
      <PromptSection
        type="user"
        value={currentUserPrompt}
        onInput={updateUserPrompt}
        inputRef={userInputRef}
        prompts={userPrompts}
        popupVisible={userPromptsPopupVisible}
        setPopupVisible={setUserPromptsPopupVisible}
        onSave={saveUserPrompt}
        onLoad={loadUserPrompt}
        onDelete={deleteUserPrompt}
        rows={4}
        placeholder="Type your message here..."
      />
      <RunCommandSection
        value={currentRunCommand}
        shell={currentSelectedShell}
        onInput={updateRunCommand}
        onShellChange={updateSelectedShell}
        inputRef={runCommandInputRef}
        shellRef={shellSelectorRef}
      />
      <ActionButtons />
    </div>
  );
};

export default InputArea;
