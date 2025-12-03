import React, { createContext, ReactNode, useContext } from "react";
import { ChatMessage } from "../types";

interface ChatContextType {
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  tree: ChatMessage[];
  toggleCollapse: (id: string) => void;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
  clearChatHistory: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
  value: ChatContextType;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  value,
}) => {
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
