import React from "react";
import { useChat } from "../contexts/ChatContext";
import { useScrollToBottom } from "../hooks/useScrollToBottom";
import ChatMessageItem from "./ChatMessageItem";
import "./MessageList.css";

const MessageList: React.FC = () => {
  const { tree, messagesContainerRef, toggleCollapse } = useChat();
  const scrollToBottom = useScrollToBottom(messagesContainerRef);

  React.useEffect(() => {
    scrollToBottom();
  }, [tree, scrollToBottom]);

  return (
    <div
      id="messages-container"
      ref={messagesContainerRef}
      className="messages-container"
    >
      {tree.map((msg) => (
        <ChatMessageItem
          key={msg.id}
          message={msg}
          onToggleCollapse={toggleCollapse}
        />
      ))}
    </div>
  );
};

export default MessageList;
