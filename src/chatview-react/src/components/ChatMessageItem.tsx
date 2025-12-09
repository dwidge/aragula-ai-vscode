import React from "react";
import { ChatMessage } from "../types";
import "./ChatMessageItem.css";

interface ChatMessageItemProps {
  message: ChatMessage & { children?: ChatMessage[] };
  level?: number;
  onToggleCollapse: (id: string) => void;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  level = 0,
  onToggleCollapse,
}) => {
  const isCollapsible = !!(
    message.message?.detail ||
    (message.children && message.children.length > 0)
  );

  return (
    <pre
      id={`message-${message.id}`}
      className={`message ${message.message?.type || "log"}-message ${
        level > 0 ? "child-message" : ""
      }`}
    >
      <div className="message-content-wrapper">
        <div
          className={`message-header ${
            !isCollapsible ? "non-collapsible" : ""
          }`}
          onClick={
            isCollapsible ? () => onToggleCollapse(message.id) : undefined
          }
        >
          <span className="message-preview">{message.message?.summary}</span>
          <span className="message-type-badge">{message.message?.type}</span>
          <button className="cancel-button" style={{ display: "none" }}>
            ✕
          </button>
          {isCollapsible && (
            <button className="collapse-button">
              {message.isCollapsed ? "▼" : "▲"}
            </button>
          )}
        </div>
        {isCollapsible && !message.isCollapsed ? (
          <div className="message-body-content">
            <div
              className={`message-detail-text ${
                message.message?.type ? `${message.message?.type}-message` : ""
              }`}
            >
              {message.message?.detail?.split("\n").map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </div>
            {message.children && message.children.length > 0 && (
              <div className="messages-container">
                {message.children.map((child) => (
                  <ChatMessageItem
                    key={child.id}
                    message={child}
                    level={level + 1}
                    onToggleCollapse={onToggleCollapse}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </pre>
  );
};

export default ChatMessageItem;
