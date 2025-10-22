import React from "react";
import { useChat } from "../contexts/ChatContext";
import { useScrollToBottom } from "../hooks/useScrollToBottom";
import "./MessageList.css";

const MessageList: React.FC = () => {
  const { tree, renderMessageRecursive, messagesContainerRef } = useChat();
  const scrollToBottom = useScrollToBottom(messagesContainerRef);

  React.useEffect(() => {
    scrollToBottom();
  }, [tree, scrollToBottom]);

  return (
    <div id="messages-container" className="messages-container">
      {tree.map((msg) => renderMessageRecursive(msg))}
    </div>
  );
};

export default MessageList;
