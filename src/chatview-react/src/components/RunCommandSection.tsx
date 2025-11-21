import React from "react";
import { useSettings } from "../contexts/SettingsContext";
import "./RunCommandSection.css";

interface RunCommandSectionProps {
  value: string;
  shell: string;
  onInput: (value: string) => void;
  onShellChange: (value: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  shellRef: React.RefObject<HTMLSelectElement | null>;
}

const RunCommandSection: React.FC<RunCommandSectionProps> = ({
  value,
  shell,
  onInput,
  onShellChange,
  inputRef,
  shellRef,
}) => {
  const { availableShells, postMessage } = useSettings();

  const handleRun = React.useCallback(() => {
    const command = inputRef.current?.value.trim();
    if (!command) {
      return;
    }

    postMessage({
      command: "runCommand",
      runCommand: command,
      shell: shell,
    });
  }, [inputRef, shell, postMessage]);

  return (
    <div className="input-row">
      <input
        ref={inputRef}
        type="text"
        className="form-input"
        placeholder="Enter command to run..."
        onInput={(e) => onInput(e.currentTarget.value)}
        value={value}
      />
      <select
        ref={shellRef}
        className="form-input"
        value={shell}
        onChange={(e) => onShellChange(e.target.value)}
      >
        {availableShells.map((s) => (
          <option key={s.path} value={s.path}>
            {s.name}
          </option>
        ))}
      </select>
      <button onClick={handleRun}>Run</button>
    </div>
  );
};

export default RunCommandSection;
