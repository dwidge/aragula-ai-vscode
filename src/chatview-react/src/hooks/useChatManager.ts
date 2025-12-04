import { useCallback, useRef } from "react";
import { ChatMessage } from "../types";
import { useLocalStorage } from "./useLocalStorage";
import { useMessageTree } from "./useMessageTree";
import { useScrollToBottom } from "./useScrollToBottom";

export const useChatManager = (tabId: string) => {
  const STORAGE_KEYS = {
    chatHistory: `chatMessages-${tabId}`,
  };

  const [chatHistory, setChatHistory] = useLocalStorage<ChatMessage[]>(
    STORAGE_KEYS.chatHistory,
    []
  );

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { tree } = useMessageTree(chatHistory);
  const scrollToBottom = useScrollToBottom(messagesContainerRef);

  const toggleCollapse = useCallback(
    (id: string) => {
      setChatHistory((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isCollapsed: !(m.isCollapsed || false) } : m
        )
      );
    },
    [setChatHistory]
  );

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, [setChatHistory]);

  return {
    chatHistory,
    setChatHistory,
    tree,
    toggleCollapse,
    clearChatHistory,
    messagesContainerRef,
    scrollToBottom,
  };
};
