import React from "react";
import { useSettings } from "../contexts/SettingsContext";
import ActionButtons from "./ActionButtons";
import "./InputArea.css";
import RunCommandSection from "./RunCommandSection";
import SystemPromptSection from "./SystemPromptSection";
import UserPromptSection from "./UserPromptSection";

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
  } = useSettings();

  return (
    <div className="input-area">
      <SystemPromptSection
        value={currentSystemPrompt}
        onInput={updateSystemPrompt}
        inputRef={systemPromptRef}
      />
      <UserPromptSection
        value={currentUserPrompt}
        onInput={updateUserPrompt}
        inputRef={userInputRef}
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
