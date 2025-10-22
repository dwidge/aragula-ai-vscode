import React from "react";
import { useSettings } from "../contexts/SettingsContext";
import Overlay from "./Overlay";
import "./ToolPopup.css";

const ToolPopup: React.FC = () => {
  const {
    toolPopupVisible,
    setToolPopupVisible,
    availableTools,
    enabledTools,
    setEnabledTools,
    sendSettingsUpdate,
  } = useSettings();

  const closeToolPopup = React.useCallback(
    () => setToolPopupVisible(false),
    [setToolPopupVisible]
  );

  const enableTool = React.useCallback(
    (tool: string) => {
      if (!enabledTools.includes(tool)) {
        const newEnabledTools = [...enabledTools, tool];
        setEnabledTools(newEnabledTools);
        sendSettingsUpdate({ enabledTools: newEnabledTools });
      }
      closeToolPopup();
    },
    [enabledTools, setEnabledTools, sendSettingsUpdate, closeToolPopup]
  );

  if (!toolPopupVisible) return null;

  return (
    <>
      <Overlay close={closeToolPopup} />
      <div
        id="tool-popup"
        className="tool-popup"
        style={{ display: "block", zIndex: 10 }}
      >
        <div className="popup-header">
          <span>Available Tools</span>
          <button className="close-button" onClick={closeToolPopup}>
            ✕
          </button>
        </div>
        <ul id="tool-popup-list" className="tool-list">
          {availableTools
            .filter((t) => !enabledTools.includes(t))
            .map((tool) => (
              <li
                key={tool}
                className="tool-item"
                onClick={() => enableTool(tool)}
              >
                {tool}
              </li>
            ))}
        </ul>
      </div>
    </>
  );
};

export default ToolPopup;
