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
  return (
    <pre
      id={`message-${message.id}`}
      className={`message ${message.messageType || "log"}-message ${
        level > 0 ? "child-message" : ""
      }`}
      style={{ marginLeft: `${level * 20}px` }}
    >
      <div className="message-content-wrapper">
        <div
          className="message-header"
          onClick={() => onToggleCollapse(message.id)}
        >
          <span className="message-preview">{message.summary}</span>
          <span className="message-type-badge">{message.messageType}</span>
          <button className="cancel-button" style={{ display: "none" }}>
            ✕
          </button>
          <button className="collapse-button">
            {message.isCollapsed ? "▼" : "▲"}
          </button>
        </div>
        <div
          className={`collapsible-content ${
            message.isCollapsed ? "collapsed" : ""
          }`}
        >
          <div className="message-body-content">
            <div
              className={`message-detail-text ${
                message.messageType ? `${message.messageType}-message` : ""
              }`}
              dangerouslySetInnerHTML={{
                __html: (message.detail || "").replace(/\n/g, "<br>"),
              }}
            />
          </div>
          {message.children && message.children.length > 0 && (
            <div className="child-messages-container">
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
      </div>
    </pre>
  );
};

export default ChatMessageItem;
