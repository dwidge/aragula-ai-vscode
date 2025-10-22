import React from "react";
import "./EnabledTools.css";

interface EnabledToolsProps {
  tools: string[];
  onRemoveTool: (tool: string) => void;
}

const EnabledTools: React.FC<EnabledToolsProps> = ({ tools, onRemoveTool }) => (
  <div id="enabled-tools-container">
    {tools.map((tool) => (
      <div key={tool} className="tool-button">
        {tool}
        <button
          className="remove-tool-button"
          onClick={() => onRemoveTool(tool)}
        >
          ✕
        </button>
      </div>
    ))}
  </div>
);

export default EnabledTools;
